import type { Employee, AttendanceLog } from './services/db';

// Dữ liệu mẫu khớp với cấu trúc trong IndexedDB
const MOCK_EMPLOYEES: Employee[] = [
  { 
    employeeId: '550e8400-e29b-41d4-a716-446655440000', 
    fullName: 'Nguyễn Văn An', 
    pin: '123456' 
  },
  { 
    employeeId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8', 
    fullName: 'Trần Thị Bình', 
    pin: '678901' 
  },
  { 
    employeeId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 
    fullName: 'Lê Văn Cường', 
    pin: '111111' 
  },
  { 
    employeeId: 'f47ac10b-58cc-4372-a567-0e02b2c3d449', 
    fullName: 'Trương Văn Dũng', 
    pin: '222222' 
  },
  { 
    employeeId: 'f47ac10b-58cc-4372-a567-0e02b2c2d479', 
    fullName: 'Phan Lệ Nam Em', 
    pin: '333333' 
  },
  { 
    employeeId: 'f47ac10b-58cc-4372-a567-1e02b2c3d479', 
    fullName: 'Vũ Thu Phương', 
    pin: '444444' 
  },
  { 
    employeeId: 'f47ac10b-58cc-4372-a567-1e02b2c3d479', 
    fullName: 'Phạm Trà Giang', 
    pin: '555555' 
  },
];

export const mockApi = {
  /**
   * Giả lập lấy danh sách nhân viên từ Server (có độ trễ mạng)
   */
  fetchEmployees: async (): Promise<Employee[]> => {
    console.log("📡 [MockAPI] Đang tải danh sách nhân viên...");
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log("✅ [MockAPI] Tải danh sách thành công.");
        resolve(MOCK_EMPLOYEES);
      }, 1000); // Trễ 1 giây
    });
  },

  /**
   * Giả lập gửi logs chấm công lên Server
   * Nhận vào một mảng logs (để sau này dùng cho sync hàng loạt)
   */
  syncLogs: async (logs: AttendanceLog[]): Promise<{ success: boolean; syncedIds: string[] }> => {
    console.log(`🚀 [MockAPI] Đang đẩy ${logs.length} dữ liệu chấm công lên Server...`, logs);
    
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Giả lập tỉ lệ thành công 90%, thỉnh thoảng lỗi mạng (để test logic offline)
        const isOnline = Math.random() > 0.1; 

        if (isOnline) {
          console.log("✅ [MockAPI] Đồng bộ thành công!");
          resolve({ 
            success: true, 
            syncedIds: logs.map(l => l.id) 
          });
        } else {
          console.warn("❌ [MockAPI] Lỗi kết nối Server!");
          reject(new Error("Network Error"));
        }
      }, 2000); // Ảnh base64 nặng nên giả lập trễ 2 giây
    });
  }
};
