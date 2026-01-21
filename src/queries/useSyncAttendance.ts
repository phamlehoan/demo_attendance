import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../db/db';
import api, { API_CONFIG } from '../services/api';
import { responseWrapper, type ApiResponseType } from './helpers';

// Interface cho Request Body dựa trên NestJS DTO bạn gửi
interface AttendanceLogDto {
  pin: string;
  type: string;
  checkedTime: string; // ISO String sẽ được class-transformer của NestJS parse thành Date
  imageCapture: string;
  // Các field khác từ MarkAttendanceRequestBody nếu có (ví dụ: location, deviceId...)
}

interface MarkAttendanceBatchRequestBody {
  logs: AttendanceLogDto[];
}

export const useSyncAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // 1. Lấy tất cả các bản ghi chưa đồng bộ từ Dexie
      const pendingLogs = await db.attendances
        .where('synced')
        .equals(0)
        .toArray();

      if (pendingLogs.length === 0) return { count: 0 };

      // 2. Chuyển đổi dữ liệu sang định dạng Batch Request Body
      const body: MarkAttendanceBatchRequestBody = {
        logs: pendingLogs.map(log => ({
          pin: log.pin,
          type: log.type,
          // Đảm bảo checkedTime là định dạng ISO (ví dụ: 2026-01-20T08:00:00.000Z)
          checkedTime: new Date(log.checkedTime).toISOString(),
          imageCapture: log.imageCapture
        }))
      };

      // 3. Gọi API POST đến endpoint batch
      const res = await responseWrapper<ApiResponseType<{ count: number }>, [string, object]>(
        api.post,
        [API_CONFIG.ENDPOINTS.CHECK_IN, body]
      );

      // 4. Nếu thành công, cập nhật lại trạng thái trong Dexie
      if (res.success && res.data.count > 0) {
        const ids = pendingLogs.map(l => l.id!);
        const now = Date.now();

        await db.attendances.bulkUpdate(
          ids.map(id => ({
            key: id,
            changes: {
              synced: 1,
              syncedAt: now
            }
          }))
        );
      }

      return res.data;
    },
    onSuccess: () => {
      // Invalidate cache để cập nhật lại bảng History trên UI
      queryClient.invalidateQueries({ queryKey: ['ATTENDANCE_LOGS'] });
    },
    onError: (error) => {
      console.error('Batch Sync Failed:', error);
    }
  });
};
