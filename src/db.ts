import { openDB } from 'idb';
import type { DBSchema } from 'idb'; 

export interface Employee {
  employeeId: string; 
  fullName: string;
  pin: string;
}

export interface AttendanceLog {
  employeeId: string;
  timestamp: number;
  type: 'IN' | 'OUT';
  synced: number; 
  photo: string | null; 
}

interface MyDB extends DBSchema {
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

export const dbPromise = openDB<MyDB>('KioskDB', 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('employees')) {
      const empStore = db.createObjectStore('employees', { keyPath: 'employeeId' });
      empStore.createIndex('by-pin', 'pin');
    }
    if (!db.objectStoreNames.contains('logs')) {
      const logStore = db.createObjectStore('logs', { keyPath: 'timestamp' });
      logStore.createIndex('by-synced', 'synced');
    }
  },
});