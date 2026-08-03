import api from './api';

const projectService = {
  // Lấy thống kê dashboard
  getDashboardStats: async () => {
    const response = await api.get('/dashboard/stats');
    return response.data;
  },

  // Lấy danh sách dự án
  getProjects: async (params) => {
    const response = await api.get('/projects', { params });
    return response.data;
  },

  // Lấy chi tiết một dự án
  getProject: async (id) => {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  },

  // Tạo dự án mới
  createProject: async (data) => {
    const response = await api.post('/projects', data);
    return response.data;
  },

  // Cập nhật dự án
  updateProject: async (id, data) => {
    const response = await api.put(`/projects/${id}`, data);
    return response.data;
  },

  // Xóa/tạm ngưng dự án
  deleteProject: async (id) => {
    const response = await api.delete(`/projects/${id}`);
    return response.data;
  },

  // --- PROJECT TASKS (HẠNG MỤC LỚN) ---

  // Lấy danh sách loại hạng mục (task types)
  getTaskTypes: async () => {
    const response = await api.get('/project-tasks/types');
    return response.data;
  },

  // Lấy chi tiết một hạng mục lớn
  getProjectTask: async (id) => {
    const response = await api.get(`/project-tasks/${id}`);
    return response.data;
  },

  // Lấy danh sách hạng mục lớn của dự án
  getProjectTasks: async (projectId) => {
    const response = await api.get(`/projects/${projectId}/tasks`);
    return response.data;
  },

  // Thêm hạng mục lớn mới
  createProjectTask: async (projectId, data) => {
    const response = await api.post(`/projects/${projectId}/tasks`, data);
    return response.data;
  },

  // Cập nhật hạng mục lớn
  updateProjectTask: async (id, data) => {
    const response = await api.put(`/project-tasks/${id}`, data);
    return response.data;
  },

  // Xóa hạng mục lớn
  deleteProjectTask: async (id) => {
    const response = await api.delete(`/project-tasks/${id}`);
    return response.data;
  },

  // --- TASK DETAILS (CÔNG VIỆC CON / GIAO KHOÁN) ---

  // Lấy danh sách công việc con thuộc hạng mục lớn
  getTaskDetails: async (taskId) => {
    const response = await api.get(`/project-tasks/${taskId}/details`);
    return response.data;
  },

  // Tạo công việc con và giao khoán
  createTaskDetail: async (taskId, data) => {
    const response = await api.post(`/project-tasks/${taskId}/details`, data);
    return response.data;
  },

  // Cập nhật công việc con / tiến độ giao khoán
  updateTaskDetail: async (id, data) => {
    const response = await api.put(`/task-details/${id}`, data);
    return response.data;
  },

  // Xóa công việc con
  deleteTaskDetail: async (id) => {
    const response = await api.delete(`/task-details/${id}`);
    return response.data;
  },


  getSubcontractorTasks: async () => {
    const response = await api.get('/subcontractor/tasks');
    return response.data;
  },

  // Lấy danh sách nhật ký của 1 công việc cụ thể
  getConstructionLogs: async (paramsOrId) => {
    const params = typeof paramsOrId === 'object' ? paramsOrId : { task_detail_id: paramsOrId };
    const response = await api.get('/construction-logs', { params });
    return response.data;
  },

  // Ghi nhật ký thi công (hỗ trợ upload ảnh bằng FormData)
  createConstructionLog: async (formData) => {
    const response = await api.post('/construction-logs', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Cập nhật nhật ký thi công, không giới hạn ngày tạo (dùng POST kèm _method = PUT trong FormData để PHP/Laravel nhận diện file)
  updateConstructionLog: async (id, formData) => {
    const response = await api.post(`/construction-logs/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Xóa nhật ký thi công, không giới hạn ngày tạo khi công việc chưa bị khóa
  deleteConstructionLog: async (id) => {
    const response = await api.delete(`/construction-logs/${id}`);
    return response.data;
  },

  // Gửi yêu cầu nghiệm thu khi đạt 100%
  requestAcceptance: async (id) => {
    const response = await api.post(`/task-details/${id}/request-acceptance`);
    return response.data;
  },

  // Phê duyệt nghiệm thu hạng mục lớn (Level 2)
  approveParentTask: async (id) => {
    const response = await api.post(`/project-tasks/${id}/approve-acceptance`);
    return response.data;
  },

  // Lấy danh sách yêu cầu nghiệm thu (Admin)
  getAcceptanceRequests: async (params) => {
    const response = await api.get('/task-details', { params });
    return response.data;
  }
};

export default projectService;
