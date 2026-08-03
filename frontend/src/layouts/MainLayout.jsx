import React, { useState } from 'react';
import { Layout, Menu, Typography, Avatar, Button, Badge, Popover, List } from 'antd';
import {
  AppstoreOutlined,
  ProjectOutlined,
  FolderOpenOutlined,
  TeamOutlined,
  ContactsOutlined,
  DatabaseOutlined,
  CheckSquareOutlined,
  DollarCircleOutlined,
  FileProtectOutlined,
  FilePdfOutlined,
  UserOutlined,
  LogoutOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import authService from '../services/authService';
import notificationService from '../services/notificationService';
import dayjs from 'dayjs';

const { Sider, Content, Header } = Layout;
const { Text } = Typography;

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = authService.getCurrentUser();

  const queryClient = useQueryClient();
  const userRole = user?.role?.name;
  const isAdmin = userRole === 'Quản trị viên' || userRole === 'Admin';

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.getNotifications(),
    enabled: !!user && isAdmin,
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => notificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.type === 'ACCEPTANCE_REQUEST') {
      navigate('/acceptances');
    } else if (notification.type === 'ACCEPTANCE_APPROVED' || notification.type === 'PAYMENT_REMINDER') {
      navigate('/finances');
    }
  };

  const notificationContent = (
    <div style={{ width: 360 }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '8px 12px 12px 12px', 
        borderBottom: '1px solid #f0f0f0',
        marginBottom: 8
      }}>
        <Text strong style={{ fontSize: '15px' }}>Thông báo mới nhất</Text>
        {unreadCount > 0 && (
          <Button 
            type="link" 
            size="small" 
            onClick={() => markAllAsReadMutation.mutate()}
            style={{ padding: 0 }}
          >
            Đánh dấu tất cả đã đọc
          </Button>
        )}
      </div>
      <div style={{ maxHeight: 350, overflowY: 'auto' }}>
        <List
          dataSource={notifications}
          renderItem={(item) => (
            <List.Item 
              onClick={() => handleNotificationClick(item)}
              style={{ 
                padding: '10px 12px', 
                cursor: 'pointer', 
                backgroundColor: item.is_read ? 'transparent' : '#f0f7ff',
                borderRadius: 4,
                marginBottom: 4,
                transition: 'background-color 0.2s',
                borderBottom: 'none'
              }}
              className="notification-item-hover"
            >
              <List.Item.Meta
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong={!item.is_read} style={{ fontSize: '13px', color: item.is_read ? '#595959' : '#1f1f1f' }}>
                      {item.title}
                    </Text>
                    {!item.is_read && <Badge status="processing" />}
                  </div>
                }
                description={
                  <div>
                    <div style={{ fontSize: '12px', color: item.is_read ? '#8c8c8c' : '#262626', marginTop: 2 }}>
                      {item.content}
                    </div>
                    <div style={{ fontSize: '11px', color: '#bfbfbf', marginTop: 4 }}>
                      {dayjs(item.created_at).format('DD/MM/YYYY HH:mm')}
                    </div>
                  </div>
                }
              />
            </List.Item>
          )}
          locale={{
            emptyText: (
              <div style={{ padding: '24px 0', textAlign: 'center' }}>
                <Text type="secondary">Không có thông báo nào</Text>
              </div>
            )
          }}
        />
      </div>
    </div>
  );

  const handleLogout = () => {
    authService.logout().finally(() => {
      authService.clearAuthData();
      navigate('/admin/login');
    });
  };

  const menuItems = (() => {
    const userRole = user?.role?.name;

    if (userRole === 'Nhà thầu phụ') {
      return [
        {
          key: '/subcontractor/tasks',
          icon: <CheckSquareOutlined />,
          label: 'Công việc & Nhật ký',
        }
      ];
    }

    const items = [
      {
        key: '/dashboard',
        icon: <AppstoreOutlined />,
        label: 'Bảng điều khiển',
      },
      {
        key: '/projects',
        icon: <ProjectOutlined />,
        label: 'Quản lý dự án',
      },
      {
        key: '/project-categories',
        icon: <FolderOpenOutlined />,
        label: 'Quản lý danh mục dự án',
      },
      {
        key: '/hr',
        icon: <TeamOutlined />,
        label: 'Quản lý tài khoản',
      },
      {
        key: '/customers',
        icon: <UserOutlined />,
        label: 'Quản lý khách hàng',
      },
      {
        key: '/partners',
        icon: <ContactsOutlined />,
        label: 'Quản lý đối tác',
      },
      {
        key: '/acceptances',
        icon: <CheckSquareOutlined />,
        label: 'Quản lý nghiệm thu',
      },
      {
        key: '/finances',
        icon: <DollarCircleOutlined />,
        label: 'Quản lý tài chính',
      },
      {
        key: '/contracts',
        icon: <FileProtectOutlined />,
        label: 'Quản lý hợp đồng',
      },
      {
        key: '/documents',
        icon: <FilePdfOutlined />,
        label: 'Quản lý hồ sơ tài liệu',
      },
    ];

    return items;
  })();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        theme="light" 
        collapsible 
        collapsed={collapsed} 
        onCollapse={(value) => setCollapsed(value)}
        width={250}
        style={{ borderRight: '1px solid #f0f0f0' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Logo */}
          <div>
            <div style={{ 
              padding: '16px 20px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 12,
              borderBottom: '1px solid #f0f0f0',
              marginBottom: 8
            }}>
              <div style={{ 
                width: 32, 
                height: 32, 
                background: '#1f1f1f', 
                borderRadius: 4, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'white',
                flexShrink: 0
              }}>
                <AppstoreOutlined style={{ fontSize: 18 }} />
              </div>
              {!collapsed && (
                <div style={{ fontWeight: 700, fontSize: '15px', lineHeight: 1.2 }}>
                  Quản lý dự án<br/>xây dựng
                </div>
              )}
            </div>
            
            {/* Menu */}
            <Menu 
              theme="light" 
              mode="inline" 
              selectedKeys={[location.pathname]} 
              items={menuItems} 
              onClick={({ key }) => navigate(key)}
              style={{ borderRight: 'none' }}
            />
          </div>

          {/* Bottom Logout Area */}
          <div style={{ 
            marginTop: 'auto', 
            padding: '16px', 
            borderTop: '1px solid #f0f0f0',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: collapsed ? 'center' : 'flex-start' }}>
              <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1677ff', flexShrink: 0 }} />
              {!collapsed && (
                <Text strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.full_name || 'Administrator'}
                </Text>
              )}
            </div>
            <Button 
              type="text" 
              danger 
              icon={<LogoutOutlined />} 
              onClick={handleLogout}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start' }}
            >
              {!collapsed && <span>Đăng xuất</span>}
            </Button>
          </div>
        </div>
      </Sider>
      
      <Layout>
        <Header style={{ 
          background: '#ffffff', 
          padding: '0 32px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          borderBottom: '1px solid #f0f0f0', 
          height: '64px'
        }}>
          <div></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {isAdmin && (
              <Popover
                content={notificationContent}
                title={null}
                trigger="click"
                placement="bottomRight"
              >
                <Badge count={unreadCount} overflowCount={99} size="small">
                  <Button 
                    type="text" 
                    icon={<BellOutlined style={{ fontSize: '20px', color: '#595959' }} />} 
                    style={{ 
                      width: '40px', 
                      height: '40px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      borderRadius: '50%'
                    }}
                  />
                </Badge>
              </Popover>
            )}
          </div>
        </Header>
        <Content style={{ margin: '0', background: '#f4f6f8', overflow: 'auto', height: 'calc(100vh - 64px)' }}>
          <div style={{ padding: '32px' }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
