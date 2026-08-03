import api from './api';

const clientContractService = {
  // Lấy danh sách hợp đồng
  getContracts: async (params) => {
    const response = await api.get('/client-contracts', { params });
    return response.data;
  },

  // Chi tiết hợp đồng
  getContract: async (id) => {
    const response = await api.get(`/client-contracts/${id}`);
    return response.data;
  },

  // Lập hợp đồng mới
  createContract: async (data) => {
    // Sử dụng multipart/form-data nếu có tải lên file thực tế
    const headers = data instanceof FormData 
      ? { 'Content-Type': 'multipart/form-data' }
      : { 'Content-Type': 'application/json' };

    const response = await api.post('/client-contracts', data, { headers });
    return response.data;
  },

  // Cập nhật hợp đồng
  updateContract: async (id, data) => {
    const response = await api.put(`/client-contracts/${id}`, data);
    return response.data;
  },

  // Xóa hợp đồng
  deleteContract: async (id) => {
    const response = await api.delete(`/client-contracts/${id}`);
    return response.data;
  },

  // Danh sách hạng mục
  getItems: async (contractId) => {
    const response = await api.get(`/client-contracts/${contractId}/items`);
    return response.data;
  },

  // Thêm hạng mục mới
  createItem: async (contractId, data) => {
    const response = await api.post(`/client-contracts/${contractId}/items`, data);
    return response.data;
  },

  // Cập nhật hạng mục
  updateItem: async (id, data) => {
    const response = await api.put(`/contract-items/${id}`, data);
    return response.data;
  },

  // Xóa hạng mục
  deleteItem: async (id) => {
    const response = await api.delete(`/contract-items/${id}`);
    return response.data;
  },

  // Danh sách phụ lục
  getAddendums: async (contractId) => {
    const response = await api.get(`/client-contracts/${contractId}/addendums`);
    return response.data;
  },

  // Thêm phụ lục mới
  createAddendum: async (contractId, data) => {
    const headers = data instanceof FormData 
      ? { 'Content-Type': 'multipart/form-data' }
      : { 'Content-Type': 'application/json' };
      
    const response = await api.post(`/client-contracts/${contractId}/addendums`, data, { headers });
    return response.data;
  },

  // Cập nhật phụ lục
  updateAddendum: async (id, data) => {
    const response = await api.put(`/contract-addendums/${id}`, data);
    return response.data;
  },

  // Xóa phụ lục
  deleteAddendum: async (id) => {
    const response = await api.delete(`/contract-addendums/${id}`);
    return response.data;
  },

  // Tải tài liệu đính kèm lên hợp đồng
  uploadDocuments: async (id, data) => {
    const headers = { 'Content-Type': 'multipart/form-data' };
    const response = await api.post(`/client-contracts/${id}/documents`, data, { headers });
    return response.data;
  }
};

export default clientContractService;
