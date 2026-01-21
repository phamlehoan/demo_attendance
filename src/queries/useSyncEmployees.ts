import { useQuery } from '@tanstack/react-query';
import { db } from '../db/db';
import api, { API_CONFIG } from '../services/api';
import { responseWrapper, type ApiResponseType } from './helpers';
import type { LocalEmployee } from '../types';

export const useSyncEmployees = () => {
  return useQuery({
    queryKey: ['sync-employees'],
    queryFn: async (): Promise<LocalEmployee[]> => {
      // 1. Lấy thời điểm đồng bộ cuối cùng từ LocalStorage
      const lastSync = localStorage.getItem('last_employee_sync_time') || '';
      
      try {
        // 2. Gọi API lấy danh sách nhân viên (chỉ lấy những người thay đổi từ sau lastSync)
        const res = await responseWrapper<
          ApiResponseType<LocalEmployee[]>, 
          [string, object]
        >(
          api.get,
          [API_CONFIG.ENDPOINTS.EMPLOYEES, { lastSync }]
        );

        if (res.success && res.data && res.data.length > 0) {
          // 3. Lưu/Cập nhật vào Dexie
          // bulkPut sẽ ghi đè nếu trùng ID (primary key), giúp dữ liệu luôn mới nhất
          await db.employees.bulkPut(res.data);
          
          // 4. Lưu lại timestamp mới để lần sau chỉ lấy dữ liệu mới (Delta Sync)
          if (res.timestamp) {
            localStorage.setItem('last_employee_sync_time', res.timestamp.toString());
          }
        }

        // Trả về toàn bộ danh sách nhân viên hiện có trong máy để UI sử dụng nếu cần
        return await db.employees.toArray();
      } catch (error) {
        console.error('Không thể đồng bộ nhân viên, sử dụng dữ liệu cũ trong máy:', error);
        // Nếu lỗi mạng, vẫn trả về dữ liệu cũ đang có trong Dexie để Kiosk tiếp tục chạy
        return await db.employees.toArray();
      }
    },
    // Cấu hình để query này tự động chạy ngầm
    staleTime: 1000 * 60 * 10, // 10 phút mới coi là dữ liệu cũ
    refetchInterval: 1000 * 60 * 30, // Tự động đồng bộ lại sau mỗi 30 phút
  });
};
