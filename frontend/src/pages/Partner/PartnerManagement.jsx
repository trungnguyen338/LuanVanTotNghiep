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

const ActionIconButton = ({ icon, tooltip, color, onClick, disabled = false, danger = false }) => (
  <Popconfirm
    title={tooltip}
    okText="Có"
    cancelText="Không"
    onConfirm={onClick}
    disabled={!danger || disabled}
    okButtonProps={danger ? { danger: true } : undefined}
  >
    <Button
      type="text"
      icon={icon}
      disabled={disabled}
      onClick={danger ? undefined : onClick}
      style={{
        width: 34,
        height: 34,
        borderRadius: 8,
        color: disabled ? '#cbd5e1' : color,
        background: disabled ? '#fafafa' : 'transparent',
        border: '1px solid transparent',
        padding: 0
      }}
      danger={danger && !disabled}
    />
  </Popconfirm>
);

const PartnerManagement = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState(null);
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);

  // Queries
  const { data: subcontractors = [], isLoading: loadingSubcontractors } = useQuery({
    queryKey: ['subcontractors', searchText, statusFilter],
    queryFn: () => partnerService.getSubcontractors({ search: searchText, status: statusFilter })
  });

  // Derived state
  const currentData = subcontractors;
  const currentLoading = loadingSubcontractors;

  // Mutations
  const createMutation = useMutation({
    mutationFn: partnerService.createSubcontractor,
    onSuccess: () => {
      message.success('Thêm đối tác thành công');
      setIsModalVisible(false);
      queryClient.invalidateQueries(['subcontractors']);
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => partnerService.updateSubcontractor(id, data),
    onSuccess: () => {
      message.success('Cập nhật đối tác thành công');
      setIsModalVisible(false);
      queryClient.invalidateQueries(['subcontractors']);
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: partnerService.deleteSubcontractor,
    onSuccess: () => {
      message.success('Đã cập nhật trạng thái đối tác');
      queryClient.invalidateQueries(['subcontractors']);
    },
    onError: () => {
      message.error('Có lỗi xảy ra');
    }
  });

  // Handlers
  const openModal = (partner = null) => {
    setEditingPartner(partner);
    if (partner) {
      form.setFieldsValue(partner);
    } else {
      form.resetFields();
      form.setFieldsValue({ status: 1 });
    }
    setIsModalVisible(true);
  };

  const handleSubmit = (values) => {
    if (editingPartner) {
      updateMutation.mutate({ id: editingPartner.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  // Utils
  const getAvatarInitials = (name) => {
    if (!name) return 'DT';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const renderStatus = (status) => {
    const isError = status === 0 || status === 'SUSPENDED';
    return (
      <Tag 
        color={isError ? 'warning' : 'success'} 
        style={{ borderRadius: 9999, padding: '3px 12px', fontWeight: 600, marginRight: 0 }}
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
        width: 330,
        render: (text, record) => {
          const partnerName = record.name;
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
                {getAvatarInitials(partnerName)}
              </Avatar>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <Text strong style={{ fontSize: 14, color: '#1f1f1f', whiteSpace: 'normal', lineHeight: 1.4 }}>{partnerName}</Text>
                <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'normal', lineHeight: 1.4 }}>{record.address || 'Chưa cập nhật địa chỉ'}</Text>
              </div>
            </div>
          );
        }
      },
      {
        title: 'MÃ NHÀ THẦU',
        dataIndex: 'subcontractor_code',
        key: 'subcontractor_code',
        width: 150,
        render: text => <Text style={{ color: '#1f1f1f', fontWeight: 500, whiteSpace: 'nowrap' }}>{text}</Text>
      },
      {
        title: 'EMAIL',
        dataIndex: 'email',
        key: 'email',
        width: 280,
        ellipsis: true,
        render: text => (
          <Text
            style={{
              color: '#1f1f1f',
              fontWeight: 500,
              display: 'block',
              width: '100%',
              maxWidth: '100%',
              minWidth: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {text || 'N/A'}
          </Text>
        )
      },
      {
        title: 'SỐ ĐIỆN THOẠI',
        dataIndex: 'phone',
        key: 'phone',
        width: 170,
        align: 'center',
        render: text => (
          <Text
            style={{
              color: '#1f1f1f',
              fontWeight: 500,
              display: 'block',
              width: '100%',
              minWidth: 0,
              whiteSpace: 'nowrap',
              textAlign: 'center'
            }}
          >
            {text || 'N/A'}
          </Text>
        )
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
                style={{ width: 34, height: 34, borderRadius: 8, padding: 0 }}
              />
            </Popconfirm>
          </Space>
        )
      }
    ];

    return baseColumns;
  };

  return (
    <div style={{ width: '100%' }}>
      <style>{`
        .partner-table .ant-table-thead > tr > th {
          font-weight: 700;
          color: #1f1f1f;
          background: #fafafa;
          white-space: nowrap;
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
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#1f1f1f', fontWeight: 800 }}>Quản lý đối tác</Title>
          <Text type="secondary" style={{ fontSize: 14, fontWeight: 500 }}>
            Quản lý thông tin nhà thầu phụ thực hiện dự án.
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
            <>
              <Option value={1}>Đang hợp tác</Option>
              <Option value={0}>Tạm ngưng</Option>
            </>
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
          tableLayout="fixed"
          scroll={{ x: 1240 }}
          pagination={{
            showTotal: (total, range) => <span style={{ fontWeight: 500 }}>Hiển thị {range[0]}-{range[1]} trong số {total} nhà thầu phụ</span>,
            pageSize: 10,
            showSizeChanger: false
          }}
        />
      </div>

      {/* Modal */}
      <Modal
        title={editingPartner ? 'Chỉnh sửa nhà thầu phụ' : 'Thêm nhà thầu phụ mới'}
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
            <Input placeholder="Nhập email Gmail" size="large" />
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
              <>
                <Option value={1}>Đang hợp tác</Option>
                <Option value={0}>Tạm ngưng</Option>
              </>
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button onClick={() => setIsModalVisible(false)} style={{ marginRight: 8 }}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending} style={{ backgroundColor: '#c25f16', borderColor: '#c25f16' }}>
              {editingPartner ? 'Lưu thay đổi' : 'Thêm mới'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PartnerManagement;
