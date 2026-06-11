import axios from 'axios';

// Create an Axios instance with base configuration
const api = axios.create({
  baseURL: 'http://localhost:8000/api', // Adjust this to match your backend URL
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

export default api;
