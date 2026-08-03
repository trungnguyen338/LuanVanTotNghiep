import api from './api';

const customerService = {
  getProjects: async () => {
    const response = await api.get('/customer/projects');
    return response.data;
  }
};

export default customerService;
