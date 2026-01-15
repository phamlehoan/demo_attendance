import { useQuery } from '@tanstack/react-query';
import { apiClient } from './apiClient';
import { responseWrapper, type PaginationResponseType } from './helpers';
import { dbPromise } from '../services/db';
import type { Employee } from '../types/attendance';

export const useEmployees = () => {
  return useQuery({
    queryKey: ['EMPLOYEES'],
    queryFn: async () => {
      // 1. Gọi API thông qua Wrapper (Wrapper này trả về response.data)
      const res = await responseWrapper<PaginationResponseType<Employee>, [string]>(
        apiClient.get.bind(apiClient),
        ['/employees']
      );

      // 2. Lấy mảng nhân viên từ data (PaginationResponseType có field data: T[])
      const employees = res.data;

      // 3. Tiến hành đồng bộ vào IndexedDB
      const db = await dbPromise;
      const tx = db.transaction('employees', 'readwrite');
      const store = tx.objectStore('employees');

      await store.clear();
      for (const emp of employees) {
        await store.put(emp);
      }
      await tx.done;

      // 4. Trả về data cho React Query để UI sử dụng
      return employees;
    },
    // Bạn nên để staleTime cao một chút để tránh gọi API liên tục mỗi khi chuyển màn hình
    staleTime: 1000 * 60 * 15, 
  });
};