import api from './api';

const partnerService = {
  // Customers
  getCustomers: async (params) => {
    const response = await api.get('/customers', { params });
    return response.data;
  },
  createCustomer: async (data) => {
    const response = await api.post('/customers', data);
    return response.data;
  },
  updateCustomer: async (id, data) => {
    const response = await api.put(`/customers/${id}`, data);
    return response.data;
  },
  deleteCustomer: async (id) => {
    const response = await api.delete(`/customers/${id}`);
    return response.data;
  },

  // Subcontractors
  getSubcontractors: async (params) => {
    const response = await api.get('/subcontractors', { params });
    return response.data;
  },
  createSubcontractor: async (data) => {
    const response = await api.post('/subcontractors', data);
    return response.data;
  },
  updateSubcontractor: async (id, data) => {
    const response = await api.put(`/subcontractors/${id}`, data);
    return response.data;
  },
  deleteSubcontractor: async (id) => {
    const response = await api.delete(`/subcontractors/${id}`);
    return response.data;
  }
};

export default partnerService;
