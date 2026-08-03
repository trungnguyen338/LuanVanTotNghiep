import api from './api';

const financeService = {
  // Lấy các thống kê tổng quan tài chính
  getStats: async () => {
    const response = await api.get('/project-payments/stats');
    return response.data;
  },

  // Lấy danh sách phiếu thanh toán (Thu/Chi)
  getPayments: async (params) => {
    const response = await api.get('/project-payments', { params });
    return response.data;
  },

  // Chi tiết phiếu thanh toán
  getPayment: async (id) => {
    const response = await api.get(`/project-payments/${id}`);
    return response.data;
  },

  // Khởi tạo phiếu thanh toán mới
  createPayment: async (data) => {
    const response = await api.post('/project-payments', data);
    return response.data;
  },

  // Cập nhật phiếu thanh toán
  updatePayment: async (id, data) => {
    const response = await api.put(`/project-payments/${id}`, data);
    return response.data;
  },

  // Xóa phiếu thanh toán
  deletePayment: async (id) => {
    const response = await api.delete(`/project-payments/${id}`);
    return response.data;
  },

  // Lấy danh sách công việc đã nghiệm thu đạt của hợp đồng thầu phụ
  getEligibleTasks: async (subContractId) => {
    const response = await api.get(`/sub-contracts/${subContractId}/eligible-tasks`);
    return response.data;
  }
};

export default financeService;
