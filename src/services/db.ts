import { openDB, type DBSchema } from 'idb';

export interface Employee {
  employeeId: string;
  fullName: string;
  pin: string;
}

export interface AttendanceLog {
  id: string; // Dùng UUID
  employeeId: string;
  timestamp: number;
  type: 'IN' | 'OUT';
  photo: string;
  synced: number; 
}

interface KioskDB extends DBSchema {
  employees: {
    key: string;
    value: Employee;
    indexes: { 'by-pin': string };
  };
  logs: {
    key: string;
    value: AttendanceLog;
    indexes: { 'by-synced': number };
  };
}

export const dbPromise = openDB<KioskDB>('KioskDatabase', 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('employees')) {
      const empStore = db.createObjectStore('employees', { keyPath: 'employeeId' });
      empStore.createIndex('by-pin', 'pin');
    }
    if (!db.objectStoreNames.contains('logs')) {
      const logStore = db.createObjectStore('logs', { keyPath: 'id' });
      logStore.createIndex('by-synced', 'synced');
    }
  },
});