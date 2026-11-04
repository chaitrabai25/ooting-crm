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
  // Allow browser/Axios to set multipart boundary automatically for FormData
  if (config.data instanceof FormData && config.headers) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      const isPublicPath =
        path.includes('/itinerary-pdf') ||
        path.includes('/pdf') ||
        path.startsWith('/itinerary/') ||
        path.startsWith('/register-tour/') ||
        path.startsWith('/trip-registration/') ||
        path === '/login';

      if (!isPublicPath) {
        localStorage.removeItem('ooting_crm_token');
        localStorage.removeItem('ooting_crm_user');
        window.location.href = '/login';
      }
    } else if (
      error.response?.status === 403 &&
      error.response?.data?.code === 'ORGANIZATION_SUSPENDED'
    ) {
      try {
        sessionStorage.setItem('ooting_crm_suspension', JSON.stringify(error.response.data));
      } catch {}
      if (window.location.pathname !== '/suspended') {
        window.location.href = '/suspended';
      }
    }

    // Sanitize error messages on client to ensure no raw technical/Prisma errors appear in UI
    if (error.response?.data?.message && typeof error.response.data.message === 'string') {
      const msg = error.response.data.message;
      const lower = msg.toLowerCase();
      if (
        lower.includes('prisma') ||
        lower.includes('unique constraint') ||
        lower.includes('foreign key') ||
        lower.includes('invocation:') ||
        lower.includes('econnrefused') ||
        lower.includes('etimedout') ||
        lower.includes('syntaxerror') ||
        lower.includes('typeerror') ||
        lower.includes('internal server error')
      ) {
        if (lower.includes('unique constraint') || lower.includes('p2002')) {
          error.response.data.message = 'A record with this information already exists. Please verify your entries.';
        } else if (lower.includes('foreign key') || lower.includes('p2003')) {
          error.response.data.message = 'This item is linked to other records and cannot be altered or removed.';
        } else {
          error.response.data.message = 'Unable to complete this request right now. Please try again shortly.';
        }
      }
    }

    return Promise.reject(error);
  }
);
