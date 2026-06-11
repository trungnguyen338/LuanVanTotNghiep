import React, { useState } from 'react';
import { 
  Table, Button, Input, Select, Typography, Tag, 
  Modal, Form, message, Popconfirm, Avatar, Space, Tabs
} from 'antd';
import { 
  SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined 
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import partnerService from '../../services/partnerService';

const { Title, Text } = Typography;
const { Option } = Select;

const PartnerManagement = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  
  const [activeTab, setActiveTab] = useState('customers');
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState(null);
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);

  // Queries
  const { data: customers = [], isLoading: loadingCustomers } = useQuery({
    queryKey: ['customers', searchText, statusFilter],
    queryFn: () => partnerService.getCustomers({ search: searchText, status: statusFilter }),
    enabled: activeTab === 'customers'
  });

  const { data: subcontractors = [], isLoading: loadingSubcontractors } = useQuery({
    queryKey: ['subcontractors', searchText, statusFilter],
    queryFn: () => partnerService.getSubcontractors({ search: searchText, status: statusFilter }),
    enabled: activeTab === 'subcontractors'
  });

  const { data: suppliers = [], isLoading: loadingSuppliers } = useQuery({
    queryKey: ['suppliers', searchText, statusFilter],
    queryFn: () => partnerService.getSuppliers({ search: searchText, status: statusFilter }),
    enabled: activeTab === 'suppliers'
  });

  // Derived state
  const currentData = activeTab === 'customers' ? customers 
                    : activeTab === 'subcontractors' ? subcontractors 
                    : suppliers;
                    
  const currentLoading = activeTab === 'customers' ? loadingCustomers 
                       : activeTab === 'subcontractors' ? loadingSubcontractors 
                       : loadingSuppliers;

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data) => {
      if (activeTab === 'customers') return partnerService.createCustomer(data);
      if (activeTab === 'subcontractors') return partnerService.createSubcontractor(data);
      return partnerService.createSupplier(data);
    },
    onSuccess: () => {
      message.success('Thêm đối tác thành công');
      setIsModalVisible(false);
      queryClient.invalidateQueries([activeTab]);
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => {
      if (activeTab === 'customers') return partnerService.updateCustomer(id, data);
      if (activeTab === 'subcontractors') return partnerService.updateSubcontractor(id, data);
      return partnerService.updateSupplier(id, data);
    },
    onSuccess: () => {
      message.success('Cập nhật đối tác thành công');
      setIsModalVisible(false);
      queryClient.invalidateQueries([activeTab]);
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => {
      if (activeTab === 'customers') return partnerService.deleteCustomer(id);
      if (activeTab === 'subcontractors') return partnerService.deleteSubcontractor(id);
      return partnerService.deleteSupplier(id);
    },
    onSuccess: () => {
      message.success('Đã cập nhật trạng thái đối tác');
      queryClient.invalidateQueries([activeTab]);
    },
    onError: () => {
      message.error('Có lỗi xảy ra');
    }
  });

  // Handlers
  const handleTabChange = (key) => {
    setActiveTab(key);
    setSearchText('');
    setStatusFilter(null);
  };

  const openModal = (partner = null) => {
    setEditingPartner(partner);
    if (partner) {
      // Map name/full_name for editing
      const mappedData = { ...partner };
      if (activeTab === 'customers') mappedData.name = partner.full_name;
      form.setFieldsValue(mappedData);
    } else {
      form.resetFields();
      form.setFieldsValue({ status: activeTab === 'subcontractors' ? 'ACTIVE' : 1 });
    }
    setIsModalVisible(true);
  };

  const handleSubmit = (values) => {
    const dataToSend = { ...values };
    
    // Map name back to full_name for customers
    if (activeTab === 'customers') {
      dataToSend.full_name = dataToSend.name;
      delete dataToSend.name;
    }

    if (editingPartner) {
      updateMutation.mutate({ id: editingPartner.id, data: dataToSend });
    } else {
      createMutation.mutate(dataToSend);
    }
  };

  // Utils
  const getAvatarInitials = (name) => {
    if (!name) return 'PT';
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

  const renderStatus = (status) => {
    const isError = status === 0 || status === 'SUSPENDED';
    return (
      <Tag 
        color={isError ? 'warning' : 'success'} 
        style={{ borderRadius: 12, padding: '2px 10px', fontWeight: 500 }}
      >
        <span style={{ 
          display: 'inline-block', width: 6, height: 6, borderRadius: '50%', 
          background: isError ? '#faad14' : '#52c41a', marginRight: 6 
        }}></span>
        {isError ? 'Tạm ngưng' : 'Đang hợp tác'}
      </Tag>
    );
  };

  // Table Columns
  const getColumns = () => {
    const baseColumns = [
      {
        title: 'TÊN ĐỐI TÁC',
        key: 'name',
        render: (text, record, index) => {
          const partnerName = activeTab === 'customers' ? record.full_name : record.name;
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar 
                style={{ 
                  backgroundColor: '#e6f4ff', 
                  color: '#1677ff',
                  fontWeight: 600,
                  verticalAlign: 'middle' 
                }} 
                size={40}
              >
                {getAvatarInitials(partnerName)}
              </Avatar>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <Text strong style={{ fontSize: 14, color: '#1f1f1f' }}>{partnerName}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>{record.address || 'Chưa cập nhật địa chỉ'}</Text>
              </div>
            </div>
          );
        }
      }
    ];

    if (activeTab === 'customers') {
      baseColumns.push({
        title: 'MÃ KHÁCH HÀNG',
        dataIndex: 'customer_code',
        key: 'customer_code',
        render: text => <Text style={{ color: '#1f1f1f', fontWeight: 500 }}>{text}</Text>
      });
    } else if (activeTab === 'subcontractors') {
      baseColumns.push({
        title: 'MÃ NHÀ THẦU',
        dataIndex: 'subcontractor_code',
        key: 'subcontractor_code',
        render: text => <Text style={{ color: '#1f1f1f', fontWeight: 500 }}>{text}</Text>
      });
    } else {
      baseColumns.push({
        title: 'MÃ SỐ THUẾ',
        dataIndex: 'tax_code',
        key: 'tax_code',
        render: text => <Text style={{ color: '#1f1f1f', fontWeight: 500 }}>{text || 'N/A'}</Text>
      });
    }

    baseColumns.push(
      {
        title: 'EMAIL',
        dataIndex: 'email',
        key: 'email',
        render: text => <Text style={{ color: '#1f1f1f', fontWeight: 500 }}>{text || 'N/A'}</Text>
      },
      {
        title: 'SỐ ĐIỆN THOẠI',
        dataIndex: 'phone',
        key: 'phone',
        render: text => <Text style={{ color: '#1f1f1f', fontWeight: 500 }}>{text || 'N/A'}</Text>
      },
      {
        title: 'TRẠNG THÁI',
        dataIndex: 'status',
        key: 'status',
        render: renderStatus
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
              title="Tạm ngưng đối tác"
              description="Bạn có chắc chắn muốn chuyển đối tác này sang trạng thái Tạm ngưng?"
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
    );

    return baseColumns;
  };

  const getPartnerLabel = () => {
    if (activeTab === 'customers') return 'khách hàng';
    if (activeTab === 'subcontractors') return 'nhà thầu phụ';
    return 'nhà cung cấp';
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <style>{`
        .partner-table .ant-table-thead > tr > th {
          font-weight: 700;
          color: '#1f1f1f';
        }
        .partner-table .ant-table-tbody > tr:hover > td {
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
        .partner-tabs .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn {
          color: #c25f16;
          font-weight: 600;
        }
        .partner-tabs .ant-tabs-ink-bar {
          background: #c25f16;
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#1f1f1f', fontWeight: 800 }}>Quản lý đối tác</Title>
          <Text type="secondary" style={{ fontSize: 14, fontWeight: 500 }}>
            Quản lý thông tin khách hàng, nhà thầu và nhà cung cấp.
          </Text>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          size="large"
          onClick={() => openModal()}
          style={{ backgroundColor: '#c25f16', borderColor: '#c25f16', borderRadius: 4, fontWeight: 500 }}
        >
          Thêm đối tác mới
        </Button>
      </div>

      <Tabs 
        activeKey={activeTab} 
        onChange={handleTabChange} 
        className="partner-tabs"
        size="large"
        items={[
          { key: 'customers', label: 'Quản lý khách hàng' },
          { key: 'subcontractors', label: 'Quản lý nhà thầu phụ' },
          { key: 'suppliers', label: 'Quản lý nhà cung cấp vật tư' }
        ]}
      />

      <div style={{ backgroundColor: '#fff', borderRadius: 8, padding: 16, marginBottom: 16, marginTop: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <Input 
            className="search-input"
            placeholder="Tìm kiếm theo tên đối tác, mã số thuế..." 
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
            {activeTab === 'subcontractors' ? (
              <>
                <Option value="ACTIVE">Đang hợp tác</Option>
                <Option value="SUSPENDED">Tạm ngưng</Option>
              </>
            ) : (
              <>
                <Option value={1}>Đang hợp tác</Option>
                <Option value={0}>Tạm ngưng</Option>
              </>
            )}
          </Select>
        </div>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
        <Table 
          className="partner-table"
          columns={getColumns()} 
          dataSource={currentData} 
          rowKey="id" 
          loading={currentLoading}
          pagination={{
            showTotal: (total, range) => <span style={{ fontWeight: 500 }}>Hiển thị {range[0]}-{range[1]} trong số {total} đối tác</span>,
            pageSize: 10,
            showSizeChanger: false
          }}
        />
      </div>

      {/* Modal */}
      <Modal
        title={editingPartner ? `Chỉnh sửa ${getPartnerLabel()}` : `Thêm ${getPartnerLabel()} mới`}
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
            label="Tên đối tác"
            rules={[{ required: true, message: 'Vui lòng nhập tên đối tác' }]}
          >
            <Input placeholder="Nhập tên" size="large" />
          </Form.Item>

          {activeTab === 'suppliers' && (
            <Form.Item
              name="tax_code"
              label="Mã số thuế"
            >
              <Input placeholder="Nhập mã số thuế" size="large" />
            </Form.Item>
          )}

          <Form.Item
            name="email"
            label="Email"
            rules={[{ type: 'email', message: 'Email không hợp lệ' }]}
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
            <Input.TextArea placeholder="Nhập địa chỉ" rows={3} size="large" />
          </Form.Item>

          <Form.Item
            name="status"
            label="Trạng thái"
            rules={[{ required: true }]}
          >
            <Select size="large">
              {activeTab === 'subcontractors' ? (
                <>
                  <Option value="ACTIVE">Đang hợp tác</Option>
                  <Option value="PENDING">Chờ xử lý</Option>
                  <Option value="SUSPENDED">Tạm ngưng</Option>
                </>
              ) : (
                <>
                  <Option value={1}>Đang hợp tác</Option>
                  <Option value={0}>Tạm ngưng</Option>
                </>
              )}
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button onClick={() => setIsModalVisible(false)} style={{ marginRight: 8 }}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending} style={{ backgroundColor: '#c25f16' }}>
              {editingPartner ? 'Lưu thay đổi' : 'Thêm mới'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PartnerManagement;
