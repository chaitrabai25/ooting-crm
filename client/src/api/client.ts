import axios from 'axios';

const rawApiUrl = (import.meta as any).env?.VITE_API_URL;
const apiUrl = rawApiUrl 
  ? `${String(rawApiUrl).replace(/\/$/, '')}/api` 
  : '/api';

export const api = axios.create({
  baseURL: apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ooting_crm_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ooting_crm_token');
      localStorage.removeItem('ooting_crm_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
