import React, { useState } from 'react';
import {
  Table, Button, Input, Select, Typography, Tag,
  Modal, Form, message, Popconfirm, Space, Progress, DatePicker
} from 'antd';
import {
  SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, SettingOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import projectService from '../../services/projectService';
import projectCategoryService from '../../services/projectCategoryService';
import partnerService from '../../services/partnerService';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const formatCurrency = (value) => {
  if (!value) return '0 VNĐ';
  const numVal = Number(value);
  return new Intl.NumberFormat('vi-VN').format(numVal) + ' VNĐ';
};

const ProjectManagement = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const [searchText, setSearchText] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  // Queries
  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['projects', searchText],
    queryFn: () => projectService.getProjects({ search: searchText })
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['projectCategories'],
    queryFn: projectCategoryService.getCategories
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => partnerService.getCustomers({})
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: projectService.createProject,
    onSuccess: () => {
      message.success('Thêm dự án thành công');
      setIsModalVisible(false);
      queryClient.invalidateQueries(['projects']);
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => projectService.updateProject(id, data),
    onSuccess: () => {
      message.success('Cập nhật dự án thành công');
      setIsModalVisible(false);
      queryClient.invalidateQueries(['projects']);
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: projectService.deleteProject,
    onSuccess: () => {
      message.success('Đã tạm ngưng dự án');
      queryClient.invalidateQueries(['projects']);
    },
    onError: () => {
      message.error('Có lỗi xảy ra');
    }
  });

  // Handlers
  const openModal = (project = null) => {
    setEditingProject(project);
    if (project) {
      form.setFieldsValue({
        ...project,
        start_date: project.start_date ? dayjs(project.start_date) : null,
        expected_end_date: project.expected_end_date ? dayjs(project.expected_end_date) : null,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        status: 'PENDING',
      });
    }
    setIsModalVisible(true);
  };

  const handleSubmit = (values) => {
    const dataToSend = {
      ...values,
      start_date: values.start_date ? values.start_date.format('YYYY-MM-DD') : null,
      expected_end_date: values.expected_end_date ? values.expected_end_date.format('YYYY-MM-DD') : null,
    };

    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data: dataToSend });
    } else {
      createMutation.mutate(dataToSend);
    }
  };

  // Render Status
  const renderStatus = (status, expectedEndDate, progress) => {
    // Logic cho "Trễ tiến độ"
    if (progress < 100 && expectedEndDate && dayjs().isAfter(dayjs(expectedEndDate))) {
      return (
        <Tag color="error" style={{ borderRadius: 12, padding: '2px 10px', fontWeight: 500 }}>
          Trễ tiến độ
        </Tag>
      );
    }

    const statusConfig = {
      DRAFT: { text: 'Bản nháp', color: 'default' },
      PENDING: { text: 'Chuẩn bị', color: 'warning' },
      PROCESSING: { text: 'Đang thực hiện', color: 'success' },
      REVISION: { text: 'Đang sửa đổi', color: 'processing' },
      COMPLETED: { text: 'Đã hoàn thành', color: 'success' },
      ON_HOLD: { text: 'Tạm ngưng', color: 'error' }
    };

    const config = statusConfig[status] || statusConfig.DRAFT;

    return (
      <Tag color={config.color} style={{ borderRadius: 12, padding: '2px 10px', fontWeight: 500 }}>
        {config.text}
      </Tag>
    );
  };

  // Table Columns
  const columns = [
    {
      title: 'Tên dự án',
      dataIndex: 'name',
      key: 'name',
      width: 320,
      render: (text, record) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Text strong style={{ color: '#1f1f1f', fontSize: 14, whiteSpace: 'normal', lineHeight: 1.4 }}>{text}</Text>
          <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{record.project_code}</Text>
        </div>
      )
    },
    {
      title: 'Tiến độ',
      dataIndex: 'progress',
      key: 'progress',
      width: 180,
      align: 'center',
      render: (progress) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Progress
            percent={progress || 0}
            showInfo={false}
            size="small"
            strokeColor={progress === 100 ? '#52c41a' : '#1677ff'}
            style={{ marginBottom: 0, width: 60 }}
          />
          <Text strong style={{ color: '#1f1f1f' }}>{progress || 0}%</Text>
        </div>
      )
    },
    {
      title: 'Ngân sách',
      dataIndex: 'budget',
      key: 'budget',
      width: 180,
      align: 'center',
      render: (budget) => <Text style={{ color: '#1f1f1f', fontWeight: 500, whiteSpace: 'nowrap' }}>{formatCurrency(budget)}</Text>
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 180,
      align: 'center',
      render: (_, record) => renderStatus(record.status, record.expected_end_date, record.progress)
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 260,
      align: 'center',
      render: (_, record) => (
        <Space size={8}>
          <Button
            size="small"
            className="action-btn edit-btn"
            icon={<EditOutlined />}
            onClick={() => openModal(record)}
            style={{ borderRadius: 4 }}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Tạm ngưng dự án"
            description="Bạn có chắc chắn muốn tạm ngưng dự án này?"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Đồng ý"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button
              size="small"
              className="action-btn delete-btn"
              danger
              icon={<DeleteOutlined />}
              style={{ borderRadius: 4 }}
            >
              Xóa
            </Button>
          </Popconfirm>
          <Button
            size="small"
            type="primary"
            icon={<SettingOutlined />}
            style={{ backgroundColor: '#c25f16', borderColor: '#c25f16', borderRadius: 4, fontWeight: 500 }}
            onClick={() => navigate(`/projects/${record.id}`)}
          >
            Quản lý
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div style={{ width: '100%' }}>
      <style>{`
        .project-table .ant-table-thead > tr > th {
          font-weight: 700;
          color: #1f1f1f;
          background-color: #fafafa;
          white-space: nowrap;
        }
        .project-table .ant-table-tbody > tr:hover > td {
          background-color: #fafafa !important;
        }
        .search-input::placeholder,
        .search-input input::placeholder {
          color: #1f1f1f !important;
          font-weight: 600 !important;
          opacity: 1 !important;
        }
        .search-input:hover, .search-input:focus {
          border-color: #c25f16 !important;
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0, color: '#1f1f1f', fontWeight: 800 }}>Danh sách dự án</Title>

        <div style={{ display: 'flex', gap: 16 }}>
          <Input
            className="search-input"
            placeholder="Tìm kiếm dự án..."
            prefix={<SearchOutlined style={{ color: '#595959' }} />}
            style={{ width: 300, backgroundColor: '#fff', border: '1px solid #d9d9d9', borderRadius: 4 }}
            size="large"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={() => openModal()}
            style={{ backgroundColor: '#c25f16', borderColor: '#c25f16', borderRadius: 4, fontWeight: 500 }}
          >
            Thêm dự án mới
          </Button>
        </div>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
        <Table
          className="project-table"
          columns={columns}
          dataSource={projects}
          rowKey="id"
          loading={loadingProjects}
          tableLayout="fixed"
          scroll={{ x: 1120 }}
          pagination={{
            showTotal: (total, range) => <span style={{ fontWeight: 500 }}>Hiển thị {range[0]}-{range[1]} trong số {total} dự án</span>,
            pageSize: 10,
            showSizeChanger: false
          }}
        />
      </div>

      {/* Modal */}
      <Modal
        title={editingProject ? 'Chỉnh sửa dự án' : 'Thêm dự án mới'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        destroyOnClose
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: 24 }}
        >
          <Form.Item
            name="name"
            label="Tên dự án"
            rules={[{ required: true, message: 'Vui lòng nhập tên dự án' }]}
          >
            <Input placeholder="Ví dụ: Tòa nhà văn phòng APEX" size="large" />
          </Form.Item>

          <Form.Item
            name="address"
            label="Địa chỉ dự án"
            rules={[{ required: true, message: 'Vui lòng nhập địa chỉ dự án' }]}
          >
            <Input placeholder="Ví dụ: 123 Đường ABC, Quận 1, TP.HCM" size="large" />
          </Form.Item>

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="category_id"
              label="Danh mục dự án"
              rules={[{ required: true, message: 'Vui lòng chọn danh mục' }]}
              style={{ flex: 1 }}
            >
              <Select size="large" placeholder="Chọn danh mục">
                {categories.map(cat => (
                  <Option key={cat.id} value={cat.id}>{cat.name}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="customer_id"
              label="Khách hàng (Chủ đầu tư)"
              rules={[{ required: true, message: 'Vui lòng chọn khách hàng' }]}
              style={{ flex: 1 }}
            >
              <Select size="large" placeholder="Chọn khách hàng">
                {customers.map(cus => (
                  <Option key={cus.id} value={cus.id}>{cus.full_name}</Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="start_date"
              label="Ngày bắt đầu"
              style={{ flex: 1 }}
            >
              <DatePicker size="large" style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày" />
            </Form.Item>

            <Form.Item
              name="expected_end_date"
              label="Ngày dự kiến kết thúc"
              style={{ flex: 1 }}
            >
              <DatePicker size="large" style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày" />
            </Form.Item>
          </div>

          <Form.Item
            name="status"
            label="Trạng thái hiện tại"
            rules={[{ required: true }]}
          >
            <Select size="large">
              <Option value="PENDING">Chuẩn bị</Option>
              <Option value="PROCESSING">Đang thực hiện</Option>
              <Option value="COMPLETED">Đã hoàn thành</Option>
              <Option value="ON_HOLD">Tạm ngưng</Option>
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: 16 }}>
            <Button onClick={() => setIsModalVisible(false)} style={{ marginRight: 8 }}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending} style={{ backgroundColor: '#c25f16' }}>
              {editingProject ? 'Lưu thay đổi' : 'Thêm mới'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProjectManagement;
