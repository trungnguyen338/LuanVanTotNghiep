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
  },

  // Suppliers
  getSuppliers: async (params) => {
    const response = await api.get('/suppliers', { params });
    return response.data;
  },
  createSupplier: async (data) => {
    const response = await api.post('/suppliers', data);
    return response.data;
  },
  updateSupplier: async (id, data) => {
    const response = await api.put(`/suppliers/${id}`, data);
    return response.data;
  },
  deleteSupplier: async (id) => {
    const response = await api.delete(`/suppliers/${id}`);
    return response.data;
  }
};

export default partnerService;
