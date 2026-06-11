import api from './api';

const projectCategoryService = {
  getCategories: async () => {
    const response = await api.get('/project-categories');
    return response.data;
  },

  createCategory: async (data) => {
    const response = await api.post('/project-categories', data);
    return response.data;
  },

  updateCategory: async (id, data) => {
    const response = await api.put(`/project-categories/${id}`, data);
    return response.data;
  },

  deleteCategory: async (id) => {
    const response = await api.delete(`/project-categories/${id}`);
    return response.data;
  }
};

export default projectCategoryService;
