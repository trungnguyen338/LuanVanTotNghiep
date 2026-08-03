import React, { useState } from 'react';
import { 
  Table, Card, Button, Input, Select, Typography, Tag, 
  Modal, Form, message, Popconfirm, Space, Row, Col, 
  Tabs, DatePicker, Descriptions, Divider, Tooltip, Statistic
} from 'antd';
import { 
  SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, 
  EyeOutlined, WalletOutlined, ArrowUpOutlined, ArrowDownOutlined,
  CalendarOutlined, NumberOutlined, ProfileOutlined, TeamOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import financeService from '../../services/financeService';
import projectService from '../../services/projectService';
import clientContractService from '../../services/clientContractService';
import subContractService from '../../services/subContractService';
import partnerService from '../../services/partnerService';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

// Formatting utilities
const formatFullCurrency = (value) => {
  if (value === undefined || value === null) return '0 đ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value).replace('₫', 'đ');
};

const formatShortCurrency = (value) => {
  if (value === undefined || value === null) return '0 VNĐ';
  const numVal = Number(value);
  return new Intl.NumberFormat('vi-VN').format(numVal) + ' VNĐ';
};

const isTerminatedSubContract = (contract) => {
  return ['TERMINATED', 'CANCELLED', 'Bị hủy'].includes(contract?.status);
};

const FinanceManagement = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const watchedSubContractId = Form.useWatch('sub_contract_id', form);
  const [activeTab, setActiveTab] = useState('1'); // '1': Thu, '2': Chi, '3': Công nợ
  const [searchText, setSearchText] = useState('');
  const [projectFilter, setProjectFilter] = useState(undefined);
  const [statusFilter, setStatusFilter] = useState(undefined);
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [paymentType, setPaymentType] = useState('REVENUE'); // REVENUE or COST
  const [selectedPaymentDetails, setSelectedPaymentDetails] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Allocations state
  const [eligibleTasks, setEligibleTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [taskAllocations, setTaskAllocations] = useState({});

  // Queries
  const { data: stats = { fund_balance: 0, total_receivable: 0, total_payable: 0 }, isLoading: loadingStats } = useQuery({
    queryKey: ['financeStats'],
    queryFn: financeService.getStats
  });

  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ['payments', activeTab, searchText, projectFilter, statusFilter],
    queryFn: () => {
      const type = activeTab === '1' ? 'REVENUE' : activeTab === '2' ? 'COST' : undefined;
      // Do not fetch payments for debt tab
      if (activeTab === '3') return [];
      return financeService.getPayments({
        payment_type: type,
        project_id: projectFilter,
        status: statusFilter,
      });
    },
    enabled: activeTab !== '3'
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectService.getProjects()
  });

  const { data: clientContracts = [], isLoading: loadingClientContracts } = useQuery({
    queryKey: ['clientContracts'],
    queryFn: () => clientContractService.getContracts(),
    enabled: activeTab === '1' || activeTab === '3' || isModalOpen
  });

  const { data: subContracts = [], isLoading: loadingSubContracts } = useQuery({
    queryKey: ['subContracts'],
    queryFn: () => subContractService.getSubContracts(),
    enabled: activeTab === '2' || activeTab === '3' || isModalOpen
  });



  // Mutations
  const createMutation = useMutation({
    mutationFn: financeService.createPayment,
    onSuccess: (data) => {
      message.success(data.message || 'Tạo phiếu thanh toán thành công');
      setIsModalOpen(false);
      invalidateAll();
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Không thể tạo phiếu thanh toán');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => financeService.updatePayment(id, data),
    onSuccess: (data) => {
      message.success(data.message || 'Cập nhật thành công');
      setIsModalOpen(false);
      invalidateAll();
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Không thể cập nhật phiếu thanh toán');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: financeService.deletePayment,
    onSuccess: (data) => {
      message.success(data.message || 'Đã xóa phiếu thanh toán');
      invalidateAll();
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Không thể xóa phiếu thanh toán');
    }
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries(['payments']);
    queryClient.invalidateQueries(['financeStats']);
    queryClient.invalidateQueries(['clientContracts']);
    queryClient.invalidateQueries(['subContracts']);
    queryClient.invalidateQueries(['subcontractors']);
    queryClient.invalidateQueries(['projects']);
  };

  const fetchEligibleTasks = async (subContractId) => {
    if (!subContractId) {
      setEligibleTasks([]);
      setSelectedTaskIds([]);
      setTaskAllocations({});
      return;
    }

    const selectedContract = subContracts.find(contract => Number(contract.id) === Number(subContractId));
    if (isTerminatedSubContract(selectedContract)) {
      message.error('Hợp đồng thầu phụ đã bị hủy, không thể lập phiếu chi.');
      setEligibleTasks([]);
      setSelectedTaskIds([]);
      setTaskAllocations({});
      form.setFieldsValue({ sub_contract_id: undefined, amount: 0 });
      return;
    }

    setLoadingTasks(true);
    try {
      const data = await financeService.getEligibleTasks(subContractId);
      setEligibleTasks(data);
    } catch (error) {
      message.error('Không thể tải danh sách công việc của hợp đồng thầu phụ');
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleSubContractChange = (subContractId) => {
    fetchEligibleTasks(subContractId);
    setSelectedTaskIds([]);
    setTaskAllocations({});
    form.setFieldsValue({ amount: 0 });
  };



  // Dynamic task balance calculator
  const getTaskFinancials = (record) => {
    const totalValue = (record.work_volume || 0) * (record.agreed_price || 0);
    const isCompleted = editingPayment?.status === 'COMPLETED';
    const currentAllocated = isCompleted
      ? (editingPayment.payment_task_details?.find(d => d.task_detail_id === record.id)?.allocated_amount || 0)
      : 0;
    const previouslyPaid = Math.max(0, (record.paid_amount || 0) - currentAllocated);
    const remaining = Math.max(0, totalValue - previouslyPaid);
    return { totalValue, previouslyPaid, remaining };
  };

  // Handlers
  const openCreateModal = (type, initialContractId = null) => {
    setPaymentType(type);
    setEditingPayment(null);
    setEligibleTasks([]);
    setSelectedTaskIds([]);
    setTaskAllocations({});
    form.resetFields();
    
    const fields = {
      payment_type: type,
      payment_date: dayjs(),
      status: type === 'REVENUE' ? 'COMPLETED' : 'PENDING',
      amount: 0,
    };
    
    if (type === 'REVENUE' && initialContractId) {
      fields.client_contract_id = initialContractId;
    } else if (type === 'COST' && initialContractId) {
      fields.sub_contract_id = initialContractId;
      fetchEligibleTasks(initialContractId);
    }
    
    form.setFieldsValue(fields);
    setIsModalOpen(true);
  };

  const handleCreatePaymentFromDebt = (type, contractId) => {
    if (type === 'COST') {
      const contract = subContracts.find(item => Number(item.id) === Number(contractId));
      if (isTerminatedSubContract(contract)) {
        message.error('Hợp đồng thầu phụ đã bị hủy, không thể lập phiếu chi.');
        return;
      }
    }

    setActiveTab(type === 'REVENUE' ? '1' : '2');
    openCreateModal(type, contractId);
  };

  const openEditModal = async (record) => {
    try {
      const detailedPayment = await financeService.getPayment(record.id);
      setEditingPayment(detailedPayment);
      setPaymentType(detailedPayment.payment_type);

      // If there is a sub_contract_id, fetch tasks and populate allocations
      if (detailedPayment.sub_contract_id) {
        setLoadingTasks(true);
        try {
          const tasksData = await financeService.getEligibleTasks(detailedPayment.sub_contract_id);
          
          const existingAllocationsMap = {};
          detailedPayment.payment_task_details?.forEach(detail => {
            existingAllocationsMap[detail.task_detail_id] = detail.allocated_amount;
          });

          // Merging logic to include currently allocated tasks (even if remaining amount was 0)
          const mergedTasks = [...tasksData];
          detailedPayment.payment_task_details?.forEach(detail => {
            const exists = mergedTasks.some(t => t.id === detail.task_detail_id);
            if (!exists && detail.task_detail) {
              mergedTasks.push(detail.task_detail);
            }
          });

          setEligibleTasks(mergedTasks);
          setTaskAllocations(existingAllocationsMap);
          setSelectedTaskIds(detailedPayment.payment_task_details?.map(detail => detail.task_detail_id) || []);
        } catch (error) {
          message.error('Không thể tải danh sách công việc của hợp đồng thầu phụ');
        } finally {
          setLoadingTasks(false);
        }
      } else {
        setEligibleTasks([]);
        setSelectedTaskIds([]);
        setTaskAllocations({});
      }

      form.resetFields();
      form.setFieldsValue({
        title: detailedPayment.title,
        amount: detailedPayment.amount ? Math.round(parseFloat(detailedPayment.amount)) : 0,
        payment_date: detailedPayment.payment_date ? dayjs(detailedPayment.payment_date) : dayjs(),
        status: detailedPayment.status,
        client_contract_id: detailedPayment.client_contract_id,
        sub_contract_id: detailedPayment.sub_contract_id,
      });
      setIsModalOpen(true);
    } catch (err) {
      message.error('Không thể lấy thông tin chi tiết để chỉnh sửa');
    }
  };

  const handleFormSubmit = (values) => {
    const allocationsArray = selectedTaskIds.map(id => ({
      task_detail_id: id,
      allocated_amount: taskAllocations[id] || 0
    })).filter(alloc => alloc.allocated_amount > 0);

    // Clean amount value (keep only digits, handle decimals safely)
    const rawAmount = String(values.amount || '');
    const cleanAmount = rawAmount.includes('.') ? Math.round(parseFloat(rawAmount)) : (parseFloat(rawAmount.replace(/[^0-9]/g, '')) || 0);

    if (paymentType === 'COST' && values.sub_contract_id) {
      if (allocationsArray.length === 0) {
        message.error('Vui lòng phân bổ số tiền thanh toán cho ít nhất một công việc.');
        return;
      }
      const sum = allocationsArray.reduce((acc, cur) => acc + cur.allocated_amount, 0);
      if (Math.abs(sum - cleanAmount) > 0.01) {
        message.error('Tổng tiền phân bổ không khớp với tổng số tiền của phiếu.');
        return;
      }
    }

    const dataToSend = {
      ...values,
      amount: cleanAmount,
      payment_type: paymentType,
      payment_date: values.payment_date ? values.payment_date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
      task_allocations: (paymentType === 'COST' && values.sub_contract_id) ? allocationsArray : undefined
    };

    if (editingPayment) {
      updateMutation.mutate({ id: editingPayment.id, data: dataToSend });
    } else {
      createMutation.mutate(dataToSend);
    }
  };

  const showDetails = async (id) => {
    try {
      const data = await financeService.getPayment(id);
      setSelectedPaymentDetails(data);
      setIsDetailOpen(true);
    } catch (err) {
      message.error('Không thể lấy thông tin chi tiết');
    }
  };

  // Status mappings
  const renderStatusTag = (status) => {
    const statusMap = {
      PENDING: { text: 'Chờ duyệt', color: 'orange' },
      COMPLETED: { text: 'Đã giải ngân', color: 'green' },
    };
    const config = statusMap[status] || { text: status, color: 'default' };
    return <Tag color={config.color} style={{ borderRadius: 4, fontWeight: 600 }}>{config.text}</Tag>;
  };

  // Table columns for Phiếu Thu / Chi
  const paymentColumns = [
    {
      title: 'STT',
      key: 'index',
      width: 70,
      render: (_, __, index) => <Text style={{ color: '#595959' }}>{index + 1}</Text>
    },
    {
      title: 'Mã phiếu',
      dataIndex: 'payment_code',
      key: 'payment_code',
      width: 170,
      render: (text) => (
        <Text strong style={{ color: '#2f6fdb', whiteSpace: 'nowrap', display: 'block' }}>
          {text}
        </Text>
      )
    },
    {
      title: activeTab === '1' ? 'Mã hợp đồng' : 'Hợp đồng thầu phụ',
      key: 'contract_code',
      width: 240,
      render: (_, record) => {
        if (activeTab === '1') {
          return record.client_contract ? (
            <div style={{ minWidth: 0 }}>
              <Text strong style={{ whiteSpace: 'nowrap' }}>{record.client_contract.contract_code}</Text>
              {record.client_contract.project && (
                <div style={{ fontSize: 11, color: '#8c8c8c' }}>Dự án: {record.client_contract.project.name}</div>
              )}
            </div>
          ) : <Text type="secondary">—</Text>;
        } else {
          return record.sub_contract ? (
            <div style={{ minWidth: 0 }}>
              <Text strong style={{ whiteSpace: 'nowrap' }}>{record.sub_contract.contract_code}</Text>
              {record.sub_contract.project && (
                <div style={{ fontSize: 11, color: '#8c8c8c' }}>Dự án: {record.sub_contract.project.name}</div>
              )}
            </div>
          ) : <Text type="secondary">—</Text>;
        }
      }
    },
    {
      title: 'Đối tác',
      key: 'partner',
      width: 220,
      render: (_, record) => {
        if (activeTab === '1') {
          return <Text style={{ whiteSpace: 'nowrap' }}>{record.client_contract?.project?.customer?.full_name || record.client_contract?.project?.customer?.user?.full_name || 'Khách hàng'}</Text>;
        } else {
          const subcontractorNames = record.sub_contract?.subcontractors?.map(s => s.name || s.user?.full_name).filter(Boolean).join(', ');
          return <Text style={{ whiteSpace: 'nowrap', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subcontractorNames || record.sub_contract?.contract_name || 'Nhà thầu phụ'}</Text>;
        }
      }
    },
    {
      title: 'Nội dung',
      dataIndex: 'title',
      key: 'title',
      width: 320,
      ellipsis: true,
      render: (text) => <Text style={{ color: '#1f1f1f', whiteSpace: 'nowrap', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>{text}</Text>,
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      width: 170,
      render: (val) => <Text strong style={{ fontSize: 14, whiteSpace: 'nowrap' }}>{formatFullCurrency(val)}</Text>
    },
    {
      title: activeTab === '1' ? 'Ngày thu' : 'Ngày chi',
      dataIndex: 'payment_date',
      key: 'payment_date',
      width: 110,
      render: (val) => <Text style={{ whiteSpace: 'nowrap' }}>{val ? dayjs(val).format('DD/MM/YYYY') : '—'}</Text>
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status) => renderStatusTag(status)
    },
    {
      title: 'Thao tác',
      key: 'action',
      align: 'right',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Chi tiết">
            <Button 
              size="small"
              icon={<EyeOutlined />} 
              onClick={() => showDetails(record.id)}
            />
          </Tooltip>
          <Tooltip title="Sửa">
            <Button 
              size="small"
              icon={<EditOutlined />} 
              onClick={() => openEditModal(record)}
            />
          </Tooltip>
          {record.status === 'COMPLETED' ? (
            <Tooltip title="Không thể xóa phiếu đã giải ngân">
              <Button 
                size="small"
                danger
                disabled
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          ) : (
            <Popconfirm
              title="Xóa phiếu thanh toán"
              description="Bạn có chắc muốn xóa phiếu này? Hành động này không thể hoàn tác."
              onConfirm={() => deleteMutation.mutate(record.id)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true, loading: deleteMutation.isPending }}
            >
              <Button 
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  // Filtering payments based on client-side search text (since search is client side or via API)
  const filteredPayments = payments.filter(p => {
    if (!searchText) return true;
    const searchLower = searchText.toLowerCase();
    return (
      p.payment_code?.toLowerCase().includes(searchLower) ||
      p.title?.toLowerCase().includes(searchLower) ||
      p.client_contract?.contract_code?.toLowerCase().includes(searchLower) ||
      p.sub_contract?.contract_code?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div style={{ width: '100%', paddingBottom: 50 }}>
      {/* Dynamic Styling */}
      <style>{`
        .finance-card {
          border-radius: 12px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.04);
          border: 1px solid #f0f0f0;
          transition: all 0.3s ease;
        }
        .finance-card:hover {
          box-shadow: 0 6px 15px rgba(0, 0, 0, 0.08);
          transform: translateY(-2px);
        }
        .kpi-title {
          font-size: 13px;
          color: #8c8c8c;
          font-weight: 500;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .kpi-value {
          font-size: 28px;
          font-weight: 800;
          color: #1f1f1f;
        }
        .filter-section {
          background-color: #fff;
          padding: 16px 24px;
          border-radius: 8px;
          border: 1px solid #f0f0f0;
          margin-bottom: 24px;
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          align-items: center;
          justify-content: space-between;
        }
        .antd-custom-table .ant-table-thead > tr > th {
          background-color: #fafafa;
          font-weight: 700;
          color: #262626;
        }
      `}</style>

      {/* Page Title */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, fontWeight: 800 }}>Quản lý Tài chính</Title>
        <Text type="secondary" style={{ fontSize: 14 }}>Quản lý dòng tiền, phiếu thu, phiếu chi và tổng hợp công nợ toàn hệ thống.</Text>
      </div>

      {/* KPI Cards Grid */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        {/* Card 1: Tổng dư quỹ */}
        <Col xs={24} md={8}>
          <Card className="finance-card" loading={loadingStats}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="kpi-title">Tổng dư quỹ thực tế</div>
                <div className="kpi-value" style={{ color: stats.fund_balance >= 0 ? '#52c41a' : '#ff4d4f' }}>
                  {formatShortCurrency(stats.fund_balance)}
                </div>
                <div style={{ fontSize: 12, color: '#bfbfbf', marginTop: 4 }}>
                  Thu thực tế - Chi thực tế
                </div>
              </div>
              <div style={{ 
                width: 48, 
                height: 48, 
                borderRadius: '50%', 
                background: stats.fund_balance >= 0 ? '#f6ffed' : '#fff2f0', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <WalletOutlined style={{ fontSize: 22, color: stats.fund_balance >= 0 ? '#52c41a' : '#ff4d4f' }} />
              </div>
            </div>
          </Card>
        </Col>

        {/* Card 2: Tổng Phải Thu */}
        <Col xs={24} md={8}>
          <Card className="finance-card" loading={loadingStats}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="kpi-title">Tổng Phải Thu (Công nợ KH)</div>
                <div className="kpi-value" style={{ color: '#1890ff' }}>
                  {formatShortCurrency(stats.total_receivable)}
                </div>
                <div style={{ fontSize: 12, color: '#bfbfbf', marginTop: 4 }}>
                  Chưa thu từ các hợp đồng dự án
                </div>
              </div>
              <div style={{ 
                width: 48, 
                height: 48, 
                borderRadius: '50%', 
                background: '#e6f7ff', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <ArrowUpOutlined style={{ fontSize: 22, color: '#1890ff' }} />
              </div>
            </div>
          </Card>
        </Col>

        {/* Card 3: Tổng Phải Trả */}
        <Col xs={24} md={8}>
          <Card className="finance-card" loading={loadingStats}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="kpi-title">Tổng Phải Trả (Công nợ thầu phụ)</div>
                <div className="kpi-value" style={{ color: '#fa8c16' }}>
                  {formatShortCurrency(stats.total_payable)}
                </div>
                <div style={{ fontSize: 12, color: '#bfbfbf', marginTop: 4 }}>
                  Còn nợ các nhà thầu phụ dự án
                </div>
              </div>
              <div style={{ 
                width: 48, 
                height: 48, 
                borderRadius: '50%', 
                background: '#fff7e6', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <ArrowDownOutlined style={{ fontSize: 22, color: '#fa8c16' }} />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Main Content Card with Tabs */}
      <Card style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)' }}>
        <Tabs 
          activeKey={activeTab} 
          onChange={(key) => {
            setActiveTab(key);
            setSearchText('');
            setProjectFilter(undefined);
            setStatusFilter(undefined);
          }}
          size="large"
          tabBarStyle={{ marginBottom: 24, fontWeight: 600 }}
          items={[
            {
              key: '1',
              label: 'Danh sách Phiếu Thu',
              children: (
                <>
                  {/* Filters bar */}
                  <div className="filter-section">
                    <Space size="middle" style={{ flex: 1, minWidth: 280 }} wrap>
                      <Input 
                        placeholder="Tìm kiếm mã phiếu..." 
                        prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />} 
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        style={{ width: 250, borderRadius: 6 }}
                        allowClear
                      />
                      <Select 
                        placeholder="Lọc theo dự án" 
                        style={{ width: 220 }}
                        value={projectFilter}
                        onChange={setProjectFilter}
                        allowClear
                      >
                        {projects.map(proj => (
                          <Option key={proj.id} value={proj.id}>{proj.name}</Option>
                        ))}
                      </Select>
                      <Select 
                        placeholder="Trạng thái" 
                        style={{ width: 150 }}
                        value={statusFilter}
                        onChange={setStatusFilter}
                        allowClear
                      >
                        <Option value="PENDING">Chờ duyệt</Option>
                        <Option value="COMPLETED">Đã giải ngân</Option>
                      </Select>
                    </Space>
                    
                    <Button 
                      type="primary" 
                      icon={<PlusOutlined />} 
                      style={{ height: 38, borderRadius: 6, fontWeight: 600 }}
                      onClick={() => openCreateModal('REVENUE')}
                    >
                      Tạo phiếu thu
                    </Button>
                  </div>

                  {/* Table */}
                  <Table 
                    className="antd-custom-table"
                    columns={paymentColumns}
                    dataSource={filteredPayments}
                    loading={loadingPayments}
                    rowKey="id"
                    tableLayout="fixed"
                    scroll={{ x: 1580 }}
                    pagination={{
                      pageSize: 10,
                      showTotal: (total, range) => `Hiển thị ${range[0]}-${range[1]} trong số ${total} phiếu thu`
                    }}
                  />
                </>
              )
            },
            {
              key: '2',
              label: 'Danh sách Phiếu Chi',
              children: (
                <>
                  {/* Filters bar */}
                  <div className="filter-section">
                    <Space size="middle" style={{ flex: 1, minWidth: 280 }} wrap>
                      <Input 
                        placeholder="Tìm kiếm mã phiếu..." 
                        prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />} 
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        style={{ width: 250, borderRadius: 6 }}
                        allowClear
                      />
                      <Select 
                        placeholder="Lọc theo dự án" 
                        style={{ width: 220 }}
                        value={projectFilter}
                        onChange={setProjectFilter}
                        allowClear
                      >
                        {projects.map(proj => (
                          <Option key={proj.id} value={proj.id}>{proj.name}</Option>
                        ))}
                      </Select>
                      <Select 
                        placeholder="Trạng thái" 
                        style={{ width: 150 }}
                        value={statusFilter}
                        onChange={setStatusFilter}
                        allowClear
                      >
                        <Option value="PENDING">Chờ duyệt</Option>
                        <Option value="COMPLETED">Đã giải ngân</Option>
                      </Select>
                    </Space>
                    
                    <Button 
                      type="primary" 
                      icon={<PlusOutlined />} 
                      style={{ height: 38, borderRadius: 6, fontWeight: 600 }}
                      onClick={() => openCreateModal('COST')}
                    >
                      Tạo phiếu chi
                    </Button>
                  </div>

                  {/* Table */}
                  <Table 
                    className="antd-custom-table"
                    columns={paymentColumns}
                    dataSource={filteredPayments}
                    loading={loadingPayments}
                    rowKey="id"
                    tableLayout="fixed"
                    scroll={{ x: 1580 }}
                    pagination={{
                      pageSize: 10,
                      showTotal: (total, range) => `Hiển thị ${range[0]}-${range[1]} trong số ${total} phiếu chi`
                    }}
                  />
                </>
              )
            },
            {
              key: '3',
              label: 'Sổ công nợ',
              children: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                  {/* Part A: Công nợ khách hàng (Phải Thu) */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <Title level={4} style={{ margin: 0, color: '#1f1f1f', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ArrowUpOutlined style={{ color: '#1890ff' }} />
                        Công nợ Khách hàng (Khoản phải thu từ chủ đầu tư)
                      </Title>
                    </div>
                    
                    <Table 
                      className="antd-custom-table"
                      loading={loadingClientContracts}
                      dataSource={clientContracts}
                      rowKey="id"
                      tableLayout="fixed"
                      scroll={{ x: 1420 }}
                      columns={[
                        {
                          title: 'Mã hợp đồng',
                          dataIndex: 'contract_code',
                          key: 'contract_code',
                          width: 150,
                          render: (text) => <Text strong style={{ whiteSpace: 'nowrap' }}>{text}</Text>
                        },
                        {
                          title: 'Tên hợp đồng',
                          dataIndex: 'contract_name',
                          key: 'contract_name',
                          width: 220,
                          ellipsis: true,
                        },
                        {
                          title: 'Dự án',
                          key: 'project',
                          width: 220,
                          ellipsis: true,
                          render: (_, record) => record.project?.name || <Text type="secondary">—</Text>
                        },
                        {
                          title: 'Khách hàng',
                          key: 'customer',
                          width: 180,
                          ellipsis: true,
                          render: (_, record) => record.project?.customer?.full_name || record.project?.customer?.user?.full_name || 'Khách hàng'
                        },
                        {
                          title: 'Giá trị hợp đồng thực tế',
                          dataIndex: 'actual_value',
                          key: 'actual_value',
                          width: 180,
                          render: (val) => <Text strong style={{ whiteSpace: 'nowrap' }}>{formatFullCurrency(val)}</Text>
                        },
                        {
                          title: 'Đã thực thu',
                          dataIndex: 'received_amount',
                          key: 'received_amount',
                          width: 150,
                          render: (val) => <Text style={{ color: '#52c41a', fontWeight: 500, whiteSpace: 'nowrap' }}>{formatFullCurrency(val)}</Text>
                        },
                        {
                          title: 'Còn phải thu',
                          dataIndex: 'remaining_amount',
                          key: 'remaining_amount',
                          width: 160,
                          render: (val) => <Text style={{ color: val > 0 ? '#1890ff' : '#8c8c8c', fontWeight: 700, whiteSpace: 'nowrap' }}>{formatFullCurrency(val)}</Text>
                        },
                        {
                          title: 'Thao tác',
                          key: 'action',
                          align: 'right',
                          width: 120,
                          render: (_, record) => (
                            <Button 
                              type="primary" 
                              size="small" 
                              onClick={() => handleCreatePaymentFromDebt('REVENUE', record.id)}
                              disabled={record.remaining_amount <= 0}
                            >
                              Thu tiền
                            </Button>
                          )
                        }
                      ]}
                      pagination={{ pageSize: 5 }}
                    />
                  </div>

                  <Divider />

                  {/* Part B: Công nợ nhà thầu phụ (Phải Trả) */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <Title level={4} style={{ margin: 0, color: '#1f1f1f', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ArrowDownOutlined style={{ color: '#fa8c16' }} />
                        Công nợ Nhà thầu phụ (Khoản phải trả phụ thầu)
                      </Title>
                    </div>

                    <Table 
                      className="antd-custom-table"
                      loading={loadingSubContracts}
                      dataSource={subContracts}
                      rowKey="id"
                      tableLayout="fixed"
                      scroll={{ x: 1420 }}
                      columns={[
                        {
                          title: 'Mã hợp đồng thầu phụ',
                          dataIndex: 'contract_code',
                          key: 'contract_code',
                          width: 160,
                          render: (text) => <Text strong style={{ whiteSpace: 'nowrap' }}>{text}</Text>
                        },
                        {
                          title: 'Tên hợp đồng',
                          dataIndex: 'contract_name',
                          key: 'contract_name',
                          width: 220,
                          ellipsis: true,
                        },
                        {
                          title: 'Dự án',
                          key: 'project',
                          width: 220,
                          ellipsis: true,
                          render: (_, record) => record.project?.name || <Text type="secondary">—</Text>
                        },
                        {
                          title: 'Giá trị hợp đồng thực tế',
                          dataIndex: 'actual_value',
                          key: 'actual_value',
                          width: 180,
                          render: (val) => <Text strong style={{ whiteSpace: 'nowrap' }}>{formatFullCurrency(val)}</Text>
                        },
                        {
                          title: 'Đã thực chi',
                          dataIndex: 'paid_amount',
                          key: 'paid_amount',
                          width: 150,
                          render: (val) => <Text style={{ color: '#fa8c16', fontWeight: 500, whiteSpace: 'nowrap' }}>{formatFullCurrency(val)}</Text>
                        },
                        {
                          title: 'Còn phải chi/trả',
                          dataIndex: 'remaining_amount',
                          key: 'remaining_amount',
                          width: 160,
                          render: (val) => <Text style={{ color: val > 0 ? '#f5222d' : '#8c8c8c', fontWeight: 700, whiteSpace: 'nowrap' }}>{formatFullCurrency(val)}</Text>
                        },
                        {
                          title: 'Thao tác',
                          key: 'action',
                          align: 'right',
                          width: 120,
                          render: (_, record) => {
                            const isTerminated = isTerminatedSubContract(record);
                            const disabledReason = isTerminated
                              ? 'Hợp đồng thầu phụ đã bị hủy, không thể lập phiếu chi'
                              : record.remaining_amount <= 0
                                ? 'Hợp đồng không còn công nợ phải chi'
                                : '';

                            return (
                              <Tooltip title={disabledReason}>
                                <span>
                                  <Button
                                    type="primary"
                                    size="small"
                                    onClick={() => handleCreatePaymentFromDebt('COST', record.id)}
                                    disabled={isTerminated || record.remaining_amount <= 0}
                                    style={{ backgroundColor: '#fa8c16', borderColor: '#fa8c16' }}
                                  >
                                    Chi tiền
                                  </Button>
                                </span>
                              </Tooltip>
                            );
                          }
                        }
                      ]}
                      pagination={{ pageSize: 5 }}
                    />
                  </div>
                </div>
              )
            }
          ]}
        />
      </Card>

      {/* Create / Edit Modal */}
      <Modal
        title={
          <Text style={{ fontSize: 18, fontWeight: 700 }}>
            {editingPayment ? 'Cập nhật phiếu thanh toán' : (paymentType === 'REVENUE' ? 'Tạo phiếu thu' : 'Tạo phiếu chi')}
          </Text>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnClose
        width={paymentType === 'COST' && watchedSubContractId ? 850 : 600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFormSubmit}
          style={{ marginTop: 20 }}
        >
          {/* Title */}
          <Form.Item
            name="title"
            label="Nội dung thanh toán"
            rules={[{ required: true, message: 'Vui lòng nhập nội dung phiếu' }]}
          >
            <Input placeholder="Ví dụ: Tạm ứng đợt 1 / Thanh toán khối lượng hoàn thành" size="large" />
          </Form.Item>

          {/* Associated Contract */}
          {paymentType === 'REVENUE' ? (
            <Form.Item
              name="client_contract_id"
              label="Hợp đồng chủ đầu tư (Dự án)"
              rules={[{ required: true, message: 'Vui lòng chọn hợp đồng khách hàng' }]}
            >
              <Select placeholder="Chọn hợp đồng thu tiền" size="large" showSearch optionFilterProp="children">
                {clientContracts.map(contract => (
                  <Option key={contract.id} value={contract.id} disabled={contract.project?.status === 'COMPLETED'}>
                    {contract.contract_code} - {contract.contract_name} ({contract.project?.name || 'Chưa gán dự án'}) {contract.project?.status === 'COMPLETED' ? '(Dự án đã hoàn thành)' : ''}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          ) : (
            <Form.Item
              name="sub_contract_id"
              label="Hợp đồng nhà thầu phụ"
              rules={[{ required: false }]}
            >
              <Select 
                placeholder="Chọn hợp đồng chi tiền thầu phụ"
                size="large" 
                showSearch 
                optionFilterProp="children" 
                allowClear
                onChange={handleSubContractChange}
              >
                {subContracts.map(contract => {
                  const isTerminated = isTerminatedSubContract(contract);
                  const isProjectCompleted = contract.project?.status === 'COMPLETED';

                  return (
                    <Option key={contract.id} value={contract.id} disabled={isProjectCompleted || isTerminated}>
                      {contract.contract_code} - {contract.contract_name} ({contract.project?.name || 'Chưa gán dự án'}) {isProjectCompleted ? '(Dự án đã hoàn thành)' : ''} {isTerminated ? '(Hợp đồng đã hủy)' : ''}
                  </Option>
                  );
                })}
              </Select>
            </Form.Item>
          )}

          {/* Allocations Table */}
          {paymentType === 'COST' && watchedSubContractId && (
            <div style={{ marginBottom: 24, padding: '16px', background: '#fafafa', borderRadius: '8px', border: '1px solid #f0f0f0' }}>
              <div style={{ marginBottom: 12 }}>
                <Text strong style={{ fontSize: 14 }}>Phân bổ thanh toán cho các công việc thầu phụ</Text>
                <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                  Chọn các công việc đã nghiệm thu để chi trả. Số tiền chi đợt này không được vượt quá giá trị còn lại.
                </div>
              </div>
              <Table
                size="small"
                loading={loadingTasks}
                dataSource={eligibleTasks}
                rowKey="id"
                pagination={false}
                rowSelection={{
                  type: 'checkbox',
                  selectedRowKeys: selectedTaskIds,
                  onChange: (selectedRowKeys) => {
                    setSelectedTaskIds(selectedRowKeys);
                    const newAllocations = { ...taskAllocations };
                    Object.keys(newAllocations).forEach(key => {
                      if (!selectedRowKeys.includes(Number(key)) && !selectedRowKeys.includes(String(key))) {
                        delete newAllocations[key];
                      }
                    });
                    selectedRowKeys.forEach(key => {
                      if (newAllocations[key] === undefined || newAllocations[key] === null) {
                        const task = eligibleTasks.find(t => t.id === Number(key) || t.id === String(key));
                        if (task) {
                          const { remaining } = getTaskFinancials(task);
                          newAllocations[key] = remaining;
                        } else {
                          newAllocations[key] = 0;
                        }
                      }
                    });
                    setTaskAllocations(newAllocations);
                    
                    const total = Object.values(newAllocations).reduce((sum, val) => sum + parseFloat(val || 0), 0);
                    form.setFieldsValue({ amount: total });
                  }
                }}
                columns={[
                  {
                    title: 'Nhà thầu phụ',
                    key: 'subcontractor',
                    render: (_, record) => {
                      return record.contractor_detail?.subcontractor?.name || record.contractor_detail?.subcontractor?.user?.full_name || '—';
                    }
                  },
                  {
                    title: 'Công việc',
                    key: 'task_name',
                    render: (_, record) => (
                      <div>
                        <Text strong style={{ fontSize: 12 }}>{record.detail_name}</Text>
                        {record.task && (
                          <div style={{ fontSize: 10, color: '#8c8c8c' }}>Hạng mục: {record.task.task_name}</div>
                        )}
                      </div>
                    )
                  },
                  {
                    title: 'Giá trị gốc',
                    key: 'total_value',
                    align: 'right',
                    render: (_, record) => {
                      const { totalValue } = getTaskFinancials(record);
                      return <span>{formatFullCurrency(totalValue)}</span>;
                    }
                  },
                  {
                    title: 'Đã trả trước đây',
                    key: 'previously_paid',
                    align: 'right',
                    render: (_, record) => {
                      const { previouslyPaid } = getTaskFinancials(record);
                      return <span style={{ color: '#52c41a' }}>{formatFullCurrency(previouslyPaid)}</span>;
                    }
                  },
                  {
                    title: 'Còn lại',
                    key: 'remaining',
                    align: 'right',
                    render: (_, record) => {
                      const { remaining } = getTaskFinancials(record);
                      return <span style={{ color: '#fa8c16', fontWeight: 600 }}>{formatFullCurrency(remaining)}</span>;
                    }
                  },
                  {
                    title: 'Chi đợt này',
                    key: 'allocated_amount',
                    width: 150,
                    render: (_, record) => {
                      const isSelected = selectedTaskIds.includes(record.id);
                      const { remaining } = getTaskFinancials(record);
                      return (
                        <Input
                          disabled={!isSelected}
                          value={taskAllocations[record.id] ?? ''}
                          onChange={(e) => {
                            // Strip all non-digits
                            const cleanValStr = e.target.value.replace(/[^0-9]/g, '');
                            let value = parseFloat(cleanValStr);
                            if (isNaN(value)) value = 0;
                            if (value < 0) value = 0;
                            if (value > remaining) {
                              value = remaining;
                              message.warning('Số tiền chi không được vượt quá số dư còn lại');
                            }
                            const newAllocations = {
                              ...taskAllocations,
                              [record.id]: value
                            };
                            setTaskAllocations(newAllocations);
                            
                            const total = Object.values(newAllocations).reduce((sum, val) => sum + parseFloat(val || 0), 0);
                            form.setFieldsValue({ amount: total });
                          }}
                          style={{ width: '100%' }}
                          suffix="đ"
                        />
                      );
                    }
                  }
                ]}
              />
            </div>
          )}

          <Row gutter={16}>
            {/* Amount */}
            <Col span={12}>
              <Form.Item
                name="amount"
                label="Số tiền (VNĐ)"
                rules={[
                  { required: true, message: 'Vui lòng nhập số tiền' },
                  {
                    validator: (_, value) => {
                      if (value) {
                        const rawVal = String(value);
                        const cleanVal = rawVal.includes('.') ? Math.round(parseFloat(rawVal)) : (parseFloat(rawVal.replace(/[^0-9]/g, '')) || 0);
                        if (isNaN(cleanVal) || cleanVal <= 0) {
                          return Promise.reject(new Error('Số tiền phải lớn hơn 0'));
                        }
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <Input 
                  placeholder="Nhập số tiền giao dịch" 
                  size="large" 
                  suffix="đ" 
                  disabled={paymentType === 'COST' && !!watchedSubContractId}
                  onChange={(e) => {
                    // Keep only digits dynamically
                    const val = e.target.value;
                    const cleaned = val.replace(/[^0-9]/g, '');
                    form.setFieldsValue({ amount: cleaned });
                  }}
                />
              </Form.Item>
            </Col>

            {/* Date */}
            <Col span={12}>
              <Form.Item
                name="payment_date"
                label="Ngày thực hiện"
                rules={[{ required: true, message: 'Vui lòng chọn ngày giao dịch' }]}
              >
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" size="large" />
              </Form.Item>
            </Col>
          </Row>

          {/* Status */}
          <Form.Item
            name="status"
            label="Trạng thái"
            rules={[{ required: true, message: 'Vui lòng chọn trạng thái' }]}
          >
            <Select size="large">
              <Option value="PENDING">Chờ duyệt</Option>
              <Option value="COMPLETED">Đã giải ngân</Option>
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: 24 }}>
            <Button onClick={() => setIsModalOpen(false)} style={{ marginRight: 8 }}>
              Hủy
            </Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={createMutation.isPending || updateMutation.isPending}
            >
              Lưu phiếu
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Details View Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ProfileOutlined style={{ color: '#1677ff', fontSize: 20 }} />
            <span style={{ fontWeight: 700, fontSize: 18 }}>Chi tiết phiếu thanh toán</span>
          </div>
        }
        open={isDetailOpen}
        onCancel={() => {
          setIsDetailOpen(false);
          setSelectedPaymentDetails(null);
        }}
        footer={[
          <Button key="close" type="primary" onClick={() => setIsDetailOpen(false)}>
            Đóng
          </Button>
        ]}
        width={650}
      >
        {selectedPaymentDetails && (
          <div style={{ marginTop: 20 }}>
            <Descriptions bordered column={1} size="middle">
              <Descriptions.Item label={<span style={{ fontWeight: 600 }}><NumberOutlined /> Mã phiếu</span>}>
                <Text strong style={{ color: '#1677ff' }}>{selectedPaymentDetails.payment_code}</Text>
              </Descriptions.Item>
              
              <Descriptions.Item label={<span style={{ fontWeight: 600 }}>Loại phiếu</span>}>
                <Tag color={selectedPaymentDetails.payment_type === 'REVENUE' ? 'blue' : 'volcano'} style={{ fontWeight: 700 }}>
                  {selectedPaymentDetails.payment_type === 'REVENUE' ? 'PHIẾU THU' : 'PHIẾU CHI'}
                </Tag>
              </Descriptions.Item>

              <Descriptions.Item label={<span style={{ fontWeight: 600 }}>Nội dung</span>}>
                <Text>{selectedPaymentDetails.title}</Text>
              </Descriptions.Item>

              <Descriptions.Item label={<span style={{ fontWeight: 600 }}>Số tiền</span>}>
                <Text strong style={{ fontSize: 16, color: '#f5222d' }}>
                  {formatFullCurrency(selectedPaymentDetails.amount)}
                </Text>
              </Descriptions.Item>

              <Descriptions.Item label={<span style={{ fontWeight: 600 }}><CalendarOutlined /> Ngày thanh toán</span>}>
                {selectedPaymentDetails.payment_date ? dayjs(selectedPaymentDetails.payment_date).format('DD/MM/YYYY') : '—'}
              </Descriptions.Item>

              <Descriptions.Item label={<span style={{ fontWeight: 600 }}>Trạng thái</span>}>
                {renderStatusTag(selectedPaymentDetails.status)}
              </Descriptions.Item>

              {/* Conditionally show Client Contract Info */}
              {selectedPaymentDetails.client_contract && (
                <Descriptions.Item label={<span style={{ fontWeight: 600 }}>Hợp đồng Khách hàng</span>}>
                  <div>
                    <Text strong>{selectedPaymentDetails.client_contract.contract_code}</Text> - {selectedPaymentDetails.client_contract.contract_name}
                    {selectedPaymentDetails.client_contract.project && (
                      <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                        Dự án: <Text type="primary">{selectedPaymentDetails.client_contract.project.name}</Text>
                      </div>
                    )}
                  </div>
                </Descriptions.Item>
              )}

              {/* Conditionally show Sub Contract Info */}
              {selectedPaymentDetails.sub_contract && (
                <Descriptions.Item label={<span style={{ fontWeight: 600 }}>Hợp đồng Thầu phụ</span>}>
                  <div>
                    <Text strong>{selectedPaymentDetails.sub_contract.contract_code}</Text> - {selectedPaymentDetails.sub_contract.contract_name}
                    {selectedPaymentDetails.sub_contract.project && (
                      <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                        Dự án: <Text type="primary">{selectedPaymentDetails.sub_contract.project.name}</Text>
                      </div>
                    )}
                  </div>
                </Descriptions.Item>
              )}

              {/* Conditionally show Customer details */}
              {selectedPaymentDetails.client_contract?.project?.customer && (
                <Descriptions.Item label={<span style={{ fontWeight: 600 }}><TeamOutlined /> Khách hàng</span>}>
                  <Text>{selectedPaymentDetails.client_contract.project.customer.full_name || selectedPaymentDetails.client_contract.project.customer.user?.full_name}</Text>
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* Conditionally show payment allocations table */}
            {selectedPaymentDetails.payment_task_details && selectedPaymentDetails.payment_task_details.length > 0 && (
              <>
                <Divider style={{ margin: '20px 0 12px 0' }} />
                <div style={{ marginBottom: 12 }}>
                  <Text strong style={{ fontSize: 14 }}>
                    <ProfileOutlined style={{ marginRight: 8, color: '#fa8c16' }} />
                    Danh sách công việc được phân bổ chi trả
                  </Text>
                </div>
                <Table
                  size="small"
                  pagination={false}
                  dataSource={selectedPaymentDetails.payment_task_details}
                  rowKey="id"
                  columns={[
                    {
                      title: 'STT',
                      key: 'stt',
                      width: 50,
                      render: (_, __, idx) => idx + 1
                    },
                    {
                      title: 'Nhà thầu phụ',
                      key: 'subcontractor',
                      render: (_, item) => {
                        return item.task_detail?.contractor_detail?.subcontractor?.name || item.task_detail?.contractor_detail?.subcontractor?.user?.full_name || '—';
                      }
                    },
                    {
                      title: 'Tên công việc',
                      key: 'task_name',
                      render: (_, item) => (
                        <div>
                          <Text strong style={{ fontSize: 12 }}>{item.task_detail?.detail_name || 'Công việc'}</Text>
                          {item.task_detail?.task && (
                            <div style={{ fontSize: 10, color: '#8c8c8c' }}>Hạng mục: {item.task_detail.task.task_name}</div>
                          )}
                        </div>
                      )
                    },
                    {
                      title: 'Số tiền chi đợt này',
                      dataIndex: 'allocated_amount',
                      key: 'allocated_amount',
                      align: 'right',
                      render: (val) => <Text strong style={{ color: '#fa8c16' }}>{formatFullCurrency(val)}</Text>
                    }
                  ]}
                />
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default FinanceManagement;
