import React, { useState } from 'react';
import { 
  Table, Button, Input, Select, Typography, Tag, 
  Modal, Form, message, Popconfirm, Avatar, Space
} from 'antd';
import { 
  SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined 
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import partnerService from '../../services/partnerService';

const { Title, Text } = Typography;
const { Option } = Select;

const CustomerManagement = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState(null);
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  // Queries
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers', searchText, statusFilter],
    queryFn: () => partnerService.getCustomers({ search: searchText, status: statusFilter })
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data) => partnerService.createCustomer(data),
    onSuccess: () => {
      message.success('Thêm khách hàng thành công');
      setIsModalVisible(false);
      queryClient.invalidateQueries(['customers']);
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => partnerService.updateCustomer(id, data),
    onSuccess: () => {
      message.success('Cập nhật khách hàng thành công');
      setIsModalVisible(false);
      queryClient.invalidateQueries(['customers']);
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => partnerService.deleteCustomer(id),
    onSuccess: () => {
      message.success('Đã vô hiệu hóa khách hàng thành công');
      queryClient.invalidateQueries(['customers']);
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  });

  // Handlers
  const openModal = (customer = null) => {
    setEditingCustomer(customer);
    if (customer) {
      const mappedData = { 
        ...customer,
        name: customer.full_name 
      };
      form.setFieldsValue(mappedData);
    } else {
      form.resetFields();
      form.setFieldsValue({ status: 1 });
    }
    setIsModalVisible(true);
  };

  const handleSubmit = (values) => {
    const dataToSend = { 
      ...values,
      full_name: values.name 
    };
    delete dataToSend.name;

    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data: dataToSend });
    } else {
      createMutation.mutate(dataToSend);
    }
  };

  // Utils
  const getAvatarInitials = (name) => {
    if (!name) return 'KH';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const renderStatus = (status) => {
    const isError = status === 0;
    return (
      <Tag 
        color={isError ? 'warning' : 'success'} 
        style={{ borderRadius: 12, padding: '2px 10px', fontWeight: 500 }}
      >
        <span style={{ 
          display: 'inline-block', width: 6, height: 6, borderRadius: '50%', 
          background: isError ? '#faad14' : '#52c41a', marginRight: 6 
        }}></span>
        {isError ? 'Vô hiệu hóa' : 'Đang hoạt động'}
      </Tag>
    );
  };

  // Table Columns
  const columns = [
    {
      title: 'TÊN KHÁCH HÀNG',
      key: 'name',
      width: 360,
      render: (text, record) => {
        const customerName = record.full_name;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <Avatar 
              style={{ 
                backgroundColor: '#e6f4ff', 
                color: '#1677ff',
                fontWeight: 600,
                verticalAlign: 'middle' 
              }} 
              size={40}
              >
                {getAvatarInitials(customerName)}
              </Avatar>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <Text strong style={{ fontSize: 14, color: '#1f1f1f', whiteSpace: 'normal', lineHeight: 1.4 }}>{customerName}</Text>
              <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'normal', lineHeight: 1.4 }}>{record.address || 'Chưa cập nhật địa chỉ'}</Text>
            </div>
          </div>
        );
      }
    },
    {
      title: 'MÃ KHÁCH HÀNG',
      dataIndex: 'customer_code',
      key: 'customer_code',
      width: 150,
      render: text => <Text style={{ color: '#1f1f1f', fontWeight: 500, whiteSpace: 'nowrap' }}>{text}</Text>
    },
    {
      title: 'EMAIL',
      dataIndex: 'email',
      key: 'email',
      width: 240,
      render: text => <Text style={{ color: '#1f1f1f', fontWeight: 500, whiteSpace: 'nowrap', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>{text || 'N/A'}</Text>
    },
    {
      title: 'SỐ ĐIỆN THOẠI',
      dataIndex: 'phone',
      key: 'phone',
      width: 160,
      render: text => <Text style={{ color: '#1f1f1f', fontWeight: 500, whiteSpace: 'nowrap' }}>{text || 'N/A'}</Text>
    },
    {
      title: 'TRẠNG THÁI',
      dataIndex: 'status',
      key: 'status',
      width: 160,
      align: 'center',
      render: renderStatus
    },
    {
      title: 'THAO TÁC',
      key: 'action',
      width: 120,
      align: 'right',
      render: (_, record) => (
        <Space size={6}>
          <Button 
            className="action-btn edit-btn"
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => openModal(record)} 
            style={{ width: 34, height: 34, borderRadius: 8, padding: 0 }}
          />
          <Popconfirm
            title="Vô hiệu hóa khách hàng"
            description="Bạn có chắc chắn muốn vô hiệu hóa tài khoản khách hàng này?"
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
                style={{ width: 34, height: 34, borderRadius: 8, padding: 0 }}
              />
            </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ width: '100%' }}>
      <style>{`
        .customer-table .ant-table-thead > tr > th {
          font-weight: 700;
          color: #1f1f1f;
          background: #fafafa;
          white-space: nowrap;
        }
        .customer-table .ant-table-tbody > tr:hover > td {
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
        .search-input input::placeholder {
          color: #1f1f1f !important;
          font-weight: 600 !important;
          opacity: 1 !important;
        }
        .filter-select .ant-select-selection-placeholder {
          color: #1f1f1f !important;
          font-weight: 600 !important;
          opacity: 1 !important;
        }
        .filter-select.ant-select:hover .ant-select-selector,
        .search-input:hover, .search-input:focus {
          border-color: #c25f16 !important;
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#1f1f1f', fontWeight: 800 }}>Quản lý khách hàng</Title>
          <Text type="secondary" style={{ fontSize: 14, fontWeight: 500 }}>
            Quản lý thông tin tài khoản khách hàng và chủ đầu tư các dự án.
          </Text>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          size="large"
          onClick={() => openModal()}
          style={{ backgroundColor: '#c25f16', borderColor: '#c25f16', borderRadius: 4, fontWeight: 500 }}
        >
          Thêm khách hàng mới
        </Button>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: 8, padding: 16, marginBottom: 16, marginTop: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <Input 
            className="search-input"
            placeholder="Tìm kiếm theo tên khách hàng, email, số điện thoại..." 
            prefix={<SearchOutlined style={{ color: '#595959' }} />} 
            style={{ width: 400, backgroundColor: '#f5f5f5', border: '1px solid #d9d9d9', borderRadius: 4 }}
            size="large"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
          />
          <Select
            className="filter-select"
            placeholder="Trạng thái"
            style={{ width: 200 }}
            size="large"
            allowClear
            value={statusFilter}
            onChange={value => setStatusFilter(value)}
          >
            <>
              <Option value={1}>Đang hoạt động</Option>
              <Option value={0}>Vô hiệu hóa</Option>
            </>
          </Select>
        </div>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
        <Table 
          className="customer-table"
          columns={columns} 
          dataSource={customers} 
          rowKey="id" 
          loading={isLoading}
          tableLayout="fixed"
          scroll={{ x: 1180 }}
          pagination={{
            showTotal: (total, range) => <span style={{ fontWeight: 500 }}>Hiển thị {range[0]}-{range[1]} trong số {total} khách hàng</span>,
            pageSize: 10,
            showSizeChanger: false
          }}
        />
      </div>

      {/* Modal */}
      <Modal
        title={editingCustomer ? "Chỉnh sửa khách hàng" : "Thêm khách hàng mới"}
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
            label="Tên khách hàng"
            rules={[{ required: true, message: 'Vui lòng nhập tên khách hàng' }]}
          >
            <Input placeholder="Nhập tên khách hàng" size="large" />
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
            <Input placeholder="Nhập email Gmail" size="large" disabled={!!editingCustomer} />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Số điện thoại"
            rules={[{ required: true, message: 'Vui lòng nhập số điện thoại' }]}
          >
            <Input placeholder="Nhập số điện thoại" size="large" />
          </Form.Item>

          <Form.Item
            name="address"
            label="Địa chỉ"
            rules={[
              { 
                required: !editingCustomer, 
                message: 'Vui lòng nhập địa chỉ' 
              },
              {
                min: 5,
                message: 'Địa chỉ phải có ít nhất 5 ký tự'
              }
            ]}
          >
            <Input.TextArea placeholder="Nhập địa chỉ" rows={3} size="large" />
          </Form.Item>

          <Form.Item
            name="status"
            label="Trạng thái"
            rules={[{ required: true }]}
          >
            <Select size="large">
              <>
                <Option value={1}>Đang hoạt động</Option>
                <Option value={0}>Vô hiệu hóa</Option>
              </>
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button onClick={() => setIsModalVisible(false)} style={{ marginRight: 8 }}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending} style={{ backgroundColor: '#c25f16', borderColor: '#c25f16' }}>
              {editingCustomer ? 'Lưu thay đổi' : 'Thêm mới'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CustomerManagement;
