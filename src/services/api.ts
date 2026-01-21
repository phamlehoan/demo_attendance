import { create, type ApisauceInstance } from 'apisauce';

// Cách này giúp TypeScript không check lỗi 'process' ở môi trường Browser
const getEnv = (key: string): string | undefined => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any)._env_?.[key] || (import.meta as any).env?.[key] || '';
};

export const API_CONFIG = {
  // Thay thế URL mặc định của bạn ở đây
  BASE_URL: getEnv('VITE_API_URL') || 'https://your-api-domain.com/api',
  ENDPOINTS: {
    HEARTBEAT: '/heartbeat',
    EMPLOYEES: '/employee-profiles',
    CHECK_IN: '/employee-attendances-batch',
  },
  TIMEOUT: 15000,
};

const api: ApisauceInstance = create({
  baseURL: API_CONFIG.BASE_URL,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: API_CONFIG.TIMEOUT,
});

// Sửa lỗi 'request.headers' possibly undefined
api.addRequestTransform((request) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    // Khởi tạo headers chắc chắn là một object
    request.headers = request.headers || {};
    request.headers['Authorization'] = `Bearer ${token}`;
  }
});

export default api;