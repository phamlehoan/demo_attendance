import type { Employee, AttendanceLog } from './db';

// Giả lập một số UUID chuẩn để bạn test
const MOCK_DATA: Employee[] = [
  { 
    employeeId: '550e8400-e29b-41d4-a716-446655440000', 
    fullName: 'Nguyễn Văn A', 
    pin: '12345' 
  },
  { 
    employeeId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8', 
    fullName: 'Trần Thị B', 
    pin: '67890' 
  },
  { 
    employeeId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 
    fullName: 'Lê Văn C', 
    pin: '55555' 
  }
];

export const mockApi = {
  /**
   * Giả lập lấy danh sách nhân viên từ Server
   */
  fetchEmployees: async (): Promise<Employee[]> => {
    console.log("📡 API: Đang tải danh sách nhân viên...");
    // Giả lập độ trễ mạng 1.5 giây
    await new Promise(resolve => setTimeout(resolve, 1500));
    return MOCK_DATA;
  },

  /**
   * Giả lập gửi logs chấm công (kèm ảnh base64) lên Server
   */
  syncLogs: async (logs: AttendanceLog[]): Promise<{ success: boolean }> => {
    console.log("🚀 API: Đang đẩy dữ liệu chấm công lên Server...", logs);
    
    // Giả lập độ trễ mạng 2 giây (vì dữ liệu ảnh Base64 khá nặng)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Giả lập tỉ lệ thành công 100%
    return { success: true };
  }
};