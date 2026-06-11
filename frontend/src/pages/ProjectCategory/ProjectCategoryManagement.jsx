import React, { useState } from 'react';
import { 
  Table, Button, Typography, Tag, 
  Modal, Form, Input, Select, message, Popconfirm, Space 
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import projectCategoryService from '../../services/projectCategoryService';

const { Title, Text } = Typography;
const { Option } = Select;

const ProjectCategoryManagement = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  // Queries
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['projectCategories'],
    queryFn: projectCategoryService.getCategories
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: projectCategoryService.createCategory,
    onSuccess: () => {
      message.success('Thêm danh mục thành công');
      setIsModalVisible(false);
      queryClient.invalidateQueries(['projectCategories']);
    },
    onError: () => {
      message.error('Có lỗi xảy ra khi thêm mới');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => projectCategoryService.updateCategory(id, data),
    onSuccess: () => {
      message.success('Cập nhật danh mục thành công');
      setIsModalVisible(false);
      queryClient.invalidateQueries(['projectCategories']);
    },
    onError: () => {
      message.error('Có lỗi xảy ra khi cập nhật');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: projectCategoryService.deleteCategory,
    onSuccess: () => {
      message.success('Đã cập nhật trạng thái danh mục');
      queryClient.invalidateQueries(['projectCategories']);
    },
    onError: () => {
      message.error('Có lỗi xảy ra');
    }
  });

  // Handlers
  const openModal = (category = null) => {
    setEditingCategory(category);
    if (category) {
      form.setFieldsValue(category);
    } else {
      form.resetFields();
      form.setFieldsValue({ status: 1 });
    }
    setIsModalVisible(true);
  };

  const handleSubmit = (values) => {
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  // Table Columns
  const columns = [
    {
      title: 'STT',
      key: 'index',
      width: 80,
      render: (text, record, index) => <Text style={{ fontWeight: 500, color: '#595959' }}>{index + 1}</Text>
    },
    {
      title: 'Tên danh mục',
      dataIndex: 'name',
      key: 'name',
      render: text => <Text style={{ fontWeight: 500, color: '#1f1f1f', fontSize: 14 }}>{text}</Text>
    },
    {
      title: 'Số lượng dự án',
      dataIndex: 'projects_count',
      key: 'projects_count',
      width: 150,
      render: text => <Text style={{ fontWeight: 500, color: '#595959' }}>{text || 0}</Text>
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status) => {
        const isActive = status === 1;
        return (
          <Tag 
            color={isActive ? 'success' : 'warning'} 
            style={{ borderRadius: 12, padding: '2px 10px', fontWeight: 500 }}
          >
            <span style={{ 
              display: 'inline-block', width: 6, height: 6, borderRadius: '50%', 
              background: isActive ? '#52c41a' : '#faad14', marginRight: 6 
            }}></span>
            {isActive ? 'Đang hoạt động' : 'Tạm ngưng'}
          </Tag>
        );
      }
    },
    {
      title: 'Thao tác',
      key: 'action',
      align: 'right',
      width: 120,
      render: (_, record) => (
        <Space size="middle">
          <Button 
            className="action-btn edit-btn"
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => openModal(record)} 
          />
          <Popconfirm
            title="Tạm ngưng danh mục"
            description="Bạn có chắc chắn muốn chuyển danh mục này sang trạng thái Tạm ngưng?"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Đồng ý"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button 
              className="action-btn delete-btn"
              type="text" 
              danger 
              icon={<DeleteOutlined />} 
            />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <style>{`
        .category-table .ant-table-thead > tr > th {
          font-weight: 700;
          color: '#1f1f1f';
          background-color: #fafafa;
        }
        .category-table .ant-table-tbody > tr:hover > td {
          background-color: #fafafa !important;
        }
        .action-btn {
          color: #8c8c8c;
          transition: all 0.3s;
        }
        .action-btn.edit-btn:hover {
          color: #1677ff;
          background-color: #e6f4ff;
        }
        .action-btn.delete-btn:hover {
          color: #ff4d4f;
          background-color: #fff2f0;
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#1f1f1f', fontWeight: 800 }}>Quản lý danh mục dự án</Title>
          <Text type="secondary" style={{ fontSize: 14, fontWeight: 500 }}>
            Quản lý và phân loại các loại hình công trình xây dựng
          </Text>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          size="large"
          onClick={() => openModal()}
          style={{ backgroundColor: '#c25f16', borderColor: '#c25f16', borderRadius: 4, fontWeight: 500 }}
        >
          Thêm danh mục
        </Button>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
        <Table 
          className="category-table"
          columns={columns} 
          dataSource={categories} 
          rowKey="id" 
          loading={isLoading}
          pagination={false}
        />
      </div>

      {/* Modal */}
      <Modal
        title={editingCategory ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: 24 }}
        >
          <Form.Item
            name="name"
            label="Tên danh mục"
            rules={[{ required: true, message: 'Vui lòng nhập tên danh mục' }]}
          >
            <Input placeholder="Ví dụ: Công trình dân dụng..." size="large" />
          </Form.Item>

          <Form.Item
            name="status"
            label="Trạng thái"
            rules={[{ required: true }]}
          >
            <Select size="large">
              <Option value={1}>Đang hoạt động</Option>
              <Option value={0}>Tạm ngưng</Option>
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: 32 }}>
            <Button onClick={() => setIsModalVisible(false)} style={{ marginRight: 8 }}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending} style={{ backgroundColor: '#c25f16' }}>
              {editingCategory ? 'Lưu thay đổi' : 'Thêm mới'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProjectCategoryManagement;
