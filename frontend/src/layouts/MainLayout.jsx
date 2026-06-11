import React, { useState } from 'react';
import { Layout, Menu, Typography, Avatar, Button } from 'antd';
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
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import authService from '../services/authService';

const { Sider, Content } = Layout;
const { Text } = Typography;

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = authService.getCurrentUser();

  const handleLogout = () => {
    authService.logout().finally(() => {
      authService.clearAuthData();
      navigate('/admin/login');
    });
  };

  const menuItems = [
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
      label: 'Quản lý nhân sự',
    },
    {
      key: '/partners',
      icon: <ContactsOutlined />,
      label: 'Quản lý đối tác',
    },
    {
      key: '/materials',
      icon: <DatabaseOutlined />,
      label: 'Quản lý vật tư',
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
        <Content style={{ margin: '0', background: '#f4f6f8', overflow: 'auto', height: '100vh' }}>
          <div style={{ padding: '32px' }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
