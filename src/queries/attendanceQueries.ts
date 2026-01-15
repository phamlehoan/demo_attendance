import { dbPromise } from '../services/db';
import type { Employee, AttendanceLog, AttendanceDisplayLog } from '../types/attendance';

export const attendanceQueries = {
  getHistory: {
    queryKey: ['ATTENDANCE_LOGS'],
    queryFn: async (): Promise<AttendanceDisplayLog[]> => {
      const db = await dbPromise;
      
      // Sử dụng 'unknown' làm trung gian để ép kiểu từ number sang 0 | 1 mà không bị TS chặn
      const [logs, emps] = await Promise.all([
        db.getAll('logs'),
        db.getAll('employees')
      ]) as unknown as [AttendanceLog[], Employee[]];

      return logs.map(log => {
        const employee = emps.find(e => e.employeeId === log.employeeId);
        return {
          ...log,
          empName: employee ? employee.fullName : "N/A"
        };
      }).sort((a, b) => b.timestamp - a.timestamp);
    }
  }
};
