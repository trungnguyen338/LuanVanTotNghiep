import React, { useMemo, useState } from 'react';
import {
  Typography, Card, Row, Col, Table, Button, Breadcrumb, Tag,
  Modal, Form, Input, Select, message, Popconfirm, Space, Progress, DatePicker, Tabs
} from 'antd';
import {
  ArrowLeftOutlined, PlusOutlined, DeleteOutlined, EditOutlined,
  UserOutlined, DollarOutlined, CheckCircleOutlined, SettingOutlined,
  BlockOutlined, TeamOutlined, ScheduleOutlined, FilterOutlined,
  EllipsisOutlined, DownOutlined, UpOutlined, InfoCircleOutlined, ExclamationCircleOutlined,
  PieChartOutlined, FileTextOutlined, PaperClipOutlined, RightOutlined,
  ShoppingOutlined, FilePdfOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import projectService from '../../services/projectService';
import subContractService from '../../services/subContractService';
import clientContractService from '../../services/clientContractService';
import documentService from '../../services/documentService';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const formatCurrency = (value) => {
  if (!value) return '0 VNĐ';
  const numVal = Number(value);
  return new Intl.NumberFormat('vi-VN').format(numVal) + ' VNĐ';
};

// Formats big currency in Tỷ/Triệu for stats
const formatCurrencyTỷ = (value) => {
  if (!value) return '0 Tỷ';
  const numVal = Number(value);
  if (numVal >= 1000000000) {
    return (numVal / 1000000000).toFixed(1).replace('.0', '') + ' Tỷ';
  }
  if (numVal >= 1000000) {
    return (numVal / 1000000).toFixed(1).replace('.0', '') + ' Triệu';
  }
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(numVal);
};

const REASSIGNED_TASK_SUFFIX = ' - Phần còn lại';
const TASK_STATUS_OPTIONS = [
  { label: 'Tất cả trạng thái', value: 'ALL' },
  { label: 'Chưa thực hiện', value: 'TODO' },
  { label: 'Đang thực hiện', value: 'DOING' },
  { label: 'Đã hoàn thành', value: 'DONE' },
  { label: 'Tạm dừng', value: 'Tạm dừng' },
  { label: 'Đã hủy', value: 'CANCELLED' },
];
const TASK_TYPE_OPTIONS = [
  { label: 'Tất cả loại hạng mục', value: 'ALL' },
  { label: 'Thi công trực tiếp', value: 'Thi công trực tiếp' },
  { label: 'Hạng mục kỹ thuật / Thiết kế', value: 'Hạng mục kỹ thuật / Thiết kế' },
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

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Active Tab
  const [activeTabKey, setActiveTabKey] = useState('1');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [filterForm] = Form.useForm();
  const [documentTypeFilter, setDocumentTypeFilter] = useState('ALL');
  const [taskFilters, setTaskFilters] = useState({
    keyword: '',
    status: 'ALL',
    taskType: 'ALL',
  });

  // Expanded parent tasks state
  const [expandedTaskIds, setExpandedTaskIds] = useState({});

  // Forms
  const [parentForm] = Form.useForm();
  const [childForm] = Form.useForm();
  const childWorkVolume = Form.useWatch('work_volume', childForm);
  const childAgreedPrice = Form.useWatch('agreed_price', childForm);
  const childProgressPercent = Form.useWatch('progress_percent', childForm);
  const childTotalValue = Number(childWorkVolume || 0) * Number(childAgreedPrice || 0);

  // Modals state
  const [isParentModalVisible, setIsParentModalVisible] = useState(false);
  const [editingParentTask, setEditingParentTask] = useState(null);

  const [isChildModalVisible, setIsChildModalVisible] = useState(false);
  const [editingChildTask, setEditingChildTask] = useState(null);
  const [activeParentTaskId, setActiveParentTaskId] = useState(null);
  const [isReassignChildTask, setIsReassignChildTask] = useState(false);

  // Queries
  const { data: project = {}, isLoading: loadingProject } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectService.getProject(id)
  });

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['projectTasks', id],
    queryFn: () => projectService.getProjectTasks(id)
  });

  const filteredTasks = useMemo(() => {
    const keyword = taskFilters.keyword.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesKeyword = !keyword
        || String(task.task_name || '').toLowerCase().includes(keyword);

      const matchesStatus = taskFilters.status === 'ALL' || task.status === taskFilters.status;
      const matchesType = taskFilters.taskType === 'ALL' || task.task_type === taskFilters.taskType;

      return matchesKeyword && matchesStatus && matchesType;
    });
  }, [tasks, taskFilters]);

  // Load subcontractor contracts to extract pivot details (subcontractor assignments)
  const { data: subContracts = [] } = useQuery({
    queryKey: ['subContracts', id],
    queryFn: () => subContractService.getSubContracts({ project_id: id })
  });

  const handleOpenDocument = async (document) => {
    try {
      await documentService.openDocumentFile(document);
    } catch (error) {
      message.error(error.response?.data?.message || error.message || 'Không thể mở tệp tài liệu');
    }
  };

  // Load client contracts of this project for financial summary
  const { data: clientContracts = [] } = useQuery({
    queryKey: ['clientContracts', id],
    queryFn: () => clientContractService.getContracts({ project_id: id })
  });

  const { data: docTypes = [] } = useQuery({
    queryKey: ['docTypes'],
    queryFn: () => documentService.getDocumentTypes()
  });

  // Load dynamic task types from backend WBS API
  const { data: taskTypes = [] } = useQuery({
    queryKey: ['taskTypes'],
    queryFn: () => projectService.getTaskTypes()
  });

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
          contract_name: contract.contract_name
        });
      });
    }
  });

  // Check if subcontractor is busy in the current project (has any unfinished child task)
  const isSubcontractorBusy = (subcontractorId, currentChildTaskId = null) => {
    return false;
  };

  const getTaskValue = (task) => Number(task.billing_value || 0);

  const getDetailsTotalValue = (task) => {
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

  const getDetailsTotalColor = (task) => {
    const taskValue = getTaskValue(task);
    const detailsTotal = getDetailsTotalValue(task);
    if (taskValue > 0 && detailsTotal > taskValue) return '#cf1322';
    if (taskValue > 0 && detailsTotal / taskValue >= 0.9) return '#d46b08';
    return '#1677ff';
  };

  const filteredDocuments = useMemo(() => {
    const normalizedFilter = String(documentTypeFilter || 'ALL');

    return (project.documents || []).filter((document) => {
      if (normalizedFilter === 'ALL') {
        return true;
      }

      return String(document.document_type_id ?? '') === normalizedFilter;
    });
  }, [project.documents, documentTypeFilter]);

  const hasActiveDocumentFilter = documentTypeFilter !== 'ALL';

  const handleResetDocumentFilter = () => {
    setDocumentTypeFilter('ALL');
  };

  // Calculations for Stats Widgets
  const plannedBudget = Number(project.budget || 0);
  const spentBudget = Number(project.spent_budget || 0);

  // Doanh thu thực tế đã thu từ các đợt thanh toán hợp đồng khách hàng đã hoàn thành (từ API backend)
  const receivedBudget = Number(project.received_budget || 0);

  const spentPercent = plannedBudget > 0 ? Math.round((spentBudget / plannedBudget) * 100) : 0;
  const receivedPercent = plannedBudget > 0 ? Math.round((receivedBudget / plannedBudget) * 100) : 0;
  const variance = plannedBudget - spentBudget;
  const disbursementRate = plannedBudget > 0 ? Math.round((spentBudget / plannedBudget) * 100) : 0;

  // Toggle card expansion
  const toggleTaskExpand = (taskId) => {
    setExpandedTaskIds(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  const handleOpenTaskDetail = (taskId) => {
    navigate(`/projects/${id}/tasks/${taskId}`);
  };

  const hasActiveTaskFilters = Boolean(
    taskFilters.keyword.trim() ||
    taskFilters.status !== 'ALL' ||
    taskFilters.taskType !== 'ALL'
  );

  const handleOpenTaskFilters = () => {
    filterForm.setFieldsValue(taskFilters);
    setIsFilterModalVisible(true);
  };

  const handleApplyTaskFilters = (values) => {
    setTaskFilters({
      keyword: values.keyword || '',
      status: values.status || 'ALL',
      taskType: values.taskType || 'ALL',
    });
    setIsFilterModalVisible(false);
  };

  const handleResetTaskFilters = () => {
    const nextFilters = {
      keyword: '',
      status: 'ALL',
      taskType: 'ALL',
    };
    setTaskFilters(nextFilters);
    filterForm.setFieldsValue(nextFilters);
  };

  // --- MUTATIONS ---

  // Parent Tasks
  const createParentTaskMutation = useMutation({
    mutationFn: (data) => projectService.createProjectTask(id, data),
    onSuccess: () => {
      message.success('Thêm hạng mục lớn thành công');
      setIsParentModalVisible(false);
      parentForm.resetFields();
      queryClient.invalidateQueries(['projectTasks', id]);
      queryClient.invalidateQueries(['project', id]);
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  });

  const updateParentTaskMutation = useMutation({
    mutationFn: ({ taskId, data }) => projectService.updateProjectTask(taskId, data),
    onSuccess: () => {
      message.success('Cập nhật hạng mục lớn thành công');
      setIsParentModalVisible(false);
      setEditingParentTask(null);
      parentForm.resetFields();
      queryClient.invalidateQueries(['projectTasks', id]);
      queryClient.invalidateQueries(['project', id]);
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  });

  const deleteParentTaskMutation = useMutation({
    mutationFn: projectService.deleteProjectTask,
    onSuccess: () => {
      message.success('Xóa hạng mục lớn thành công');
      queryClient.invalidateQueries(['projectTasks', id]);
      queryClient.invalidateQueries(['project', id]);
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Không thể xóa hạng mục lớn này');
    }
  });

  // Child Tasks
  const createChildTaskMutation = useMutation({
    mutationFn: ({ taskId, data }) => projectService.createTaskDetail(taskId, data),
    onSuccess: () => {
      message.success('Thêm công việc con & giao khoán thành công');
      setIsChildModalVisible(false);
      setIsReassignChildTask(false);
      childForm.resetFields();
      queryClient.invalidateQueries(['projectTasks', id]);
      queryClient.invalidateQueries(['project', id]);
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
      queryClient.invalidateQueries(['projectTasks', id]);
      queryClient.invalidateQueries(['project', id]);
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  });

  const deleteChildTaskMutation = useMutation({
    mutationFn: projectService.deleteTaskDetail,
    onSuccess: () => {
      message.success('Xóa công việc con thành công');
      queryClient.invalidateQueries(['projectTasks', id]);
      queryClient.invalidateQueries(['project', id]);
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Không thể xóa công việc này');
    }
  });

  // --- HANDLERS ---

  const handleOpenParentModal = (task = null) => {
    setEditingParentTask(task);
    if (task) {
      parentForm.setFieldsValue({
        task_name: task.task_name,
        task_type: task.task_type,
        status: task.status,
        progress_percent: task.progress_percent,
        billing_value: task.billing_value,
      });
    } else {
      parentForm.resetFields();
      parentForm.setFieldsValue({ task_type: 'Thi công trực tiếp', status: 'TODO', progress_percent: 0, billing_value: null });
    }
    setIsParentModalVisible(true);
  };

  const handleParentSubmit = (values) => {
    if (editingParentTask) {
      updateParentTaskMutation.mutate({ taskId: editingParentTask.id, data: values });
    } else {
      createParentTaskMutation.mutate(values);
    }
  };

  const handleOpenChildModal = (parentTaskId, child = null, presetValues = {}) => {
    const { lockAssignmentFields = false, ...formPresetValues } = presetValues;

    setActiveParentTaskId(parentTaskId);
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

  const handleReassignRemainingWork = (parentTaskId, record) => {
    const remainingWorkVolume = getRemainingWorkVolume(record);
    if (remainingWorkVolume <= 0) {
      message.info('Công việc này không còn khối lượng để giao lại.');
      return;
    }

    handleOpenChildModal(parentTaskId, null, {
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
        taskId: activeParentTaskId,
        data: {
          ...dataToSend,
          progress_percent: 0,
          status: 'TODO',
          acceptance_status: 'NONE',
        },
      });
    }
  };

  // Render project status badge
  const renderProjectStatusBadge = (status) => {
    const configs = {
      PENDING: { text: 'Chuẩn bị', color: 'warning' },
      PROCESSING: { text: 'Đang thi công', color: 'orange' },
      COMPLETED: { text: 'Đã hoàn thành', color: 'success' },
      ON_HOLD: { text: 'Tạm ngưng', color: 'error' }
    };
    const config = configs[status] || { text: status, color: 'default' };

    // Ant Design v6 styles
    const colors = {
      orange: { bg: '#fff7e6', text: '#d46b08', border: '#ffd591' },
      success: { bg: '#f6ffed', text: '#389e0d', border: '#b7eb8f' },
      warning: { bg: '#fffbe6', text: '#d4b106', border: '#ffe58f' },
      error: { bg: '#fff1f0', text: '#cf1322', border: '#ffa39e' },
      processing: { bg: '#e6f7ff', text: '#0958d9', border: '#91d5ff' },
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

  const renderStatusDot = (progress) => {
    let dotColor = '#faad14'; // Yellow
    if (progress === 100) dotColor = '#52c41a'; // Green
    else if (progress >= 50) dotColor = '#d46b08'; // Orange/Brown

    return (
      <span style={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        backgroundColor: dotColor,
        display: 'inline-block',
        marginRight: 8
      }} />
    );
  };

  const renderAcceptanceTag = (status) => {
    const configs = {
      NONE: { text: 'Chưa nghiệm thu', color: 'default' },
      PENDING: { text: 'Chờ duyệt', color: 'warning' },
      APPROVED: { text: 'Đã duyệt', color: 'success' },
      REJECTED: { text: 'Không đạt yêu cầu', color: 'error' },
    };
    const config = configs[status] || configs.NONE;
    return <Tag color={config.color} style={{ fontWeight: 500 }}>{config.text}</Tag>;
  };

  const expandedRowRender = (task) => {
    const columns = [
      {
        title: 'Tên công việc',
        dataIndex: 'detail_name',
        key: 'detail_name',
        render: (text) => <Text strong>{text}</Text>
      },
      {
        title: 'Thời gian',
        key: 'duration',
        render: (_, record) => {
          if (!record.start_date && !record.end_date) return '---';
          const start = record.start_date ? dayjs(record.start_date).format('DD/MM/YYYY') : '---';
          const end = record.end_date ? dayjs(record.end_date).format('DD/MM/YYYY') : '---';
          return `${start} Đến ${end}`;
        }
      },
      {
        title: 'Nhà thầu phụ',
        key: 'subcontractor',
        render: (_, record) => record.contractor_detail?.subcontractor?.name || record.contractorDetail?.subcontractor?.name || '---'
      },
      {
        title: 'Đơn vị',
        dataIndex: 'unit',
        key: 'unit',
        render: (text) => text || '---'
      },
      {
        title: 'Khối lượng / Đơn giá',
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
        title: 'Tiến độ',
        key: 'progress_percent',
        width: 150,
        render: (_, record) => {
          const progress = Math.max(0, Number(record.progress_percent || 0));
          let barColor = '#c25f16';
          if (progress === 100) {
            if (record.acceptance_status === 'REJECTED') barColor = '#f5222d';
            else if (record.acceptance_status === 'PENDING') barColor = '#faad14';
            else barColor = '#52c41a';
          }
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Progress percent={progress} size="small" strokeColor={barColor} style={{ margin: 0, flex: 1 }} />
            </div>
          );
        }
      },
      {
        title: 'Trạng thái',
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
        title: 'Nghiệm thu',
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
                              <p style={{ margin: '0 0 4px 0', fontWeight: 700, color: '#c2410c', fontSize: '13px' }}>Phản hồi từ Ban quản lý dự án:</p>
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
        title: 'Hành động',
        key: 'actions',
        width: 140,
        render: (_, record) => {
          const isApproved = record.acceptance_status === 'APPROVED';
          const isOriginalReassigned = hasBeenReassigned(record, task.details || []);
          const isDisabled = isApproved || project.status === 'COMPLETED' || isOriginalReassigned;
          return (
            <Space size="middle">
              {record.status === 'CANCELLED' && getRemainingWorkVolume(record) > 0 && (
                <Button
                  size="small"
                  icon={<PlusOutlined />}
                  disabled={isOriginalReassigned}
                  onClick={() => handleReassignRemainingWork(task.id, record)}
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
                onClick={() => handleOpenChildModal(task.id, record)}
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

    return (
      <div className="child-table-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text strong style={{ fontSize: 14, color: '#595959' }}>
            🛠️ Chi tiết công việc con ({task.details?.length || 0})
          </Text>
          <Button
            size="small"
            type="primary"
            icon={<PlusOutlined />}
            disabled={project.status === 'COMPLETED'}
            onClick={() => handleOpenChildModal(task.id)}
            style={{ backgroundColor: '#c25f16', borderColor: '#c25f16', borderRadius: 4, fontSize: 12, fontWeight: 600 }}
          >
            Thêm công việc con
          </Button>
        </div>
        <Table
          dataSource={task.details || []}
          columns={columns}
          rowKey="id"
          pagination={false}
          className="child-table"
          bordered
          size="small"
        />
      </div>
    );
  };

  if (loadingProject) {
    return <Card loading bordered={false} style={{ width: '100%', margin: '24px 0' }} />;
  }

  return (
    <div style={{ width: '100%', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`
        .project-detail-layout .ant-card {
          border-radius: 8px;
          border: 1px solid #f0f0f0;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }
        .task-card-title-link {
          cursor: pointer;
          transition: color 0.2s ease;
        }
        .task-card-title-link:hover {
          color: #c25f16;
        }
        .task-card-clickable {
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .task-card-clickable:hover {
          box-shadow: 0 10px 28px rgba(194, 95, 22, 0.08);
          transform: translateY(-1px);
        }
        .stats-card {
          height: 120px;
        }
        .info-title {
          font-size: 14px;
          color: #8c8c8c;
          margin-bottom: 4px;
          font-weight: 500;
        }
        .info-value {
          font-size: 14px;
          color: #262626;
          font-weight: 600;
        }
        .finance-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          align-items: center;
        }
        .finance-label {
          color: #595959;
          font-size: 13px;
        }
        .finance-val {
          font-weight: 700;
          font-size: 14px;
          color: #262626;
        }
        .custom-tabs .ant-tabs-nav::before {
          border-bottom: 1px solid #f0f0f0;
        }
        .custom-tabs .ant-tabs-tab-btn {
          font-weight: 600 !important;
          color: #595959;
          font-size: 14px;
        }
        .custom-tabs .ant-tabs-tab-active .ant-tabs-tab-btn {
          color: #c25f16 !important;
        }
        .custom-tabs .ant-tabs-ink-bar {
          background-color: #c25f16 !important;
        }
        .task-card {
          background: #ffffff;
          border: 1px solid #e8e8e8;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 16px;
          transition: all 0.2s;
        }
        .task-card:hover {
          border-color: #c25f16;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        .task-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
        }
        .task-card-title {
          font-size: 16px;
          font-weight: 700;
          color: #262626;
          display: flex;
          align-items: center;
        }
        .task-card-desc {
          color: #8c8c8c;
          font-size: 13px;
          margin-bottom: 16px;
        }
        .task-card-progress {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .child-table-container {
          margin-top: 16px;
          border-top: 1px dashed #e8e8e8;
          padding-top: 16px;
        }
        .child-table .ant-table-thead > tr > th {
          font-weight: 700;
          color: #1f1f1f;
          background-color: #fafafa;
        }
      `}</style>

      {/* Top Navigation Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Breadcrumb separator=">">
          <Breadcrumb.Item>
            <span style={{ cursor: 'pointer', color: '#c25f16', fontWeight: 600 }} onClick={() => navigate('/projects')}>
              ← Quay lại danh sách dự án
            </span>
          </Breadcrumb.Item>
        </Breadcrumb>
        <Text style={{ color: '#8c8c8c', fontSize: 13, fontWeight: 500 }}>
          Mã dự án: {project.project_code || '---'}
        </Text>
      </div>

      {/* Main Title Row */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0, fontWeight: 800, color: '#1f1f1f', fontSize: 22 }}>
          Chi tiết Dự án: {project.name || '---'}
        </Title>
        {renderProjectStatusBadge(project.status)}
      </div>

      {/* Stat Cards Area */}
      <Row gutter={16} style={{ marginBottom: 24 }} className="project-detail-layout">
        {/* Card 1: Overall Progress */}
        <Col span={8}>
          <Card className="stats-card" bodyStyle={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8 }}>TIẾN ĐỘ TỔNG THỂ</Text>
            <Text strong style={{ fontSize: 28, color: '#1f1f1f', display: 'block', lineHeight: 1.1 }}>
              {project.progress || 0}%
            </Text>
          </Card>
        </Col>

        {/* Card 2: Spent Budget */}
        <Col span={8}>
          <Card className="stats-card" bodyStyle={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8 }}>CHI PHÍ DỰ KIẾN</Text>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#1f1f1f' }}>
                {formatCurrency(spentBudget)}
              </span>
              <span style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 500 }}>
                / {formatCurrency(plannedBudget)}
              </span>
            </div>
            <Progress
              percent={spentPercent}
              showInfo={false}
              strokeColor="#c25f16"
              size="small"
              style={{ margin: 0 }}
            />
          </Card>
        </Col>

        {/* Card 3: Received Budget */}
        <Col span={8}>
          <Card className="stats-card" bodyStyle={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8 }}>NGÂN SÁCH ĐÃ THU</Text>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#1f1f1f' }}>
                {formatCurrency(receivedBudget)}
              </span>
              <span style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 500 }}>
                / {formatCurrency(plannedBudget)}
              </span>
            </div>
            <Progress
              percent={receivedPercent}
              showInfo={false}
              strokeColor="#52c41a"
              size="small"
              style={{ margin: 0 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Info Grid & Financial Summary */}
      <Row gutter={16} style={{ marginBottom: 32 }} className="project-detail-layout">
        {/* Left: General Project Info */}
        <Col span={16}>
          <Card title={<span style={{ fontWeight: 700, fontSize: 15, color: '#262626' }}>📋 Thông tin chung dự án</span>} style={{ height: '100%' }} bodyStyle={{ padding: '24px' }}>
            <Row gutter={[24, 24]}>
              <Col span={8}>
                <div className="info-title">Ngày khởi công</div>
                <div className="info-value">{project.start_date ? dayjs(project.start_date).format('DD/MM/YYYY') : '---'}</div>
              </Col>
              <Col span={8}>
                <div className="info-title">Dự kiến hoàn thành</div>
                <div className="info-value">{project.expected_end_date ? dayjs(project.expected_end_date).format('DD/MM/YYYY') : '---'}</div>
              </Col>

              <Col span={8}>
                <div className="info-title">Địa điểm</div>
                <div className="info-value" style={{ fontSize: 13 }}>{project.address || '---'}</div>
              </Col>
              <Col span={8}>
                <div className="info-title">Khách hàng</div>
                <div className="info-value">{project.customer?.full_name || '---'}</div>
              </Col>
              <Col span={8}>
                <div className="info-title">Loại hình</div>
                <div className="info-value">{project.category?.name || '---'}</div>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* Right: Financial Summary */}
        <Col span={8}>
          <Card title={<span style={{ fontWeight: 700, fontSize: 15, color: '#262626' }}>📊 Tóm tắt tài chính</span>} style={{ height: '100%' }} bodyStyle={{ padding: '24px' }}>
            <div className="finance-row">
              <span className="finance-label">Ngân sách kế hoạch</span>
              <span className="finance-val">{formatCurrency(plannedBudget)}</span>
            </div>
            <div className="finance-row">
              <span className="finance-label">Chi phí dự kiến</span>
              <span className="finance-val">{formatCurrency(spentBudget)}</span>
            </div>
            <div className="finance-row">
              <span className="finance-label">Chênh lệch (Lời / Lỗ dự kiến)</span>
              <span className="finance-val" style={{ color: variance >= 0 ? '#389e0d' : '#cf1322', fontWeight: 'bold' }}>
                {variance >= 0 ? 'Lời: +' : 'Lỗ: '}{formatCurrency(Math.abs(variance))}
              </span>
            </div>

            <div style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span className="finance-label" style={{ fontWeight: 600 }}>Tỷ lệ chi phí dự kiến</span>
                <span style={{ fontWeight: 700, color: '#c25f16', fontSize: 13 }}>{disbursementRate}%</span>
              </div>
              <Progress percent={disbursementRate} showInfo={false} strokeColor="#c25f16" size="small" style={{ margin: 0 }} />
            </div>
          </Card>
        </Col>
      </Row>

      {/* Main Tabbed Area */}
      <Tabs
        activeKey={activeTabKey}
        onChange={setActiveTabKey}
        className="custom-tabs"
        style={{ marginBottom: 32 }}
      >
        {/* Tab 1: WBS & Progress breakdown */}
        <Tabs.TabPane tab="Tiến độ & Hạng mục" key="1">
          {/* List Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text strong style={{ fontSize: 16, color: '#1f1f1f' }}>Danh sách hạng mục thi công</Text>
            <Space>
              <Button
                icon={<FilterOutlined />}
                style={{
                  borderRadius: 4,
                  borderColor: hasActiveTaskFilters ? '#c25f16' : undefined,
                  color: hasActiveTaskFilters ? '#c25f16' : undefined,
                }}
                onClick={handleOpenTaskFilters}
              >
                Bộ lọc
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                disabled={project.status === 'COMPLETED'}
                onClick={() => handleOpenParentModal()}
                style={{ backgroundColor: '#c25f16', borderColor: '#c25f16', borderRadius: 4, fontWeight: 600 }}
              >
                Thêm hạng mục
              </Button>
            </Space>
          </div>

          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Hiển thị {filteredTasks.length}/{tasks.length} hạng mục
            </Text>
            {hasActiveTaskFilters && (
              <Button size="small" type="link" onClick={handleResetTaskFilters} style={{ padding: 0, color: '#c25f16' }}>
                Xóa bộ lọc
              </Button>
            )}
          </div>

          {/* Card list of WBS Tasks */}
          {tasks.length > 0 ? (
            filteredTasks.length > 0 ? (
              filteredTasks.map((task) => {
                const isExpanded = !!expandedTaskIds[task.id];
                const isApproved = task.acceptance_status === 'APPROVED';

                // Custom colors for parent WBS bars matching the progress
                let strokeCol = '#faad14'; // Yellow
                if (task.progress_percent === 100) strokeCol = '#52c41a'; // Green
                else if (task.progress_percent >= 50) strokeCol = '#d46b08'; // Orange/Brown

                return (
                  <div
                    key={task.id}
                    className="task-card task-card-clickable"
                    role="button"
                    tabIndex={0}
                    onClick={() => handleOpenTaskDetail(task.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleOpenTaskDetail(task.id);
                      }
                    }}
                  >
                    <div className="task-card-header">
                      <div>
                        <div className="task-card-title task-card-title-link">
                          {renderStatusDot(task.progress_percent)}
                          {task.task_name}
                          {(() => {
                            const list = taskTypes.length > 0 ? taskTypes : [
                              { value: 'Thi công trực tiếp', label: 'Thi công trực tiếp' },
                              { value: 'Hạng mục kỹ thuật / Thiết kế', label: 'Hạng mục kỹ thuật / Thiết kế' }
                            ];
                            const typeObj = list.find(t => t.value === task.task_type);
                            if (!typeObj) return null;
                            return (
                              <Tag color={task.task_type === 'Hạng mục kỹ thuật / Thiết kế' ? 'blue' : 'orange'} style={{ marginLeft: 12, fontWeight: 500 }}>
                                {typeObj.label}
                              </Tag>
                            );
                          })()}
                        </div>
                        <div className="task-card-desc">
                          Hạng mục thi công trực thuộc dự án.
                        </div>
                        <div style={{ display: 'flex', gap: 24, marginTop: 8, fontSize: '13px', color: '#595959', flexWrap: 'wrap' }}>
                          <span>Giá trị hạng mục: <strong style={{ color: '#c25f16' }}>{formatCurrency(getTaskValue(task))}</strong></span>
                          <span>Tổng giá trị công việc: <strong style={{ color: getDetailsTotalColor(task) }}>{formatCurrency(getDetailsTotalValue(task))}</strong></span>
                        </div>
                      </div>

                      <Space onClick={(event) => event.stopPropagation()}>
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          disabled={isApproved || project.status === 'COMPLETED'}
                          onClick={() => handleOpenParentModal(task)}
                          style={{ borderRadius: 4 }}
                        >
                          Sửa
                        </Button>
                        <Popconfirm
                          title="Xóa hạng mục thi công"
                          description="Bạn có chắc muốn xóa hạng mục này? Chỉ có thể xóa nếu không còn công việc con bên trong."
                          onConfirm={() => deleteParentTaskMutation.mutate(task.id)}
                          okText="Xóa"
                          cancelText="Hủy"
                          okButtonProps={{ danger: true }}
                          disabled={isApproved || project.status === 'COMPLETED'}
                        >
                          <Button
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            disabled={isApproved || project.status === 'COMPLETED'}
                            style={{ borderRadius: 4 }}
                          >
                            Xóa
                          </Button>
                        </Popconfirm>
                      </Space>
                    </div>

                    <div className="task-card-progress">
                      <Progress
                        percent={task.progress_percent || 0}
                        strokeColor={strokeCol}
                        showInfo={false}
                        style={{ flex: 1, margin: 0 }}
                      />
                      <Text strong style={{ fontSize: 14, minWidth: 40, textAlign: 'right' }}>
                        {task.progress_percent || 0}%
                      </Text>
                    </div>
                  </div>
                );
              })
            ) : (
              <Card style={{ padding: '40px 0', textAlign: 'center', borderColor: '#f0f0f0' }}>
                <Text type="secondary">Không có hạng mục nào phù hợp với bộ lọc hiện tại.</Text>
              </Card>
            )
          ) : (
            <Card style={{ padding: '40px 0', textAlign: 'center', borderColor: '#f0f0f0' }}>
              <Text type="secondary">Chưa có hạng mục thi công nào được lập cho dự án này.</Text>
            </Card>
          )}
        </Tabs.TabPane>

        {/* Tab 2: Project Finances (Simulated / Contract billing summary) */}
        <Tabs.TabPane tab="Tài chính dự án" key="2">
          <Card title={<Text strong>Ngân sách chi tiết hợp đồng</Text>} style={{ borderColor: '#f0f0f0' }}>
            <Table
              dataSource={[
                ...clientContracts.map(c => ({
                  key: `client-${c.id}`,
                  contract_code: c.contract_code,
                  name: c.contract_name,
                  type: 'Doanh thu (Thu)',
                  value: c.contract_value,
                  status: c.status === 'ACTIVE' ? 'Đang hiệu lực' : c.status
                })),
                ...subContracts.map(c => ({
                  key: `sub-${c.id}`,
                  contract_code: c.contract_code,
                  name: c.contract_name,
                  type: 'Chi phí (Chi)',
                  value: c.total_value || c.contract_value,
                  status: c.status === 'ACTIVE' ? 'Đang hiệu lực' : c.status
                }))
              ]}
              columns={[
                { title: 'Mã hợp đồng', dataIndex: 'contract_code', key: 'contract_code' },
                { title: 'Tên hợp đồng', dataIndex: 'name', key: 'name', width: '40%' },
                { title: 'Phân loại', dataIndex: 'type', key: 'type', render: (t) => <Tag color={t.includes('Doanh thu') ? 'success' : 'warning'}>{t}</Tag> },
                { title: 'Giá trị hợp đồng', dataIndex: 'value', key: 'value', render: (val) => <strong>{formatCurrency(val)}</strong> },
                { title: 'Trạng thái', dataIndex: 'status', key: 'status' }
              ]}
              pagination={false}
              bordered
            />
          </Card>
        </Tabs.TabPane>

        {/* Tab 3: Connected Contracts */}
        <Tabs.TabPane tab="Hợp đồng liên quan" key="3">
          <Row gutter={16}>
            <Col span={12}>
              <Card title={<span style={{ fontWeight: 700 }}><BlockOutlined /> Hợp đồng khách hàng gốc</span>}>
                {clientContracts.length > 0 ? (
                  clientContracts.map(c => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f5f5f5' }}>
                      <div>
                        <Text strong style={{ color: '#1677ff', cursor: 'pointer' }} onClick={() => navigate(`/contracts/${c.id}`)}>
                          {c.contract_code}
                        </Text>
                        <Text style={{ display: 'block', fontSize: 13, color: '#595959' }}>{c.contract_name}</Text>
                      </div>
                      <Text strong>{formatCurrency(c.contract_value)}</Text>
                    </div>
                  ))
                ) : (
                  <Text type="secondary" italic>Không có hợp đồng khách hàng nào liên kết.</Text>
                )}
              </Card>
            </Col>

            <Col span={12}>
              <Card title={<span style={{ fontWeight: 700 }}><TeamOutlined /> Hợp đồng nhà thầu phụ</span>}>
                {subContracts.length > 0 ? (
                  subContracts.map(c => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f5f5f5' }}>
                      <div>
                        <Text strong style={{ color: '#c25f16', cursor: 'pointer' }} onClick={() => navigate(`/sub-contracts/${c.id}`)}>
                          {c.contract_code}
                        </Text>
                        <Text style={{ display: 'block', fontSize: 13, color: '#595959' }}>{c.contract_name}</Text>
                      </div>
                      <Text strong>{formatCurrency(c.total_value || c.contract_value)}</Text>
                    </div>
                  ))
                ) : (
                  <Text type="secondary" italic>Không có hợp đồng nhà thầu phụ nào liên kết.</Text>
                )}
              </Card>
            </Col>
          </Row>
        </Tabs.TabPane>

        {/* Tab 4: Project Documents */}
        <Tabs.TabPane tab="Tài liệu dự án" key="4">
          <Card title={<Text strong>📁 Danh mục hồ sơ & tài liệu đính kèm</Text>} style={{ borderColor: '#f0f0f0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Space size={12} wrap>
                  <Text strong style={{ fontSize: 14, color: '#262626' }}>
                    Bộ lọc loại tài liệu
                  </Text>
                  <Select
                    value={documentTypeFilter}
                    onChange={setDocumentTypeFilter}
                    style={{ minWidth: 260 }}
                    placeholder="Chọn loại tài liệu"
                    size="middle"
                  >
                    <Option value="ALL">Tất cả loại tài liệu</Option>
                    {docTypes.map((type) => (
                      <Option key={type.id} value={String(type.id)}>
                        {type.type_name}
                      </Option>
                    ))}
                  </Select>
                </Space>
                {hasActiveDocumentFilter && (
                  <Button type="link" onClick={handleResetDocumentFilter} style={{ padding: 0, color: '#c25f16' }}>
                    Xóa bộ lọc
                  </Button>
                )}
              </div>

              <Text type="secondary" style={{ fontSize: 12 }}>
                Hiển thị {filteredDocuments.length}/{(project.documents || []).length} tài liệu
              </Text>

              {project.documents && project.documents.length > 0 ? (
                filteredDocuments.length > 0 ? (
                  filteredDocuments.map(doc => (
                  <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', border: '1px solid #f0f0f0', borderRadius: 6, backgroundColor: '#fafafa' }}>
                    <div style={{ fontSize: 24 }}>
                      {doc.file_url?.endsWith('.pdf') ? (
                        <FilePdfOutlined style={{ color: '#ff4d4f' }} />
                      ) : (
                        <FileTextOutlined style={{ color: '#1890ff' }} />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <a href={doc.download_url || doc.file_url} onClick={(event) => { event.preventDefault(); handleOpenDocument(doc); }} style={{ fontWeight: 600, color: '#1890ff', display: 'block' }}>
                        {doc.document_name || 'Tài liệu đính kèm'}
                      </a>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Loại: {doc.document_type?.type_name || doc.documentType?.type_name || 'Tài liệu'} • Trạng thái: {doc.status}
                      </Text>
                    </div>
                    <Button
                      size="small"
                      icon={<PaperClipOutlined />}
                      onClick={() => handleOpenDocument(doc)}
                    >
                      Tải xuống
                    </Button>
                  </div>
                ))
                ) : (
                  <div style={{ padding: '20px 0', textAlign: 'center' }}>
                    <Text type="secondary" italic>Không có tài liệu nào phù hợp với bộ lọc loại tài liệu hiện tại.</Text>
                  </div>
                )
              ) : (
                <div style={{ padding: '20px 0', textAlign: 'center' }}>
                  <Text type="secondary" italic>Chưa có hồ sơ hay tài liệu nào được tải lên cho dự án này.</Text>
                </div>
              )}
            </div>
          </Card>
        </Tabs.TabPane>
      </Tabs>

      <Modal
        title="Bộ lọc hạng mục thi công"
        open={isFilterModalVisible}
        onCancel={() => setIsFilterModalVisible(false)}
        footer={[
          <Button key="reset" onClick={handleResetTaskFilters}>
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
          onFinish={handleApplyTaskFilters}
          initialValues={taskFilters}
        >
          <Form.Item name="keyword" label="Từ khóa">
            <Input allowClear placeholder="Tìm theo tên hạng mục, hạng mục hợp đồng hoặc mô tả" />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái">
            <Select options={TASK_STATUS_OPTIONS} />
          </Form.Item>
          <Form.Item name="taskType" label="Loại hạng mục">
            <Select options={TASK_TYPE_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Parent Task */}
      <Modal
        title={editingParentTask ? 'Chỉnh sửa hạng mục thi công lớn' : 'Thêm hạng mục lớn mới'}
        open={isParentModalVisible}
        onCancel={() => setIsParentModalVisible(false)}
        footer={null}
        destroyOnClose
        width={500}
      >
        <Form
          form={parentForm}
          layout="vertical"
          onFinish={handleParentSubmit}
          style={{ marginTop: 20 }}
        >
          <Form.Item
            name="task_name"
            label="Tên hạng mục thi công lớn"
            rules={[{ required: true, message: 'Vui lòng nhập tên hạng mục' }]}
          >
            <Input placeholder="Ví dụ: Thi công phần móng tòa APEX" size="large" />
          </Form.Item>

          <Form.Item
            name="task_type"
            label="Loại hạng mục"
            rules={[{ required: true }]}
          >
            <Select size="large" placeholder="Chọn loại hạng mục">
              {(taskTypes.length > 0 ? taskTypes : [
                { value: 'Thi công trực tiếp', label: 'Thi công trực tiếp' },
                { value: 'Hạng mục kỹ thuật / Thiết kế', label: 'Hạng mục kỹ thuật / Thiết kế' }
              ]).map(type => (
                <Option key={type.value} value={type.value}>{type.label}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="billing_value"
            label="Giá trị hạng mục (VNĐ)"
          >
            <Input type="number" min="0" placeholder="Ví dụ: 50000000" size="large" />
          </Form.Item>

          {editingParentTask && !(editingParentTask.details && editingParentTask.details.length > 0) && (
            <Form.Item
              name="progress_percent"
              label="Tiến độ hạng mục (%)"
              rules={[{ required: true, message: 'Nhập tiến độ' }]}
            >
              <Input type="number" min={0} max={100} size="large" />
            </Form.Item>
          )}

          {editingParentTask && (
            <Form.Item
              name="status"
              label="Trạng thái"
              rules={[{ required: true }]}
            >
              <Select size="large">
                <Option value="TODO">Chuẩn bị</Option>
                <Option value="DOING">Đang thực hiện</Option>
                <Option value="DONE">Đã hoàn thành</Option>
                <Option value="CANCELLED">Đã hủy</Option>
              </Select>
            </Form.Item>
          )}

          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: 24 }}>
            <Button onClick={() => setIsParentModalVisible(false)} style={{ marginRight: 8 }}>
              Hủy
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={createParentTaskMutation.isPending || updateParentTaskMutation.isPending}
              style={{ backgroundColor: '#c25f16', borderColor: '#c25f16', borderRadius: 4 }}
            >
              {editingParentTask ? 'Lưu thay đổi' : 'Thêm mới'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Child Task */}
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
                return (
                  <Option key={sub.pivot_id} value={sub.pivot_id} disabled={busy}>
                    {sub.name} ({sub.contract_name || sub.contract_code}){busy ? ' - (Đang thực hiện công việc khác)' : ''}
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

export default ProjectDetail;
