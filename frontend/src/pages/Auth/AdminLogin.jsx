import React from 'react';
import { Form, Input, Button, Checkbox, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import authService from '../../services/authService';

const { Title, Text } = Typography;

const inputStyle = {
  backgroundColor: '#f4f6fb',
  borderRadius: '6px',
  padding: '10px 14px',
  border: '1px solid #d9d9d9',
  fontSize: '15px'
};

const iconStyle = {
  color: '#595959',
  fontSize: '16px',
  marginRight: '6px'
};

const AdminLogin = () => {
  const navigate = useNavigate();

  const loginMutation = useMutation({
    mutationFn: (credentials) => authService.adminLogin(credentials),
    onSuccess: (data) => {
      authService.setAuthData(data.access_token, data.user);
      message.success('Đăng nhập thành công!');
      navigate('/dashboard');
    },
    onError: (error) => {
      const errorMsg = error.response?.data?.message || 'Đăng nhập thất bại. Vui lòng thử lại.';
      message.error(errorMsg);
    }
  });

  const onFinish = (values) => {
    loginMutation.mutate({
      login_id: values.login_id,
      password: values.password
    });
  };

  return (
    <div style={{ maxWidth: 360, margin: '0 auto', padding: '0 16px' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <Title level={2} style={{ margin: 0, fontWeight: 600, color: '#1f1f1f' }}>Hệ Thống Quản Trị</Title>
        <Text style={{ color: '#8c8c8c', fontSize: '14px' }}>Industrial Excellence ERP</Text>
      </div>

      <Form
        name="admin_login"
        initialValues={{ remember: true }}
        onFinish={onFinish}
        layout="vertical"
        requiredMark={(label, info) => (
          <span><span style={{color: '#ff4d4f'}}>*</span> {label}</span>
        )}
      >
        <Form.Item
          label="Email hoặc Tên đăng nhập"
          name="login_id"
          rules={[{ required: true, message: 'Vui lòng nhập Email hoặc Tên đăng nhập!' }]}
          style={{ marginBottom: 24 }}
        >
          <Input 
            prefix={<UserOutlined style={iconStyle} />} 
            placeholder="admin" 
            style={inputStyle} 
          />
        </Form.Item>

        <Form.Item
          label="Mật khẩu"
          name="password"
          rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
          style={{ marginBottom: 20 }}
        >
          <Input.Password 
            prefix={<LockOutlined style={iconStyle} />} 
            placeholder="••••••••" 
            style={inputStyle} 
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Form.Item name="remember" valuePropName="checked" noStyle>
              <Checkbox style={{ color: '#262626' }}>Ghi nhớ đăng nhập</Checkbox>
            </Form.Item>
            <a href="#" style={{ color: '#1677ff' }}>Quên mật khẩu?</a>
          </div>
        </Form.Item>

        <Form.Item>
          <Button 
            type="primary" 
            htmlType="submit" 
            style={{ 
              width: '100%', 
              height: 44, 
              borderRadius: 6, 
              fontSize: '16px',
              fontWeight: 500,
              backgroundColor: '#1677ff',
              boxShadow: 'none'
            }}
            loading={loginMutation.isPending}
          >
            Đăng nhập
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default AdminLogin;
