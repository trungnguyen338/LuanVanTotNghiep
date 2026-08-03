import { useState } from 'react';
import { 
  Table, Button, Input, Select, Typography, Tag, 
  Modal, Form, message, Popconfirm, Space, Upload, Card, Row, Col, Breadcrumb, Tooltip, Dropdown 
} from 'antd';
import { 
  SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, 
  UploadOutlined, DownloadOutlined, CheckCircleOutlined, FolderOpenOutlined,
  FilePdfOutlined, FileWordOutlined, FileExcelOutlined, FileImageOutlined, FileUnknownOutlined 
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import documentService from '../../services/documentService';
import projectService from '../../services/projectService';

const { Title, Text } = Typography;
const { Option } = Select;

const DOCUMENT_STATUS_OPTIONS = [
  {
    value: 'DRAFT',
    label: 'Bản nháp',
    icon: <EditOutlined />,
    tone: { text: '#1f1f1f', bg: '#f5f5f5', border: '#f5f5f5', dot: '#9ca3af' },
  },
  {
    value: 'ACTIVE',
    label: 'Đang hiệu lực',
    icon: <CheckCircleOutlined />,
    tone: { text: '#0f64e8', bg: '#e8f8ff', border: '#e8f8ff', dot: '#38bdf8' },
  },
  {
    value: 'ARCHIVED',
    label: 'Lưu trữ',
    icon: <FolderOpenOutlined />,
    tone: { text: '#334155', bg: '#f1f5f9', border: '#cbd5e1', dot: '#64748b' },
  },
];

const getDocumentStatus = (status) => (
  DOCUMENT_STATUS_OPTIONS.find((item) => item.value === status) || DOCUMENT_STATUS_OPTIONS[1]
);

const DELETE_PROTECTED_DOCUMENT_TYPES = [
  'Hợp đồng khách hàng',
  'Hợp đồng thầu phụ',
  'Hợp đồng nhà thầu phụ',
  'Phụ lục hợp đồng',
];

const UPLOAD_RESTRICTED_DOCUMENT_TYPES = [
  'Hợp đồng khách hàng',
  'Hợp đồng thầu phụ',
  'Hợp đồng nhà thầu phụ',
  'Phụ lục hợp đồng',
];

const isDeleteProtectedDocument = (document) => (
  DELETE_PROTECTED_DOCUMENT_TYPES.includes(document?.document_type?.type_name)
);

const isUploadRestrictedDocumentType = (typeName) => (
  UPLOAD_RESTRICTED_DOCUMENT_TYPES.includes(typeName)
);

const StatusPill = ({ status }) => {
  const option = getDocumentStatus(status);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 92,
        height: 34,
        padding: '0 16px',
        borderRadius: 999,
        background: option.tone.bg,
        color: option.tone.text,
        fontWeight: 800,
        fontSize: 15,
        lineHeight: 1,
      }}
    >
      <span>{option.label}</span>
    </span>
  );
};

const ActionIconButton = ({ color, disabled, onClick, icon, tooltip, danger = false }) => (
  <Tooltip title={tooltip}>
    <Button
      type="text"
      disabled={disabled}
      onClick={onClick}
      icon={icon}
      style={{
        color: disabled ? '#bfbfbf' : color,
        padding: 0,
        width: 34,
        height: 34,
        borderRadius: 8,
        background: disabled ? '#fafafa' : 'transparent',
        border: '1px solid transparent',
      }}
      danger={danger && !disabled}
    />
  </Tooltip>
);

const DocumentManagement = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  // Search and Filter States
  const [search, setSearch] = useState('');
  const [selectedProject, setSelectedProject] = useState(undefined);
  const [selectedType, setSelectedType] = useState(undefined);

  // Modal States
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [fileList, setFileList] = useState([]);

  // Queries
  const { data: documents = [], isLoading: loadingDocs } = useQuery({
    queryKey: ['documents', search, selectedProject, selectedType],
    queryFn: () => {
      const params = {};
      if (search) params.search = search;
      if (selectedProject) params.project_id = selectedProject;
      if (selectedType) params.document_type_id = selectedType;
      return documentService.getDocuments(params);
    }
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectService.getProjects()
  });

  const { data: docTypes = [] } = useQuery({
    queryKey: ['docTypes'],
    queryFn: () => documentService.getDocumentTypes()
  });

  const uploadableDocTypes = docTypes.filter((type) => !isUploadRestrictedDocumentType(type.type_name));

  // Mutations
  const createMutation = useMutation({
    mutationFn: documentService.createDocument,
    onSuccess: () => {
      message.success('Tải lên tài liệu mới thành công');
      setIsModalVisible(false);
      form.resetFields();
      setFileList([]);
      queryClient.invalidateQueries(['documents']);
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Lỗi khi tải lên tài liệu');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => documentService.updateDocument(id, data),
    onSuccess: () => {
      message.success('Cập nhật tài liệu thành công');
      setIsModalVisible(false);
      form.resetFields();
      setFileList([]);
      setEditingDocument(null);
      queryClient.invalidateQueries(['documents']);
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Lỗi khi cập nhật tài liệu');
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => documentService.updateDocumentStatus(id, status),
    onSuccess: () => {
      message.success('Cập nhật trạng thái tài liệu thành công');
      queryClient.invalidateQueries(['documents']);
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Không thể cập nhật trạng thái tài liệu');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: documentService.deleteDocument,
    onSuccess: () => {
      message.success('Xóa tài liệu thành công');
      queryClient.invalidateQueries(['documents']);
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Không thể xóa tài liệu này');
    }
  });

  // Handlers
  const handleOpenModal = (doc = null) => {
    setEditingDocument(doc);
    if (doc) {
      form.setFieldsValue({
        document_name: doc.document_name,
        project_id: doc.project_id,
        document_type_id: doc.document_type_id,
        status: doc.status || 'ACTIVE',
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ status: 'ACTIVE' });
    }
    setFileList([]);
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setEditingDocument(null);
    form.resetFields();
    setFileList([]);
  };

  const handleUploadChange = ({ fileList }) => {
    setFileList(fileList);
  };

  const onFinish = (values) => {
    if (!editingDocument && fileList.length === 0) {
      message.error('Vui lòng chọn tệp đính kèm tải lên');
      return;
    }

    const formData = new FormData();
    formData.append('document_name', values.document_name);
    formData.append('project_id', values.project_id);
    formData.append('document_type_id', values.document_type_id);
    formData.append('status', values.status || 'ACTIVE');

    if (editingDocument) {
      if (fileList.length > 0 && fileList[0].originFileObj) {
        formData.append('file', fileList[0].originFileObj);
      }
      formData.append('_method', 'PUT'); // Spoof PUT request for Laravel multipart/form-data
      updateMutation.mutate({ id: editingDocument.id, data: formData });
    } else {
      fileList.forEach(file => {
        if (file.originFileObj) {
          formData.append('files[]', file.originFileObj);
        }
      });
      createMutation.mutate(formData);
    }
  };

  // Helper: File Icon Renderer
  const getFileIcon = (url) => {
    if (!url) return <FileUnknownOutlined style={{ color: '#bfbfbf', fontSize: 18 }} />;
    const ext = url.split('.').pop().toLowerCase();
    if (ext === 'pdf') return <FilePdfOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />;
    if (['doc', 'docx'].includes(ext)) return <FileWordOutlined style={{ color: '#1890ff', fontSize: 18 }} />;
    if (['xls', 'xlsx'].includes(ext)) return <FileExcelOutlined style={{ color: '#52c41a', fontSize: 18 }} />;
    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return <FileImageOutlined style={{ color: '#fa8c16', fontSize: 18 }} />;
    return <FileUnknownOutlined style={{ color: '#8c8c8c', fontSize: 18 }} />;
  };

  const handleOpenFile = async (document) => {
    try {
      await documentService.openDocumentFile(document);
    } catch (error) {
      message.error(error.response?.data?.message || error.message || 'Không thể mở tệp tài liệu');
    }
  };

  // Table Columns
  const columns = [
    {
      title: 'Tên tài liệu',
      dataIndex: 'document_name',
      key: 'document_name',
      width: 330,
      render: (text, record) => (
        <Space size="middle" style={{ minWidth: 0 }}>
          {getFileIcon(record.file_url)}
          <a
            href={record.download_url || record.file_url}
            onClick={(event) => { event.preventDefault(); handleOpenFile(record); }}
            style={{ fontWeight: 600, color: '#2f6fdb', whiteSpace: 'normal', lineHeight: 1.5 }}
          >
            {text}
          </a>
        </Space>
      )
    },
    {
      title: 'Dự án',
      dataIndex: ['project', 'name'],
      key: 'project_name',
      width: 250,
      align: 'center',
      render: (name) => <Text style={{ color: '#595959', fontWeight: 500, display: 'block', whiteSpace: 'normal', lineHeight: 1.5, textAlign: 'center' }}>{name || '---'}</Text>
    },
    {
      title: 'Phân loại',
      dataIndex: ['document_type', 'type_name'],
      key: 'type_name',
      width: 170,
      align: 'center',
      render: (typeName) => <Tag color="blue" style={{ fontWeight: 500, marginRight: 0 }}>{typeName}</Tag>
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 190,
      align: 'center',
      render: (_, record) => {
        const currentStatus = record.status || 'ACTIVE';
        const statusMenuItems = DOCUMENT_STATUS_OPTIONS.map((status) => ({
          key: status.value,
          label: <StatusPill status={status.value} />,
        }));

        return (
          <Dropdown
            menu={{
              items: statusMenuItems,
              onClick: ({ key }) => updateStatusMutation.mutate({ id: record.id, status: key }),
            }}
            trigger={['click']}
            placement="bottom"
          >
            <button
              type="button"
              className="document-status-trigger"
              disabled={updateStatusMutation.isLoading}
            >
              <StatusPill status={currentStatus} />
            </button>
          </Dropdown>
        );
      }
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 150,
      align: 'center',
      render: (_, record) => {
        const deleteProtected = isDeleteProtectedDocument(record);

        return (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Space size={8}>
              <ActionIconButton
                tooltip="Xem / Tải xuống tệp"
                icon={<DownloadOutlined style={{ fontSize: 16, fontWeight: 700 }} />}
                color="#3b82f6"
                onClick={() => handleOpenFile(record)}
              />

              <ActionIconButton
                tooltip="Chỉnh sửa thông tin"
                icon={<EditOutlined style={{ fontSize: 16 }} />}
                color="#d97706"
                onClick={() => handleOpenModal(record)}
              />

              {deleteProtected ? (
                <Tooltip title="Không thể xóa tài liệu thuộc hợp đồng hoặc phụ lục hợp đồng">
                  <Button
                    type="text"
                    icon={<DeleteOutlined style={{ fontSize: 16 }} />}
                    disabled
                    style={{
                      padding: 0,
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      border: '1px solid transparent',
                    }}
                  />
                </Tooltip>
              ) : (
                <Popconfirm
                  title="Bạn chắc chắn muốn xóa tài liệu này?"
                  description="Thao tác này sẽ xóa tài liệu khỏi hệ thống."
                  okText="Có"
                  cancelText="Không"
                  placement="left"
                  onConfirm={() => deleteMutation.mutate(record.id)}
                >
                  <Button
                    type="text"
                    icon={<DeleteOutlined style={{ fontSize: 16 }} />}
                    danger
                    style={{
                      padding: 0,
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      border: '1px solid transparent',
                    }}
                  />
                </Popconfirm>
              )}
            </Space>
          </div>
        );
      }
    }
  ];

  return (
    <div style={{ padding: '0px' }}>
      <style>{`
        .document-status-trigger {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          border: 0;
          outline: 0;
          background: transparent;
          box-shadow: none;
          cursor: pointer;
        }
        .document-status-trigger:hover {
          opacity: 0.86;
        }
        .document-status-trigger:focus,
        .document-status-trigger:active {
          border: 0;
          outline: 0;
          box-shadow: none;
        }
        .document-status-trigger:disabled {
          cursor: wait;
          opacity: 0.72;
        }
        .document-status-select .ant-select-selector {
          height: 34px !important;
          border-radius: 999px !important;
          border: 0 !important;
          outline: none !important;
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .document-status-select.ant-select-focused .ant-select-selector,
        .document-status-select.ant-select-open .ant-select-selector,
        .document-status-select .ant-select-selector:focus,
        .document-status-select .ant-select-selector:active {
          border: 0 !important;
          outline: none !important;
          box-shadow: none !important;
        }
        .document-status-select:hover .ant-select-selector {
          border: 0 !important;
          background: transparent !important;
          opacity: 0.86;
        }
        .document-status-select .ant-select-selection-item {
          display: flex;
          align-items: center;
          justify-content: center;
          padding-inline-end: 0 !important;
        }
        .document-status-dropdown .ant-select-item-option-content {
          display: flex;
          justify-content: center;
        }
      `}</style>

      {/* Breadcrumb */}
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item>Quản lý dự án xây dựng</Breadcrumb.Item>
        <Breadcrumb.Item>Quản lý hồ sơ tài liệu</Breadcrumb.Item>
      </Breadcrumb>

      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 800, color: '#1f1f1f' }}>
            Quản lý hồ sơ tài liệu
          </Title>
          <Text type="secondary" style={{ fontSize: '13px', fontWeight: 500 }}>
            Hệ thống lưu trữ tập trung, số hóa hồ sơ thiết kế, giấy phép và các văn bản cốt lõi của dự án.
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleOpenModal()}
          style={{ backgroundColor: '#1890ff', borderColor: '#1890ff', borderRadius: 4, height: 40, fontWeight: 600 }}
        >
          Tải lên tài liệu mới
        </Button>
      </div>

      {/* Search and Filters */}
      <Card style={{ marginBottom: 24, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }} bodyStyle={{ padding: '20px' }}>
        <Row gutter={16}>
          <Col span={8}>
            <div style={{ fontWeight: 600, marginBottom: 8, color: '#262626' }}>Tìm kiếm tên tài liệu</div>
            <Input
              placeholder="Nhập tên tài liệu cần tìm..."
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="large"
              allowClear
            />
          </Col>
          <Col span={8}>
            <div style={{ fontWeight: 600, marginBottom: 8, color: '#262626' }}>Dự án</div>
            <Select
              placeholder="Chọn dự án cần xem..."
              style={{ width: '100%' }}
              value={selectedProject}
              onChange={(value) => setSelectedProject(value)}
              size="large"
              allowClear
            >
              {projects.map((proj) => (
                <Option key={proj.id} value={proj.id}>
                  {proj.name} ({proj.project_code})
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={8}>
            <div style={{ fontWeight: 600, marginBottom: 8, color: '#262626' }}>Loại hồ sơ</div>
            <Select
              placeholder="Chọn loại tài liệu..."
              style={{ width: '100%' }}
              value={selectedType}
              onChange={(value) => setSelectedType(value)}
              size="large"
              allowClear
            >
              {docTypes.map((type) => (
                <Option key={type.id} value={type.id}>
                  {type.type_name}
                </Option>
              ))}
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Main Table */}
      <Card style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }} bodyStyle={{ padding: 0 }}>
        <Table
          dataSource={documents}
          columns={columns}
          rowKey="id"
          loading={loadingDocs}
          bordered
          tableLayout="fixed"
          scroll={{ x: 1220 }}
          pagination={{ pageSize: 8, showSizeChanger: false }}
          className="contract-table"
        />
      </Card>

      {/* Upload/Edit Modal */}
      <Modal
        title={
          <div style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: 12, fontWeight: 700, fontSize: 16 }}>
            {editingDocument ? 'Chỉnh sửa thông tin tài liệu' : 'Tải lên tài liệu mới'}
          </div>
        }
        open={isModalVisible}
        onCancel={handleCloseModal}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          style={{ marginTop: 20 }}
        >
          <Form.Item
            name="document_name"
            label="Tên gọi tài liệu"
            rules={[{ required: true, message: 'Nhập tên hiển thị cho tài liệu' }]}
          >
            <Input placeholder="Ví dụ: Bản vẽ kỹ thuật kết cấu phần móng, Giấy phép xây dựng..." size="large" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="project_id"
                label="Dự án đính kèm"
                rules={[{ required: true, message: 'Chọn dự án liên kết' }]}
              >
                <Select placeholder="Chọn dự án..." size="large">
                  {projects.map((proj) => (
                    <Option key={proj.id} value={proj.id} disabled={proj.status === 'COMPLETED'}>
                      {proj.name} ({proj.project_code}) {proj.status === 'COMPLETED' ? '(Đã hoàn thành)' : ''}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="document_type_id"
                label="Loại tài liệu"
                rules={[{ required: true, message: 'Chọn phân loại tài liệu' }]}
                tooltip={editingDocument && isDeleteProtectedDocument(editingDocument)
                  ? 'Không thể đổi phân loại của tài liệu thuộc hợp đồng hoặc phụ lục hợp đồng'
                  : undefined}
              >
                <Select
                  placeholder="Chọn phân loại..."
                  size="large"
                  disabled={editingDocument && isDeleteProtectedDocument(editingDocument)}
                >
                  {(editingDocument && isDeleteProtectedDocument(editingDocument) ? docTypes : uploadableDocTypes).map((type) => (
                    <Option key={type.id} value={type.id}>
                      {type.type_name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="status"
            label="Trạng thái tài liệu"
            rules={[{ required: true, message: 'Chọn trạng thái tài liệu' }]}
          >
            <Select
              placeholder="Chọn trạng thái..."
              size="large"
              className="document-status-select"
              popupClassName="document-status-dropdown"
              optionLabelProp="label"
            >
              {DOCUMENT_STATUS_OPTIONS.map((status) => (
                <Option key={status.value} value={status.value} label={<StatusPill status={status.value} />}>
                  <StatusPill status={status.value} />
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label={editingDocument ? "Thay thế tệp tin mới (tùy chọn)" : "Chọn tệp tin tải lên"}>
            <Upload
              beforeUpload={() => false}
              maxCount={editingDocument ? 1 : undefined}
              multiple={!editingDocument}
              fileList={fileList}
              onChange={handleUploadChange}
            >
              <Button icon={<UploadOutlined />} size="large" style={{ borderRadius: 4 }}>
                Chọn file đính kèm
              </Button>
            </Upload>
            <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
              Hỗ trợ tệp định dạng PDF, Word, Excel, Hình ảnh (tối đa 20MB)
            </Text>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: 28 }}>
            <Space>
              <Button onClick={handleCloseModal} size="large" style={{ borderRadius: 4 }}>
                Hủy bỏ
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={createMutation.isLoading || updateMutation.isLoading}
                size="large"
                style={{ backgroundColor: '#1890ff', borderColor: '#1890ff', borderRadius: 4, fontWeight: 600 }}
              >
                {editingDocument ? 'Cập nhật' : 'Tải lên & Kích hoạt'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DocumentManagement;
