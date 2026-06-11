import api from './api';

const authService = {
  /**
   * Login for Admin/Internal Staff and Subcontractors
   * @param {Object} credentials { login_id, password }
   */
  adminLogin: async (credentials) => {
    const response = await api.post('/auth/admin/login', credentials);
    return response.data;
  },

  /**
   * Login for Customers
   * @param {Object} credentials { login_id, password }
   */
  customerLogin: async (credentials) => {
    const response = await api.post('/auth/customer/login', credentials);
    return response.data;
  },

  /**
   * Logout the current user
   */
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  /**
   * Helper to set auth tokens in localStorage
   * @param {string} token 
   * @param {Object} user 
   */
  setAuthData: (token, user) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },

  /**
   * Helper to get current user from localStorage
   */
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },
  
  /**
   * Clear auth data
   */
  clearAuthData: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
  }
};

export default authService;
