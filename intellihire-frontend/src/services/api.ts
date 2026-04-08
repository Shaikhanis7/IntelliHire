import axiosInstance from '../lib/axios';
import { API_ENDPOINTS } from '../config/constants';

export const api = {
  get: <T>(url: string, config?: any) => axiosInstance.get<T>(url, config),
  post: <T>(url: string, data?: any, config?: any) => axiosInstance.post<T>(url, data, config),
  put: <T>(url: string, data?: any, config?: any) => axiosInstance.put<T>(url, data, config),
  delete: <T>(url: string, config?: any) => axiosInstance.delete<T>(url, config),
  patch: <T>(url: string, data?: any, config?: any) => axiosInstance.patch<T>(url, data, config),
};