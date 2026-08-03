import api from './api';

const subContractService = {
  // Lấy danh sách hợp đồng nhà thầu phụ
  getSubContracts: async (params) => {
    const response = await api.get('/sub-contracts', { params });
    return response.data;
  },

  // Chi tiết hợp đồng nhà thầu phụ
  getSubContract: async (id) => {
    const response = await api.get(`/sub-contracts/${id}`);
    return response.data;
  },

  // Lập hợp đồng nhà thầu phụ mới
  createSubContract: async (data) => {
    const headers = data instanceof FormData 
      ? { 'Content-Type': 'multipart/form-data' }
      : { 'Content-Type': 'application/json' };

    const response = await api.post('/sub-contracts', data, { headers });
    return response.data;
  },

  // Cập nhật hợp đồng nhà thầu phụ
  updateSubContract: async (id, data) => {
    const response = await api.put(`/sub-contracts/${id}`, data);
    return response.data;
  },

  // Xóa hợp đồng nhà thầu phụ
  deleteSubContract: async (id) => {
    const response = await api.delete(`/sub-contracts/${id}`);
    return response.data;
  },

  // Danh sách phụ lục hợp đồng nhà thầu phụ
  getAddendums: async (subContractId) => {
    const response = await api.get(`/sub-contracts/${subContractId}/addendums`);
    return response.data;
  },

  // Thêm phụ lục hợp đồng nhà thầu phụ mới
  createAddendum: async (subContractId, data) => {
    const headers = data instanceof FormData 
      ? { 'Content-Type': 'multipart/form-data' }
      : { 'Content-Type': 'application/json' };
      
    const response = await api.post(`/sub-contracts/${subContractId}/addendums`, data, { headers });
    return response.data;
  },

  // Cập nhật phụ lục hợp đồng nhà thầu phụ
  updateAddendum: async (id, data) => {
    const response = await api.put(`/sub-contract-addendums/${id}`, data);
    return response.data;
  },

  // Xóa phụ lục hợp đồng nhà thầu phụ
  deleteAddendum: async (id) => {
    const response = await api.delete(`/sub-contract-addendums/${id}`);
    return response.data;
  },

  // Tải tài liệu đính kèm lên hợp đồng thầu phụ
  uploadDocuments: async (id, data) => {
    const headers = { 'Content-Type': 'multipart/form-data' };
    const response = await api.post(`/sub-contracts/${id}/documents`, data, { headers });
    return response.data;
  }
};

export default subContractService;
