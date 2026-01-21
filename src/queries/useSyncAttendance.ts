import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../db/db';
import api, { API_CONFIG } from '../services/api';
import { responseWrapper, type ApiResponseType } from './helpers';
import { TimeService } from '../services';
import { useNetworkStatus } from './useNetworkStatus';
import dayjs from 'dayjs';

interface AttendanceLogDto {
  pin: string;
  type: string;
  checkedTime: string;
  imageCapture: string;
}

interface MarkAttendanceBatchRequestBody {
  logs: AttendanceLogDto[];
}

export const useSyncAttendance = () => {
  const queryClient = useQueryClient();
  const { pingServer } = useNetworkStatus();

  return useMutation({
    mutationFn: async () => {
      // BƯỚC 0: Kiểm tra mạng tươi trước khi bắt đầu
      const isOnline = await pingServer();
      if (!isOnline) throw new Error('OFFLINE_BEFORE_SYNC');

      const pendingLogs = await db.attendances.where('synced').equals(0).toArray();
      if (pendingLogs.length === 0) return { count: 0 };

      const body: MarkAttendanceBatchRequestBody = {
        logs: pendingLogs.map(log => ({
          pin: log.pin,
          type: log.type,
          // Ép giờ Local sang định dạng ISO Z để bypass lỗi Timezone Server
          checkedTime: dayjs(log.checkedTime).format('YYYY-MM-DDTHH:mm:ss.SSS') + 'Z',
          imageCapture: log.imageCapture
        }))
      };

      const res = await responseWrapper<ApiResponseType<{ count: number }>, [string, object]>(
        api.post,
        [API_CONFIG.ENDPOINTS.CHECK_IN, body]
      );

      if (res.success && res.data.count > 0) {
        const ids = pendingLogs.map(l => l.id!);
        const now = TimeService.getCurrent();

        await db.attendances.bulkUpdate(
          ids.map(id => ({
            key: id,
            changes: { synced: 1, syncedAt: now }
          }))
        );
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ATTENDANCE_LOGS'] });
    },
    onError: (err: unknown) => {
      const error = err as Error;
      if (error.message === 'OFFLINE_BEFORE_SYNC') {
        console.warn('Sync aborted: Device is actually offline');
      } else {
        console.error('Batch Sync Failed:', error);
      }
    }
  });
};
