import axios from 'axios';

// Create an Axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000/api`,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor to attach the auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle global errors (like 401 Unauthorized)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and redirect to login if unauthorized
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      // window.location.href = '/admin/login'; // Redirect logic can be handled at component level or here
    }
    return Promise.reject(error);
  }
);

export const getCleanImageUrl = (url) => {
  if (!url) return '';

  const normalizedUrl = String(url).replaceAll('\\', '/');

  // URL xem trước của file vừa chọn không nằm trên backend.
  if (normalizedUrl.startsWith('blob:') || normalizedUrl.startsWith('data:')) {
    return normalizedUrl;
  }

  try {
    const apiBaseUrl = new URL(api.defaults.baseURL, window.location.origin);
    const apiOrigin = apiBaseUrl.origin;

    // Ảnh nhật ký là file nội bộ. Luôn dùng origin của API thay vì host được
    // Laravel tạo từ APP_URL (thường là localhost và không dùng được từ máy khác).
    const storageMarker = '/storage/';
    const storagePosition = normalizedUrl.indexOf(storageMarker);
    if (storagePosition !== -1) {
      return `${apiOrigin}${normalizedUrl.slice(storagePosition)}`;
    }

    if (!/^https?:\/\//i.test(normalizedUrl)) {
      const relativePath = normalizedUrl
        .replace(/^\/+/, '')
        .replace(/^storage\/+/, '');

      return `${apiOrigin}/storage/${relativePath}`;
    }
  } catch {
    // Giữ nguyên URL nếu baseURL được cấu hình không hợp lệ.
  }

  return normalizedUrl;
};

export default api;
