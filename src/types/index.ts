export const TkEmployeeAttendanceType = {
  CHECK_IN: 'CHECK_IN',
  CHECK_OUT: 'CHECK_OUT',
} as const;

export type TkEmployeeAttendanceType = typeof TkEmployeeAttendanceType[keyof typeof TkEmployeeAttendanceType];

export interface AttendanceLogDto {
  pin: string;
  type: TkEmployeeAttendanceType;
  checkedTime: string; // ISO String cho NestJS
  imageCapture: string;
}

export interface MarkAttendanceBatchRequestBody {
  logs: AttendanceLogDto[];
}

/**
 * Dữ liệu Nhân viên lưu tại máy (Dexie) và từ API đổ về
 */
export interface LocalEmployee {
  employeeId: string;
  pin: string;
  fullName: string;
  firstName: string;
  middleName: string;
  lastName: string;
  avatar?: string; // Có thể mở rộng thêm ảnh đại diện
}

export interface AttendanceUploadResponse {
  logId: string;
  status: string;
}

/**
 * Dữ liệu Nhật ký chấm công lưu tại máy
 */
export interface LocalAttendance {
  id?: number;          // Tự động tăng trong Dexie
  employeeId: string;
  pin: string;
  type: TkEmployeeAttendanceType;   // Ràng buộc chỉ 2 giá trị
  imageCapture: string; // Base64 string
  checkedTime: number;    // Thời gian đã hiệu chỉnh (Monotonic)
  timezone: string;
  synced: 0 | 1;        // 0: Chưa gửi lên server, 1: Đã gửi
  syncedAt?: number;    // Timestamp lúc đồng bộ thành công
}

/**
 * Interface cho Redux State
 */
export interface KioskState {
  online: boolean;
  offset: number;
  rtt: number | null;
}

/**
 * Interface cho API Response chuẩn của bạn
 */
export interface ApiResponseType<T> {
  data: T;
  code: number;
  success: boolean;
  timestamp: string | number;
}

/**
 * Type cho các tham số truyền vào CameraModal
 */
export interface CameraModalProps {
  isOpen: boolean;
  empName: string;
  onConfirm: (photoBase64: string) => Promise<void> | void;
  onCancel: () => void;
}
