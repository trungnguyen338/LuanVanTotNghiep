import api from './api';

const documentService = {
  // Lấy danh sách loại tài liệu
  getDocumentTypes: async () => {
    const response = await api.get('/document-types');
    return response.data;
  },

  // Lấy danh sách hồ sơ tài liệu (filters: project_id, document_type_id, search)
  getDocuments: async (params) => {
    const response = await api.get('/project-documents', { params });
    return response.data;
  },

  // Chi tiết một tài liệu
  getDocument: async (id) => {
    const response = await api.get(`/project-documents/${id}`);
    return response.data;
  },
  // Lập tài liệu mới (file upload qua FormData)
  createDocument: async (formData) => {
    const response = await api.post('/project-documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Cập nhật tài liệu (dùng POST kèm _method = PUT trong FormData để PHP/Laravel nhận diện file)
  updateDocument: async (id, formData) => {
    const response = await api.post(`/project-documents/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Cập nhật riêng trạng thái để tài liệu pháp lý vẫn khóa sửa file/thông tin nhưng đổi được trạng thái nghiệp vụ.
  updateDocumentStatus: async (id, status) => {
    const response = await api.patch(`/project-documents/${id}/status`, { status });
    return response.data;
  },

  // Xóa tài liệu
  deleteDocument: async (id) => {
    const response = await api.delete(`/project-documents/${id}`);
    return response.data;
  },

  // Xem/tải tài liệu qua API để giữ Authorization header từ Axios interceptor.
  openDocumentFile: async (document) => {
    if (!document?.id) {
      throw new Error('Không tìm thấy mã tài liệu');
    }

    try {
      const response = await api.get(`/project-documents/${document.id}/download`, {
        responseType: 'blob',
      });
      const blobUrl = window.URL.createObjectURL(response.data);
      const link = window.document.createElement('a');
      link.href = blobUrl;
      link.download = getDownloadFilename(document, response.headers?.['content-disposition']);
      link.rel = 'noopener noreferrer';
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
    } catch (error) {
      throw error;
    }
  },
};

const getDownloadFilename = (document, contentDisposition) => {
  const fallbackName = String(document?.document_name || 'tai-lieu').trim();
  const fileNameFromHeader = parseFilenameFromContentDisposition(contentDisposition);

  if (fileNameFromHeader) {
    return fileNameFromHeader;
  }

  const extension = getFileExtension(document?.file_url);
  if (!extension) {
    return fallbackName;
  }

  const lowerName = fallbackName.toLowerCase();
  const lowerExtension = `.${extension.toLowerCase()}`;
  return lowerName.endsWith(lowerExtension) ? fallbackName : `${fallbackName}${lowerExtension}`;
};

const parseFilenameFromContentDisposition = (contentDisposition) => {
  if (!contentDisposition || typeof contentDisposition !== 'string') {
    return '';
  }

  const utf8Match = contentDisposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim().replace(/^"|"$/g, ''));
    } catch (error) {
      return utf8Match[1].trim().replace(/^"|"$/g, '');
    }
  }

  const plainMatch = contentDisposition.match(/filename\s*=\s*("?)([^";]+)\1/i);
  return plainMatch?.[2]?.trim() || '';
};

const getFileExtension = (fileUrl) => {
  if (!fileUrl || typeof fileUrl !== 'string') {
    return '';
  }

  try {
    const url = new URL(fileUrl, window.location.origin);
    const pathname = url.pathname || '';
    const lastSegment = pathname.split('/').pop() || '';
    const parts = lastSegment.split('.');
    return parts.length > 1 ? parts.pop() : '';
  } catch (error) {
    const cleanUrl = fileUrl.split('?')[0].split('#')[0];
    const lastSegment = cleanUrl.split('/').pop() || '';
    const parts = lastSegment.split('.');
    return parts.length > 1 ? parts.pop() : '';
  }
};

export default documentService;
