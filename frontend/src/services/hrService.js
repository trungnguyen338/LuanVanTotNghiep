import api from './api';

const hrService = {
  getRoles: async () => {
    const response = await api.get('/roles');
    return response.data;
  },

  getUsers: async (params) => {
    const response = await api.get('/users', { params });
    return response.data;
  },

  createUser: async (userData) => {
    const response = await api.post('/users', userData);
    return response.data;
  },

  updateUser: async (id, userData) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },

  deleteUser: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  }
};

export default hrService;
