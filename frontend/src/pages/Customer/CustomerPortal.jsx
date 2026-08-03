import { useState } from 'react';
import {
  Typography, Card, Row, Col, Progress, Tag,
  Select, Badge, Empty, Image, Spin, Button, message, Tooltip, Avatar, Timeline,
  Popover, List, Modal, Form, Input
} from 'antd';
import {
  CheckCircleOutlined, CompassOutlined, CalendarOutlined,
  UserOutlined, FileTextOutlined, DownloadOutlined, BellOutlined,
  LogoutOutlined, HomeOutlined, ClockCircleOutlined, AlertOutlined,
  DashboardOutlined, PhoneOutlined, MailOutlined, QuestionCircleOutlined
} from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { getCleanImageUrl } from '../../services/api';
import customerService from '../../services/customerService';
import authService from '../../services/authService';
import documentService from '../../services/documentService';
import notificationService from '../../services/notificationService';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const EMPTY_PROJECT = {
  id: null,
  name: '',
  address: '',
  start_date: null,
  expected_end_date: null,
  progress: 0,
  budget: 0,
  received_budget: 0,
  tasks: [],
  documents: [],
};

const formatCurrency = (value) => {
  if (!value) return '0 đ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value).replace('₫', 'đ');
};

const formatCurrencyShorthand = (value) => {
  if (!value) return '0 VNĐ';
  const numVal = Number(value);
  if (numVal >= 1e9) {
    const billions = numVal / 1e9;
    return `${billions.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} Tỷ VNĐ`;
  }
  if (numVal >= 1e6) {
    const millions = numVal / 1e6;
    return `${millions.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} Triệu VNĐ`;
  }
  return `${numVal.toLocaleString('vi-VN')} VNĐ`;
};

const CustomerPortal = () => {
  const currentUser = authService.getCurrentUser();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'progress', 'docs'
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [changePasswordForm] = Form.useForm();

  const changePasswordMutation = useMutation({
    mutationFn: (data) => authService.changePassword(data),
    onSuccess: () => {
      message.success('Đổi mật khẩu thành công!');
      setIsChangePasswordOpen(false);
      changePasswordForm.resetFields();
    },
    onError: (error) => {
      const errMsg = error.response?.data?.message || 'Có lỗi xảy ra khi đổi mật khẩu.';
      message.error(errMsg);
    }
  });

  const handleChangePasswordSubmit = (values) => {
    changePasswordMutation.mutate({
      current_password: values.current_password,
      new_password: values.new_password,
      new_password_confirmation: values.new_password_confirmation,
    });
  };

  // Queries
  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['customerProjects'],
    queryFn: customerService.getProjects,
  });

  // Notifications query
  const { data: notifications = [], refetch: refetchNotifications } = useQuery({
    queryKey: ['customerNotifications'],
    queryFn: notificationService.getNotifications,
    refetchInterval: 30000,
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      refetchNotifications();
    } catch (error) {
      console.error(error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      refetchNotifications();
      message.success('Đã đánh dấu đã đọc toàn bộ thông báo');
    } catch (error) {
      console.error(error);
    }
  };

  const hasProjects = projects.length > 0;
  const activeProject = projects.find(p => p.id === selectedProjectId) || projects[0] || EMPTY_PROJECT;

  const handleLogout = () => {
    authService.logout();
    message.success('Đăng xuất thành công');
    window.location.href = '/customer/login';
  };

  // Helper to calculate task detail statistics
  const getTaskStats = (project) => {
    let completedCount = 0;
    let inProgressCount = 0;

    project?.tasks?.forEach(task => {
      task.details?.forEach(detail => {
        const isDone = detail.status === 'Đã hoàn thành' || detail.status === 'DONE' || detail.acceptance_status === 'APPROVED' || detail.progress_percent === 100;
        const isDoing = detail.status === 'Đang thực hiện' || detail.status === 'DOING' || (detail.progress_percent > 0 && detail.progress_percent < 100);

        if (isDone) {
          completedCount++;
        } else if (isDoing) {
          inProgressCount++;
        }
      });
    });

    return { completedCount, inProgressCount };
  };

  // Helper to extract log images
  const getLogImages = (project) => {
    const images = [];
    project?.tasks?.forEach(task => {
      task.details?.forEach(detail => {
        detail.logs?.forEach(log => {
          log.images?.forEach(img => {
            images.push({
              uid: img.id,
              url: getCleanImageUrl(img.image_url),
              date: dayjs(log.created_at).format('DD/MM/YYYY'),
              title: log.title || detail.detail_name
            });
          });
        });
      });
    });
    // Sort by date/id descending to show latest
    return images.reverse().slice(0, 8);
  };

  // Helper to extract milestones (completed tasks)
  const getMilestones = (project) => {
    const milestones = [];
    project?.tasks?.forEach(task => {
      if (task.status === 'DONE' || task.progress_percent === 100) {
        milestones.push({
          id: task.id,
          name: task.task_name,
          date: task.completed_date ? dayjs(task.completed_date).format('DD/MM/YYYY') : 'Đã hoàn thành'
        });
      }
    });
    return milestones;
  };

  // Helper to extract approved details
  const getApprovedDetails = (project) => {
    const list = [];
    project?.tasks?.forEach(task => {
      task.details?.forEach(detail => {
        if (detail.acceptance_status === 'APPROVED') {
          list.push({
            id: detail.id,
            name: detail.detail_name,
            date: detail.end_date ? dayjs(detail.end_date).format('DD/MM/YYYY') : 'Đã nghiệm thu'
          });
        }
      });
    });
    return list;
  };

  const handleDownloadDoc = async (doc) => {
    try {
      message.loading({ content: 'Đang tải tài liệu...', key: 'downloadDoc' });
      await documentService.openDocumentFile(doc);
      message.success({ content: 'Tải tài liệu thành công!', key: 'downloadDoc' });
    } catch {
      message.error({ content: 'Không thể tải tài liệu', key: 'downloadDoc' });
    }
  };

  if (loadingProjects) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' }}>
        <Spin size="large" tip="Đang tải dữ liệu cổng khách hàng..." />
      </div>
    );
  }

  const logImages = getLogImages(activeProject);
  const milestones = getMilestones(activeProject);
  const approvedDetails = getApprovedDetails(activeProject);
  const { completedCount, inProgressCount } = getTaskStats(activeProject);

  // Sorting parent tasks to create stage flow
  const sortedTasks = [...activeProject.tasks].sort((a, b) => a.id - b.id);

  // Remaining days calculation
  const expectedDate = activeProject?.expected_end_date ? dayjs(activeProject.expected_end_date) : null;
  const today = dayjs();
  const diffDays = expectedDate ? expectedDate.diff(today, 'day') : 0;

  const notificationPopoverContent = (
    <div style={{ width: 320 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
        <Text strong>Thông báo</Text>
        {unreadCount > 0 && (
          <Button type="link" size="small" onClick={handleMarkAllAsRead} style={{ color: '#e8560f', padding: 0 }}>
            Đọc tất cả
          </Button>
        )}
      </div>
      {notifications.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có thông báo nào" />
      ) : (
        <List
          size="small"
          dataSource={notifications.slice(0, 5)}
          renderItem={n => (
            <List.Item
              onClick={() => {
                if (!n.is_read) handleMarkAsRead(n.id);
              }}
              style={{
                cursor: 'pointer',
                background: n.is_read ? 'transparent' : '#fff3eb',
                borderRadius: 4,
                padding: '8px 12px',
                marginBottom: 4,
                transition: 'background 0.3s'
              }}
            >
              <List.Item.Meta
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong={!n.is_read} style={{ fontSize: 13 }}>{n.title}</Text>
                    {!n.is_read && <Badge status="processing" color="#e8560f" />}
                  </div>
                }
                description={
                  <div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{n.content}</div>
                    <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 4 }}>
                      {dayjs(n.created_at).format('DD/MM/YYYY HH:mm')}
                    </div>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 8, marginTop: 8, textAlign: 'center' }}>
        <Button type="link" size="small" onClick={() => setActiveTab('notifications')} style={{ color: '#e8560f', padding: 0 }}>
          Xem tất cả thông báo
        </Button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
      {/* Dynamic styles */}
      <style>{`
        .portal-sidebar {
          width: 280px;
          background: #0f172a; /* Sleek Dark Theme Sidebar */
          border-right: none;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 32px 24px;
          box-shadow: 4px 0 24px rgba(15, 23, 42, 0.05);
        }
        .portal-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 40px;
          padding: 0 8px;
        }
        .portal-menu-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 10px;
          color: #94a3b8;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          margin-bottom: 8px;
        }
        .portal-menu-item:hover {
          background: #1e293b;
          color: #f8fafc;
        }
        .portal-menu-item.active {
          background: linear-gradient(135deg, #e8560f 0%, #f97316 100%);
          color: #fff;
          box-shadow: 0 4px 12px rgba(232, 86, 15, 0.25);
        }
        .portal-menu-item.active .anticon {
          color: #fff !important;
        }
        .portal-menu-item.logout-btn {
          color: #f87171;
        }
        .portal-menu-item.logout-btn:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }
        .portal-content {
          flex: 1;
          padding: 32px 40px 48px 40px;
          overflow-y: auto;
          max-width: 100%;
          width: 100%;
        }
        .portal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
        }
        .portal-banner {
          background: linear-gradient(135deg, #e8560f 0%, #f97316 100%);
          border-radius: 16px;
          padding: 28px 32px;
          box-shadow: 0 10px 25px rgba(232, 86, 15, 0.15);
          position: relative;
          overflow: hidden;
        }
        .portal-banner::before {
          content: '';
          position: absolute;
          top: -20%;
          right: -10%;
          width: 300px;
          height: 300px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.08);
          pointer-events: none;
        }
        .portal-banner::after {
          content: '';
          position: absolute;
          bottom: -50%;
          right: 15%;
          width: 200px;
          height: 200px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.05);
          pointer-events: none;
        }
        .portal-card {
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(15, 23, 42, 0.03);
          border: 1px solid #f1f5f9;
          background: #fff;
          margin-bottom: 24px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
        }
        .portal-card:hover {
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
          transform: translateY(-2px);
        }
        .portal-card .ant-card-body {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .metric-card {
          background: #fff;
          border-radius: 16px;
          border: 1px solid #f1f5f9;
          padding: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 4px 20px rgba(15, 23, 42, 0.02);
          height: 100%;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        .metric-card:hover {
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
          transform: translateY(-2px);
        }
        .metric-icon-box {
          width: 52px;
          height: 52px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          transition: all 0.3s ease;
        }
        .timeline-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
          padding: 20px 10px;
        }
        .timeline-line {
          position: absolute;
          top: 36px;
          left: 5%;
          right: 5%;
          height: 3px;
          background: #e2e8f0;
          z-index: 1;
        }
        .timeline-node {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          z-index: 2;
          width: 12%;
          text-align: center;
        }
        .timeline-circle {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          margin-bottom: 12px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.05);
          transition: all 0.3s ease;
        }
        .image-gallery {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
          gap: 16px;
        }
        .gallery-card {
          position: relative;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
          aspect-ratio: 1.25;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .gallery-card:hover {
          transform: scale(1.03);
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
        }
        .gallery-card img {
          transition: transform 0.5s ease !important;
        }
        .gallery-card:hover img {
          transform: scale(1.08);
        }
        .gallery-date {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%);
          color: #fff;
          font-size: 11px;
          padding: 8px 4px 4px 4px;
          text-align: center;
        }
        .overview-stages-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .overview-stage-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          background: #f8fafc;
          border-radius: 10px;
          border: 1px solid #f1f5f9;
          transition: all 0.3s ease;
        }
        .overview-stage-item:hover {
          background: #fff;
          border-color: #ffd8c2;
          box-shadow: 0 4px 12px rgba(232, 86, 15, 0.04);
        }
        .overview-stage-item-card:hover {
          background: #fff !important;
          border-color: #ffd8c2 !important;
          box-shadow: 0 4px 12px rgba(232, 86, 15, 0.05);
          transform: translateX(3px);
        }
        .contract-stat-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-radius: 12px;
          background: #f8fafc;
          border: 1px solid #f1f5f9;
          margin-bottom: 12px;
          transition: all 0.3s ease;
        }
        .contract-stat-row:last-child {
          margin-bottom: 0;
        }
        .contract-stat-row:hover {
          background: #fff;
          border-color: #ffd8c2;
          box-shadow: 0 4px 12px rgba(232, 86, 15, 0.05);
        }
        .notification-item-card:hover {
          background: #fff !important;
          border-color: #ffd8c2 !important;
          box-shadow: 0 6px 16px rgba(232, 86, 15, 0.06);
          transform: translateY(-1px);
        }
      `}</style>

      {/* Sidebar Left */}
      <div className="portal-sidebar">
        <div>
          <div className="portal-logo">
            <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #e8560f 0%, #f97316 100%)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(232, 86, 15, 0.3)' }}>
              <HomeOutlined style={{ color: '#fff', fontSize: 20 }} />
            </div>
            <div>
              <Title level={5} style={{ margin: 0, fontWeight: 800, color: '#f8fafc' }}>Cổng khách hàng</Title>
              <Text style={{ fontSize: 11, color: '#64748b', display: 'block', marginTop: -2 }}>Customer Portal</Text>
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <div
              className={`portal-menu-item ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <DashboardOutlined />
              <span>Tổng quan</span>
            </div>

            <div
              className={`portal-menu-item ${activeTab === 'progress' ? 'active' : ''}`}
              onClick={() => setActiveTab('progress')}
            >
              <CompassOutlined />
              <span>Tiến độ dự án</span>
            </div>

            <div
              className={`portal-menu-item ${activeTab === 'docs' ? 'active' : ''}`}
              onClick={() => setActiveTab('docs')}
            >
              <FileTextOutlined />
              <span>Hợp đồng & Tài liệu</span>
            </div>

            <div
              className={`portal-menu-item ${activeTab === 'notifications' ? 'active' : ''}`}
              onClick={() => setActiveTab('notifications')}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <BellOutlined />
                <span>Thông báo</span>
              </div>
              {unreadCount > 0 && (
                <Badge count={unreadCount} style={{ backgroundColor: '#e8560f' }} />
              )}
            </div>

            <div
              className={`portal-menu-item ${activeTab === 'support' ? 'active' : ''}`}
              onClick={() => setActiveTab('support')}
            >
              <QuestionCircleOutlined />
              <span>Hỗ trợ</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: '1px solid #1e293b', paddingTop: 16 }}>
          <div
            className="portal-menu-item"
            onClick={() => setIsChangePasswordOpen(true)}
            style={{ background: 'transparent', marginBottom: 0 }}
          >
          </div>
          <div
            className="portal-menu-item logout-btn"
            onClick={handleLogout}
            style={{ marginBottom: 0 }}
          >
            <LogoutOutlined />
            <span>Đăng xuất</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="portal-content">
        {/* Header bar */}
        <div className="portal-header">
          {/* Breadcrumb / Project select */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Text type="secondary" style={{ fontSize: 14 }}>
              {activeTab === 'overview' ? 'Giao diện Khách hàng - Tổng quan' : activeTab === 'progress' ? 'Tiến độ dự án' : 'Tài liệu'} /
            </Text>
            <Select
              value={activeProject.id}
              onChange={setSelectedProjectId}
              style={{ width: 280, fontWeight: 700 }}
              bordered={false}
              disabled={!hasProjects}
              placeholder="Chưa có dự án"
              suffixIcon={<DownOutlined style={{ color: '#e8560f', fontSize: 14 }} />}
            >
              {projects.map(p => (
                <Option key={p.id} value={p.id}>{p.name}</Option>
              ))}
            </Select>
          </div>

          {/* User badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <Popover
              content={notificationPopoverContent}
              title={<span style={{ fontWeight: 800 }}>Thông báo mới nhất</span>}
              trigger="click"
              placement="bottomRight"
            >
              <Badge count={unreadCount} offset={[-2, 2]} style={{ backgroundColor: '#e8560f' }}>
                <Button type="text" shape="circle" icon={<BellOutlined style={{ fontSize: 18, color: '#64748b' }} />} />
              </Badge>
            </Popover>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>{currentUser?.full_name}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Khách hàng</div>
              </div>
              <Avatar style={{ backgroundColor: '#fff3eb', color: '#e8560f' }} icon={<UserOutlined />} />
            </div>
          </div>
        </div>

        {activeTab === 'overview' && (
          <>
            {/* Welcome Banner */}
            <div className="portal-banner" style={{ marginBottom: 24 }}>
              <div className="banner-content">
                <Title level={2} style={{ color: '#fff', margin: 0, fontWeight: 800 }}>
                  Chào mừng trở lại, {currentUser?.full_name || 'Quý khách'}!
                </Title>
                <Paragraph style={{ color: 'rgba(255, 255, 255, 0.9)', margin: '8px 0 0 0', fontSize: 14 }}>
                  {hasProjects ? (
                    <>Hệ thống đang cập nhật tiến độ thi công thực tế cho dự án <strong style={{ color: '#fff' }}>{activeProject.name}</strong>. Mọi thông tin nghiệm thu và hình ảnh nhật ký đều được đồng bộ trực tiếp từ công trường.</>
                  ) : (
                    <>Bạn chưa có dự án nào được gán trên hệ thống. Các số liệu sẽ được cập nhật ngay khi dự án được khởi tạo.</>
                  )}
                </Paragraph>
              </div>
            </div>

            {/* Top row - 4 Metric Cards */}
            <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
              {/* Metric 1: Project Progress */}
              <Col xs={24} sm={12} lg={6}>
                <div className="metric-card">
                  <div>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', fontWeight: 600 }}>Tiến độ dự án</Text>
                    <Title level={3} style={{ margin: '8px 0 0 0', fontWeight: 800 }}>{activeProject.progress || 0}%</Title>
                    <Text type="secondary" style={{ fontSize: 11 }}>Hoàn thành</Text>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: '50%', background: '#fff3eb', border: '2px solid #ffd8c2', fontWeight: 900, color: '#e8560f', fontSize: 14 }}>
                    {activeProject.progress || 0}%
                  </div>
                </div>
              </Col>

              {/* Metric 2: Completed subtasks */}
              <Col xs={24} sm={12} lg={6}>
                <div className="metric-card">
                  <div>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', fontWeight: 600 }}>Hạng mục hoàn thành</Text>
                    <Title level={3} style={{ margin: '8px 0 0 0', fontWeight: 800 }}>{completedCount}</Title>
                    <Text type="secondary" style={{ fontSize: 11 }}>hạng mục con</Text>
                  </div>
                  <div className="metric-icon-box" style={{ background: '#dcfce7', color: '#22c55e' }}>
                    <CheckCircleOutlined />
                  </div>
                </div>
              </Col>

              {/* Metric 3: In progress subtasks */}
              <Col xs={24} sm={12} lg={6}>
                <div className="metric-card">
                  <div>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', fontWeight: 600 }}>Hạng mục đang thực hiện</Text>
                    <Title level={3} style={{ margin: '8px 0 0 0', fontWeight: 800 }}>{inProgressCount}</Title>
                    <Text type="secondary" style={{ fontSize: 11 }}>hạng mục con</Text>
                  </div>
                  <div className="metric-icon-box" style={{ background: '#fff3eb', color: '#e8560f' }}>
                    <ClockCircleOutlined />
                  </div>
                </div>
              </Col>

              {/* Metric 4: Expected end date */}
              <Col xs={24} sm={12} lg={6}>
                <div className="metric-card">
                  <div>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', fontWeight: 600 }}>Ngày dự kiến hoàn thành</Text>
                    <Title level={3} style={{ margin: '8px 0 0 0', fontWeight: 800, fontSize: 18 }}>
                      {expectedDate ? expectedDate.format('DD/MM/YYYY') : 'Chưa thiết lập'}
                    </Title>
                    <Text style={{ fontSize: 11, color: diffDays < 0 ? '#ef4444' : '#e8560f', fontWeight: 600 }}>
                      {!expectedDate ? 'Chưa có thời hạn' : diffDays < 0 ? `Quá hạn ${Math.abs(diffDays)} ngày` : diffDays === 0 ? 'Đến hạn hôm nay' : `Còn ${diffDays} ngày`}
                    </Text>
                  </div>
                  <div className="metric-icon-box" style={{ background: '#f1f5f9', color: '#64748b' }}>
                    <CalendarOutlined />
                  </div>
                </div>
              </Col>
            </Row>

            {/* Middle Section: Progress Circle & Contract Details */}
            <Row gutter={[24, 24]} style={{ marginBottom: 24, display: 'flex', flexWrap: 'wrap' }}>
              {/* Progress Circle & Stages list */}
              <Col xs={24} lg={12} style={{ display: 'flex', flexDirection: 'column' }}>
                <Card className="portal-card" title={<span style={{ fontWeight: 800, fontSize: 16 }}>Tiến độ tổng thể</span>} style={{ height: '100%', flex: 1 }}>
                  <Row align="middle" gutter={24} style={{ height: '100%', minHeight: 220 }}>
                    <Col xs={24} sm={10} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <Progress
                        type="circle"
                        percent={activeProject.progress || 0}
                        strokeColor="#e8560f"
                        strokeWidth={8}
                        width={140}
                        format={(percent) => (
                          <div>
                            <div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a' }}>{percent}%</div>
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Hoàn thành</div>
                          </div>
                        )}
                      />
                    </Col>

                    <Col xs={24} sm={14}>
                      <div className="overview-stages-list">
                        <Title level={5} style={{ margin: '0 0 4px 0', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', color: '#64748b' }}>Các giai đoạn dự án</Title>
                        {sortedTasks.length === 0 ? (
                          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có hạng mục lớn" />
                        ) : (
                          sortedTasks.slice(0, 6).map(task => {
                            const isDone = task.status === 'DONE' || task.progress_percent === 100;
                            const isDoing = !isDone && (task.status === 'DOING' || (task.progress_percent > 0 && task.progress_percent < 100));
                            let color = '#cbd5e1';
                            let statusText = 'Chưa bắt đầu';

                            if (isDone) {
                              color = '#22c55e';
                              statusText = 'Đã hoàn thành';
                            } else if (isDoing) {
                              color = '#e8560f';
                              statusText = `Thi công (${task.progress_percent}%)`;
                            }

                            return (
                              <div key={task.id} className="overview-stage-item">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                                  <Text strong style={{ fontSize: 13, color: '#334155' }}>{task.task_name}</Text>
                                </div>
                                <Text style={{ fontSize: 12, color: isDone ? '#22c55e' : isDoing ? '#e8560f' : '#64748b' }}>{statusText}</Text>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </Col>
                  </Row>
                </Card>
              </Col>

              {/* Contract Information */}
              <Col xs={24} lg={12} style={{ display: 'flex', flexDirection: 'column' }}>
                <Card className="portal-card" title={<span style={{ fontWeight: 800, fontSize: 16 }}>THÔNG TIN HỢP ĐỒNG</span>} style={{ height: '100%', flex: 1 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-around', minHeight: 220 }}>
                    <div className="contract-stat-row">
                      <Text style={{ color: '#475569', fontWeight: 600 }}>Tổng giá trị Hợp đồng:</Text>
                      <Tooltip title={formatCurrency(activeProject.budget)}>
                        <Title level={4} style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>
                          {formatCurrencyShorthand(activeProject.budget)}
                        </Title>
                      </Tooltip>
                    </div>

                    <div className="contract-stat-row">
                      <Text style={{ color: '#475569', fontWeight: 600 }}>Đã thanh toán:</Text>
                      <Tooltip title={formatCurrency(activeProject.received_budget)}>
                        <Title level={4} style={{ margin: 0, fontWeight: 800, color: '#22c55e' }}>
                          {formatCurrencyShorthand(activeProject.received_budget)}
                        </Title>
                      </Tooltip>
                    </div>

                    <div className="contract-stat-row">
                      <Text style={{ color: '#475569', fontWeight: 600 }}>Còn phải nộp:</Text>
                      <Tooltip title={formatCurrency(activeProject.budget - activeProject.received_budget)}>
                        <Title level={4} style={{ margin: 0, fontWeight: 800, color: '#ef4444' }}>
                          {formatCurrencyShorthand(activeProject.budget - activeProject.received_budget)}
                        </Title>
                      </Tooltip>
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>

            {/* Bottom Section: Major categories list & Images */}
            <Row gutter={[24, 24]} style={{ display: 'flex', flexWrap: 'wrap' }}>
              {/* Category lists (Parent tasks table style) */}
              <Col xs={24} lg={12} style={{ display: 'flex', flexDirection: 'column' }}>
                <Card className="portal-card" title={<span style={{ fontWeight: 800, fontSize: 16 }}>Tiến độ các hạng mục chính</span>} style={{ height: '100%', flex: 1 }}>
                  {sortedTasks.length === 0 ? (
                    <Empty description="Chưa có thông tin tiến độ." />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {sortedTasks.map(task => {
                        const isDone = task.status === 'DONE' || task.progress_percent === 100;
                        const isDoing = !isDone && (task.status === 'DOING' || (task.progress_percent > 0 && task.progress_percent < 100));

                        return (
                          <div
                            key={task.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '14px 18px',
                              background: '#f8fafc',
                              borderRadius: 12,
                              border: '1px solid #f1f5f9',
                              marginBottom: 8,
                              transition: 'all 0.3s ease'
                            }}
                            className="overview-stage-item-card"
                          >
                            <div style={{ flex: 1, minWidth: 120 }}>
                              <Text strong style={{ fontSize: 13, color: '#334155' }}>{task.task_name}</Text>
                            </div>
                            <div style={{ width: '130px', margin: '0 16px' }}>
                              <Progress
                                percent={task.progress_percent}
                                size="small"
                                showInfo={false}
                                strokeColor={isDone ? '#22c55e' : '#e8560f'}
                                style={{ margin: 0 }}
                              />
                            </div>
                            <div style={{ width: '100px', textAlign: 'right' }}>
                              <Tag
                                color={isDone ? 'success' : isDoing ? 'processing' : 'default'}
                                style={{ margin: 0, fontWeight: 600, borderRadius: 4 }}
                              >
                                {isDone ? 'Hoàn thành' : isDoing ? `${task.progress_percent}%` : 'Chưa làm'}
                              </Tag>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </Col>

              {/* Latest images */}
              <Col xs={24} lg={12} style={{ display: 'flex', flexDirection: 'column' }}>
                <Card
                  className="portal-card"
                  title={<span style={{ fontWeight: 800, fontSize: 16 }}>Hình ảnh thi công mới nhất</span>}
                  bodyStyle={{ padding: 24 }}
                  extra={<Button type="link" onClick={() => setActiveTab('progress')} style={{ color: '#e8560f', fontWeight: 600, padding: 0 }}>Xem tất cả</Button>}
                  style={{ height: '100%', flex: 1 }}
                >
                  {logImages.length === 0 ? (
                    <Empty description="Chưa có hình ảnh nhật ký thi công nào từ công trường." />
                  ) : (
                    <Image.PreviewGroup>
                      <div className="image-gallery">
                        {logImages.slice(0, 4).map(img => (
                          <div key={img.uid} className="gallery-card">
                            <Image
                              src={img.url}
                              alt={img.title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <div className="gallery-date">{img.date}</div>
                          </div>
                        ))}
                      </div>
                    </Image.PreviewGroup>
                  )}
                </Card>
              </Col>
            </Row>
          </>
        )}

        {activeTab === 'progress' && (
          <>
            {/* Top row cards */}
            <Row gutter={24}>
              {/* Card 1: Project details card */}
              <Col xs={24} lg={16}>
                <Card className="portal-card" bodyStyle={{ padding: 24 }}>
                  <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <Title level={3} style={{ margin: '0 0 16px 0', fontWeight: 800 }}>{activeProject.name || 'Chưa có dự án'}</Title>

                      <Row gutter={[16, 12]}>
                        <Col span={12}>
                          <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>Địa chỉ</Text>
                          <Text strong style={{ color: '#334155' }}><CompassOutlined style={{ marginRight: 6 }} />{activeProject.address || 'Chưa cập nhật'}</Text>
                        </Col>
                        <Col span={12}>
                          <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>Ngày dự kiến hoàn thành</Text>
                          <Text strong style={{ color: '#334155' }}><CalendarOutlined style={{ marginRight: 6 }} />{activeProject.expected_end_date ? dayjs(activeProject.expected_end_date).format('DD/MM/YYYY') : 'N/A'}</Text>
                        </Col>
                        <Col span={12}>
                          <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>Ngày khởi công</Text>
                          <Text strong style={{ color: '#334155' }}><CalendarOutlined style={{ marginRight: 6 }} />{activeProject.start_date ? dayjs(activeProject.start_date).format('DD/MM/YYYY') : 'N/A'}</Text>
                        </Col>
                        <Col span={12}>
                          <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>Chủ đầu tư</Text>
                          <Text strong style={{ color: '#334155' }}><UserOutlined style={{ marginRight: 6 }} />{currentUser?.full_name}</Text>
                        </Col>
                      </Row>
                    </div>
                  </div>
                </Card>
              </Col>

              {/* Card 2: Overall Progress Card */}
              <Col xs={24} lg={8}>
                <Card className="portal-card" bodyStyle={{ padding: 24, textAlign: 'center', height: '100%' }}>
                  <Text type="secondary" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Tiến độ tổng thể</Text>

                  <div style={{ margin: '16px 0' }}>
                    <div style={{ fontSize: 44, fontWeight: 900, color: '#e8560f', lineHeight: 1 }}>
                      {activeProject.progress || 0}%
                    </div>
                  </div>

                  <Progress
                    percent={activeProject.progress || 0}
                    strokeColor={{ '0%': '#e8560f', '100%': '#f97316' }}
                    trailColor="#f1f5f9"
                    showInfo={false}
                    strokeWidth={8}
                    style={{ marginBottom: 16 }}
                  />

                  <Tag color="orange" style={{ padding: '4px 12px', borderRadius: 12, border: 'none', fontWeight: 600, color: '#e8560f', background: '#fff3eb' }}>
                    {activeProject.progress === 100 ? 'Đã hoàn thành bàn giao' : activeProject.progress > 0 ? 'Dự án đang thi công đúng tiến độ' : 'Dự án chuẩn bị khởi công'}
                  </Tag>
                </Card>
              </Col>
            </Row>

            {/* Timeline Row Card: Giai đoạn thi công */}
            <Card className="portal-card" title={<span style={{ fontWeight: 800, fontSize: 16 }}>Tiến độ các giai đoạn</span>}>
              {sortedTasks.length === 0 ? (
                <Empty description="Dự án chưa được phân rã hạng mục thi công." />
              ) : (
                <div style={{ position: 'relative', overflowX: 'auto', padding: '10px 0' }}>
                  <div className="timeline-line" />
                  <div className="timeline-container">
                    {sortedTasks.map((task) => {
                      const isDone = task.status === 'DONE' || task.progress_percent === 100;
                      const isDoing = !isDone && (task.status === 'DOING' || (task.progress_percent > 0 && task.progress_percent < 100));
                      const isTodo = !isDone && !isDoing;

                      let color = '#cbd5e1'; // Gray
                      let bg = '#f1f5f9';
                      let icon = <ClockCircleOutlined style={{ color: '#94a3b8' }} />;

                      if (isDone) {
                        color = '#22c55e'; // Green
                        bg = '#dcfce7';
                        icon = <CheckCircleOutlined style={{ color: '#22c55e' }} />;
                      } else if (isDoing) {
                        color = '#e8560f'; // Orange/Red
                        bg = '#fff3eb';
                        icon = <AlertOutlined style={{ color: '#e8560f' }} />;
                      }

                      return (
                        <div key={task.id} className="timeline-node">
                          <div className="timeline-circle" style={{ background: bg, border: `2px solid ${color}` }}>
                            {icon}
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: isTodo ? '#94a3b8' : '#0f172a', marginBottom: 4 }}>
                            {task.task_name}
                          </div>
                          <div style={{ fontSize: 11, color: isDone ? '#22c55e' : isDoing ? '#e8560f' : '#64748b' }}>
                            {isDone ? 'Đã hoàn thành' : isDoing ? `Đang thực hiện (${task.progress_percent}%)` : 'Chưa bắt đầu'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>

            {/* Middle Section: Hạng mục details & Images */}
            <Row gutter={24}>
              {/* Category list progress */}
              <Col xs={24} lg={12}>
                <Card
                  className="portal-card"
                  title={<span style={{ fontWeight: 800, fontSize: 16 }}>Tiến độ các hạng mục</span>}
                  bodyStyle={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}
                >
                  {sortedTasks.length === 0 ? (
                    <Empty description="Không có dữ liệu tiến độ." />
                  ) : (
                    sortedTasks.map(task => (
                      <div key={task.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                        <div style={{ flex: 1, minWidth: 100 }}>
                          <Text strong style={{ color: '#1e293b', fontSize: '13px' }}>{task.task_name}</Text>
                        </div>
                        <div style={{ width: '150px' }}>
                          <Progress
                            percent={task.progress_percent}
                            strokeColor={task.progress_percent === 100 ? '#22c55e' : '#e8560f'}
                            size="small"
                            status={task.progress_percent === 100 ? 'normal' : 'active'}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </Card>
              </Col>

              {/* Latest Images */}
              <Col xs={24} lg={12}>
                <Card
                  className="portal-card"
                  title={<span style={{ fontWeight: 800, fontSize: 16 }}>Hình ảnh thi công mới nhất</span>}
                  bodyStyle={{ padding: 24 }}
                  extra={<Button type="link" onClick={() => setActiveTab('progress')} style={{ color: '#e8560f', fontWeight: 600, padding: 0 }}>Xem tất cả</Button>}
                >
                  {logImages.length === 0 ? (
                    <Empty description="Chưa có hình ảnh nhật ký thi công nào từ công trường." />
                  ) : (
                    <Image.PreviewGroup>
                      <div className="image-gallery">
                        {logImages.map(img => (
                          <div key={img.uid} className="gallery-card">
                            <Image
                              src={img.url}
                              alt={img.title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <div className="gallery-date">{img.date}</div>
                          </div>
                        ))}
                      </div>
                    </Image.PreviewGroup>
                  )}
                </Card>
              </Col>
            </Row>

            {/* Bottom Row grid: Milestones, Accepted, Docs */}
            <Row gutter={24}>
              {/* Important Milestones */}
              <Col xs={24} md={8}>
                <Card className="portal-card" title={<span style={{ fontWeight: 800, fontSize: 15 }}>Các mốc quan trọng</span>} style={{ height: '100%' }}>
                  {milestones.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa đạt cột mốc lớn nào." />
                  ) : (
                    <Timeline mode="left">
                      {milestones.map(m => (
                        <Timeline.Item key={m.id} dot={<CheckCircleOutlined style={{ fontSize: 16, color: '#22c55e' }} />}>
                          <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 13 }}>{m.name}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>{m.date}</div>
                        </Timeline.Item>
                      ))}
                    </Timeline>
                  )}
                </Card>
              </Col>

              {/* Accepted details list */}
              <Col xs={24} md={8}>
                <Card className="portal-card" title={<span style={{ fontWeight: 800, fontSize: 15 }}>Hạng mục đã nghiệm thu</span>} style={{ height: '100%' }}>
                  {approvedDetails.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có biên bản nghiệm thu đầu việc được duyệt." />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {approvedDetails.slice(0, 5).map(item => (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f8fafc', borderRadius: 8 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{item.name}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>Ngày duyệt: {item.date}</div>
                          </div>
                          <Tag color="success" style={{ margin: 0, fontWeight: 600, borderRadius: 4 }}>Nghiệm thu</Tag>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </Col>

              {/* Project documents */}
              <Col xs={24} md={8}>
                <Card
                  className="portal-card"
                  title={<span style={{ fontWeight: 800, fontSize: 15 }}>Tài liệu dự án</span>}
                  style={{ height: '100%' }}
                  extra={<Button type="link" onClick={() => setActiveTab('docs')} style={{ color: '#e8560f', fontWeight: 600, padding: 0 }}>Xem tất cả</Button>}
                >
                  {(!activeProject.documents || activeProject.documents.length === 0) ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có tài liệu đính kèm." />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {activeProject.documents.slice(0, 4).map(doc => (
                        <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', border: '1px solid #f1f5f9', borderRadius: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <FileTextOutlined style={{ color: '#e8560f', fontSize: 18 }} />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 12, color: '#1e293b', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.document_name}>
                                {doc.document_name}
                              </div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>{doc.document_type?.type_name || 'Hồ sơ'}</div>
                            </div>
                          </div>
                          <Tooltip title="Tải xuống">
                            <Button
                              type="text"
                              shape="circle"
                              icon={<DownloadOutlined style={{ color: '#e8560f' }} />}
                              onClick={() => handleDownloadDoc(doc)}
                            />
                          </Tooltip>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </Col>
            </Row>
          </>
        )}

        {/* Tab 3: Full Document List */}
        {activeTab === 'docs' && (
          <Row gutter={[24, 24]} style={{ display: 'flex', flexWrap: 'wrap' }}>
            {/* Left Column: Documents list */}
            <Col xs={24} lg={16} style={{ display: 'flex', flexDirection: 'column' }}>
              <Card className="portal-card" title={<span style={{ fontWeight: 800, fontSize: 16 }}>Tất cả hồ sơ tài liệu dự án</span>} style={{ height: '100%', flex: 1 }}>
                {(!activeProject.documents || activeProject.documents.length === 0) ? (
                  <Empty description="Không có tài liệu nào được đính kèm." />
                ) : (
                  <Row gutter={[16, 16]}>
                    {activeProject.documents.map(doc => (
                      <Col xs={24} md={12} key={doc.id}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '18px 20px',
                            border: '1px solid #f1f5f9',
                            borderRadius: 14,
                            background: '#f8fafc',
                            transition: 'all 0.3s ease'
                          }}
                          className="overview-stage-item-card"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{ width: 44, height: 44, background: '#fff3eb', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(232, 86, 15, 0.05)' }}>
                              <FileTextOutlined style={{ color: '#e8560f', fontSize: 22 }} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.document_name}>
                                {doc.document_name}
                              </div>
                              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{doc.document_type?.type_name || 'Hồ sơ pháp lý'}</div>
                            </div>
                          </div>
                          <Button
                            type="primary"
                            shape="circle"
                            icon={<DownloadOutlined />}
                            style={{ backgroundColor: '#e8560f', borderColor: '#e8560f', boxShadow: '0 2px 8px rgba(232, 86, 15, 0.2)' }}
                            onClick={() => handleDownloadDoc(doc)}
                          />
                        </div>
                      </Col>
                    ))}
                  </Row>
                )}
              </Card>
            </Col>

            {/* Right Column: Sidebar Guidance */}
            <Col xs={24} lg={8} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Document Overview Stats */}
              <Card className="portal-card" title={<span style={{ fontWeight: 800, fontSize: 15 }}>Tổng số tài liệu</span>}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: '#64748b', fontWeight: 600 }}>Tài liệu đã chia sẻ:</Text>
                  <Title level={4} style={{ margin: 0, fontWeight: 800, color: '#e8560f' }}>
                    {activeProject.documents?.length || 0} bản
                  </Title>
                </div>
              </Card>

              {/* Standard Document Types workflow info */}
              <Card className="portal-card" title={<span style={{ fontWeight: 800, fontSize: 15 }}>Quy trình hồ sơ</span>}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <Text strong style={{ fontSize: 13, color: '#1e293b', display: 'block' }}>1. Ký kết & Tải lên:</Text>
                    <Text style={{ fontSize: 12, color: '#64748b' }}>Hợp đồng, phụ lục sau khi ký kết được văn phòng công ty scan và tải lên hệ thống ngay lập tức.</Text>
                  </div>
                  <div>
                    <Text strong style={{ fontSize: 13, color: '#1e293b', display: 'block' }}>2. Thiết kế & Bản vẽ:</Text>
                    <Text style={{ fontSize: 12, color: '#64748b' }}>Các bản vẽ kỹ thuật chi tiết sẽ được phê duyệt và lưu trữ tại đây làm căn cứ thi công.</Text>
                  </div>
                  <div>
                    <Text strong style={{ fontSize: 13, color: '#1e293b', display: 'block' }}>3. Nghiệm thu & Bàn giao:</Text>
                    <Text style={{ fontSize: 12, color: '#64748b' }}>Biên bản bàn giao mặt bằng và biên bản nghiệm thu từng đợt sẽ là cơ sở pháp lý để thanh quyết toán.</Text>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        )}

        {/* Tab 4: Notifications Tab */}
        {activeTab === 'notifications' && (
          <Row gutter={[24, 24]} style={{ display: 'flex', flexWrap: 'wrap' }}>
            {/* Left Column: Notification list */}
            <Col xs={24} lg={16} style={{ display: 'flex', flexDirection: 'column' }}>
              <Card
                className="portal-card"
                title={<span style={{ fontWeight: 800, fontSize: 16 }}>Thông báo của tôi</span>}
                style={{ height: '100%', flex: 1 }}
                extra={
                  unreadCount > 0 && (
                    <Button type="primary" onClick={handleMarkAllAsRead} style={{ backgroundColor: '#e8560f', borderColor: '#e8560f', borderRadius: 8, fontWeight: 600 }}>
                      Đánh dấu đọc tất cả
                    </Button>
                  )
                }
              >
                {notifications.length === 0 ? (
                  <Empty description="Không có thông báo nào." />
                ) : (
                  <List
                    itemLayout="horizontal"
                    dataSource={notifications}
                    renderItem={n => (
                      <List.Item
                        onClick={() => {
                          if (!n.is_read) handleMarkAsRead(n.id);
                        }}
                        style={{
                          cursor: 'pointer',
                          background: n.is_read ? 'transparent' : '#fff3eb',
                          padding: '16px 20px',
                          borderRadius: 12,
                          marginBottom: 10,
                          border: n.is_read ? '1px solid #f1f5f9' : '1px solid #ffd8c2',
                          transition: 'all 0.3s ease',
                          boxShadow: n.is_read ? 'none' : '0 4px 12px rgba(232, 86, 15, 0.05)'
                        }}
                        className="notification-item-card"
                      >
                        <List.Item.Meta
                          avatar={
                            <div style={{
                              width: 42,
                              height: 42,
                              borderRadius: 10,
                              background: n.is_read ? '#f1f5f9' : 'linear-gradient(135deg, #fff3eb 0%, #ffe8d6 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: n.is_read ? '#64748b' : '#e8560f',
                              fontSize: 18,
                              boxShadow: n.is_read ? 'none' : '0 2px 8px rgba(232, 86, 15, 0.1)'
                            }}>
                              <BellOutlined />
                            </div>
                          }
                          title={
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text strong={!n.is_read} style={{ fontSize: 14, color: n.is_read ? '#475569' : '#0f172a' }}>{n.title}</Text>
                              {!n.is_read && <Tag color="orange" style={{ margin: 0, borderRadius: 6, fontWeight: 700 }}>Mới</Tag>}
                            </div>
                          }
                          description={
                            <div style={{ marginTop: 4 }}>
                              <div style={{ color: '#475569', fontSize: 13, lineHeight: '1.5' }}>{n.content}</div>
                              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <ClockCircleOutlined style={{ fontSize: 10 }} />
                                {dayjs(n.created_at).format('DD/MM/YYYY HH:mm')}
                              </div>
                            </div>
                          }
                        />
                      </List.Item>
                    )}
                  />
                )}
              </Card>
            </Col>

            {/* Right Column: Sidebar info */}
            <Col xs={24} lg={8} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Notification Statistics */}
              <Card className="portal-card" title={<span style={{ fontWeight: 800, fontSize: 15 }}>Trạng thái hộp thư</span>}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: '#64748b', fontWeight: 600 }}>Tổng số thông báo:</Text>
                    <Badge count={notifications.length} showZero style={{ backgroundColor: '#64748b' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: '#e8560f', fontWeight: 600 }}>Chưa đọc:</Text>
                    <Badge count={unreadCount} style={{ backgroundColor: '#e8560f' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: '#22c55e', fontWeight: 600 }}>Đã đọc:</Text>
                    <Badge count={notifications.length - unreadCount} showZero style={{ backgroundColor: '#22c55e' }} />
                  </div>
                </div>
              </Card>

              {/* Tips / Guidance */}
              <Card className="portal-card" title={<span style={{ fontWeight: 800, fontSize: 15 }}>Hướng dẫn & Lưu ý</span>}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <Text strong style={{ fontSize: 13, color: '#1e293b', display: 'block' }}>• Nghiệm thu công việc:</Text>
                    <Text style={{ fontSize: 12, color: '#64748b' }}>Khi nhận được thông báo nghiệm thu hoàn tất, quý khách có thể chuyển qua mục "Tiến độ dự án" để xem chi tiết hạng mục.</Text>
                  </div>
                  <div>
                    <Text strong style={{ fontSize: 13, color: '#1e293b', display: 'block' }}>• Yêu cầu thanh toán:</Text>
                    <Text style={{ fontSize: 12, color: '#64748b' }}>Khi có yêu cầu thanh toán đợt tiếp theo, vui lòng kiểm tra hồ sơ đính kèm và hóa đơn tương ứng trong mục "Hợp đồng & Tài liệu".</Text>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        )}

        {/* Tab 5: Support Tab */}
        {activeTab === 'support' && (
          <Row gutter={24}>
            <Col xs={24} lg={12}>
              <Card className="portal-card" title={<span style={{ fontWeight: 800, fontSize: 18 }}>Trung tâm hỗ trợ khách hàng</span>}>
                <Paragraph style={{ color: '#475569', fontSize: 16 }}>
                  Nếu quý khách có bất kỳ thắc mắc hoặc phản hồi nào về tiến độ thi công, hồ sơ kỹ thuật, thanh toán hợp đồng hoặc phản ánh chất lượng công trình, vui lòng liên hệ với chúng tôi để được giải quyết nhanh nhất.
                </Paragraph>

                <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fff3eb', color: '#e8560f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                      <PhoneOutlined />
                    </div>
                    <div>
                      <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>Hotline CSKH</Text>
                      <Text strong style={{ fontSize: 18, color: '#0f172a' }}>0987.654.321 (Phím 1)</Text>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fff3eb', color: '#e8560f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                      <MailOutlined />
                    </div>
                    <div>
                      <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>Email Hỗ trợ</Text>
                      <Text strong style={{ fontSize: 18, color: '#0f172a' }}>support@trungnguyen.vn</Text>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fff3eb', color: '#e8560f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                      <HomeOutlined />
                    </div>
                    <div>
                      <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>Trụ sở chính công ty</Text>
                      <Text strong style={{ fontSize: 17, color: '#0f172a' }}>Tòa nhà Trung Nguyên, 123 Nguyễn Hữu Thọ, Quận 7, TP. HCM</Text>
                    </div>
                  </div>
                </div>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card className="portal-card" title={<span style={{ fontWeight: 800, fontSize: 18 }}>Câu hỏi thường gặp (FAQ)</span>}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <Text strong style={{ fontSize: 16, color: '#1e293b', display: 'block' }}>1. Làm cách nào để tải tài liệu bản vẽ kỹ thuật?</Text>
                    <Text style={{ fontSize: 15, color: '#64748b' }}>Quý khách chuyển sang tab "Hợp đồng & Tài liệu", tìm tài liệu cần thiết và nhấn nút Tải xuống màu cam ở bên phải.</Text>
                  </div>

                  <div>
                    <Text strong style={{ fontSize: 16, color: '#1e293b', display: 'block' }}>2. Hình ảnh công trường được cập nhật với tần suất nào?</Text>
                    <Text style={{ fontSize: 15, color: '#64748b' }}>Nhà thầu phụ và kỹ sư giám sát của Trung Nguyên ghi nhật ký và chụp ảnh công trường hàng ngày. Quý khách có thể theo dõi ảnh mới nhất ngay trên tab "Tổng quan".</Text>
                  </div>

                  <div>
                    <Text strong style={{ fontSize: 16, color: '#1e293b', display: 'block' }}>3. Tôi muốn phản ánh chất lượng thi công thì làm thế nào?</Text>
                    <Text style={{ fontSize: 15, color: '#64748b' }}>Quý khách vui lòng gọi ngay hotline hoặc gửi email đính kèm hình ảnh phản ánh. Đội ngũ giám sát của chúng tôi sẽ cử kỹ sư xuống hiện trường xử lý trong vòng 24 giờ.</Text>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        )}
      </div>

      <Modal
        title={<span style={{ fontWeight: 800, fontSize: 18 }}>Đổi mật khẩu tài khoản</span>}
        open={isChangePasswordOpen}
        onCancel={() => {
          if (!changePasswordMutation.isPending) {
            setIsChangePasswordOpen(false);
            changePasswordForm.resetFields();
          }
        }}
        footer={null}
        destroyOnClose
      >
        <Form
          form={changePasswordForm}
          layout="vertical"
          onFinish={handleChangePasswordSubmit}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            label="Mật khẩu hiện tại"
            name="current_password"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại!' }]}
          >
            <Input.Password placeholder="Nhập mật khẩu hiện tại" />
          </Form.Item>

          <Form.Item
            label="Mật khẩu mới"
            name="new_password"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu mới!' },
              { min: 6, message: 'Mật khẩu mới phải có ít nhất 6 ký tự!' }
            ]}
          >
            <Input.Password placeholder="Nhập mật khẩu mới" />
          </Form.Item>

          <Form.Item
            label="Xác nhận mật khẩu mới"
            name="new_password_confirmation"
            dependencies={['new_password']}
            rules={[
              { required: true, message: 'Vui lòng xác nhận mật khẩu mới!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('new_password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Mật khẩu xác nhận không trùng khớp!'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Nhập lại mật khẩu mới" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: 24 }}>
            <Button
              style={{ marginRight: 8 }}
              onClick={() => {
                setIsChangePasswordOpen(false);
                changePasswordForm.resetFields();
              }}
              disabled={changePasswordMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={changePasswordMutation.isPending}
              style={{ background: '#e8560f', borderColor: '#e8560f' }}
            >
              Cập nhật
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

// Standard down arrow icon component to react-icons mockup
const DownOutlined = (props) => (
  <svg viewBox="64 64 896 896" focusable="false" data-icon="down" width="1em" height="1em" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M884 256h-75c-5.1 0-9.9 2.5-12.9 6.6L512 654.2 227.9 262.6c-3-4.1-7.8-6.6-12.9-6.6h-75c-6.5 0-10.3 7.4-6.5 12.7l352.6 486.1c12.8 17.6 39 17.6 51.7 0l352.6-486.1c3.9-5.3.1-12.7-6.4-12.7z"></path>
  </svg>
);

export default CustomerPortal;
