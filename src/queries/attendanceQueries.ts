import { dbPromise } from '../services/db';
import type { AttendanceDisplayLog, AttendanceLog, Employee } from '../types/attendance';

const ONE_HOUR_MS = 60 * 60 * 1000;

export const attendanceQueries = {
  getHistory: {
    queryKey: ['ATTENDANCE_LOGS'],
    queryFn: async (): Promise<AttendanceDisplayLog[]> => {
      const db = await dbPromise;
      const [logs, emps] = await Promise.all([
        db.getAll('logs'),
        db.getAll('employees')
      ]) as unknown as [AttendanceLog[], Employee[]];

      return logs.map(log => {
        const employee = emps.find(e => e.employeeId === log.employeeId);
        return {
          ...log,
          empName: employee ? employee.fullName : "Unknown"
        };
      }).sort((a, b) => b.timestamp - a.timestamp);
    }
  },

  cleanupOldLogs: async () => {
    const db = await dbPromise;
    const now = Date.now();
    const allLogs = await db.getAll('logs');
    
    // Chỉ xóa những log đã sync xong và thời gian sync đã quá 1 tiếng
    const logsToDelete = allLogs.filter(log => 
      log.synced === 1 && 
      log.syncedAt && 
      (now - log.syncedAt) > ONE_HOUR_MS
    );

    if (logsToDelete.length > 0) {
      const tx = db.transaction('logs', 'readwrite');
      await Promise.all([...logsToDelete.map(l => tx.store.delete(l.id)), tx.done]);
      console.log(`Cleaned up ${logsToDelete.length} old synced logs.`);
    }
  }
};
