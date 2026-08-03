import React, { useState } from 'react';
import {
  Table, Button, Input, Select, Typography, Tag,
  Modal, Form, message, Popconfirm, Avatar, Space
} from 'antd';
import {
  SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import hrService from '../../services/hrService';

const { Title, Text } = Typography;
const { Option } = Select;

const HRManagement = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const [searchText, setSearchText] = useState('');
  const [selectedRole, setSelectedRole] = useState(null);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Fetch Roles
  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: hrService.getRoles
  });

  // Fetch Users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users', searchText, selectedRole],
    queryFn: () => hrService.getUsers({ search: searchText, role_id: selectedRole })
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: hrService.createUser,
    onSuccess: () => {
      message.success('Tạo tài khoản thành công');
      setIsModalVisible(false);
      queryClient.invalidateQueries(['users']);
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => hrService.updateUser(id, data),
    onSuccess: () => {
      message.success('Cập nhật tài khoản thành công');
      setIsModalVisible(false);
      queryClient.invalidateQueries(['users']);
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: hrService.deleteUser,
    onSuccess: (data) => {
      message.success(data?.message || 'Đã thực hiện thao tác thành công');
      queryClient.invalidateQueries(['users']);
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  });

  // Handlers
  const openModal = (user = null) => {
    setEditingUser(user);
    if (user) {
      form.setFieldsValue({
        ...user,
        password: '', // Không hiển thị mật khẩu khi sửa
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ status: 1 });
    }
    setIsModalVisible(true);
  };

  const handleSubmit = (values) => {
    if (editingUser) {
      // Bỏ password nếu trống khi cập nhật
      const dataToUpdate = { ...values };
      if (!dataToUpdate.password) {
        delete dataToUpdate.password;
      }
      updateMutation.mutate({ id: editingUser.id, data: dataToUpdate });
    } else {
      createMutation.mutate(values);
    }
  };

  const getAvatarInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (index) => {
    const colors = ['#1677ff', '#fa8c16', '#52c41a', '#722ed1', '#eb2f96'];
    return colors[index % colors.length];
  };

  // Table Columns
  const columns = [
    {
      title: 'HỌ VÀ TÊN',
      dataIndex: 'full_name',
      key: 'full_name',
      render: (text, record, index) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar
            style={{
              backgroundColor: getAvatarColor(index),
              verticalAlign: 'middle'
            }}
            size={40}
          >
            {getAvatarInitials(text)}
          </Avatar>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Text strong style={{ fontSize: 14, color: '#1f1f1f' }}>{text}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.email}</Text>
          </div>
        </div>
      )
    },
    {
      title: 'VAI TRÒ',
      dataIndex: ['role', 'name'],
      key: 'role',
      render: (text) => <Text style={{ color: '#1f1f1f', fontWeight: 500 }}>{text}</Text>
    },
    {
      title: 'SỐ ĐIỆN THOẠI',
      dataIndex: 'phone',
      key: 'phone',
      render: (text) => <Text style={{ color: '#1f1f1f', fontWeight: 500 }}>{text}</Text>
    },
    {
      title: 'TRẠNG THÁI',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag
          color={status === 1 ? 'success' : 'warning'}
          style={{ borderRadius: 12, padding: '2px 10px', fontWeight: 500 }}
        >
          <span style={{
            display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
            background: status === 1 ? '#52c41a' : '#faad14', marginRight: 6
          }}></span>
          {status === 1 ? 'Đang hoạt động' : 'Vô hiệu hóa'}
        </Tag>
      )
    },
    {
      title: 'THAO TÁC',
      key: 'action',
      align: 'right',
      render: (_, record) => (
        <Space size="middle">
          <Button
            className="action-btn edit-btn"
            type="text"
            icon={<EditOutlined />}
            onClick={() => openModal(record)}
          />
          <Popconfirm
            title="Xóa hoặc vô hiệu hóa tài khoản"
            description="Tài khoản liên kết với dự án/hợp đồng sẽ bị vô hiệu hóa, tài khoản chưa có dự án sẽ bị xóa hoàn toàn. Bạn có đồng ý?"
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
    <div style={{ width: '100%' }}>
      <style>{`
        .hr-table .ant-table-thead > tr > th {
          font-weight: 700;
          color: '#1f1f1f';
        }
        .hr-table .ant-table-tbody > tr:hover > td {
          background-color: #fafafa !important;
          cursor: pointer;
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
        .search-input::placeholder,
        .search-input input::placeholder,
        .search-input .ant-input::placeholder {
          color: #1f1f1f !important;
          font-weight: 600 !important;
          opacity: 1 !important;
        }
        .role-select .ant-select-selection-placeholder,
        .ant-select-selection-placeholder {
          color: #1f1f1f !important;
          font-weight: 600 !important;
          opacity: 1 !important;
        }
        .ant-select-arrow {
          color: #1f1f1f !important;
          font-weight: bold !important;
        }
        .role-select.ant-select:hover .ant-select-selector {
          border-color: #c25f16 !important;
        }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#1f1f1f', fontWeight: 800 }}>Quản lý tài khoản</Title>
          <Text type="secondary" style={{ fontSize: 14, fontWeight: 500 }}>
            Quản lý tài khoản đăng nhập của Khách hàng và Nhà thầu phụ.
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={() => openModal()}
          style={{ backgroundColor: '#c25f16', borderColor: '#c25f16', borderRadius: 4, fontWeight: 500 }}
        >
          Tạo tài khoản mới
        </Button>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: 8, padding: 16, marginBottom: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <Input
            className="search-input"
            placeholder="Tìm kiếm theo tên..."
            prefix={<SearchOutlined style={{ color: '#595959' }} />}
            style={{ width: 300, backgroundColor: '#fff', border: '1px solid #d9d9d9', borderRadius: 4 }}
            size="large"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
          />
          <Select
            className="role-select"
            placeholder="Tất cả vai trò"
            prefix={<SearchOutlined style={{ color: '#595959' }} />}
            style={{ width: 300, backgroundColor: '#fff', border: '1px solid #d9d9d9', borderRadius: 4 }}
            size="large"
            allowClear
            value={selectedRole}
            onChange={value => setSelectedRole(value)}
          >
            {roles.map(role => (
              <Option key={role.id} value={role.id}>{role.name}</Option>
            ))}
          </Select>
        </div>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
        <Table
          className="hr-table"
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={isLoading}
          onRow={(record) => {
            return {
              onClick: () => {
                // Có thể mở modal khi click vào hàng nếu muốn
              },
            };
          }}
          pagination={{
            showTotal: (total, range) => <span style={{ fontWeight: 500 }}>Hiển thị {range[0]}-{range[1]} trên tổng số {total} tài khoản</span>,
            pageSize: 10,
            showSizeChanger: false
          }}
        />
      </div>

      {/* Modal Thêm/Sửa */}
      <Modal
        title={editingUser ? 'Chỉnh sửa tài khoản' : 'Tạo tài khoản mới'}
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
            name="full_name"
            label="Họ và tên"
            rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
          >
            <Input placeholder="Nhập họ và tên" size="large" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Vui lòng nhập email' },
              { type: 'email', message: 'Email không hợp lệ' },
              {
                validator: (_, value) => {
                  if (value) {
                    const hasDiacritics = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/u.test(value);
                    if (hasDiacritics) {
                      return Promise.reject(new Error('Email không được chứa ký tự có dấu'));
                    }
                    if (!value.toLowerCase().endsWith('@gmail.com')) {
                      return Promise.reject(new Error('Email phải có đuôi @gmail.com (ví dụ: @gmail.com)'));
                    }
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <Input placeholder="Nhập email" size="large" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Số điện thoại"
          >
            <Input placeholder="Nhập số điện thoại" size="large" />
          </Form.Item>

          <Form.Item
            name="address"
            label="Địa chỉ"
          >
            <Input.TextArea placeholder="Nhập địa chỉ" rows={2} />
          </Form.Item>

          <Form.Item
            name="role_id"
            label="Vai trò"
            rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
          >
            <Select placeholder="Chọn vai trò" size="large">
              {roles.map(role => (
                <Option key={role.id} value={role.id}>{role.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="password"
            label="Mật khẩu"
            rules={[{ required: !editingUser, message: 'Vui lòng nhập mật khẩu' }]}
          >
            <Input.Password placeholder={editingUser ? 'Để trống nếu không muốn đổi mật khẩu' : 'Nhập mật khẩu'} size="large" />
          </Form.Item>

          <Form.Item
            name="status"
            label="Trạng thái"
            rules={[{ required: true }]}
          >
            <Select size="large">
              <Option value={1}>Đang hoạt động</Option>
              <Option value={0}>Vô hiệu hóa</Option>
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button onClick={() => setIsModalVisible(false)} style={{ marginRight: 8 }}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending} style={{ backgroundColor: '#c25f16' }}>
              {editingUser ? 'Lưu thay đổi' : 'Tạo mới'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default HRManagement;
