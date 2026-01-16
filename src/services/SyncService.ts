import { apiClient } from '../queries/apiClient';
import type { AttendanceLog } from '../types/attendance';
import { dbPromise } from './db';

export const SyncService = {
  syncLogs: async () => {
    const db = await dbPromise;
    // Gán type AttendanceLog[] vào đây
    const unsyncedLogs: AttendanceLog[] = await db.getAllFromIndex('logs', 'by-synced', 0);

    if (unsyncedLogs.length === 0) return;

    try {
      // Ép kiểu response để tránh lỗi type
      const response = await apiClient.post('/attendance/sync', { logs: unsyncedLogs });

      if (response.ok) {
        const tx = db.transaction('logs', 'readwrite');
        for (const log of unsyncedLogs) {
          await tx.store.put({ ...log, synced: 1 });
        }
        await tx.done;
      }
    } catch (error) {
      console.error('[SyncService] Error:', error);
    }
  }
};
