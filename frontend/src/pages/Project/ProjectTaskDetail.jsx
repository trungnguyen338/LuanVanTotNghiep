import React, { useMemo, useState } from 'react';
import {
  Typography, Card, Row, Col, Table, Button, Breadcrumb, Tag,
  Modal, Form, Input, Select, message, Popconfirm, Space, Progress, DatePicker,
  Image, Timeline, Empty
} from 'antd';
import {
  ArrowLeftOutlined, PlusOutlined, DeleteOutlined, EditOutlined,
  CalendarOutlined, PercentageOutlined, CheckCircleOutlined, FilterOutlined,
  ClockCircleOutlined, UserOutlined, ExclamationCircleOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import projectService from '../../services/projectService';
import subContractService from '../../services/subContractService';
import authService from '../../services/authService';
import { getCleanImageUrl } from '../../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const formatCurrency = (value) => {
  if (!value) return '0 VNĐ';
  const numVal = Number(value);
  return new Intl.NumberFormat('vi-VN').format(numVal) + ' VNĐ';
};

const REASSIGNED_TASK_SUFFIX = ' - Phần còn lại';
const TASK_DETAIL_STATUS_OPTIONS = [
  { label: 'Tất cả trạng thái', value: 'ALL' },
  { label: 'Chưa thực hiện', value: 'TODO' },
  { label: 'Đang thực hiện', value: 'DOING' },
  { label: 'Đã hoàn thành', value: 'DONE' },
  { label: 'Tạm dừng', value: 'Tạm dừng' },
  { label: 'Đã hủy', value: 'CANCELLED' },
];
const TASK_DETAIL_ACCEPTANCE_OPTIONS = [
  { label: 'Tất cả nghiệm thu', value: 'ALL' },
  { label: 'Chưa nghiệm thu', value: 'NONE' },
  { label: 'Chờ duyệt', value: 'PENDING' },
  { label: 'Đã nghiệm thu', value: 'APPROVED' },
  { label: 'Không đạt yêu cầu', value: 'REJECTED' },
];

const isReassignedChildTask = (task) => {
  return String(task?.detail_name || '').trim().endsWith(REASSIGNED_TASK_SUFFIX);
};

const getReassignedSourceName = (task) => {
  const detailName = String(task?.detail_name || '').trim();
  return isReassignedChildTask(task) ? detailName.slice(0, -REASSIGNED_TASK_SUFFIX.length) : '';
};

const hasBeenReassigned = (record, details = []) => {
  const detailName = String(record?.detail_name || '').trim();
  if (!detailName) {
    return false;
  }

  return details.some((detail) => getReassignedSourceName(detail) === detailName);
};

const ProjectTaskDetail = () => {
  const { projectId, taskId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const currentUser = authService.getCurrentUser();
  const userRole = currentUser?.role?.name;
  const isEngineerOrAdmin = ['Kỹ sư', 'Quản trị viên'].includes(userRole);

  const [childForm] = Form.useForm();
  const [filterForm] = Form.useForm();
  const childWorkVolume = Form.useWatch('work_volume', childForm);
  const childAgreedPrice = Form.useWatch('agreed_price', childForm);
  const childProgressPercent = Form.useWatch('progress_percent', childForm);
  const childTotalValue = Number(childWorkVolume || 0) * Number(childAgreedPrice || 0);
  const [isChildModalVisible, setIsChildModalVisible] = useState(false);
  const [editingChildTask, setEditingChildTask] = useState(null);
  const [isReassignChildTask, setIsReassignChildTask] = useState(false);
  const [isLogsModalVisible, setIsLogsModalVisible] = useState(false);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [taskFilters, setTaskFilters] = useState({
    keyword: '',
    status: 'ALL',
    acceptanceStatus: 'ALL',
  });

  // Queries
  const { data: task = {}, isLoading: loadingTask } = useQuery({
    queryKey: ['projectTask', taskId],
    queryFn: () => projectService.getProjectTask(taskId)
  });

  const { data: project = {} } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectService.getProject(projectId)
  });

  const { data: subContracts = [] } = useQuery({
    queryKey: ['subContracts', projectId],
    queryFn: () => subContractService.getSubContracts({ project_id: projectId })
  });

  const { data: constructionLogs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ['constructionLogs', taskId],
    queryFn: () => projectService.getConstructionLogs({ project_task_id: taskId }),
    enabled: !!taskId
  });

  const filteredChildTasks = useMemo(() => {
    const keyword = taskFilters.keyword.trim().toLowerCase();

    return (task.details || []).filter((detail) => {
      const subcontractorName = detail.contractor_detail?.subcontractor?.name
        || detail.contractorDetail?.subcontractor?.name
        || '';

      const matchesKeyword = !keyword
        || String(detail.detail_name || '').toLowerCase().includes(keyword)
        || String(subcontractorName || '').toLowerCase().includes(keyword)
        || String(detail.unit || '').toLowerCase().includes(keyword);

      const matchesStatus = taskFilters.status === 'ALL' || detail.status === taskFilters.status;
      const matchesAcceptance = taskFilters.acceptanceStatus === 'ALL' || detail.acceptance_status === taskFilters.acceptanceStatus;

      return matchesKeyword && matchesStatus && matchesAcceptance;
    });
  }, [task.details, taskFilters]);

  // Flatten available subcontractor assignments from subContracts
  const subcontractorAssignments = [];
  subContracts.forEach(contract => {
    if (contract.subcontractors && contract.subcontractors.length > 0) {
      contract.subcontractors.forEach(sub => {
        subcontractorAssignments.push({
          pivot_id: sub.pivot?.id,
          subcontractor_id: sub.id,
          name: sub.name,
          role: sub.pivot?.role_in_contract,
          contract_code: contract.contract_code,
          contract_name: contract.contract_name,
          contract_status: contract.status
        });
      });
    }
  });

  // Check if subcontractor is busy in the current parent task (has any unfinished child task)
  const isSubcontractorBusy = (subcontractorId, currentChildTaskId = null) => {
    return false;
  };

  const getTaskValue = () => {
    const billingValue = Number(task.billing_value || 0);
    if (billingValue > 0) return billingValue;
    return Number(task.contract_item?.price || 0);
  };

  const getDetailsTotalValue = () => {
    if (task.details_total_value !== undefined && task.details_total_value !== null) {
      return Number(task.details_total_value || 0);
    }

    return (task.details || []).reduce((sum, detail) => {
      return sum + Number(detail.committed_value ?? detail.total_value ?? (Number(detail.work_volume || 0) * Number(detail.agreed_price || 0)));
    }, 0);
  };

  const getRemainingWorkVolume = (record) => {
    const remaining = Number(record.remaining_work_volume ?? 0);
    if (remaining > 0) {
      return remaining;
    }

    if (record.status !== 'CANCELLED') {
      return 0;
    }

    const progress = Math.max(0, Number(record.progress_percent || 0));
    if (progress <= 0) {
      return Number(record.work_volume || 0);
    }

    return Math.max(0, Number(record.work_volume || 0) * (100 - Math.min(100, progress)) / 100);
  };

  const detailsTotalColor = () => {
    const taskValue = getTaskValue();
    const detailsTotal = getDetailsTotalValue();
    if (taskValue > 0 && detailsTotal > taskValue) return '#cf1322';
    if (taskValue > 0 && detailsTotal / taskValue >= 0.9) return '#d46b08';
    return '#1677ff';
  };

  const hasActiveFilters = Boolean(
    taskFilters.keyword.trim() ||
    taskFilters.status !== 'ALL' ||
    taskFilters.acceptanceStatus !== 'ALL'
  );

  const handleOpenFilters = () => {
    filterForm.setFieldsValue(taskFilters);
    setIsFilterModalVisible(true);
  };

  const handleApplyFilters = (values) => {
    setTaskFilters({
      keyword: values.keyword || '',
      status: values.status || 'ALL',
      acceptanceStatus: values.acceptanceStatus || 'ALL',
    });
    setIsFilterModalVisible(false);
  };

  const handleResetFilters = () => {
    const nextFilters = {
      keyword: '',
      status: 'ALL',
      acceptanceStatus: 'ALL',
    };
    setTaskFilters(nextFilters);
    filterForm.setFieldsValue(nextFilters);
  };

  // Mutations
  const createChildTaskMutation = useMutation({
    mutationFn: ({ taskId, data }) => projectService.createTaskDetail(taskId, data),
    onSuccess: () => {
      message.success('Thêm công việc con & giao khoán thành công');
      setIsChildModalVisible(false);
      setIsReassignChildTask(false);
      childForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['projectTask', taskId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  });

  const updateChildTaskMutation = useMutation({
    mutationFn: ({ detailId, data }) => projectService.updateTaskDetail(detailId, data),
    onSuccess: () => {
      message.success('Cập nhật công việc giao khoán thành công');
      setIsChildModalVisible(false);
      setEditingChildTask(null);
      setIsReassignChildTask(false);
      childForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['projectTask', taskId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  });

  const deleteChildTaskMutation = useMutation({
    mutationFn: projectService.deleteTaskDetail,
    onSuccess: () => {
      message.success('Xóa công việc con thành công');
      queryClient.invalidateQueries({ queryKey: ['projectTask', taskId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Không thể xóa công việc này');
    }
  });

  // Handlers

  const handleOpenChildModal = (child = null, presetValues = {}) => {
    const { lockAssignmentFields = false, ...formPresetValues } = presetValues;

    setEditingChildTask(child);
    setIsReassignChildTask(child ? isReassignedChildTask(child) : lockAssignmentFields);
    if (child) {
      childForm.setFieldsValue({
        contractor_detail_id: child.contractor_detail_id,
        detail_name: child.detail_name,
        unit: child.unit,
        work_volume: child.work_volume,
        agreed_price: child.agreed_price,
        progress_percent: child.progress_percent,
        status: child.status,
        acceptance_status: child.acceptance_status,
        rejection_note: child.rejection_note,
        start_date: child.start_date ? dayjs(child.start_date) : null,
        end_date: child.end_date ? dayjs(child.end_date) : null,
      });
    } else {
      childForm.resetFields();
      childForm.setFieldsValue({
        status: 'TODO',
        acceptance_status: 'NONE',
        progress_percent: 0,
        ...formPresetValues,
      });
    }
    setIsChildModalVisible(true);
  };

  const handleReassignRemainingWork = (record) => {
    const remainingWorkVolume = getRemainingWorkVolume(record);
    if (remainingWorkVolume <= 0) {
      message.info('Công việc này không còn khối lượng để giao lại.');
      return;
    }

    handleOpenChildModal(null, {
      detail_name: `${record.detail_name} - Phần còn lại`,
      unit: record.unit,
      work_volume: Number(remainingWorkVolume.toFixed(2)),
      agreed_price: record.agreed_price,
      status: 'TODO',
      acceptance_status: 'NONE',
      progress_percent: 0,
      lockAssignmentFields: true,
    });
  };

  const isEditingChildFullyCompleted = (values = {}) => {
    if (!editingChildTask) {
      return false;
    }

    const progress = Number(values.progress_percent ?? childProgressPercent ?? editingChildTask.progress_percent ?? 0);
    const workVolume = Number(values.work_volume ?? editingChildTask.work_volume ?? 0);
    const accumulatedVolume = Number(editingChildTask.accumulated_volume ?? 0);

    return progress >= 100 || (workVolume > 0 && accumulatedVolume >= workVolume);
  };

  const handleChildSubmit = (values) => {
    if (values.status === 'CANCELLED' && isEditingChildFullyCompleted(values)) {
      message.warning('Công việc đã đạt 100% tiến độ hoặc đủ khối lượng thi công, không thể chuyển sang Đã hủy.');
      return;
    }

    const dataToSend = {
      ...values,
      start_date: values.start_date ? values.start_date.format('YYYY-MM-DD') : null,
      end_date: values.end_date ? values.end_date.format('YYYY-MM-DD') : null,
    };

    if (editingChildTask) {
      updateChildTaskMutation.mutate({
        detailId: editingChildTask.id,
        data: isReassignChildTask
          ? {
              ...dataToSend,
              unit: editingChildTask.unit,
              work_volume: editingChildTask.work_volume,
              agreed_price: editingChildTask.agreed_price,
            }
          : dataToSend,
      });
    } else {
      createChildTaskMutation.mutate({
        taskId,
        data: {
          ...dataToSend,
          progress_percent: 0,
          status: 'TODO',
          acceptance_status: 'NONE',
        },
      });
    }
  };

  // Status and Acceptance Renderers
  const renderTaskStatusBadge = (status) => {
    const configs = {
      TODO: { text: 'Chưa thực hiện', color: 'default' },
      DOING: { text: 'Đang thực hiện', color: 'orange' },
      DONE: { text: 'Đã hoàn thành', color: 'success' },
      'Tạm dừng': { text: 'Tạm dừng', color: 'error' },
      CANCELLED: { text: 'Đã hủy', color: 'error' }
    };
    const config = configs[status] || { text: status, color: 'default' };

    const colors = {
      success: { bg: '#f6ffed', text: '#389e0d', border: '#b7eb8f' },
      orange: { bg: '#fff7e6', text: '#d46b08', border: '#ffd591' },
      error: { bg: '#fff1f0', text: '#cf1322', border: '#ffa39e' },
      default: { bg: '#f5f5f5', text: '#595959', border: '#d9d9d9' }
    };
    const c = colors[config.color] || colors.default;

    return (
      <span style={{
        backgroundColor: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
        padding: '3px 12px',
        borderRadius: 4,
        fontWeight: 600,
        fontSize: 12,
        marginLeft: 12
      }}>
        {config.text}
      </span>
    );
  };

  const renderAcceptanceTag = (status) => {
    const configs = {
      NONE: { text: 'Chưa nghiệm thu', color: 'default' },
      PENDING: { text: 'Chờ duyệt', color: 'warning' },
      APPROVED: { text: 'Đã nghiệm thu', color: 'success' },
      REJECTED: { text: 'Không đạt yêu cầu', color: 'error' },
    };
    const config = configs[status] || configs.NONE;

    if (status === 'APPROVED') {
      return (
        <span style={{ color: '#52c41a', fontWeight: 600, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <CheckCircleOutlined /> Đã nghiệm thu
        </span>
      );
    }
    return <Tag color={config.color} style={{ fontWeight: 500 }}>{config.text}</Tag>;
  };

  // Calculations for Stat Cards
  const parentValue = Number(task.contract_item?.price || task.billing_value || 0);
  const totalTasksValue = project.tasks
    ? project.tasks.reduce((sum, t) => sum + Number(t.contract_item?.price || t.billing_value || 0), 0)
    : 0;

  // Calculate Task Weight dynamically matching the backend's weighted progress formula
  const taskWeight = totalTasksValue > 0 && parentValue > 0
    ? Math.round((parentValue / totalTasksValue) * 100)
    : (project.tasks && project.tasks.length > 0 ? Math.round(100 / project.tasks.length) : (task.task_name === 'TEST' || task.task_name === 'Phần Móng' ? 15 : 25));

  // Get Start Date from earliest child task or task expected date
  const earliestStartDate = task.details && task.details.length > 0
    ? task.details
      .filter(d => d.start_date)
      .map(d => d.start_date)
      .sort()[0]
    : task.created_at;

  const startDateFormatted = earliestStartDate
    ? dayjs(earliestStartDate).format('DD/MM/YYYY')
    : '---';

  // Generate dynamic logs based on subcontractor updates
  const generateRecentLogs = () => {
    if (!constructionLogs || constructionLogs.length === 0) {
      return [
        {
          time: 'Mới đây',
          content: `Đang lập kế hoạch thi công hạng mục "${task.task_name}"`,
          color: '#d9d9d9'
        }
      ];
    }

    return constructionLogs.slice(0, 4).map((log) => {
      const subName = log.task_detail?.contractor_detail?.subcontractor?.name || 
                      log.taskDetail?.contractorDetail?.subcontractor?.name || 
                      'Nhà thầu phụ';
      const detailName = log.task_detail?.detail_name || log.taskDetail?.detail_name || '';
      const text = log.title || log.description || 'Cập nhật tiến độ';
      return {
        time: log.created_at ? dayjs(log.created_at).format('DD/MM/YYYY, HH:mm') : '---',
        content: `${subName} cập nhật nhật ký cho "${detailName}": ${text}`,
        color: '#1890ff',
        raw: log
      };
    });
  };

  const recentLogs = generateRecentLogs();

  const columns = [
    {
      title: 'TÊN CÔNG VIỆC',
      dataIndex: 'detail_name',
      key: 'detail_name',
      render: (text) => <Text strong style={{ color: '#262626' }}>{text}</Text>
    },
    {
      title: 'THỜI GIAN',
      key: 'duration',
      render: (_, record) => {
        if (!record.start_date && !record.end_date) return '---';
        const start = record.start_date ? dayjs(record.start_date).format('DD/MM/YYYY') : '---';
        const end = record.end_date ? dayjs(record.end_date).format('DD/MM/YYYY') : '---';
        return `${start} Đến ${end}`;
      }
    },
    {
      title: 'NHÀ THẦU PHỤ',
      key: 'subcontractor',
      render: (_, record) => record.contractor_detail?.subcontractor?.name || record.contractorDetail?.subcontractor?.name || '---'
    },
    {
      title: 'ĐƠN VỊ',
      dataIndex: 'unit',
      key: 'unit',
      render: (text) => text || '---'
    },
    {
      title: 'KHỐI LƯỢNG / ĐƠN GIÁ',
      key: 'volume_price',
      render: (_, record) => (
        <div>
          <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
            KL: <strong>{record.work_volume || 0}</strong>
          </Text>
          <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
            Đơn giá: <strong>{formatCurrency(record.agreed_price)}</strong>
          </Text>
          <Text style={{ fontSize: 12, color: '#c25f16' }}>
            Thành tiền: <strong>{formatCurrency(record.total_value ?? (Number(record.work_volume || 0) * Number(record.agreed_price || 0)))}</strong>
          </Text>
          {getRemainingWorkVolume(record) > 0 && (
            <Text style={{ fontSize: 12, color: '#d46b08', display: 'block', marginTop: 4 }}>
              Còn lại để giao lại: <strong>{Number(getRemainingWorkVolume(record)).toFixed(2)} {record.unit || ''}</strong>
            </Text>
          )}
          {hasBeenReassigned(record, task.details || []) && (
            <Tag color="default" style={{ marginTop: 6 }}>
              Đã giao lại
            </Tag>
          )}
        </div>
      )
    },
    {
      title: 'TIẾN ĐỘ (%)',
      key: 'progress_percent',
      width: 160,
      render: (_, record) => {
        const progress = Math.max(0, Number(record.progress_percent || 0));
        let barColor = '#faad14';
        if (progress === 100) {
          if (record.acceptance_status === 'REJECTED') barColor = '#f5222d';
          else if (record.acceptance_status === 'PENDING') barColor = '#faad14';
          else barColor = '#52c41a';
        } else if (progress >= 50) {
          barColor = '#d46b08';
        }

        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Progress
              percent={progress}
              size="small"
              strokeColor={barColor}
              showInfo={false}
              style={{ flex: 1, margin: 0 }}
            />
            <Text strong style={{ minWidth: 35, textAlign: 'right', fontSize: 13 }}>{progress}%</Text>
          </div>
        );
      }
    },
    {
      title: 'TRẠNG THÁI',
      key: 'status',
      render: (_, record) => {
        const status = record.status;
        const configs = {
          TODO: { text: 'Chưa thực hiện', color: 'default' },
          DOING: { text: 'Đang thực hiện', color: 'orange' },
          DONE: { text: 'Đã hoàn thành', color: 'success' },
          'Tạm dừng': { text: 'Tạm dừng', color: 'error' },
          CANCELLED: { text: 'Đã hủy', color: 'error' }
        };
        const config = configs[status] || { text: status, color: 'default' };
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: 'NGHIỆM THU',
      key: 'acceptance_status',
      render: (_, record) => {
        const percent = record.progress_percent || 0;
        if (percent < 100) {
          return renderAcceptanceTag('NONE');
        }
        const status = record.acceptance_status;
        const tag = renderAcceptanceTag(status);
        if (status === 'REJECTED') {
          return (
            <div>
              {tag}
              <div style={{ marginTop: '4px' }}>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    Modal.warning({
                      title: 'Lý do nghiệm thu không đạt',
                      icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
                      width: 520,
                      content: (
                        <div style={{ marginTop: '12px' }}>
                          <p><strong>Công việc:</strong> {record.detail_name}</p>
                          <div style={{ 
                            backgroundColor: '#fff7ed', 
                            borderLeft: '4px solid #f97316', 
                            padding: '12px 16px', 
                            borderRadius: '4px', 
                            marginTop: '12px' 
                          }}>
                            <p style={{ margin: '0 0 4px 0', fontWeight: 700, color: '#c2410c', fontSize: '13px' }}>Phản hồi phản đối nghiệm thu:</p>
                            <p style={{ margin: 0, color: '#ea580c', fontStyle: 'italic', fontSize: '14px', lineHeight: '1.6' }}>
                              {record.rejection_note || 'Không có lý do chi tiết.'}
                            </p>
                          </div>
                        </div>
                      ),
                      okText: 'Đóng',
                    });
                  }}
                  style={{ 
                    fontSize: '11px', 
                    color: '#ff4d4f', 
                    borderBottom: '1px dashed #ff4d4f', 
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3
                  }}
                >
                  <InfoCircleOutlined />
                  Xem lý do từ chối
                </a>
              </div>
            </div>
          );
        }
        return tag;
      }
    },
    {
      title: 'HÀNH ĐỘNG',
      key: 'actions',
      width: 140,
      render: (_, record) => {
        const isApproved = record.acceptance_status === 'APPROVED';
        const isCompleted = project.status === 'COMPLETED';
        const isOriginalReassigned = hasBeenReassigned(record, task.details || []);
        const isDisabled = isApproved || isCompleted || isOriginalReassigned;
        return (
          <Space size="middle">
            {record.status === 'CANCELLED' && getRemainingWorkVolume(record) > 0 && (
              <Button
                size="small"
                icon={<PlusOutlined />}
                disabled={isOriginalReassigned}
                onClick={() => handleReassignRemainingWork(record)}
                style={{
                  borderRadius: 4,
                  color: isOriginalReassigned ? undefined : '#c25f16',
                  borderColor: isOriginalReassigned ? undefined : '#c25f16',
                }}
              >
                Giao lại
              </Button>
            )}
            <Button
              size="small"
              icon={<EditOutlined />}
              disabled={isDisabled}
              onClick={() => handleOpenChildModal(record)}
              style={{ borderRadius: 4 }}
            >
              Sửa
            </Button>
            <Popconfirm
              title="Xóa công việc con"
              description="Bạn có chắc muốn xóa công việc này?"
              onConfirm={() => deleteChildTaskMutation.mutate(record.id)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
              disabled={isDisabled}
            >
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                disabled={isDisabled}
                style={{ borderRadius: 4 }}
              >
                Xóa
              </Button>
            </Popconfirm>
          </Space>
        );
      }
    }
  ];

  if (loadingTask) {
    return <Card loading bordered={false} style={{ width: '100%', margin: '24px 0' }} />;
  }

  return (
    <div style={{ width: '100%', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`
        .task-detail-layout .ant-card {
          border-radius: 8px;
          border: 1px solid #f0f0f0;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }
        .metric-card {
          height: 110px;
        }
        .metric-title {
          font-size: 11px;
          color: #8c8c8c;
          margin-bottom: 6px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }
        .metric-value {
          font-size: 20px;
          color: #1f1f1f;
          font-weight: 800;
          line-height: 1.1;
        }
        .metric-sub {
          font-size: 12px;
          color: #595959;
          margin-top: 4px;
        }
        .task-table .ant-table-thead > tr > th {
          font-weight: 700;
          color: #1f1f1f;
          background-color: #fafafa;
          font-size: 12px;
        }
        .log-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px dashed #f0f0f0;
        }
        .log-item:last-child {
          border-bottom: none;
        }
        .log-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-top: 5px;
          flex-shrink: 0;
        }
      `}</style>

      {/* Top Breadcrumbs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Breadcrumb separator=">">
          <Breadcrumb.Item>
            <span style={{ cursor: 'pointer', color: '#595959' }} onClick={() => navigate('/projects')}>
              Quản lý dự án
            </span>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <span style={{ cursor: 'pointer', color: '#595959' }} onClick={() => navigate(`/projects/${projectId}`)}>
              Chi tiết Dự án
            </span>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <span style={{ fontWeight: 600, color: '#1f1f1f' }}>Chi tiết Hạng mục</span>
          </Breadcrumb.Item>
        </Breadcrumb>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/projects/${projectId}`)}
          style={{ borderRadius: 4 }}
        >
          Quay lại dự án
        </Button>
      </div>

      {/* Title Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Title level={4} style={{ margin: 0, fontWeight: 800, color: '#1f1f1f', fontSize: 22 }}>
              {task.task_name || 'Hạng mục chi tiết'}
            </Title>
            {renderTaskStatusBadge(task.status)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24, fontSize: '14px', color: '#595959', flexWrap: 'wrap' }}>
          <span>Giá trị hạng mục lớn: <strong style={{ color: '#c25f16' }}>{formatCurrency(getTaskValue())}</strong></span>
          <span>Tổng giá trị công việc con: <strong style={{ color: detailsTotalColor() }}>{formatCurrency(getDetailsTotalValue())}</strong></span>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }} className="task-detail-layout">
        {/* Card 1: Task Weight */}
        <Col span={8}>
          <Card className="metric-card" bodyStyle={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
            <div className="metric-title">TRỌNG SỐ HẠNG MỤC</div>
            <div className="metric-value">{taskWeight}% <span style={{ fontSize: 13, color: '#8c8c8c', fontWeight: 500 }}>trong tổng dự án</span></div>
            <Progress
              percent={taskWeight}
              showInfo={false}
              strokeColor="#c25f16"
              size="small"
              style={{ margin: '8px 0 0 0' }}
            />
          </Card>
        </Col>

        {/* Card 2: Start Date */}
        <Col span={8}>
          <Card className="metric-card" bodyStyle={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, height: '100%' }}>
            <div style={{ backgroundColor: '#fff7e6', width: 44, height: 44, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CalendarOutlined style={{ fontSize: 20, color: '#c25f16' }} />
            </div>
            <div>
              <div className="metric-title" style={{ marginBottom: 2 }}>NGÀY BẮT ĐẦU</div>
              <div className="metric-value" style={{ fontSize: 18 }}>{startDateFormatted}</div>
            </div>
          </Card>
        </Col>

        {/* Card 3: Overall progress */}
        <Col span={8}>
          <Card className="metric-card" bodyStyle={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
            <div className="metric-title">TIẾN ĐỘ TỔNG QUÁT</div>
            <div className="metric-value">{task.progress_percent || 0}%</div>
            <Progress
              percent={task.progress_percent || 0}
              showInfo={false}
              strokeColor="#52c41a"
              size="small"
              style={{ margin: '8px 0 0 0' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Table Card */}
      <Card
        title={
          <div>
            <span style={{ fontWeight: 800, fontSize: 15, color: '#262626', display: 'block' }}>Danh sách công việc</span>
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
              Chi tiết các đầu việc trong hạng mục {task.task_name}
            </Text>
          </div>
        }
        extra={
          <Space>
            <Button
              icon={<FilterOutlined />}
              onClick={handleOpenFilters}
              style={{
                borderRadius: 4,
                borderColor: hasActiveFilters ? '#c25f16' : undefined,
                color: hasActiveFilters ? '#c25f16' : undefined,
              }}
            >
              Bộ lọc
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              disabled={project.status === 'COMPLETED'}
              onClick={() => handleOpenChildModal()}
              style={{ backgroundColor: '#c25f16', borderColor: '#c25f16', borderRadius: 4, fontWeight: 600 }}
            >
              Thêm công việc mới
            </Button>
          </Space>
        }
        style={{ marginBottom: 24 }}
        bodyStyle={{ padding: 0 }}
      >
        <div style={{ padding: '12px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Hiển thị {filteredChildTasks.length}/{(task.details || []).length} công việc
          </Text>
          {hasActiveFilters && (
            <Button size="small" type="link" onClick={handleResetFilters} style={{ padding: 0, color: '#c25f16' }}>
              Xóa bộ lọc
            </Button>
          )}
        </div>
        <Table
          dataSource={filteredChildTasks}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 5 }}
          className="task-table"
          bordered
        />
      </Card>

      {/* Bottom Layout Row */}
      <Row gutter={16}>
        {/* Left: Dynamic Logger */}
        <Col span={10}>
          <Card title={<span style={{ fontWeight: 700, fontSize: 14, color: '#262626' }}><ClockCircleOutlined /> Nhật ký cập nhật mới nhất</span>}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {recentLogs.map((log, index) => (
                <div key={index} className="log-item">
                  <div className="log-dot" style={{ backgroundColor: log.color }} />
                  <div style={{ flex: 1 }}>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', fontWeight: 500, marginBottom: 2 }}>{log.time}</Text>
                    <Text style={{ fontSize: 13, color: '#262626', fontWeight: 600 }}>{log.content}</Text>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, borderTop: '1px solid #f0f0f0', paddingTop: 12, textAlign: 'center' }}>
              <span 
                style={{ color: '#c25f16', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
                onClick={() => setIsLogsModalVisible(true)}
              >
                Xem toàn bộ nhật ký
              </span>
            </div>
          </Card>
        </Col>
      </Row>

      <Modal
        title="Bộ lọc công việc giao khoán"
        open={isFilterModalVisible}
        onCancel={() => setIsFilterModalVisible(false)}
        footer={[
          <Button key="reset" onClick={handleResetFilters}>
            Xóa bộ lọc
          </Button>,
          <Button key="cancel" onClick={() => setIsFilterModalVisible(false)}>
            Hủy
          </Button>,
          <Button
            key="apply"
            type="primary"
            onClick={() => filterForm.submit()}
            style={{ backgroundColor: '#c25f16', borderColor: '#c25f16' }}
          >
            Áp dụng
          </Button>,
        ]}
        destroyOnClose
      >
        <Form
          form={filterForm}
          layout="vertical"
          onFinish={handleApplyFilters}
          initialValues={taskFilters}
        >
          <Form.Item name="keyword" label="Từ khóa">
            <Input allowClear placeholder="Tìm theo tên công việc, nhà thầu phụ hoặc đơn vị" />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái">
            <Select options={TASK_DETAIL_STATUS_OPTIONS} />
          </Form.Item>
          <Form.Item name="acceptanceStatus" label="Trạng thái nghiệm thu">
            <Select options={TASK_DETAIL_ACCEPTANCE_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal View All Construction Logs */}
      <Modal
        title={
          <div style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#1f1f1f' }}>Nhật ký thi công chi tiết</span>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, fontWeight: 500, marginTop: 4 }}>
              Hạng mục: {task.task_name}
            </Text>
          </div>
        }
        open={isLogsModalVisible}
        onCancel={() => setIsLogsModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsLogsModalVisible(false)} style={{ borderRadius: 4 }}>
            Đóng
          </Button>
        ]}
        width={720}
        destroyOnClose
        bodyStyle={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: 8 }}
      >
        {loadingLogs ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <Progress percent={50} status="active" showInfo={false} style={{ width: 120 }} />
            <div style={{ marginTop: 8, color: '#8c8c8c' }}>Đang tải nhật ký...</div>
          </div>
        ) : !constructionLogs || constructionLogs.length === 0 ? (
          <Empty description="Chưa có nhật ký thi công nào được ghi nhận cho hạng mục này." />
        ) : (
          <Timeline mode="left">
            {constructionLogs.map((log) => {
              const subName = log.task_detail?.contractor_detail?.subcontractor?.name || 
                              log.taskDetail?.contractorDetail?.subcontractor?.name || 
                              'Nhà thầu phụ';
              const detailName = log.task_detail?.detail_name || log.taskDetail?.detail_name || 'Công việc';
              return (
                <Timeline.Item 
                  key={log.id} 
                  color="#1890ff"
                  label={
                    <span style={{ fontWeight: 600, color: '#595959', fontSize: 12 }}>
                      {log.created_at ? dayjs(log.created_at).format('DD/MM/YYYY') : '---'}
                      <span style={{ display: 'block', fontSize: 11, fontWeight: 400, color: '#8c8c8c' }}>
                        {log.created_at ? dayjs(log.created_at).format('HH:mm') : ''}
                      </span>
                    </span>
                  }
                >
                  <Card 
                    size="small" 
                    style={{ 
                      borderRadius: 8, 
                      border: '1px solid #f0f0f0',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                      marginBottom: 8
                    }}
                    bodyStyle={{ padding: 12 }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                      <Text strong style={{ color: '#262626', fontSize: 14 }}>
                        {subName} <span style={{ fontWeight: 400, color: '#8c8c8c' }}>ghi nhận cho</span> "{detailName}"
                      </Text>
                      <Space size="xs" wrap>
                        {log.weather && (
                          <Tag color="blue" style={{ fontSize: 11, margin: 0 }}>
                            ☁️ {log.weather}
                          </Tag>
                        )}
                        <Tag color="orange" style={{ fontSize: 11, margin: 0 }}>
                          KL: {log.daily_volume || 0} m³
                        </Tag>
                      </Space>
                    </div>

                    {log.title && (
                      <div style={{ fontWeight: 700, color: '#1f1f1f', marginBottom: 4, fontSize: 13 }}>
                        {log.title}
                      </div>
                    )}

                    {log.description && (
                      <div style={{ color: '#595959', fontSize: 13, whiteSpace: 'pre-wrap', marginBottom: 8, lineHeight: 1.5 }}>
                        {log.description}
                      </div>
                    )}

                    {log.images && log.images.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <Image.PreviewGroup>
                          <Space size={8} wrap>
                            {log.images.map((img) => (
                              <Image
                                key={img.id}
                                width={60}
                                height={60}
                                src={getCleanImageUrl(img.image_url)}
                                fallback="/fallback-image.png"
                                style={{ borderRadius: 4, objectFit: 'cover', border: '1px solid #e8e8e8' }}
                              />
                            ))}
                          </Space>
                        </Image.PreviewGroup>
                      </div>
                    )}
                  </Card>
                </Timeline.Item>
              );
            })}
          </Timeline>
        )}
      </Modal>

      {/* Modal Add/Edit Child Task */}
      <Modal
        title={editingChildTask ? 'Chỉnh sửa công việc giao khoán' : 'Thêm công việc con mới & Giao khoán'}
        open={isChildModalVisible}
        onCancel={() => {
          setIsChildModalVisible(false);
          setIsReassignChildTask(false);
        }}
        footer={null}
        destroyOnClose
        width={600}
      >
        <Form
          form={childForm}
          layout="vertical"
          onFinish={handleChildSubmit}
          style={{ marginTop: 20 }}
        >
          <Form.Item
            name="contractor_detail_id"
            label="Chọn Nhà thầu phụ & Hợp đồng giao khoán"
            rules={[{ required: true, message: 'Vui lòng chọn nhà thầu phụ' }]}
          >
            <Select size="large" placeholder="Chọn nhà thầu phụ giao khoán" disabled={!!editingChildTask}>
              {subcontractorAssignments.map(sub => {
                const busy = isSubcontractorBusy(sub.subcontractor_id, editingChildTask?.id);
                const terminated = sub.contract_status === 'TERMINATED';
                return (
                  <Option key={sub.pivot_id} value={sub.pivot_id} disabled={busy || terminated}>
                    {sub.name} ({sub.contract_name || sub.contract_code}){terminated ? ' - (Hợp đồng đã chấm dứt)' : busy ? ' - (Đang thực hiện công việc khác)' : ''}
                  </Option>
                );
              })}
            </Select>
          </Form.Item>

          <Form.Item
            name="detail_name"
            label="Tên công việc cụ thể"
            rules={[{ required: true, message: 'Vui lòng nhập tên công việc' }]}
          >
            <Input placeholder="Ví dụ: Đổ bê tông dầm móng" size="large" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={6}>
              <Form.Item
                name="unit"
                label="Đơn vị"
                rules={[{ required: true, message: 'Vui lòng chọn đơn vị tính' }]}
              >
                <Select size="large" placeholder="Chọn" disabled={isReassignChildTask}>
                  <Option value="cái">cái</Option>
                  <Option value="bộ">bộ</Option>
                  <Option value="m²">m²</Option>
                  <Option value="m³">m³</Option>
                  <Option value="m">m</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col span={9}>
              <Form.Item
                name="work_volume"
                label="Khối lượng khoán"
                rules={[{ required: true, message: 'Vui lòng nhập khối lượng' }]}
              >
                <Input type="number" step="0.01" min="0.01" placeholder="Ví dụ: 120.50" size="large" disabled={isReassignChildTask} />
              </Form.Item>
            </Col>

            <Col span={9}>
              <Form.Item
                name="agreed_price"
                label="Đơn giá khoán (VNĐ)"
                rules={[{ required: true, message: 'Vui lòng nhập đơn giá' }]}
              >
                <Input type="number" min="0" placeholder="Ví dụ: 1500000" size="large" disabled={isReassignChildTask} />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ marginBottom: 16, padding: '10px 12px', border: '1px solid #f0f0f0', borderRadius: 6, background: '#fafafa' }}>
            <Text type="secondary">Thành tiền công việc: </Text>
            <Text strong style={{ color: '#c25f16' }}>{formatCurrency(childTotalValue)}</Text>
          </div>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="start_date"
                label="Ngày bắt đầu dự kiến"
              >
                <DatePicker size="large" style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày" />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="end_date"
                label="Ngày kết thúc dự kiến"
                dependencies={['start_date']}
                rules={[
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (value) {
                        const isNew = !editingChildTask;
                        const hasChanged = editingChildTask && (!editingChildTask.end_date || !dayjs(editingChildTask.end_date).isSame(value, 'day'));
                        if ((isNew || hasChanged) && value.isBefore(dayjs().startOf('day'))) {
                          return Promise.reject(new Error('Ngày kết thúc dự kiến phải ở tương lai (từ hôm nay trở đi)'));
                        }
                      }
                      if (!value || !getFieldValue('start_date') || !value.isBefore(dayjs(getFieldValue('start_date')), 'day')) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Ngày kết thúc dự kiến phải sau hoặc bằng ngày bắt đầu dự kiến'));
                    },
                  }),
                ]}
              >
                <DatePicker 
                  size="large" 
                  style={{ width: '100%' }} 
                  format="DD/MM/YYYY" 
                  placeholder="Chọn ngày" 
                  disabledDate={(current) => current && current < dayjs().startOf('day')}
                />
              </Form.Item>
            </Col>
          </Row>

          {editingChildTask && (
            <>
              <div style={{ display: 'flex', gap: 16 }}>
                <Form.Item
                  name="progress_percent"
                  label="Tiến độ thực tế (%)"
                  rules={[{ required: true }]}
                  style={{ flex: 1 }}
                >
                  <Input type="number" min={0} max={100} size="large" />
                </Form.Item>

                <Form.Item
                  name="status"
                  label="Trạng thái"
                  rules={[{ required: true }]}
                  style={{ flex: 1 }}
                >
                  <Select size="large">
                    <Option value="TODO">Chuẩn bị</Option>
                    <Option value="DOING">Đang thực hiện</Option>
                    <Option value="DONE">Đã hoàn thành</Option>
                    <Option value="Tạm dừng">Tạm dừng</Option>
                    <Option value="CANCELLED" disabled={isEditingChildFullyCompleted()}>Đã hủy</Option>
                  </Select>
                </Form.Item>
              </div>

              <div style={{ display: 'flex', gap: 16 }}>
                <Form.Item
                  name="acceptance_status"
                  label="Trạng thái nghiệm thu"
                  rules={[{ required: true }]}
                  style={{ flex: 1 }}
                >
                  <Select size="large">
                    <Option value="NONE">Chưa nghiệm thu</Option>
                    <Option value="PENDING">Chờ duyệt nghiệm thu</Option>
                    <Option value="APPROVED">Đã duyệt hoàn thành</Option>
                    <Option value="REJECTED">Không đạt yêu cầu</Option>
                  </Select>
                </Form.Item>
              </div>

              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) => prevValues.acceptance_status !== currentValues.acceptance_status}
              >
                {({ getFieldValue }) =>
                  getFieldValue('acceptance_status') === 'REJECTED' ? (
                    <Form.Item
                      name="rejection_note"
                      label="Lý do nghiệm thu không đạt"
                      rules={[{ required: true, message: 'Vui lòng điền lý do bác bỏ' }]}
                    >
                      <Input.TextArea placeholder="Mô tả lý do hoặc lỗi kỹ thuật cần khắc phục..." rows={3} />
                    </Form.Item>
                  ) : null
                }
              </Form.Item>
            </>
          )}

          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: 24 }}>
            <Button onClick={() => setIsChildModalVisible(false)} style={{ marginRight: 8 }}>
              Hủy
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={createChildTaskMutation.isPending || updateChildTaskMutation.isPending}
              style={{ backgroundColor: '#c25f16', borderColor: '#c25f16', borderRadius: 4 }}
            >
              {editingChildTask ? 'Lưu thay đổi' : 'Thêm mới'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProjectTaskDetail;
