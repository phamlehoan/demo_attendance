import { create } from 'apisauce';

// Lưu ý: Export bằng "export const" để các file khác import { apiClient } được
export const apiClient = create({
  baseURL: import.meta.env.VITE_API_URL || 'https://api.example.com',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});
