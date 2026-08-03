import React, { useState, useEffect } from 'react';
import { 
  Typography, Card, Row, Col, Table, Button, Tag, 
  Modal, Form, Input, Select, message, Space, Progress, Divider, Tooltip, Empty, Spin
} from 'antd';
import { 
  CheckOutlined, CloseOutlined, CalendarOutlined, 
  UserOutlined, ExclamationCircleOutlined, CheckSquareOutlined,
  FileSearchOutlined, EyeOutlined, EyeInvisibleOutlined,
  BarChartOutlined, CheckCircleOutlined, DownloadOutlined,
  FileTextOutlined, CloudDownloadOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import projectService from '../../services/projectService';
import { getCleanImageUrl } from '../../services/api';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

const formatCurrency = (value) => {
  if (!value) return '0 VNĐ';
  const numVal = Number(value);
  return new Intl.NumberFormat('vi-VN').format(numVal) + ' VNĐ';
};

const AcceptanceManagement = () => {
  const queryClient = useQueryClient();
  const [selectedProject, setSelectedProject] = useState('ALL');
  const [selectedParentTask, setSelectedParentTask] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  
  // Modal states
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isRejectModalVisible, setIsRejectModalVisible] = useState(false);
  const [rejectForm] = Form.useForm();
  
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);
  
  // Logs view modal state
  const [isLogsModalVisible, setIsLogsModalVisible] = useState(false);
  const [selectedChildTask, setSelectedChildTask] = useState(null);
  const [logsList, setLogsList] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Document acceptance report preview modal
  const [isDocModalVisible, setIsDocModalVisible] = useState(false);
  const [selectedParentDoc, setSelectedParentDoc] = useState(null);

  // Query raw requests (all child task details)
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['acceptanceRequests'],
    queryFn: () => projectService.getAcceptanceRequests()
  });

  // Mutations
  const approveMutation = useMutation({
    mutationFn: ({ id, data }) => projectService.updateTaskDetail(id, data),
    onSuccess: () => {
      message.success('Phê duyệt nghiệm thu công việc thành công!');
      queryClient.invalidateQueries(['acceptanceRequests']);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Lỗi hệ thống khi phê duyệt.');
    }
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, data }) => projectService.updateTaskDetail(id, data),
    onSuccess: () => {
      message.success('Bác bỏ yêu cầu nghiệm thu thành công!');
      setIsRejectModalVisible(false);
      rejectForm.resetFields();
      setSelectedRecord(null);
      queryClient.invalidateQueries(['acceptanceRequests']);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Lỗi hệ thống khi bác bỏ.');
    }
  });

  // Handlers
  const handleApprove = (record) => {
    Modal.confirm({
      title: 'Xác nhận phê duyệt nghiệm thu?',
      icon: <ExclamationCircleOutlined style={{ color: '#10b981' }} />,
      content: `Bạn có chắc chắn muốn duyệt nghiệm thu công việc "${record.detail_name}"? Sau khi duyệt, khối lượng sẽ được ghi nhận chính thức và khóa chỉnh sửa nhật ký thi công.`,
      okText: 'Phê duyệt',
      okButtonProps: { style: { backgroundColor: '#10b981', borderColor: '#10b981', fontWeight: 600 } },
      cancelText: 'Hủy',
      onOk: () => {
        approveMutation.mutate({
          id: record.id,
          data: {
            detail_name: record.detail_name,
            work_volume: record.work_volume,
            agreed_price: record.agreed_price,
            progress_percent: record.progress_percent,
            status: record.status,
            acceptance_status: 'APPROVED',
            start_date: record.start_date,
            end_date: record.end_date
          }
        });
      }
    });
  };

  const handleOpenRejectModal = (record) => {
    setSelectedRecord(record);
    rejectForm.resetFields();
    setIsRejectModalVisible(true);
  };

  const handleRejectSubmit = (values) => {
    if (!selectedRecord) return;
    rejectMutation.mutate({
      id: selectedRecord.id,
      data: {
        detail_name: selectedRecord.detail_name,
        work_volume: selectedRecord.work_volume,
        agreed_price: selectedRecord.agreed_price,
        progress_percent: selectedRecord.progress_percent,
        status: selectedRecord.status,
        acceptance_status: 'REJECTED',
        rejection_note: values.rejection_note,
        start_date: selectedRecord.start_date,
        end_date: selectedRecord.end_date
      }
    });
  };

  const handleExpand = (recordId) => {
    if (expandedRowKeys.includes(recordId)) {
      setExpandedRowKeys(expandedRowKeys.filter(key => key !== recordId));
    } else {
      setExpandedRowKeys([...expandedRowKeys, recordId]);
    }
  };

  const handleViewLogs = async (childRecord) => {
    setSelectedChildTask(childRecord);
    setIsLogsModalVisible(true);
    setLogsLoading(true);
    try {
      const logs = await projectService.getConstructionLogs(childRecord.id);
      setLogsList(logs || []);
    } catch (err) {
      message.error('Không thể tải danh sách nhật ký thi công.');
    } finally {
      setLogsLoading(false);
    }
  };

  const handleShowRejectionReason = (childRecord) => {
    Modal.info({
      title: 'Chi tiết lý do từ chối nghiệm thu',
      icon: <InfoCircleOutlined style={{ color: '#ef4444' }} />,
      width: 500,
      content: (
        <div style={{ marginTop: '16px' }}>
          <p><strong>Công việc con:</strong> {childRecord.detail_name}</p>
          <p style={{ marginBottom: '8px' }}><strong>Nội dung phản hồi lỗi kỹ thuật:</strong></p>
          <div style={{ backgroundColor: '#fff7ed', borderLeft: '4px solid #f97316', padding: '12px', borderRadius: '4px' }}>
            <Text style={{ color: '#ea580c', fontStyle: 'italic' }}>
              {childRecord.rejection_note || 'Không có lý do chi tiết.'}
            </Text>
          </div>
        </div>
      ),
      okText: 'Đóng'
    });
  };

  const handleShowDocModal = (parentTask) => {
    setSelectedParentDoc(parentTask);
    setIsDocModalVisible(true);
  };

  // Group child tasks (requests) under parent tasks (ProjectTask)
  const parentTaskMap = {};
  requests.forEach(detail => {
    const pTask = detail.task;
    if (!pTask) return;
    const pTaskId = pTask.id;
    if (!parentTaskMap[pTaskId]) {
      parentTaskMap[pTaskId] = {
        id: pTaskId,
        task_name: pTask.task_name,
        project_name: pTask.project?.name || '---',
        project_category: pTask.project?.category?.name || '',
        status: pTask.status,
        progress_percent: pTask.progress_percent,
        details: []
      };
    }
    parentTaskMap[pTaskId].details.push(detail);
  });

  const parentTasksList = Object.values(parentTaskMap).map(parent => {
    const details = parent.details;
    const allApproved = details.length > 0 && details.every(d => d.acceptance_status === 'APPROVED');
    const anyPending = details.some(d => d.acceptance_status === 'PENDING');
    
    let computedStatus = 'DOING'; // "Chưa hoàn thành"
    if (allApproved) {
      computedStatus = 'APPROVED'; // "Đã nghiệm thu"
    } else if (anyPending) {
      computedStatus = 'PENDING'; // "Đang chờ nghiệm thu"
    }

    return {
      ...parent,
      computedStatus
    };
  });

  // Extract unique filter fields
  const projectOptions = Array.from(new Set(parentTasksList.map(p => p.project_name)));
  const taskOptions = selectedProject === 'ALL'
    ? Array.from(new Set(parentTasksList.map(p => p.task_name)))
    : Array.from(new Set(parentTasksList.filter(p => p.project_name === selectedProject).map(p => p.task_name)));

  // Reset selected task filter if selected project changes
  useEffect(() => {
    setSelectedParentTask('ALL');
  }, [selectedProject]);

  // Filter lists
  const filteredParentTasks = parentTasksList.filter(parent => {
    const matchProject = selectedProject === 'ALL' || parent.project_name === selectedProject;
    const matchParentTask = selectedParentTask === 'ALL' || parent.task_name === selectedParentTask;
    
    let matchStatus = true;
    if (selectedStatus !== 'ALL') {
      matchStatus = parent.status === selectedStatus;
    }
    return matchProject && matchParentTask && matchStatus;
  });

  // Calculate Metrics from original requests list
  const pendingCount = requests.filter(r => r.acceptance_status === 'PENDING').length;
  const approvedCount = requests.filter(r => r.acceptance_status === 'APPROVED').length;
  const rejectedCount = requests.filter(r => r.acceptance_status === 'REJECTED').length;
  const totalProcessed = approvedCount + rejectedCount;
  const passRate = totalProcessed > 0 ? ((approvedCount / totalProcessed) * 100).toFixed(1) : '0';

  // Nested Sub-Table column configuration
  const expandedRowRender = (parentRecord) => {
    const childColumns = [
      {
        title: 'TÊN CÔNG VIỆC CON',
        dataIndex: 'detail_name',
        key: 'detail_name',
        width: 240,
        render: (text) => <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '13px', display: 'block', whiteSpace: 'normal', lineHeight: 1.5 }}>{text}</span>
      },
      {
        title: 'NHÀ THẦU PHỤ',
        key: 'subcontractor',
        width: 180,
        render: (_, childRecord) => {
          const sub = childRecord.contractor_detail?.subcontractor;
          return <span style={{ color: '#475569', fontSize: '13px', display: 'block', whiteSpace: 'normal', lineHeight: 1.5 }}>{sub?.user?.full_name || 'N/A'}</span>;
        }
      },
      {
        title: 'ĐƠN VỊ',
        dataIndex: 'unit',
        key: 'unit',
        width: 90,
        align: 'center',
        render: (text) => <span style={{ color: '#475569', fontSize: '13px', whiteSpace: 'nowrap' }}>{text || '---'}</span>
      },
      {
        title: 'NHẬT KÝ',
        key: 'logs',
        width: 110,
        align: 'center',
        render: (_, childRecord) => (
          <a 
            href="#" 
            onClick={(e) => {
              e.preventDefault();
              handleViewLogs(childRecord);
            }}
            style={{ 
              color: '#9d4300', 
              fontWeight: 600, 
              fontSize: '13px',
              textDecoration: 'none',
              borderBottom: '1px dashed #9d4300',
              paddingBottom: '1px'
            }}
          >
            Xem chi tiết
          </a>
        )
      },
      {
        title: 'TIẾN ĐỘ',
        key: 'progress',
        width: 130,
        align: 'center',
        render: (_, childRecord) => {
          const percent = childRecord.progress_percent || 0;
          let color = percent >= 100 ? '#22C55E' : percent >= 50 ? '#F59E0B' : '#9d4300';
          
          if (childRecord.acceptance_status === 'REJECTED') {
            color = '#EF4444'; // Đỏ khi bị từ chối
          } else if (childRecord.acceptance_status === 'PENDING') {
            color = '#F59E0B'; // Cam khi đang chờ duyệt
          }
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ flex: 1, backgroundColor: '#e2e8f0', height: '6px', borderRadius: '9999px', overflow: 'hidden', maxWidth: '80px' }}>
                <div style={{ backgroundColor: color, height: '100%', width: `${Math.min(percent, 100)}%`, borderRadius: '9999px', transition: 'width 0.4s ease' }} />
              </div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>{percent}%</span>
            </div>
          );
        }
      },
      {
        title: 'TRẠNG THÁI CÔNG VIỆC',
        key: 'status',
        width: 160,
        align: 'center',
        render: (_, childRecord) => {
          const status = childRecord.status;
          const configs = {
            TODO: { text: 'Chưa thực hiện', color: 'default' },
            DOING: { text: 'Đang thực hiện', color: 'orange' },
            DONE: { text: 'Đã hoàn thành', color: 'success' },
            'Tạm dừng': { text: 'Tạm dừng', color: 'error' },
            CANCELLED: { text: 'Đã hủy', color: 'error' }
          };
          const config = configs[status] || { text: status, color: 'default' };
          return <Tag color={config.color} style={{ borderRadius: '4px', fontWeight: 600 }}>{config.text}</Tag>;
        }
      },
      {
        title: 'TRẠNG THÁI NGHIỆM THU',
        key: 'acceptance_status',
        width: 180,
        align: 'center',
        render: (_, childRecord) => {
          const percent = childRecord.progress_percent || 0;
          if (percent < 100) {
            return <Tag color="default" style={{ borderRadius: '4px', fontWeight: 600 }}>Chưa nghiệm thu</Tag>;
          }
          
          const accStatus = childRecord.acceptance_status;
          if (accStatus === 'APPROVED') {
            return (
              <span style={{ color: '#22C55E', fontWeight: 700, fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircleOutlined /> Đã nghiệm thu
              </span>
            );
          }
          if (accStatus === 'PENDING') {
            return <Tag color="warning" style={{ borderRadius: '4px', fontWeight: 600 }}>Chờ nghiệm thu</Tag>;
          }
          if (accStatus === 'REJECTED') {
            return (
              <Space size={4}>
                <Tag color="error" style={{ borderRadius: '4px', fontWeight: 600 }}>Bị từ chối</Tag>
                <Tooltip title="Xem chi tiết lý do lỗi kỹ thuật">
                  <Button 
                    size="small" 
                    type="link" 
                    danger 
                    onClick={() => handleShowRejectionReason(childRecord)}
                    style={{ padding: 0, height: 'auto', fontSize: '12px', textDecoration: 'underline' }}
                  >
                    Chi tiết
                  </Button>
                </Tooltip>
              </Space>
            );
          }
          return <Tag color="default" style={{ borderRadius: '4px', fontWeight: 600 }}>Chưa nghiệm thu</Tag>;
        }
      },
      {
        title: 'THAO TÁC',
        key: 'actions',
        width: 140,
        align: 'center',
        render: (_, childRecord) => {
          const isPending = childRecord.acceptance_status === 'PENDING';
          if (!isPending) return null;
          return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Tooltip title="Phê duyệt nghiệm thu">
                <button
                  onClick={() => handleApprove(childRecord)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#22C55E',
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 3px rgba(34, 197, 94, 0.3)'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.4)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(34, 197, 94, 0.3)'; }}
                >
                  <CheckOutlined style={{ fontSize: '14px' }} />
                </button>
              </Tooltip>
              <Tooltip title="Từ chối nghiệm thu">
                <button
                  onClick={() => handleOpenRejectModal(childRecord)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    border: '1px solid #fecaca',
                    backgroundColor: '#fef2f2',
                    color: '#EF4444',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  <CloseOutlined style={{ fontSize: '14px' }} />
                </button>
              </Tooltip>
            </div>
          );
        }
      }
    ];

    return (
      <div style={{ margin: '0 24px 16px 24px' }}>
        <Table
          dataSource={parentRecord.details}
          columns={childColumns}
          pagination={false}
          rowKey="id"
          className="nested-child-table"
          size="small"
          tableLayout="fixed"
          scroll={{ x: 1130 }}
        />
      </div>
    );
  };

  // Render status badge
  const renderStatusBadge = (status) => {
    const config = {
      TODO: { bg: '#f1f5f9', color: '#64748b', dotColor: '#94a3b8', text: 'Chưa thực hiện' },
      DOING: { bg: '#fff7ed', color: '#c2410c', dotColor: '#f97316', text: 'Đang thực hiện' },
      DONE: { bg: '#dcfce7', color: '#16a34a', dotColor: '#22C55E', text: 'Đã hoàn thành' }
    };
    const s = config[status] || { bg: '#f1f5f9', color: '#64748b', dotColor: '#94a3b8', text: status };
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '5px 14px',
        borderRadius: '9999px',
        backgroundColor: s.bg,
        color: s.color,
        fontSize: '13px',
        fontWeight: 600,
        lineHeight: '1.4'
      }}>
        <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: s.dotColor, flexShrink: 0 }} />
        {s.text}
      </span>
    );
  };

  // Main table column configuration
  const columns = [
    {
      title: 'HẠNG MỤC',
      key: 'task_name',
      width: 520,
      render: (_, record) => (
        <div style={{ padding: '2px 0' }}>
          <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a', marginBottom: '3px', lineHeight: '1.4', whiteSpace: 'normal' }}>
            {record.task_name}
          </div>
          <div style={{ color: '#64748b', fontSize: '13px', whiteSpace: 'normal', lineHeight: 1.5 }}>
            <span style={{ color: '#9d4300', fontWeight: 600 }}>{record.project_name}</span>
            {record.project_category && (
              <>
                <span style={{ margin: '0 6px', color: '#cbd5e1' }}>•</span>
                {record.project_category}
              </>
            )}
          </div>
        </div>
      )
    },
    {
      title: 'TRẠNG THÁI',
      key: 'status',
      width: 170,
      align: 'center',
      render: (_, record) => renderStatusBadge(record.status)
    },
    {
      title: 'THAO TÁC',
      key: 'actions',
      width: 140,
      align: 'center',
      render: (_, record) => {
        const isExpanded = expandedRowKeys.includes(record.id);
        const isApproved = record.status === 'DONE';
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <Tooltip title={isExpanded ? "Thu gọn danh sách" : "Xem chi tiết công việc con"}>
              <button
                onClick={() => handleExpand(record.id)}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  border: isExpanded ? 'none' : '1.5px solid #1e293b',
                  backgroundColor: isExpanded ? '#1e293b' : '#ffffff',
                  color: isExpanded ? '#ffffff' : '#1e293b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: isExpanded ? '0 4px 12px rgba(30, 41, 59, 0.25)' : '0 1px 3px rgba(0,0,0,0.08)'
                }}
                onMouseEnter={(e) => {
                  if (!isExpanded) {
                    e.currentTarget.style.backgroundColor = '#f1f5f9';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  } else {
                    e.currentTarget.style.backgroundColor = '#334155';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isExpanded) {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.transform = 'translateY(0)';
                  } else {
                    e.currentTarget.style.backgroundColor = '#1e293b';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                {isExpanded ? <EyeInvisibleOutlined style={{ fontSize: '16px' }} /> : <EyeOutlined style={{ fontSize: '16px' }} />}
              </button>
            </Tooltip>

          </div>
        );
      }
    }
  ];

  return (
    <div style={{ width: '100%', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {styleTag}
      
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ margin: 0, fontWeight: 800, color: '#0f172a', fontSize: '22px', lineHeight: '1.3' }}>
          Quản lý nghiệm thu
        </h2>
        <p style={{ margin: '6px 0 0 0', color: '#64748b', fontSize: '14px' }}>
          Kiểm tra và phê duyệt các hạng mục thi công tại công trình.
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '28px' }}>
        {/* Card 1: Chờ nghiệm thu */}
        <div className="kpi-card" style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Chờ nghiệm thu
            </span>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckSquareOutlined style={{ fontSize: '18px', color: '#F59E0B' }} />
            </div>
          </div>
          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '36px', fontWeight: 800, color: '#0f172a', lineHeight: '1' }}>
              {isLoading ? <Spin size="small" /> : pendingCount}
            </div>
            <span style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px', display: 'block' }}>
              Hạng mục cần phê duyệt ngay
            </span>
          </div>
        </div>

        {/* Card 2: Đã hoàn thành */}
        <div className="kpi-card" style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Đã hoàn thành (Tháng)
            </span>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircleOutlined style={{ fontSize: '18px', color: '#22C55E' }} />
            </div>
          </div>
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <span style={{ fontSize: '36px', fontWeight: 800, color: '#0f172a', lineHeight: '1' }}>
                {isLoading ? <Spin size="small" /> : approvedCount}
              </span>
              {approvedCount > 0 && (
                <span style={{ 
                  fontSize: '13px', 
                  fontWeight: 700, 
                  color: '#22C55E',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2px'
                }}>
                  ↑ {totalProcessed > 0 ? Math.round((approvedCount / totalProcessed) * 100) : 0}%
                </span>
              )}
            </div>
            <span style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px', display: 'block' }}>
              Hạng mục đã hoàn thành nghiệm thu
            </span>
          </div>
        </div>

        {/* Card 3: Tỉ lệ đạt yêu cầu */}
        <div className="kpi-card" style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tỉ lệ đạt yêu cầu
            </span>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChartOutlined style={{ fontSize: '18px', color: '#0f172a' }} />
            </div>
          </div>
          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '36px', fontWeight: 800, color: '#0f172a', lineHeight: '1', marginBottom: '10px' }}>
              {isLoading ? <Spin size="small" /> : `${passRate}%`}
            </div>
            <div style={{ width: '100%', backgroundColor: '#e2e8f0', height: '8px', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{ 
                backgroundColor: '#22C55E', 
                height: '100%', 
                width: `${Math.min(parseFloat(passRate) || 0, 100)}%`, 
                borderRadius: '9999px',
                transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <Row gutter={[20, 16]}>
          <Col xs={24} sm={8}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Dự án</label>
              <Select
                value={selectedProject}
                onChange={setSelectedProject}
                style={{ width: '100%' }}
                placeholder="Chọn dự án"
              >
                <Select.Option value="ALL">Tất cả dự án</Select.Option>
                {/* 
                  - Liên kết động giữa các bộ lọc (Cascading Filters): Khi chọn một Dự án cụ thể, danh sách lựa chọn trong bộ lọc Hạng mục thi công sẽ tự động lọc chỉ hiển thị các hạng mục thuộc về dự án đó để tránh hiển thị thừa các hạng mục không liên quan. Đồng thời, thiết lập useEffect an toàn chỉ phụ thuộc vào selectedProject để tự động đặt lại (reset) bộ lọc hạng mục về "Tất cả hạng mục" khi dự án thay đổi, tránh xảy ra vòng lặp render vô tận (infinite loop) gây lỗi màn hình trắng tinh.
                */}
                {projectOptions.map(name => (
                  <Select.Option key={name} value={name}>{name}</Select.Option>
                ))}
              </Select>
            </div>
          </Col>
          <Col xs={24} sm={8}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Hạng mục thi công</label>
              <Select
                value={selectedParentTask}
                onChange={setSelectedParentTask}
                style={{ width: '100%' }}
                placeholder="Chọn hạng mục thi công"
              >
                <Select.Option value="ALL">Tất cả hạng mục</Select.Option>
                {taskOptions.map(name => (
                  <Select.Option key={name} value={name}>{name}</Select.Option>
                ))}
              </Select>
            </div>
          </Col>
          <Col xs={24} sm={8}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Trạng thái</label>
              <Select
                value={selectedStatus}
                onChange={setSelectedStatus}
                style={{ width: '100%' }}
                placeholder="Chọn trạng thái"
              >
                <Select.Option value="ALL">Tất cả trạng thái</Select.Option>
                <Select.Option value="DONE">Đã hoàn thành</Select.Option>
                <Select.Option value="DOING">Đang thực hiện</Select.Option>
                <Select.Option value="TODO">Chưa thực hiện</Select.Option>
              </Select>
            </div>
          </Col>
        </Row>
      </div>

      {/* Main Table */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        <Table 
          dataSource={filteredParentTasks}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          bordered={false}
          tableLayout="fixed"
          scroll={{ x: 840 }}
          expandable={{
            expandedRowRender,
            expandedRowKeys,
            onExpandedRowsChange: setExpandedRowKeys,
            showExpandColumn: false
          }}
          pagination={{ 
            pageSize: 10,
            showTotal: (total, range) => (
              <span style={{ fontSize: '13px', color: '#64748b' }}>
                Hiển thị {range[0]}-{range[1]} trên {total} hạng mục
              </span>
            ),
            style: { padding: '12px 24px', borderTop: '1px solid #e2e8f0' }
          }}
          className="acceptance-table"
        />
      </div>

      {/* Modal: Từ chối nghiệm thu */}
      <Modal
        title={
          <div>
            <div style={{ fontWeight: 800, fontSize: '18px', color: '#0f172a' }}>Từ chối nghiệm thu công việc</div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>{selectedRecord?.detail_name}</div>
          </div>
        }
        open={isRejectModalVisible}
        onCancel={() => {
          setIsRejectModalVisible(false);
          setSelectedRecord(null);
        }}
        footer={null}
        destroyOnClose
        width={550}
      >
        <Form
          form={rejectForm}
          layout="vertical"
          onFinish={handleRejectSubmit}
          style={{ marginTop: '20px' }}
        >
          <Form.Item
            name="rejection_note"
            label="Lý do từ chối (Chi tiết các lỗi kỹ thuật / phần thi công chưa đạt yêu cầu)"
            rules={[
              { required: true, message: 'Vui lòng nhập lý do từ chối.' },
              { min: 10, message: 'Lý do từ chối phải dài ít nhất 10 ký tự để nhà thầu phụ nắm thông tin khắc phục.' }
            ]}
          >
            <Input.TextArea 
              placeholder="Ví dụ: Lớp vữa trát tường chưa phẳng mặt, phát hiện vết rạn chân chim tại trục C-D. Yêu cầu nhà thầu phụ dọn dẹp vệ sinh và trát lại..." 
              rows={4} 
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: '24px' }}>
            <Button 
              onClick={() => {
                setIsRejectModalVisible(false);
                setSelectedRecord(null);
              }} 
              style={{ marginRight: '12px', borderRadius: '6px' }}
            >
              Hủy bỏ
            </Button>
            <Button 
              type="primary" 
              danger
              htmlType="submit" 
              loading={rejectMutation.isPending}
              style={{ borderRadius: '6px', fontWeight: 600 }}
            >
              Xác nhận từ chối
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal: Xem chi tiết Nhật ký thi công */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileTextOutlined style={{ color: '#9d4300', fontSize: '16px' }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '16px', color: '#0f172a' }}>Nhật ký thi công chi tiết</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Công việc con: {selectedChildTask?.detail_name}</div>
            </div>
          </div>
        }
        open={isLogsModalVisible}
        onCancel={() => {
          setIsLogsModalVisible(false);
          setSelectedChildTask(null);
          setLogsList([]);
        }}
        footer={[
          <Button key="close" type="primary" onClick={() => setIsLogsModalVisible(false)} style={{ borderRadius: '6px' }}>
            Đóng cửa sổ
          </Button>
        ]}
        width={750}
        destroyOnClose
      >
        <div style={{ marginTop: '20px', maxHeight: '500px', overflowY: 'auto', paddingRight: '4px' }}>
          {logsLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin tip="Đang tải nhật ký..." size="large" />
            </div>
          ) : logsList.length === 0 ? (
            <Empty description="Chưa có nhật ký thi công nào được ghi nhận cho công việc giao khoán này." style={{ padding: '30px 0' }} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {logsList.map((log) => (
                <div 
                  key={log.id} 
                  style={{ 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '10px', 
                    padding: '16px',
                    backgroundColor: '#ffffff',
                    transition: 'border-color 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                    <Space>
                      <CalendarOutlined style={{ color: '#9d4300' }} />
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                        Ngày thi công: {dayjs(log.created_at).format('DD/MM/YYYY')}
                      </span>
                    </Space>
                    <Space size="middle">
                      <Tag color="blue" style={{ fontWeight: 600, borderRadius: '4px' }}>Thời tiết: {log.weather || 'Bình thường'}</Tag>
                      <span style={{ fontWeight: 700, color: '#22C55E', fontSize: '13px' }}>Khối lượng ngày: {log.daily_volume} {selectedChildTask?.unit || ''}</span>
                    </Space>
                  </div>
                  
                  {log.title && (
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b', marginBottom: '6px' }}>
                      {log.title}
                    </div>
                  )}

                  <p style={{ color: '#475569', fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
                    {log.description || 'Không có mô tả chi tiết công tác thi công.'}
                  </p>

                  {log.images && log.images.length > 0 && (
                    <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {log.images.map((img) => (
                        <img 
                          key={img.id} 
                          src={getCleanImageUrl(img.image_url)} 
                          alt="Ảnh thực tế công trình" 
                          style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Modal: Biên bản nghiệm thu (Document Acceptance Report) */}
      <Modal
        title={null}
        open={isDocModalVisible}
        onCancel={() => {
          setIsDocModalVisible(false);
          setSelectedParentDoc(null);
        }}
        footer={[
          <Button 
            key="print" 
            type="primary" 
            icon={<CloudDownloadOutlined />}
            onClick={() => {
              window.print();
              message.success('Đang khởi chạy in hoặc xuất file PDF...');
            }}
            style={{ backgroundColor: '#22C55E', borderColor: '#22C55E', borderRadius: '6px', fontWeight: 600 }}
          >
            Xuất PDF / In biên bản
          </Button>,
          <Button key="close" onClick={() => setIsDocModalVisible(false)} style={{ borderRadius: '6px' }}>
            Đóng
          </Button>
        ]}
        width={800}
        destroyOnClose
      >
        {selectedParentDoc && (
          <div className="acceptance-report-document" style={{ padding: '24px', fontFamily: '"Times New Roman", Times, serif', color: '#000000' }}>
            {/* National Header */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '15px', textTransform: 'uppercase' }}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
              <div style={{ fontWeight: 'bold', fontSize: '14px', textDecoration: 'underline' }}>Độc lập - Tự do - Hạnh phúc</div>
              <div style={{ marginTop: '16px', fontStyle: 'italic', fontSize: '13px' }}>
                Hồ Chí Minh, ngày {dayjs().format('DD')} tháng {dayjs().format('MM')} năm {dayjs().format('YYYY')}
              </div>
            </div>

            {/* Document Title */}
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '18px', textTransform: 'uppercase' }}>BIÊN BẢN NGHIỆM THU KHỐI LƯỢNG HOÀN THÀNH</div>
              <div style={{ fontSize: '13px', fontStyle: 'italic' }}>Số: BBNT-{selectedParentDoc.id}/{dayjs().format('YYYY')}</div>
            </div>

            <div style={{ fontSize: '14.5px', lineHeight: '1.6', marginBottom: '20px' }}>
              <div><strong>1. Tên Dự án:</strong> {selectedParentDoc.project_name}</div>
              <div><strong>2. Hạng mục thi công chính:</strong> {selectedParentDoc.task_name}</div>
              {selectedParentDoc.project_category && (
                <div><strong>3. Loại hạng mục:</strong> {selectedParentDoc.project_category}</div>
              )}
              <div><strong>{selectedParentDoc.project_category ? '4' : '3'}. Thành phần tham gia nghiệm thu:</strong></div>
              <div style={{ paddingLeft: '20px' }}>- Đại diện Ban quản lý Dự án (Giám sát trưởng)</div>
              <div style={{ paddingLeft: '20px' }}>- Đại diện các Nhà thầu phụ liên quan thi công hạng mục</div>
            </div>

            <Divider style={{ borderColor: '#000000', margin: '12px 0' }} />

            {/* Table of Child work details */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '14.5px', marginBottom: '8px' }}>{selectedParentDoc.project_category ? '5' : '4'}. Chi tiết khối lượng công việc được nghiệm thu:</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #000000', padding: '6px', textAlign: 'center', width: '5%' }}>STT</th>
                    <th style={{ border: '1px solid #000000', padding: '6px', textAlign: 'left', width: '45%' }}>Tên công việc con</th>
                    <th style={{ border: '1px solid #000000', padding: '6px', textAlign: 'center', width: '15%' }}>Khối lượng</th>
                    <th style={{ border: '1px solid #000000', padding: '6px', textAlign: 'right', width: '15%' }}>Đơn giá khoán</th>
                    <th style={{ border: '1px solid #000000', padding: '6px', textAlign: 'right', width: '20%' }}>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedParentDoc.details.map((detail, index) => (
                    <tr key={detail.id}>
                      <td style={{ border: '1px solid #000000', padding: '6px', textAlign: 'center' }}>{index + 1}</td>
                      <td style={{ border: '1px solid #000000', padding: '6px' }}>{detail.detail_name}</td>
                      <td style={{ border: '1px solid #000000', padding: '6px', textAlign: 'center' }}>{detail.work_volume} {detail.unit || ''}</td>
                      <td style={{ border: '1px solid #000000', padding: '6px', textAlign: 'right' }}>{formatCurrency(detail.agreed_price)}</td>
                      <td style={{ border: '1px solid #000000', padding: '6px', textAlign: 'right' }}>
                        {formatCurrency(detail.work_volume * detail.agreed_price)}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ fontWeight: 'bold' }}>
                    <td colSpan={4} style={{ border: '1px solid #000000', padding: '6px', textAlign: 'right' }}>Tổng cộng giá trị nghiệm thu:</td>
                    <td style={{ border: '1px solid #000000', padding: '6px', textAlign: 'right' }}>
                      {formatCurrency(selectedParentDoc.details.reduce((sum, d) => sum + (d.work_volume * d.agreed_price), 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Acceptance Conclusion */}
            <div style={{ fontSize: '14.5px', lineHeight: '1.6', marginBottom: '40px' }}>
              <div><strong>6. Kết luận nghiệm thu:</strong></div>
              <div style={{ fontStyle: 'italic', paddingLeft: '20px' }}>
                Căn cứ vào kết quả thi công thực tế được ghi nhận qua nhật ký thi công liên quan và các hồ sơ kiểm tra chất lượng, Ban quản lý dự án đồng ý nghiệm thu khối lượng hoàn thành của hạng mục thi công này. Khối lượng sẽ được ghi nhận chính thức để làm căn cứ thực hiện thanh toán tiếp theo.
              </div>
            </div>

            {/* Signature Area */}
            <Row justify="space-between" style={{ fontSize: '14.5px', textAlign: 'center', marginTop: '20px' }}>
              <Col span={10}>
                <div style={{ fontWeight: 'bold' }}>ĐẠI DIỆN NHÀ THẦU PHỤ</div>
                <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#6b7280', marginTop: '4px' }}>(Ký, ghi rõ họ tên)</div>
              </Col>
              <Col span={10}>
                <div style={{ fontWeight: 'bold' }}>ĐẠI DIỆN BAN QUẢN LÝ DỰ ÁN</div>
                <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#6b7280', marginTop: '4px' }}>(Ký, ghi rõ họ tên)</div>
              </Col>
            </Row>
          </div>
        )}
      </Modal>
    </div>
  );
};

const styleTag = (
  <style>{`
    /* Main Acceptance Table */
    .acceptance-table .ant-table-thead > tr > th {
      font-weight: 700 !important;
      color: #475569 !important;
      background-color: #f8fafc !important;
      border-bottom: 1px solid #e2e8f0 !important;
      font-size: 12px !important;
      letter-spacing: 0.06em !important;
      text-transform: uppercase !important;
      padding: 14px 24px !important;
    }
    .acceptance-table .ant-table-tbody > tr > td {
      border-bottom: 1px solid #f1f5f9 !important;
      padding: 16px 24px !important;
      transition: background-color 0.15s ease !important;
    }
    .acceptance-table .ant-table-tbody > tr:hover > td {
      background-color: #f8fafc !important;
    }
    .acceptance-table .ant-table-expanded-row > td {
      padding: 0 !important;
      background-color: #f8fafc !important;
    }
    
    /* Nested child table */
    .nested-child-table .ant-table-thead > tr > th {
      font-weight: 700 !important;
      color: #64748b !important;
      background-color: #f1f5f9 !important;
      border-bottom: 1px solid #e2e8f0 !important;
      font-size: 11.5px !important;
      letter-spacing: 0.05em !important;
      text-transform: uppercase !important;
      padding: 10px 16px !important;
    }
    .nested-child-table .ant-table-tbody > tr > td {
      padding: 12px 16px !important;
      border-bottom: 1px solid #f1f5f9 !important;
    }
    .nested-child-table .ant-table-tbody > tr:hover > td {
      background-color: #f8fafc !important;
    }
    .nested-child-table {
      border-radius: 8px !important;
      overflow: hidden !important;
      border: 1px solid #e2e8f0 !important;
    }
    .nested-child-table .ant-table {
      border-radius: 8px !important;
    }

    /* KPI Card Hover */
    .kpi-card {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .kpi-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.06), 0 4px 10px -2px rgba(0, 0, 0, 0.03);
      border-color: #cbd5e1;
    }

    /* Ant Select Styling */
    .ant-select-selector {
      border-radius: 8px !important;
      border-color: #e2e8f0 !important;
      background-color: #f8fafc !important;
      font-size: 13px !important;
      min-height: 38px !important;
    }
    .ant-select-selector:hover,
    .ant-select-focused .ant-select-selector {
      border-color: #9d4300 !important;
    }
    
    /* Pagination */
    .acceptance-table .ant-pagination {
      margin: 0 !important;
      padding: 14px 24px !important;
      border-top: 1px solid #e2e8f0 !important;
      background-color: #f8fafc !important;
    }
    .ant-pagination-item-active {
      background-color: #9d4300 !important;
      border-color: #9d4300 !important;
    }
    .ant-pagination-item-active a {
      color: #ffffff !important;
    }

    /* Modal styling */
    .ant-modal-header {
      padding: 20px 24px !important;
      border-bottom: 1px solid #f1f5f9 !important;
    }
    .ant-modal-content {
      border-radius: 12px !important;
      overflow: hidden !important;
    }

    /* Responsive KPI grid */
    @media (max-width: 768px) {
      .kpi-card {
        grid-column: span 1 !important;
      }
    }
    
    @media print {
      body * {
        visibility: hidden;
      }
      .acceptance-report-document, .acceptance-report-document * {
        visibility: visible;
      }
      .acceptance-report-document {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
      }
    }
  `}</style>
);

export default AcceptanceManagement;
