import { toast } from 'react-toastify';
import type { ApiResponse, ApiErrorResponse } from 'apisauce';

export interface ApiResponseType<T> {
  data: T;
  code: number;
  success: boolean;
  timestamp: string;
}

export interface PaginationResponseType<T> {
  data: T[];
  payloadSize?: number;
  hasNext?: boolean;
  totalRecords?: number;
}

// Định nghĩa kiểu cho hàm API call (Zero Any)
type ApiCallFunc<TArgs extends unknown[], TData> = (...args: TArgs) => Promise<ApiResponse<TData>>;

/**
 * responseWrapper: Xử lý phản hồi và lỗi tập trung
 */
export async function responseWrapper<TData, TArgs extends unknown[] = unknown[]>(
  func: ApiCallFunc<TArgs, TData>,
  args: TArgs = [] as unknown as TArgs
): Promise<TData> {
  // Không dùng new Promise(async ...) để tránh lỗi "Promise executor should not be async"
  const response = await func(...args);

  if (response.ok && response.data !== undefined) {
    return response.data;
  }

  // Ép kiểu lỗi để xử lý thông báo
  const errorResponse = response as ApiErrorResponse<TData>;

  if (
    errorResponse.originalError?.message === 'CONNECTION_TIMEOUT' || 
    errorResponse.problem === 'TIMEOUT_ERROR'
  ) {
    toast.error('Connection timeout. Please check your network and try again.');
  }

  // Throw lỗi để React Query (hoặc catch bên ngoài) xử lý
  // Nếu server trả về object lỗi thì throw object đó, nếu không thì throw mã lỗi (problem)
  throw errorResponse.data || errorResponse.problem;
}

// Helper bóc tách data
export const getResponseData = <T>(obj: { data: T }): T => obj.data;