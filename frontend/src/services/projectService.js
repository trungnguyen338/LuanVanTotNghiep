import api from './api';

const projectService = {
  getProjects: async (params) => {
    const response = await api.get('/projects', { params });
    return response.data;
  },

  createProject: async (data) => {
    const response = await api.post('/projects', data);
    return response.data;
  },

  updateProject: async (id, data) => {
    const response = await api.put(`/projects/${id}`, data);
    return response.data;
  },

  deleteProject: async (id) => {
    const response = await api.delete(`/projects/${id}`);
    return response.data;
  }
};

export default projectService;
