import React from 'react';
import { Navigate } from 'react-router-dom';
import authService from '../services/authService';

const CustomerProtectedRoute = ({ children }) => {
  const user = authService.getCurrentUser();
  const token = localStorage.getItem('access_token');

  if (!user || !token) {
    return <Navigate to="/customer/login" replace />;
  }

  if (user.role?.name !== 'Khách hàng') {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

export default CustomerProtectedRoute;
