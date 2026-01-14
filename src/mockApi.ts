import type { Employee } from './db';

// Dữ liệu nhân viên giả lập
const MOCK_EMPLOYEES: Employee[] = [
  {
    employeeId: "EMP001",
    firstName: "Anh",
    lastName: "Nguyễn",
    middleName: "Văn",
    fullName: "Nguyễn Văn Anh",
    email: "anh.nv@company.com",
    pinCode: "11111"
  },
  {
    employeeId: "EMP002",
    firstName: "Bình",
    lastName: "Trần",
    middleName: "Thị",
    fullName: "Trần Thị Bình",
    email: "binh.tt@company.com",
    pinCode: "22222"
  }
];

export const mockApi = {
  // Giả lập GET /employees
  fetchEmployees: async (): Promise<Employee[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(MOCK_EMPLOYEES), 1500); // Giả lập lag 1.5s
    });
  },

  // Giả lập POST /sync-kiosk-attendance-logs
  syncLogs: async (logs: any[]): Promise<{ success: boolean }> => {
    console.log(">>> MOCK API: Đang nhận dữ liệu logs:", logs);
    return new Promise((resolve) => {
      setTimeout(() => resolve({ success: true }), 2000); // Giả lập lag 2s
    });
  }
};
