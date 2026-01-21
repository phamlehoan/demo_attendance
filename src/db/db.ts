import Dexie, { type Table } from 'dexie';
import type { LocalEmployee, LocalAttendance } from '../types';

export class KioskDatabase extends Dexie {
  employees!: Table<LocalEmployee>;
  attendances!: Table<LocalAttendance>;

  constructor() {
    super('KioskDatabase');
    this.version(1).stores({
      /**
       * employees:
       * - employeeId: Khóa chính (UUID), không dùng ++
       * - pin: Đánh index để tìm kiếm nhân viên nhanh khi nhập mã PIN
       */
      employees: 'employeeId, pin, fullName',

      /**
       * attendances:
       * - ++id: Khóa chính tự tăng cho local
       * - employeeId: Index để sau này lọc lịch sử theo nhân viên nếu cần
       * - synced: Cực kỳ quan trọng để lọc những bản ghi chưa đẩy lên server (.where('synced').equals(0))
       * - checkedTime: Index để sắp xếp lịch sử theo thời gian (OrderBy)
       */
      attendances: '++id, employeeId, pin, synced, checkedTime'
    });
  }
}

export const db = new KioskDatabase();