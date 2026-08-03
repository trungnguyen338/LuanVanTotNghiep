import React, { useState, useEffect, useMemo } from 'react';
import {
  Typography, Card, Row, Col, Button, Tag,
  Modal, Form, Input, Select, message, Space, Progress, Upload, Image, Divider, Popconfirm, Spin, Empty, DatePicker
} from 'antd';
import {
  PlusOutlined, ClockCircleOutlined, CheckCircleOutlined,
  CloudOutlined, UserOutlined, SettingOutlined, InboxOutlined,
  CalendarOutlined, DashboardOutlined, CheckSquareOutlined, EditOutlined, DeleteOutlined,
  InfoCircleOutlined, ExclamationCircleOutlined, SearchOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import projectService from '../../services/projectService';
import authService from '../../services/authService';
import { getCleanImageUrl } from '../../services/api';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const formatNumber = (value) => {
  if (value === undefined || value === null) return '0';
  const num = Number(value);
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(num);
};

const formatCurrency = (value) => {
  if (!value) return '0 VNĐ';
  const numVal = Number(value);
  return new Intl.NumberFormat('vi-VN').format(numVal) + ' VNĐ';
};

const getProgressColor = (task) => {
  if (task.acceptance_status === 'REJECTED') {
    return '#ef4444'; // Đỏ khi bị từ chối
  }
  if (task.acceptance_status === 'PENDING') {
    return '#ea580c'; // Cam khi đang chờ duyệt
  }
  const percent = task.progress_percent;
  return percent >= 100 ? '#10b981' : '#ea580c';
};

const isCancelledTask = (task) => task?.status === 'CANCELLED' || task?.status === 'Đã hủy';

const isTaskLockedForLogs = (task) => (
  isCancelledTask(task) || ['PENDING', 'APPROVED'].includes(task?.acceptance_status)
);

// Parser to extract [Nhân lực: ...] and [Máy móc: ...] from description
const parseLogDescription = (desc = '') => {
  const laborRegex = /\[Nhân lực:\s*(.*?)\]/;
  const machineryRegex = /\[Máy móc:\s*(.*?)\]/;

  const laborMatch = desc.match(laborRegex);
  const machineryMatch = desc.match(machineryRegex);

  const labor = laborMatch ? laborMatch[1] : '';
  const machinery = machineryMatch ? machineryMatch[1] : '';

  let cleanDesc = desc
    .replace(laborRegex, '')
    .replace(machineryRegex, '')
    .trim();

  return { labor, machinery, description: cleanDesc };
};

const SubcontractorTasks = () => {
  const queryClient = useQueryClient();
  const currentUser = authService.getCurrentUser();

  // State variables
  const [isEditLogModalVisible, setIsEditLogModalVisible] = useState(false);
  const [currentLogDate, setCurrentLogDate] = useState(dayjs());
  const [selectedTask, setSelectedTask] = useState(null);
  const [editingLog, setEditingLog] = useState(null);
  const [fileList, setFileList] = useState([]);
  const [editFileList, setEditFileList] = useState([]);
  const [removedImageIds, setRemovedImageIds] = useState([]);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  useEffect(() => {
    const syncCurrentLogDate = () => setCurrentLogDate(dayjs());
    syncCurrentLogDate();
    const timer = setInterval(syncCurrentLogDate, 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatusFilter, setActiveStatusFilter] = useState('ALL');
  const [detailActiveTab, setDetailActiveTab] = useState('logs');

  // Queries
  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['subcontractorTasks'],
    queryFn: () => projectService.getSubcontractorTasks()
  });

  const { data: activeLogs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ['constructionLogs', selectedTask?.id],
    queryFn: () => projectService.getConstructionLogs(selectedTask?.id),
    enabled: !!selectedTask
  });

  const { data: recentLogs = [], isLoading: loadingRecentLogs } = useQuery({
    queryKey: ['subcontractorRecentLogs'],
    queryFn: () => projectService.getConstructionLogs({})
  });

  // Auto-select first task and sync selectedTask when tasks update
  useEffect(() => {
    if (tasks.length > 0) {
      if (!selectedTask) {
        setSelectedTask(tasks[0]);
      } else {
        const freshTask = tasks.find(t => t.id === selectedTask.id);
        if (freshTask && (
          freshTask.progress_percent !== selectedTask.progress_percent ||
          freshTask.accumulated_volume !== selectedTask.accumulated_volume ||
          freshTask.acceptance_status !== selectedTask.acceptance_status ||
          freshTask.status !== selectedTask.status
        )) {
          setSelectedTask(freshTask);
        }
      }
    }
  }, [tasks, selectedTask]);

  // Mutations
  const createLogMutation = useMutation({
    mutationFn: (formData) => projectService.createConstructionLog(formData),
    onSuccess: () => {
      message.success('Ghi nhật ký và cập nhật tiến độ thành công!');
      form.resetFields();
      setFileList([]);
      queryClient.invalidateQueries({ queryKey: ['subcontractorTasks'] });
      queryClient.invalidateQueries({ queryKey: ['subcontractorRecentLogs'] });
      if (selectedTask) {
        queryClient.invalidateQueries({ queryKey: ['constructionLogs', selectedTask.id] });
      }
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Lỗi hệ thống khi ghi nhật ký.');
    }
  });

  const updateLogMutation = useMutation({
    mutationFn: ({ id, formData }) => projectService.updateConstructionLog(id, formData),
    onSuccess: () => {
      message.success('Cập nhật nhật ký và tiến độ thành công!');
      setIsEditLogModalVisible(false);
      setEditingLog(null);
      editForm.resetFields();
      setEditFileList([]);
      setRemovedImageIds([]);
      queryClient.invalidateQueries({ queryKey: ['subcontractorTasks'] });
      queryClient.invalidateQueries({ queryKey: ['subcontractorRecentLogs'] });
      if (selectedTask) {
        queryClient.invalidateQueries({ queryKey: ['constructionLogs', selectedTask.id] });
      }
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Lỗi hệ thống khi cập nhật nhật ký.');
    }
  });

  const deleteLogMutation = useMutation({
    mutationFn: (id) => projectService.deleteConstructionLog(id),
    onSuccess: () => {
      message.success('Xóa nhật ký thi công thành công!');
      queryClient.invalidateQueries({ queryKey: ['subcontractorTasks'] });
      queryClient.invalidateQueries({ queryKey: ['subcontractorRecentLogs'] });
      if (selectedTask) {
        queryClient.invalidateQueries({ queryKey: ['constructionLogs', selectedTask.id] });
      }
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Lỗi hệ thống khi xóa nhật ký.');
    }
  });

  const requestAcceptanceMutation = useMutation({
    mutationFn: (id) => projectService.requestAcceptance(id),
    onSuccess: () => {
      message.success('Gửi yêu cầu nghiệm thu thành công! Chờ giám sát duyệt.');
      queryClient.invalidateQueries({ queryKey: ['subcontractorTasks'] });
      queryClient.invalidateQueries({ queryKey: ['subcontractorRecentLogs'] });
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra khi gửi yêu cầu.');
    }
  });

  // Handlers
  const handleLogSubmit = (values) => {
    if (isTaskLockedForLogs(selectedTask)) {
      message.warning(isCancelledTask(selectedTask)
        ? 'Công việc này đã hủy, không thể ghi nhật ký thi công.'
        : 'Công việc này đã gửi yêu cầu nghiệm thu hoặc đã hoàn thành, không thể ghi thêm nhật ký mới.');
      return;
    }

    const formData = new FormData();
    formData.append('task_detail_id', selectedTask.id);
    formData.append('daily_volume', values.daily_volume);
    formData.append('title', values.title || 'Nhật ký thi công');
    formData.append('weather', values.weather || 'Nắng');
    formData.append('description', values.description);
    formData.append('created_at', dayjs().format('YYYY-MM-DD HH:mm:ss'));

    fileList.forEach(file => {
      if (file.originFileObj) {
        formData.append('images[]', file.originFileObj);
      }
    });

    createLogMutation.mutate(formData);
  };

  const handleOpenEditLogModal = (log) => {
    if (isTaskLockedForLogs(selectedTask)) {
      message.warning(isCancelledTask(selectedTask)
        ? 'Công việc này đã hủy, không thể chỉnh sửa nhật ký thi công.'
        : 'Công việc này đã gửi yêu cầu nghiệm thu hoặc đã hoàn thành, không thể chỉnh sửa nhật ký.');
      return;
    }

    setEditingLog(log);
    const parsed = parseLogDescription(log.description);
    editForm.resetFields();
    editForm.setFieldsValue({
      daily_volume: log.daily_volume,
      weather: log.weather || 'Nắng',
      title: log.title || 'Nhật ký thi công',
      description: parsed.description,
    });

    const existingImages = log.images ? log.images.map(img => ({
      uid: img.id,
      name: img.image_url.split('/').pop(),
      status: 'done',
      url: getCleanImageUrl(img.image_url),
    })) : [];

    setEditFileList(existingImages);
    setRemovedImageIds([]);
    setIsEditLogModalVisible(true);
  };

  const handleEditLogSubmit = (values) => {
    if (isTaskLockedForLogs(selectedTask)) {
      message.warning(isCancelledTask(selectedTask)
        ? 'Công việc này đã hủy, không thể chỉnh sửa nhật ký thi công.'
        : 'Công việc này đã gửi yêu cầu nghiệm thu hoặc đã hoàn thành, không thể chỉnh sửa nhật ký.');
      return;
    }

    const formData = new FormData();
    formData.append('_method', 'PUT');
    formData.append('daily_volume', values.daily_volume);
    formData.append('title', values.title || 'Nhật ký thi công');
    formData.append('weather', values.weather || 'Nắng');
    formData.append('description', values.description);

    editFileList.forEach(file => {
      if (file.originFileObj) {
        formData.append('images[]', file.originFileObj);
      }
    });
    removedImageIds.forEach(id => formData.append('remove_image_ids[]', id));

    updateLogMutation.mutate({ id: editingLog.id, formData });
  };

  const handleUploadChange = ({ fileList: newFileList }) => {
    setFileList(newFileList);
  };

  const handleEditUploadChange = ({ fileList: newFileList }) => {
    setEditFileList(newFileList);
  };

  // Render Helpers
  const renderAcceptanceTag = (status) => {
    const configs = {
      NONE: { text: 'Chưa nghiệm thu', color: 'default' },
      PENDING: { text: 'Chờ duyệt', color: 'warning' },
      APPROVED: { text: 'Đã nghiệm thu', color: 'success' },
      REJECTED: { text: 'Không đạt yêu cầu', color: 'error' },
    };
    const config = configs[status] || configs.NONE;
    return <Tag color={config.color} style={{ fontWeight: 600, padding: '2px 8px' }}>{config.text.toUpperCase()}</Tag>;
  };

  const renderStatusTag = (status) => {
    const configs = {
      TODO: { text: 'Chưa thực hiện', color: 'default' },
      DOING: { text: 'Đang thực hiện', color: 'orange' },
      DONE: { text: 'Đã hoàn thành', color: 'green' },
      CANCELLED: { text: 'Đã hủy', color: 'error' }
    };
    const config = configs[status] || { text: status, color: 'default' };

    // Check if it is Đang thực hiện to style matches mockup badge
    if (status === 'DOING' || status === 'Đang thực hiện') {
      return (
        <span style={{
          backgroundColor: '#fff7ed',
          color: '#ea580c',
          border: '1px solid #ffedd5',
          borderRadius: '4px',
          padding: '2px 8px',
          fontSize: '11px',
          fontWeight: 700,
          display: 'inline-block'
        }}>
          Đang thực hiện
        </span>
      );
    }

    // Check if it is Đã hoàn thành to style matches mockup badge
    if (status === 'DONE' || status === 'Đã hoàn thành') {
      return (
        <span style={{
          backgroundColor: '#f0fdf4',
          color: '#16a34a',
          border: '1px solid #dcfce7',
          borderRadius: '4px',
          padding: '2px 8px',
          fontSize: '11px',
          fontWeight: 700,
          display: 'inline-block'
        }}>
          Đã hoàn thành
        </span>
      );
    }

    if (status === 'CANCELLED' || status === 'Đã hủy') {
      return (
        <span style={{
          backgroundColor: '#fef2f2',
          color: '#dc2626',
          border: '1px solid #fee2e2',
          borderRadius: '4px',
          padding: '2px 8px',
          fontSize: '11px',
          fontWeight: 700,
          display: 'inline-block'
        }}>
          Đã hủy
        </span>
      );
    }

    return <Tag color={config.color} style={{ borderRadius: '4px', fontWeight: 600 }}>{config.text}</Tag>;
  };

  // Filter tasks based on search and status tabs
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        (task.detail_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.project_name || '').toLowerCase().includes(searchQuery.toLowerCase());

      let matchesStatus = true;
      if (activeStatusFilter === 'DOING') {
        matchesStatus = task.status === 'DOING' || task.status === 'Đang thực hiện';
      } else if (activeStatusFilter === 'DONE') {
        matchesStatus = task.status === 'DONE' || task.status === 'Đã hoàn thành';
      } else if (activeStatusFilter === 'CANCELLED') {
        matchesStatus = task.status === 'CANCELLED' || task.status === 'Đã hủy' || task.status === 'Tạm dừng';
      }
      return matchesSearch && matchesStatus;
    });
  }, [tasks, searchQuery, activeStatusFilter]);

  return (
    <div style={{ width: '100%', fontFamily: 'Inter, system-ui, sans-serif', padding: '16px 8px' }}>
      <style>{`
        /* Smooth scrolling list of task cards on the left */
        .task-list-container {
          max-height: calc(100vh - 340px);
          overflow-y: auto;
          padding-right: 4px;
        }
        .task-list-container::-webkit-scrollbar {
          width: 5px;
        }
        .task-list-container::-webkit-scrollbar-track {
          background: transparent;
        }
        .task-list-container::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        .task-list-container::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        /* Hover & Active states for Task Cards */
        .task-item-card {
          cursor: pointer;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 12px;
          transition: all 0.2s ease-in-out;
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.01);
        }
        .task-item-card:hover {
          border-color: #cbd5e1;
          transform: translateY(-1px);
        }
        .task-item-card.active {
          border-color: #f97316;
          border-width: 2px;
          background: #fffdfa;
          box-shadow: 0 4px 16px rgba(249, 115, 22, 0.04);
        }

        /* Tabs styling */
        .custom-filter-tabs {
          display: flex;
          border-bottom: 1px solid #e2e8f0;
          margin-bottom: 16px;
          gap: 20px;
        }
        .custom-filter-tab {
          padding: 8px 4px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 700;
          color: #64748b;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
        }
        .custom-filter-tab:hover {
          color: #1e293b;
        }
        .custom-filter-tab.active {
          color: #ea580c;
          border-bottom-color: #ea580c;
        }

        /* Clean White Cards for Log Entries */
        .log-entry-item-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }
      `}</style>

      {selectedTask && (
        <div style={{ marginBottom: '24px' }}>
          {/* Breadcrumbs (Left Aligned) */}
          <div style={{ fontSize: '16px', color: '#475569', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
            <span style={{ color: '#64748b' }}>Nhật ký thi công</span>
            <span style={{ color: '#94a3b8', fontWeight: 700 }}>&gt;</span>
            <span style={{ color: '#0f172a', fontWeight: 700 }}>Chi tiết công việc</span>
          </div>

          {/* Project Title & Dates (Centered) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginTop: '-10px' }}>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>
              {selectedTask.project_name}
            </h2>
            <span style={{ fontSize: '14px', color: '#475569', display: 'block', marginTop: '6px', fontWeight: 600 }}>
              Thời gian thực hiện: {selectedTask.start_date ? dayjs(selectedTask.start_date).format('DD/MM/YYYY') : '---'} - {selectedTask.end_date ? dayjs(selectedTask.end_date).format('DD/MM/YYYY') : '---'}
            </span>
          </div>
        </div>
      )}

      <Row gutter={24}>
        {/* Left Column: Tasks List */}
        <Col span={8}>
          <Card
            bordered={false}
            bodyStyle={{ padding: '20px' }}
            style={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0', minHeight: 'calc(100vh - 120px)' }}
          >
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>Danh sách công việc</div>

            {/* Search input */}
            <div style={{ marginBottom: '16px' }}>
              <Input
                placeholder="Tìm kiếm công việc..."
                prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="large"
                style={{ borderRadius: '8px', borderColor: '#e2e8f0' }}
                allowClear
              />
            </div>

            {/* Filter Tabs */}
            <div className="custom-filter-tabs">
              <div className={`custom-filter-tab ${activeStatusFilter === 'ALL' ? 'active' : ''}`} onClick={() => setActiveStatusFilter('ALL')}>Tất cả</div>
              <div className={`custom-filter-tab ${activeStatusFilter === 'DOING' ? 'active' : ''}`} onClick={() => setActiveStatusFilter('DOING')}>Đang thực hiện</div>
              <div className={`custom-filter-tab ${activeStatusFilter === 'DONE' ? 'active' : ''}`} onClick={() => setActiveStatusFilter('DONE')}>Hoàn thành</div>
              <div className={`custom-filter-tab ${activeStatusFilter === 'CANCELLED' ? 'active' : ''}`} onClick={() => setActiveStatusFilter('CANCELLED')}>Đã hủy/Tạm dừng</div>
            </div>

            {/* Task list container */}
            <div className="task-list-container">
              {loadingTasks ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}><Spin size="large" /></div>
              ) : filteredTasks.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không tìm thấy công việc" />
              ) : (
                filteredTasks.map((task) => {
                  const isSelected = selectedTask?.id === task.id;
                  const percent = task.progress_percent || 0;
                  const taskCode = `CT-${task.id.toString().padStart(2, '0')}`;

                  return (
                    <div
                      key={task.id}
                      className={`task-item-card ${isSelected ? 'active' : ''}`}
                      onClick={() => setSelectedTask(task)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{
                          border: '1px solid #fed7aa',
                          background: '#fff7ed',
                          color: '#ea580c',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontWeight: 700,
                          fontSize: '11px',
                          whiteSpace: 'nowrap'
                        }}>
                          {taskCode}
                        </span>
                        <span style={{
                          fontWeight: 800,
                          fontSize: '14px',
                          color: '#1e293b',
                          lineHeight: '1.4',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flexGrow: 1
                        }}>
                          {task.detail_name}
                        </span>
                      </div>

                      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
                        Hạng mục: <span style={{ fontWeight: 600, color: '#475569' }}>{task.parent_task_name}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                        <div>
                          {renderStatusTag(task.status)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '50%', justifyContent: 'flex-end' }}>
                          <Progress
                            percent={percent}
                            size="small"
                            strokeColor={getProgressColor(task)}
                            showInfo={false}
                            style={{ flexGrow: 1, margin: 0 }}
                          />
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', minWidth: '32px', textAlign: 'right' }}>
                            {percent}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer task count */}
            {!loadingTasks && (
              <div style={{ textAlign: 'center', fontSize: '12px', color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: '12px', marginTop: '12px', fontWeight: 500 }}>
                Hiển thị {filteredTasks.length}/{tasks.length} công việc
              </div>
            )}
          </Card>
        </Col>

        {/* Right Column: Selected Task Details */}
        <Col span={16}>
          {selectedTask ? (
            <div style={{ paddingLeft: '4px' }}>

              {/* Active Task Info Card */}
              <Card
                bordered={false}
                bodyStyle={{ padding: '24px' }}
                style={{ borderRadius: '16px', marginBottom: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      border: '1px solid #fed7aa',
                      background: '#fff7ed',
                      color: '#ea580c',
                      padding: '3px 10px',
                      borderRadius: '6px',
                      fontWeight: 700,
                      fontSize: '12px'
                    }}>
                      {`CT-${selectedTask.id.toString().padStart(2, '0')}`}
                    </span>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>{selectedTask.detail_name}</h2>
                  </div>
                  <div>
                    {renderStatusTag(selectedTask.status)}
                  </div>
                </div>

                <Row gutter={24} style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                  <Col span={6}>
                    <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Hạng mục</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginTop: '6px' }}>{selectedTask.parent_task_name}</div>
                  </Col>
                  <Col span={6}>
                    <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Khối lượng công việc</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginTop: '6px' }}>{formatNumber(selectedTask.work_volume)} {selectedTask.unit || ''}</div>
                  </Col>
                  <Col span={6}>
                    <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Khối lượng đã thực hiện</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#ea580c', marginTop: '6px' }}>{formatNumber(selectedTask.accumulated_volume)} {selectedTask.unit || ''}</div>
                  </Col>
                  <Col span={6}>
                    <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Tiến độ công việc</div>
                    <div style={{ marginTop: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Progress
                          percent={selectedTask.progress_percent}
                          size="small"
                          strokeColor={getProgressColor(selectedTask)}
                          showInfo={false}
                          style={{ flexGrow: 1, margin: 0 }}
                        />
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>
                          {selectedTask.progress_percent}%
                        </span>
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card>

              {/* Detail View Nav Tabs (Mockup Style with Orange active color) */}
              <div className="custom-filter-tabs" style={{ marginBottom: '20px' }}>
                <div className={`custom-filter-tab ${detailActiveTab === 'logs' ? 'active' : ''}`} onClick={() => setDetailActiveTab('logs')}>Nhật ký thi công</div>
                <div className={`custom-filter-tab ${detailActiveTab === 'info' ? 'active' : ''}`} onClick={() => setDetailActiveTab('info')}>Thông tin công việc</div>
              </div>

              {/* Tab Contents */}
              {detailActiveTab === 'logs' ? (
                <Row gutter={20}>
                  {/* Create Log Form (Left column) */}
                  <Col span={12}>
                    <Card
                      bordered={false}
                      title={<span style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a' }}>Tạo nhật ký mới</span>}
                      style={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.01)' }}
                    >
                      {(() => {
                        const isCancelled = isCancelledTask(selectedTask);
                        const isLocked = isTaskLockedForLogs(selectedTask);
                        if (isLocked) {
                          return (
                            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', fontSize: '13px' }}>
                              {isCancelled ? (
                                <ExclamationCircleOutlined style={{ color: '#dc2626', fontSize: '36px', marginBottom: '16px', display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />
                              ) : (
                                <CheckCircleOutlined style={{ color: '#10b981', fontSize: '36px', marginBottom: '16px', display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />
                              )}
                              {isCancelled
                                ? 'Công việc này đã hủy, nhà thầu phụ không thể ghi thêm nhật ký thi công.'
                                : 'Công việc này đã gửi yêu cầu nghiệm thu hoặc đã hoàn thành, không thể ghi thêm nhật ký mới.'}
                              {!isCancelled && selectedTask.progress_percent >= 100 && selectedTask.acceptance_status === 'APPROVED' && (
                                <div style={{ marginTop: '16px', fontWeight: 700, color: '#047857', fontSize: '14px' }}>ĐÃ ĐƯỢC NGHIỆM THU </div>
                              )}
                            </div>
                          );
                        }

                        return (
                          <Form
                            form={form}
                            layout="vertical"
                            onFinish={handleLogSubmit}
                          >
                            <Row gutter={12}>
                              <Col span={12}>
                                <Form.Item label={<span style={{ fontWeight: 600, color: '#475569' }}>Ngày thi công *</span>}>
                                  <DatePicker value={currentLogDate} format="DD/MM/YYYY" style={{ width: '100%', borderRadius: '6px' }} disabled />
                                </Form.Item>
                              </Col>
                              <Col span={12}>
                                <Form.Item
                                  name="weather"
                                  label={<span style={{ fontWeight: 600, color: '#475569' }}>Thời tiết *</span>}
                                  initialValue="Nắng"
                                  rules={[{ required: true }]}
                                >
                                  <Select style={{ width: '100%' }}>
                                    <Option value="Nắng">☀️ Nắng</Option>
                                    <Option value="Mưa">🌧️ Mưa</Option>
                                    <Option value="U ám">☁️ Nhiều mây</Option>
                                    <Option value="Gió mạnh">💨 Gió bão</Option>
                                  </Select>
                                </Form.Item>
                              </Col>
                            </Row>

                            <Form.Item
                              name="daily_volume"
                              label={<span style={{ fontWeight: 600, color: '#475569' }}>Khối lượng hoàn thành *</span>}
                              rules={[{ required: true, message: 'Vui lòng nhập khối lượng hoàn thành' }]}
                            >
                              <Input type="number" step="0.01" min="0" placeholder="Ví dụ: 12.5" suffix={selectedTask.unit || 'm3'} style={{ borderRadius: '6px' }} />
                            </Form.Item>



                            <Form.Item
                              name="description"
                              label={<span style={{ fontWeight: 600, color: '#475569' }}>Mô tả công việc trong ngày *</span>}
                              rules={[{ required: true, message: 'Vui lòng nhập nội dung chi tiết' }]}
                            >
                              <Input.TextArea placeholder="Mô tả cụ thể công việc đã thực hiện..." rows={3} maxLength={500} showCount style={{ borderRadius: '6px' }} />
                            </Form.Item>

                            <Form.Item label={<span style={{ fontWeight: 600, color: '#475569' }}>Hình ảnh hiện trường</span>}>
                              <Upload
                                fileList={fileList}
                                onChange={handleUploadChange}
                                beforeUpload={() => false}
                                multiple
                                accept="image/*"
                                showUploadList={false}
                              >
                                <div style={{
                                  border: '1.5px dashed #cbd5e1',
                                  borderRadius: '8px',
                                  padding: '20px 16px',
                                  textAlign: 'center',
                                  cursor: 'pointer',
                                  background: '#f8fafc',
                                  width: '272px',
                                  margin: '0 auto',
                                  transition: 'all 0.2s'
                                }}>
                                  <PlusOutlined style={{ fontSize: '24px', color: '#94a3b8', marginBottom: '8px' }} />
                                  <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px', fontWeight: 500 }}>Kéo thả ảnh vào đây hoặc</div>
                                  <Button size="small" style={{ backgroundColor: '#ea580c', borderColor: '#ea580c', color: 'white', borderRadius: '4px', fontSize: '12px', fontWeight: 700, padding: '0 12px', height: '28px' }}>
                                    Chọn ảnh
                                  </Button>
                                </div>
                              </Upload>

                              {/* Custom preview list below */}
                              {fileList.length > 0 && (
                                <div style={{ marginTop: '12px' }}>
                                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                                    {fileList.map((file, idx) => {
                                      const url = file.url || (file.originFileObj ? URL.createObjectURL(file.originFileObj) : '');
                                      return (
                                        <div key={file.uid || idx} style={{ position: 'relative', width: '56px', height: '56px', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
                                          <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="preview" />
                                          <Button
                                            size="small"
                                            type="text"
                                            danger
                                            icon={<DeleteOutlined style={{ fontSize: '10px' }} />}
                                            onClick={() => {
                                              const newList = fileList.filter((_, i) => i !== idx);
                                              setFileList(newList);
                                            }}
                                            style={{
                                              position: 'absolute',
                                              top: '2px',
                                              right: '2px',
                                              width: '16px',
                                              height: '16px',
                                              padding: 0,
                                              background: 'rgba(255,255,255,0.8)',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              borderRadius: '50%'
                                            }}
                                          />
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>Đã chọn {fileList.length}/10 ảnh</div>
                                </div>
                              )}
                            </Form.Item>

                            <Form.Item style={{ marginBottom: 0, marginTop: '20px' }}>
                              <Button
                                type="primary"
                                htmlType="submit"
                                loading={createLogMutation.isPending}
                                style={{
                                  backgroundColor: '#ea580c',
                                  borderColor: '#ea580c',
                                  borderRadius: '8px',
                                  fontWeight: 700,
                                  width: '100%',
                                  height: '40px',
                                  fontSize: '14px'
                                }}
                              >
                                Lưu nhật ký
                              </Button>
                            </Form.Item>
                          </Form>
                        );
                      })()}
                    </Card>
                  </Col>

                  {/* List of Logged Entries (Right column: Clean cards list instead of timeline) */}
                  <Col span={12}>
                    <Card
                      bordered={false}
                      title={<span style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a' }}>Nhật ký thi công đã ghi</span>}
                      style={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.01)' }}
                      bodyStyle={{ maxHeight: '580px', overflowY: 'auto', padding: '16px' }}
                    >
                      {loadingLogs ? (
                        <div style={{ textAlign: 'center', padding: '30px' }}><Spin size="small" /></div>
                      ) : activeLogs.length === 0 ? (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa ghi nhận nhật ký nào cho công việc này." />
                      ) : (
                        <div>
                          {activeLogs.map((log) => {
                            const parsed = parseLogDescription(log.description);

                            return (
                              <div key={log.id} className="log-entry-item-card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                  <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '13px' }}>
                                    {dayjs(log.created_at).format('DD/MM/YYYY')}
                                  </span>
                                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#ea580c' }}>
                                    {log.weather === 'Nắng' ? '☀️ Nắng' : log.weather === 'Mưa' ? '🌧️ Mưa' : log.weather === 'U ám' ? '☁️ U ám' : log.weather === 'Gió mạnh' ? '💨 Gió bão' : log.weather}
                                  </span>
                                </div>

                                {/* Labor & Machinery tags row */}
                                {(parsed.labor || parsed.machinery) && (
                                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '10px', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', border: '1px solid #f1f5f9', lineHeight: '1.4' }}>
                                    {parsed.labor && <span>Nhân lực: <strong>{parsed.labor}</strong></span>}
                                    {parsed.labor && parsed.machinery && <span style={{ margin: '0 6px', color: '#cbd5e1' }}>|</span>}
                                    {parsed.machinery && <span>Máy móc: <strong>{parsed.machinery}</strong></span>}
                                  </div>
                                )}

                                <p style={{ color: '#475569', fontSize: '12px', margin: '0 0 10px 0', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                                  {parsed.description || 'Không có mô tả chi tiết.'}
                                </p>

                                {/* Images gallery */}
                                {log.images && log.images.length > 0 && (
                                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                                    {log.images.map((img) => (
                                      <Image
                                        key={img.id}
                                        src={getCleanImageUrl(img.image_url)}
                                        alt="minh chung"
                                        width={56}
                                        height={56}
                                        style={{ objectFit: 'cover', borderRadius: '6px' }}
                                      />
                                    ))}
                                  </div>
                                )}

                                {/* Bottom log row */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '10px', marginTop: '4px' }}>
                                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#c2410c' }}>
                                    Khối lượng thực hiện: {formatNumber(log.daily_volume)} {selectedTask.unit || ''}
                                  </div>

                                  {(() => {
                                    const isTaskLocked = isTaskLockedForLogs(selectedTask);
                                    const canModifyLog = !isTaskLocked;

                                    if (!canModifyLog) return null;

                                    return (
                                      <div style={{ display: 'flex', gap: '10px' }}>
                                        <Button
                                          size="small"
                                          type="link"
                                          icon={<EditOutlined />}
                                          onClick={() => handleOpenEditLogModal(log)}
                                          style={{ padding: 0, height: 'auto', fontSize: '11px', fontWeight: 600, color: '#4f46e5' }}
                                        >
                                          Sửa
                                        </Button>
                                        <Popconfirm
                                          title="Xóa nhật ký thi công"
                                          description="Bạn có chắc muốn xóa nhật ký này?"
                                          onConfirm={() => deleteLogMutation.mutate(log.id)}
                                          okText="Xóa"
                                          cancelText="Hủy"
                                          okButtonProps={{ danger: true, loading: deleteLogMutation.isPending }}
                                        >
                                          <Button
                                            size="small"
                                            type="link"
                                            danger
                                            icon={<DeleteOutlined />}
                                            style={{ padding: 0, height: 'auto', fontSize: '11px', fontWeight: 600 }}
                                          >
                                            Xóa
                                          </Button>
                                        </Popconfirm>
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </Card>
                  </Col>
                </Row>
              ) : (
                /* Information Tab content */
                <Card
                  bordered={false}
                  bodyStyle={{ padding: '24px' }}
                  style={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}
                >
                  <Row gutter={[24, 24]}>
                    <Col span={12}>
                      <h4 style={{ margin: '0 0 6px 0', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>Chi tiết công việc giao khoán</h4>
                      <div style={{ color: '#1e293b', fontSize: '14px', lineHeight: '1.6', fontWeight: 700 }}>{selectedTask.detail_name}</div>
                    </Col>
                    <Col span={12}>
                      <h4 style={{ margin: '0 0 6px 0', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>Tên hạng mục cha</h4>
                      <div style={{ color: '#1e293b', fontSize: '14px', lineHeight: '1.6', fontWeight: 700 }}>{selectedTask.parent_task_name}</div>
                    </Col>
                    <Col span={12}>
                      <h4 style={{ margin: '0 0 6px 0', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>Dự án xây dựng</h4>
                      <div style={{ color: '#1e293b', fontSize: '14px', lineHeight: '1.6', fontWeight: 700 }}>{selectedTask.project_name}</div>
                    </Col>
                    <Col span={12}>
                      <h4 style={{ margin: '0 0 6px 0', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>Đơn giá khoán tạm tính</h4>
                      <div style={{ color: '#1e293b', fontSize: '14px', lineHeight: '1.6', fontWeight: 800 }}>{formatCurrency(selectedTask.agreed_price)} / {selectedTask.unit || 'm³'}</div>
                    </Col>
                    <Col span={12}>
                      <h4 style={{ margin: '0 0 6px 0', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>Tổng giá trị khoán tạm tính</h4>
                      <div style={{ color: '#ea580c', fontSize: '16px', lineHeight: '1.6', fontWeight: 800 }}>{formatCurrency(selectedTask.agreed_price * selectedTask.work_volume)}</div>
                    </Col>
                    <Col span={12}>
                      <h4 style={{ margin: '0 0 6px 0', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>Giá trị đã thực hiện lũy kế</h4>
                      <div style={{ color: '#059669', fontSize: '16px', lineHeight: '1.6', fontWeight: 800 }}>{formatCurrency(selectedTask.agreed_price * selectedTask.accumulated_volume)}</div>
                    </Col>
                  </Row>

                  {/* Acceptance status and submit action button in Info Tab */}
                  {(() => {
                    const isCancelled = isCancelledTask(selectedTask);
                    const isLocked = ['PENDING', 'APPROVED'].includes(selectedTask.acceptance_status);
                    const isRejected = selectedTask.acceptance_status === 'REJECTED';
                    const canRequest = !isCancelled && selectedTask.progress_percent >= 100 && selectedTask.acceptance_status !== 'APPROVED' && selectedTask.acceptance_status !== 'PENDING';

                    return (
                      <div style={{ marginTop: '24px', borderTop: '1px solid #f1f5f9', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Trạng thái nghiệm thu:</span>
                          <span style={{ marginLeft: '8px' }}>
                            {renderAcceptanceTag(selectedTask.acceptance_status)}
                          </span>
                        </div>
                        {(canRequest || isLocked || isRejected || isCancelled) && (
                          <Button
                            type="primary"
                            disabled={!canRequest}
                            onClick={() => requestAcceptanceMutation.mutate(selectedTask.id)}
                            style={{
                              borderRadius: '8px',
                              fontWeight: 700,
                              backgroundColor: canRequest ? '#ea580c' : undefined,
                              borderColor: canRequest ? '#ea580c' : undefined
                            }}
                          >
                            {isCancelled ? 'Công việc đã hủy' : isRejected ? 'Gửi lại yêu cầu nghiệm thu' : selectedTask.acceptance_status === 'PENDING' ? 'Đang chờ duyệt nghiệm thu' : selectedTask.acceptance_status === 'APPROVED' ? 'Đã được nghiệm thu' : 'Gửi yêu cầu nghiệm thu'}
                          </Button>
                        )}
                      </div>
                    );
                  })()}

                  {selectedTask.acceptance_status === 'REJECTED' && selectedTask.rejection_note && (
                    <div style={{
                      marginTop: '16px',
                      padding: '12px 16px',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fee2e2',
                      borderRadius: '8px',
                      color: '#991b1b',
                      fontSize: '13px',
                      fontWeight: 500
                    }}>
                      <span style={{ fontWeight: 700 }}>Lý do từ chối: </span>
                      {selectedTask.rejection_note}
                    </div>
                  )}
                </Card>
              )}
            </div>
          ) : (
            <Card bordered={false} style={{ borderRadius: '16px', textAlign: 'center', padding: '100px 0', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
              <Empty description="Chọn một công việc từ danh sách bên trái để xem chi tiết và nhật ký thi công." />
            </Card>
          )}
        </Col>
      </Row>

      {/* Modal: Chỉnh sửa nhật ký thi công */}
      <Modal
        title={
          <div>
            <Title level={4} style={{ margin: 0, fontWeight: 800 }}>Chỉnh sửa nhật ký thi công</Title>
            <Text type="secondary" style={{ fontSize: '12px' }}>{selectedTask?.detail_name} ({selectedTask?.project_name})</Text>
          </div>
        }
        open={isEditLogModalVisible}
        onCancel={() => setIsEditLogModalVisible(false)}
        footer={null}
        destroyOnClose
        width={650}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditLogSubmit}
          style={{ marginTop: '20px' }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="daily_volume"
                label={selectedTask?.unit ? `Khối lượng hoàn thành hôm nay (${selectedTask.unit})` : "Khối lượng hoàn thành hôm nay"}
                rules={[{ required: true, message: 'Vui lòng nhập khối lượng hoàn thành' }]}
              >
                <Input type="number" step="0.01" min="0" placeholder="Ví dụ: 12.5" size="large" suffix={selectedTask?.unit} style={{ borderRadius: '6px' }} />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="weather"
                label="Thời tiết tại công trường"
                rules={[{ required: true }]}
              >
                <Select size="large" style={{ borderRadius: '6px' }}>
                  <Option value="Nắng">☀️ Nắng ráo</Option>
                  <Option value="Mưa">🌧️ Mưa ướt</Option>
                  <Option value="U ám">☁️ U ám / Nhiều mây</Option>
                  <Option value="Gió mạnh">💨 Gió bão</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>



          <Form.Item
            name="description"
            label="Nội dung công việc chi tiết"
            rules={[{ required: true, message: 'Vui lòng nhập nội dung chi tiết' }]}
          >
            <Input.TextArea placeholder="Mô tả cụ thể công việc đã làm được..." rows={3} style={{ borderRadius: '6px' }} />
          </Form.Item>

          <Form.Item label="Hình ảnh minh chứng tại hiện trường">
            <Upload
              fileList={editFileList}
              onChange={handleEditUploadChange}
              beforeUpload={() => false}
              multiple
              accept="image/*"
              showUploadList={false}
            >
              <div style={{
                border: '1.5px dashed #cbd5e1',
                borderRadius: '8px',
                padding: '20px 16px',
                textAlign: 'center',
                cursor: 'pointer',
                background: '#f8fafc',
                width: '272px',
                margin: '0 auto',
                transition: 'all 0.2s'
              }}>
                <PlusOutlined style={{ fontSize: '24px', color: '#94a3b8', marginBottom: '8px' }} />
                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px', fontWeight: 500 }}>Kéo thả ảnh vào đây hoặc</div>
                <Button size="small" style={{ backgroundColor: '#ea580c', borderColor: '#ea580c', color: 'white', borderRadius: '4px', fontSize: '12px', fontWeight: 700, padding: '0 12px', height: '28px' }}>
                  Chọn ảnh
                </Button>
              </div>
            </Upload>

            {/* Custom preview list below */}
            {editFileList.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                  {editFileList.map((file, idx) => {
                    const url = file.url || (file.originFileObj ? URL.createObjectURL(file.originFileObj) : '');
                    return (
                      <div key={file.uid || idx} style={{ position: 'relative', width: '56px', height: '56px', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
                        <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="preview" />
                        <Button
                          size="small"
                          type="text"
                          danger
                          icon={<DeleteOutlined style={{ fontSize: '10px' }} />}
                          onClick={() => {
                            const newList = editFileList.filter((_, i) => i !== idx);
                            setEditFileList(newList);
                            if (!file.originFileObj && file.uid) {
                              setRemovedImageIds(current => [...current, file.uid]);
                            }
                          }}
                          style={{
                            position: 'absolute',
                            top: '2px',
                            right: '2px',
                            width: '16px',
                            height: '16px',
                            padding: 0,
                            background: 'rgba(255,255,255,0.8)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%'
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>Đã chọn {editFileList.length}/10 ảnh</div>
              </div>
            )}
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: '28px' }}>
            <Button onClick={() => setIsEditLogModalVisible(false)} size="large" style={{ marginRight: '12px', borderRadius: '8px' }}>
              Hủy bỏ
            </Button>

            <Button
              type="primary"
              htmlType="submit"
              loading={updateLogMutation.isPending}
              size="large"
              style={{ backgroundColor: '#ea580c', borderColor: '#ea580c', borderRadius: '8px', fontWeight: 700 }}
            >
              Cập nhật nhật ký
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SubcontractorTasks;
