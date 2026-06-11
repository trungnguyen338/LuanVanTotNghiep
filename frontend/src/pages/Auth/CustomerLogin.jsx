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

const CustomerLogin = () => {
  const navigate = useNavigate();

  const loginMutation = useMutation({
    mutationFn: (credentials) => authService.customerLogin(credentials),
    onSuccess: (data) => {
      authService.setAuthData(data.access_token, data.user);
      message.success('Đăng nhập cổng khách hàng thành công!');
      navigate('/portal');
    },
    onError: (error) => {
      const errorMsg = error.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';
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
        <div style={{ width: 56, height: 56, background: '#1677ff', borderRadius: '50%', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <UserOutlined style={{ fontSize: 28, color: '#fff' }} />
        </div>
        <Title level={2} style={{ margin: 0, fontWeight: 600, color: '#1f1f1f' }}>Cổng Khách Hàng</Title>
        <Text style={{ color: '#8c8c8c', fontSize: '14px' }}>Theo dõi tiến độ dự án của bạn</Text>
      </div>

      <Form
        name="customer_login"
        initialValues={{ remember: true }}
        onFinish={onFinish}
        layout="vertical"
        requiredMark={(label, info) => (
          <span><span style={{color: '#ff4d4f'}}>*</span> {label}</span>
        )}
      >
        <Form.Item
          label="Tài khoản khách hàng"
          name="login_id"
          rules={[{ required: true, message: 'Vui lòng nhập tài khoản!' }]}
          style={{ marginBottom: 24 }}
        >
          <Input 
            prefix={<UserOutlined style={iconStyle} />} 
            placeholder="Nhập Email / Tên đăng nhập" 
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
            <a href="#" style={{ color: '#1677ff' }}>Hỗ trợ truy cập?</a>
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
            Vào Cổng Khách Hàng
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default CustomerLogin;
