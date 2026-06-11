import React from 'react';
import { Outlet } from 'react-router-dom';
import { Layout, Row, Col } from 'antd';

const { Content } = Layout;

const AuthLayout = () => {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content>
        <Row style={{ height: '100vh' }}>
          {/* Left Side - Background Image */}
          <Col 
            xs={0} 
            sm={0} 
            md={12} 
            lg={14} 
            style={{
              backgroundImage: 'url("https://images.unsplash.com/photo-1541888086425-d81bb19240f5?q=80&w=2070&auto=format&fit=crop")', // Construction theme image
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          
          {/* Right Side - Login Form */}
          <Col 
            xs={24} 
            sm={24} 
            md={12} 
            lg={10} 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#fff'
            }}
          >
            <div style={{ width: '100%', maxWidth: 450, padding: '20px' }}>
              <Outlet />
            </div>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
};

export default AuthLayout;
