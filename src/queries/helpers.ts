import { toast } from 'react-toastify';
import type { ApiResponse, ApiErrorResponse } from 'apisauce';
import mockEmployees from '../mocks/employees.json';
import mockAttendance from '../mocks/attendance.json';

export interface ApiResponseType<T> {
  data: T;
  code: number;
  success: boolean;
  timestamp: string;
}

type ApiCallFunc<TArgs extends unknown[], TData> = (...args: TArgs) => Promise<ApiResponse<TData>>;

/**
 * responseWrapper: Xử lý phản hồi, lỗi tập trung và Mock Fallback
 */
export async function responseWrapper<TData, TArgs extends unknown[] = unknown[]>(
  func: ApiCallFunc<TArgs, TData>,
  args: TArgs = [] as unknown as TArgs
): Promise<TData> {
  try {
    const response = await func(...args);

    if (response.ok && response.data !== undefined) {
      return response.data;
    }

    throw response;
  } catch (error: unknown) {
    const url = (args[0] as string) || '';

    // 1. LOẠI TRỪ CLOUDFLARE & HEARTBEAT (KHÔNG MOCK)
    // - Cloudflare: Dùng để check ổn định mạng theo repo cũ của bạn.
    // - Heartbeat: Cần lỗi thật để useNetworkStatus tính toán offset từ LocalStorage.
    if (
      url.includes('cloudflare') || 
      url.includes('1.1.1.1') || 
      url.includes('/heartbeat') // Giả sử endpoint của bạn có chứa từ này
    ) {
      const apiError = error as ApiErrorResponse<TData>;
      throw apiError.data || apiError.problem || apiError;
    }

    // 2. LOGIC MOCK FALLBACK CHO CÁC API DỮ LIỆU
    if (url.includes('/employee-profiles')) {
      console.warn(`[Mock] API Employee failed, using local data.`);
      return mockEmployees as unknown as TData;
    }

    if (url.includes('/employee-attendances-batch')) {
      console.warn(`[Mock] API Attendance failed, using local data.`);
      return mockAttendance as unknown as TData;
    }

    // 3. XỬ LÝ LỖI TOAST (Chỉ hiện cho các thao tác người dùng, không hiện cho heartbeat ngầm)
    const apiError = error as ApiErrorResponse<TData>;
    
    // Chỉ báo lỗi timeout cho các request không phải heartbeat/network check
    const isBackgroundRequest = url.includes('/heartbeat') || url.includes('1.1.1.1');
    
    if (!isBackgroundRequest) {
      if (
        apiError.problem === 'TIMEOUT_ERROR' || 
        apiError.originalError?.message === 'CONNECTION_TIMEOUT'
      ) {
        toast.error('Connection timeout. Please check your network and try again.');
      }
    }

    if (apiError.data) {
      throw apiError.data;
    }
    
    throw new Error(apiError.problem || 'UNKNOWN_ERROR');
  }
}

export const getResponseData = <T>(obj: { data: T }): T => obj.data;