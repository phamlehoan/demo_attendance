export type ActionType = 'IN' | 'OUT';

export interface Employee {
  employeeId: string;
  fullName: string;
  pin: string;
}

export interface AttendanceLog {
  id: string;
  employeeId: string;
  timestamp: number;
  type: ActionType;
  photo: string;
  synced: 0 | 1;
  syncedAt?: number;
}

export interface AttendanceDisplayLog extends AttendanceLog {
  empName: string;
}
