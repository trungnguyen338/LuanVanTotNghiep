import React, { useState, useEffect } from 'react';
import { 
  Table, Button, Input, Select, Typography, Tag, 
  Modal, Form, message, Popconfirm, Space, DatePicker, Tabs, Upload, Card, AutoComplete
} from 'antd';
import { 
  SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, UploadOutlined 
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import clientContractService from '../../services/clientContractService';
import subContractService from '../../services/subContractService';
import partnerService from '../../services/partnerService';
import projectService from '../../services/projectService';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const formatCurrency = (value) => {
  if (!value) return '0 VNĐ';
  const numVal = Number(value);
  return new Intl.NumberFormat('vi-VN').format(numVal) + ' VNĐ';
};

const actionIconButtonStyle = {
  width: 32,
  height: 32,
  borderRadius: 6,
  border: '1px solid #e8e5df',
  background: '#faf9f7',
  color: '#5f625f',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const deleteActionIconButtonStyle = {
  ...actionIconButtonStyle,
  color: '#9f4d48',
  background: '#fbf7f6',
  borderColor: '#ead9d7',
};

const ActionIconButton = ({ icon, danger = false, ...props }) => (
  <Button
    type="text"
    icon={React.cloneElement(icon, { style: { fontSize: 15 } })}
    style={danger ? deleteActionIconButtonStyle : actionIconButtonStyle}
    {...props}
  />
);

const ContractManagement = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('contractActiveTab') || 'client-contract';
  });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingContract, setEditingContract] = useState(null);
  const [fileList, setFileList] = useState([]);

  // Queries
  const { data: contracts = [], isLoading: loadingContracts } = useQuery({
    queryKey: ['clientContracts', searchText, statusFilter],
    queryFn: () => {
      const params = {};
      if (searchText) params.search = searchText;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      return clientContractService.getContracts(params);
    },
    enabled: activeTab === 'client-contract'
  });

  const { data: subContracts = [], isLoading: loadingSubContracts } = useQuery({
    queryKey: ['subContracts', searchText, statusFilter],
    queryFn: () => {
      const params = {};
      if (searchText) params.search = searchText;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      return subContractService.getSubContracts(params);
    },
    enabled: activeTab === 'subcontractor-contract'
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectService.getProjects()
  });

  const { data: subcontractors = [] } = useQuery({
    queryKey: ['subcontractors'],
    queryFn: () => partnerService.getSubcontractors(),
    enabled: activeTab === 'subcontractor-contract' || isModalVisible
  });

  // Effect: Set form values when modal opens with a contract to edit
  useEffect(() => {
    if (isModalVisible && editingContract) {
      // Use setTimeout to ensure Form element is rendered and connected
      const timer = setTimeout(() => {
        if (activeTab === 'subcontractor-contract') {
          const subcontractorIds = editingContract.subcontractors?.map(s => s.id) || [];
          form.setFieldsValue({
            contract_name: editingContract.contract_name,
            contract_value: editingContract.contract_value,
            subcontractor_ids: subcontractorIds,
            signed_date: editingContract.signed_date ? dayjs(editingContract.signed_date) : null,
            status: editingContract.status,
          });
        } else {
          form.setFieldsValue({
            contract_name: editingContract.contract_name,
            contract_value: editingContract.contract_value,
            signed_date: editingContract.signed_date ? dayjs(editingContract.signed_date) : null,
            status: editingContract.status,
          });
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isModalVisible, editingContract, activeTab, form]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: clientContractService.createContract,
    onSuccess: () => {
      message.success('Lập hợp đồng mới thành công');
      setIsModalVisible(false);
      form.resetFields();
      setFileList([]);
      queryClient.invalidateQueries(['clientContracts']);
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Lỗi khi tạo hợp đồng');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => clientContractService.updateContract(id, data),
    onSuccess: () => {
      message.success('Cập nhật hợp đồng thành công');
      setIsModalVisible(false);
      form.resetFields();
      setFileList([]);
      queryClient.invalidateQueries(['clientContracts']);
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Lỗi khi cập nhật hợp đồng');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: clientContractService.deleteContract,
    onSuccess: () => {
      message.success('Xóa hợp đồng thành công');
      queryClient.invalidateQueries(['clientContracts']);
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Không thể xóa hợp đồng này');
    }
  });

  const createSubContractMutation = useMutation({
    mutationFn: subContractService.createSubContract,
    onSuccess: () => {
      message.success('Lập hợp đồng nhà thầu phụ mới thành công');
      setIsModalVisible(false);
      form.resetFields();
      setFileList([]);
      queryClient.invalidateQueries(['subContracts']);
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Lỗi khi tạo hợp đồng nhà thầu phụ');
    }
  });

  const updateSubContractMutation = useMutation({
    mutationFn: ({ id, data }) => subContractService.updateSubContract(id, data),
    onSuccess: () => {
      message.success('Cập nhật hợp đồng nhà thầu phụ thành công');
      setIsModalVisible(false);
      form.resetFields();
      setFileList([]);
      queryClient.invalidateQueries(['subContracts']);
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Lỗi khi cập nhật hợp đồng nhà thầu phụ');
    }
  });

  const deleteSubContractMutation = useMutation({
    mutationFn: subContractService.deleteSubContract,
    onSuccess: () => {
      message.success('Xóa hợp đồng nhà thầu phụ thành công');
      queryClient.invalidateQueries(['subContracts']);
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Không thể xóa hợp đồng nhà thầu phụ này');
    }
  });



  // Handlers
  const openModal = (contract = null) => {
    setEditingContract(contract);
    if (!contract) {
      form.resetFields();
    }
    setFileList([]);
    setIsModalVisible(true);
  };

  const handleSubmit = (values) => {
    if (activeTab === 'subcontractor-contract') {
      const selectedIds = values.subcontractor_ids || [];
      if (selectedIds.length === 0) {
        message.error('Vui lòng chọn nhà thầu phụ thực hiện!');
        return;
      }

      if (editingContract) {
        const updateData = {
          contract_name: values.contract_name,
          contract_value: values.contract_value,
          signed_date: values.signed_date ? values.signed_date.format('YYYY-MM-DD') : null,
          status: values.status || editingContract.status,
          subcontractor_ids: selectedIds
        };
        updateSubContractMutation.mutate({ id: editingContract.id, data: updateData });
      } else {
        const formData = new FormData();
        formData.append('project_id', values.project_id);
        formData.append('contract_name', values.contract_name);
        formData.append('contract_value', values.contract_value);
        
        if (values.signed_date) {
          formData.append('signed_date', values.signed_date.format('YYYY-MM-DD'));
        }
        
        fileList.forEach(file => {
          formData.append('document_files[]', file.originFileObj);
        });
        if (values.file_url) {
          formData.append('file_url', values.file_url);
        }

        selectedIds.forEach((id) => {
          formData.append('subcontractor_ids[]', id);
        });

        createSubContractMutation.mutate(formData);
      }

    } else {
      const formData = new FormData();
      formData.append('project_id', values.project_id);
      formData.append('contract_name', values.contract_name);
      formData.append('contract_value', values.contract_value);
      
      if (values.signed_date) {
        formData.append('signed_date', values.signed_date.format('YYYY-MM-DD'));
      }
      
      fileList.forEach(file => {
        formData.append('document_files[]', file.originFileObj);
      });
      if (values.file_url) {
        formData.append('file_url', values.file_url);
      }

      if (editingContract) {
        const updateData = {
          contract_name: values.contract_name,
          contract_value: values.contract_value,
          signed_date: values.signed_date ? values.signed_date.format('YYYY-MM-DD') : null,
          status: values.status
        };
        updateMutation.mutate({ id: editingContract.id, data: updateData });
      } else {
        createMutation.mutate(formData);
      }
    }
  };

  const handleFileChange = ({ fileList }) => {
    setFileList(fileList);
  };

  // Render Status Tag
  const renderStatus = (status) => {
    const config = {
      DRAFT: { text: 'Bản nháp', color: 'default' },
      ACTIVE: { text: 'Đang hiệu lực', color: 'success' },
      COMPLETED: { text: 'Đã hoàn thành', color: 'processing' },
      TERMINATED: { text: 'Chấm dứt', color: 'error' },
      CANCELLED: { text: 'Đã hủy', color: 'error' }
    };

    const item = config[status] || config.DRAFT;

    return (
      <Tag 
        color={item.color} 
        style={{ 
          borderRadius: 12, 
          padding: '2px 10px', 
          fontWeight: 600, 
          border: 'none',
          backgroundColor: status === 'ACTIVE' ? '#e6f7ff' : undefined,
          color: status === 'ACTIVE' ? '#0958d9' : undefined
        }}
      >
        {item.text}
      </Tag>
    );
  };

  // Table Columns
  const columns = [
    {
      title: 'STT',
      key: 'stt',
      width: '5%',
      render: (_, __, index) => (
        <Text style={{ color: '#595959', fontWeight: 500 }}>
          {String(index + 1).padStart(2, '0')}
        </Text>
      )
    },
    {
      title: 'Số hợp đồng',
      dataIndex: 'contract_code',
      key: 'contract_code',
      width: '10%',
      render: (text) => <Text strong style={{ color: '#1f1f1f', whiteSpace: 'nowrap' }}>{text}</Text>
    },
    {
      title: 'Tên hợp đồng',
      dataIndex: 'contract_name',
      key: 'contract_name',
      width: '17%',
      render: (text) => <Text style={{ color: '#1f1f1f', fontWeight: 500 }}>{text}</Text>
    },
    {
      title: 'Tên dự án',
      dataIndex: ['project', 'name'],
      key: 'project_name',
      width: '17%',
      render: (text) => <Text style={{ color: '#1f1f1f', fontWeight: 500 }}>{text || 'N/A'}</Text>
    },
    {
      title: 'Tên khách hàng',
      dataIndex: ['project', 'customer', 'full_name'],
      key: 'customer_name',
      width: '12%',
      render: (text) => <Text style={{ color: '#595959' }}>{text || 'N/A'}</Text>
    },
    {
      title: 'Giá trị hợp đồng',
      dataIndex: 'contract_value',
      key: 'contract_value',
      width: '14%',
      render: (value) => <Text strong style={{ color: '#1f1f1f', whiteSpace: 'nowrap' }}>{formatCurrency(value)}</Text>
    },
    {
      title: 'Ngày ký',
      dataIndex: 'signed_date',
      key: 'signed_date',
      width: '8%',
      render: (date) => <Text style={{ color: '#595959', whiteSpace: 'nowrap' }}>{date ? dayjs(date).format('DD/MM/YYYY') : '---'}</Text>
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: '9%',
      render: (status) => renderStatus(status)
    },
    {
      title: 'Thao tác',
      key: 'action',
      align: 'right',
      width: '8%',
      render: (_, record) => (
        <Space size={8}>
          <ActionIconButton
            icon={<EyeOutlined />}
            onClick={() => navigate(`/contracts/${record.id}`)}
            title="Xem chi tiết"
          />
          <ActionIconButton
            icon={<EditOutlined />}
            onClick={() => openModal(record)}
            title="Chỉnh sửa"
          />
          <Popconfirm
            title="Xóa hợp đồng"
            description="Bạn có chắc chắn muốn xóa hợp đồng khách hàng này?"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <ActionIconButton
              danger
              icon={<DeleteOutlined />}
              title="Xóa"
            />
          </Popconfirm>
        </Space>
      )
    }
  ];



  const subContractColumns = [
    {
      title: <span style={{ whiteSpace: 'nowrap' }}>STT</span>,
      key: 'stt',
      width: 70,
      render: (_, __, index) => (
        <Text style={{ color: '#595959', fontWeight: 500 }}>
          {String(index + 1).padStart(2, '0')}
        </Text>
      )
    },
    {
      title: <span style={{ whiteSpace: 'nowrap' }}>Số hợp đồng</span>,
      dataIndex: 'contract_code',
      key: 'contract_code',
      width: 140,
      render: (text) => <Text strong style={{ color: '#1f1f1f', whiteSpace: 'nowrap' }}>{text}</Text>
    },
    {
      title: 'Tên hợp đồng',
      dataIndex: 'contract_name',
      key: 'contract_name',
      width: 190,
      render: (text) => <Text style={{ color: '#1f1f1f', fontWeight: 500 }}>{text}</Text>
    },
    {
      title: 'Tên dự án',
      dataIndex: ['project', 'name'],
      key: 'project_name',
      width: 220,
      render: (text) => <Text style={{ color: '#595959' }}>{text || 'N/A'}</Text>
    },
    {
      title: 'Nhà thầu phụ',
      key: 'subcontractor_name',
      width: 220,
      render: (_, record) => {
        const subs = record.subcontractors || [];
        return (
          <Text style={{ color: '#595959' }}>
            {subs.length > 0 ? subs.map(s => s.name).join(', ') : 'N/A'}
          </Text>
        );
      }
    },
    {
      title: <span style={{ whiteSpace: 'nowrap' }}>Giá trị gốc</span>,
      dataIndex: 'contract_value',
      key: 'contract_value',
      width: 170,
      render: (value) => <Text style={{ color: '#595959', whiteSpace: 'nowrap' }}>{formatCurrency(value)}</Text>
    },
    {
      title: <span style={{ whiteSpace: 'nowrap' }}>Tổng giá trị</span>,
      dataIndex: 'total_value',
      key: 'total_value',
      width: 180,
      render: (value) => <Text strong style={{ color: '#8c3a00', whiteSpace: 'nowrap' }}>{formatCurrency(value)}</Text>
    },
    {
      title: <span style={{ whiteSpace: 'nowrap' }}>Ngày ký</span>,
      dataIndex: 'signed_date',
      key: 'signed_date',
      width: 120,
      render: (date) => <Text style={{ color: '#595959', whiteSpace: 'nowrap' }}>{date ? dayjs(date).format('DD/MM/YYYY') : '---'}</Text>
    },
    {
      title: <span style={{ whiteSpace: 'nowrap' }}>Trạng thái</span>,
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status) => renderStatus(status)
    },
    {
      title: <span style={{ whiteSpace: 'nowrap' }}>Thao tác</span>,
      key: 'action',
      align: 'right',
      width: 130,
      fixed: 'right',
      render: (_, record) => (
        <Space size={8}>
          <ActionIconButton
            icon={<EyeOutlined />}
            onClick={() => navigate(`/sub-contracts/${record.id}`)}
            title="Xem chi tiết"
          />
          <ActionIconButton
            icon={<EditOutlined />}
            onClick={() => openModal(record)}
            title="Chỉnh sửa"
          />
          <Popconfirm
            title="Xóa hợp đồng thầu phụ"
            description="Bạn có chắc chắn muốn xóa hợp đồng thầu phụ này?"
            onConfirm={() => deleteSubContractMutation.mutate(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <ActionIconButton
              danger
              icon={<DeleteOutlined />}
              title="Xóa"
            />
          </Popconfirm>
        </Space>
      )
    }
  ];

  // Tab Items
  const tabItems = [
    {
      key: 'client-contract',
      label: 'Hợp đồng khách hàng',
      children: (
        <div style={{ backgroundColor: '#fff', borderRadius: 8, border: '1px solid #e8e8e8', overflow: 'hidden', marginTop: 16 }}>
          <Table 
            className="contract-table"
            columns={columns} 
            dataSource={contracts} 
            rowKey="id" 
            loading={loadingContracts}
            pagination={{
              showTotal: (total, range) => `Hiển thị ${range[0]}-${range[1]} trong số ${total} hợp đồng`,
              pageSize: 10,
              showSizeChanger: false
            }}
          />
        </div>
      )
    },
    {
      key: 'subcontractor-contract',
      label: 'Hợp đồng thầu phụ',
      children: (
        <div style={{ backgroundColor: '#fff', borderRadius: 8, border: '1px solid #e8e8e8', overflow: 'hidden', marginTop: 16 }}>
          <Table 
            className="contract-table"
            columns={subContractColumns} 
            dataSource={subContracts} 
            rowKey="id" 
            loading={loadingSubContracts}
            scroll={{ x: 1570 }}
            pagination={{
              showTotal: (total, range) => `Hiển thị ${range[0]}-${range[1]} trong số ${total} hợp đồng thầu phụ`,
              pageSize: 10,
              showSizeChanger: false
            }}
          />
        </div>
      )
    },

  ];

  return (
    <div style={{ width: '100%' }}>
      <style>{`
        .contract-tabs .ant-tabs-nav-list {
          font-weight: 600;
        }
        .contract-tabs .ant-tabs-tab {
          font-size: 15px;
          color: #595959;
        }
        .contract-tabs .ant-tabs-tab-active .ant-tabs-tab-btn {
          color: #8c3a00 !important;
        }
        .contract-tabs .ant-tabs-ink-bar {
          background: #8c3a00 !important;
        }
        .contract-table .ant-table-thead > tr > th {
          font-weight: 700;
          color: #1f1f1f;
          background-color: #fafafa;
        }
        .contract-table .ant-table-tbody > tr:hover > td {
          background-color: #fafafa !important;
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#1f1f1f', fontWeight: 800 }}>Quản lý hợp đồng</Title>
          <Text type="secondary" style={{ fontSize: 14 }}>Quản lý và theo dõi các loại hợp đồng trong hệ thống.</Text>
        </div>
        
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => openModal()}
          style={{ backgroundColor: '#8c3a00', borderColor: '#8c3a00', borderRadius: 4, fontWeight: 600, height: 40 }}
        >
          Thêm hợp đồng mới
        </Button>
      </div>

      {/* Search & Filters */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center' }}>
        <Input 
          placeholder="Tìm kiếm theo tên khách hàng, số hợp đồng..." 
          prefix={<SearchOutlined style={{ color: '#8c8c8c' }} />} 
          style={{ width: 350, height: 38, borderRadius: 4 }}
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <Text style={{ fontWeight: 500 }}>Trạng thái:</Text>
          <Select 
            value={statusFilter} 
            onChange={value => setStatusFilter(value)}
            style={{ width: 150, height: 38 }}
            className="filter-select"
          >
            <Option value="ALL">Tất cả</Option>
            <Option value="DRAFT">Bản nháp</Option>
            <Option value="ACTIVE">Đang hiệu lực</Option>
            <Option value="COMPLETED">Đã hoàn thành</Option>
            <Option value="TERMINATED">Chấm dứt</Option>
          </Select>
        </div>
      </div>

      {/* Tabs list */}
      <Tabs 
        className="contract-tabs"
        activeKey={activeTab} 
        onChange={key => {
          setActiveTab(key);
          localStorage.setItem('contractActiveTab', key);
        }} 
        items={tabItems}
      />

      {/* Modal Lập Hợp Đồng */}
      <Modal
        title={editingContract ? 'Chỉnh sửa hợp đồng' : 'Lập hợp đồng mới'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        destroyOnClose
        width={650}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: 20 }}
        >
          {!editingContract && (
            <Form.Item
              name="project_id"
              label="Dự án áp dụng"
              rules={[{ required: true, message: 'Vui lòng chọn dự án' }]}
            >
              <Select placeholder="Chọn dự án xây dựng" size="large">
                {projects.map(proj => (
                  <Option key={proj.id} value={proj.id} disabled={proj.status === 'COMPLETED'}>
                    {proj.name} ({proj.project_code}) {proj.status === 'COMPLETED' ? '(Đã hoàn thành)' : ''}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          {activeTab === 'subcontractor-contract' && (
            <Form.Item
              name="subcontractor_ids"
              label="Nhà thầu phụ thực hiện"
              rules={[{ required: true, message: 'Vui lòng chọn ít nhất một nhà thầu phụ' }]}
            >
              <Select 
                mode="multiple" 
                placeholder="Chọn nhà thầu phụ thực hiện" 
                size="large" 
                showSearch 
                filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              >
                {subcontractors.map(sub => (
                  <Option key={sub.id} value={sub.id} label={sub.name}>
                    {sub.name} ({sub.subcontractor_code})
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Form.Item
            name="contract_name"
            label="Tên hợp đồng"
            rules={[{ required: true, message: 'Vui lòng nhập tên hợp đồng' }]}
          >
            <Input placeholder="Ví dụ: Hợp đồng thi công gói thầu bê tông APEX" size="large" />
          </Form.Item>

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="contract_value"
              label="Giá trị hợp đồng (VNĐ)"
              rules={[{ required: true, message: 'Vui lòng nhập giá trị hợp đồng' }]}
              style={{ flex: 1 }}
            >
              <Input type="number" placeholder="Ví dụ: 45000000000" size="large" />
            </Form.Item>

            <Form.Item
              name="signed_date"
              label="Ngày ký hợp đồng"
              style={{ flex: 1 }}
            >
              <DatePicker size="large" style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày ký" />
            </Form.Item>
          </div>

          {editingContract && (
            <Form.Item
              name="status"
              label="Trạng thái hợp đồng"
              rules={[{ required: true }]}
            >
              <Select size="large">
                <Option value="DRAFT">Bản nháp</Option>
                <Option value="ACTIVE">Đang hiệu lực</Option>
                <Option value="COMPLETED">Đã hoàn thành</Option>
                <Option value="TERMINATED">Chấm dứt</Option>
              </Select>
            </Form.Item>
          )}

          {!editingContract && (
            <Form.Item
              label="File hợp đồng đính kèm"
              extra="Hỗ trợ file PDF, DOC, DOCX, ZIP tối đa 20MB"
            >
              <Upload
                beforeUpload={() => false} // Chặn tự động upload của antd
                onChange={handleFileChange}
                fileList={fileList}
                multiple
                maxCount={10}
              >
                <Button icon={<UploadOutlined />} size="large">Chọn tệp tin</Button>
              </Upload>
            </Form.Item>
          )}

          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: 24 }}>
            <Button onClick={() => setIsModalVisible(false)} style={{ marginRight: 8 }}>
              Hủy
            </Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={
                createMutation.isPending || 
                updateMutation.isPending || 
                createSubContractMutation.isPending || 
                updateSubContractMutation.isPending
              }
              style={{ backgroundColor: '#8c3a00', borderColor: '#8c3a00' }}
            >
              {editingContract ? 'Lưu thay đổi' : 'Lưu hợp đồng'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ContractManagement;
