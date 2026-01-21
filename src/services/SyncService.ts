import { db } from '../db/db';
import { TkEmployeeAttendanceType } from '../types'; // Import Type mới
import { TimeService } from '.';

export const SyncService = {
  async getEmployeeByPin(pin: string) {
    return await db.employees.where('pin').equals(pin).first();
  },

  /**
   * Lưu bản ghi chấm công vào local DB
   * @param employeeId - Cần lưu UUID để Server dễ map
   * @param type - Phải là CHECK_IN hoặc CHECK_OUT
   */
  async saveAttendance(
    employeeId: string, 
    pin: string, 
    type: TkEmployeeAttendanceType, 
    imageCapture: string
  ) {
    return await db.attendances.add({
      employeeId,
      pin,
      type,
      imageCapture,
      checkedTime: TimeService.getCurrent(),
      synced: 0,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone 
    });
  }
};