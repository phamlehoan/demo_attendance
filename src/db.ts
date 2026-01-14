import { openDB, type DBSchema } from 'idb'; // Sửa DBSchema tại đây

export interface Employee {
  employeeId: string;
  firstName: string;
  lastName: string;
  middleName: string;
  fullName: string;
  email: string;
  pinCode: string;
}

interface AttendanceLog {
  id?: number;
  employeeId: string;
  timestamp: number;
  type: 'IN' | 'OUT';
  synced: number;
}

interface AttendanceDB extends DBSchema {
  employees: {
    key: string;
    value: Employee;
    indexes: { 'by-pin': string };
  };
  logs: {
    key: number;
    value: AttendanceLog;
    indexes: { 'by-synced': number };
  };
}

export const dbPromise = openDB<AttendanceDB>('AttendanceDB', 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('employees')) {
      const empStore = db.createObjectStore('employees', { keyPath: 'employeeId' });
      empStore.createIndex('by-pin', 'pinCode');
    }
    if (!db.objectStoreNames.contains('logs')) {
      const logStore = db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
      logStore.createIndex('by-synced', 'synced');
    }
  },
});
