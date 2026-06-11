import React from 'react';
import { Navigate } from 'react-router-dom';
import authService from '../services/authService';

const ProtectedRoute = ({ children }) => {
  const user = authService.getCurrentUser();
  const token = localStorage.getItem('access_token');

  if (!user || !token) {
    // Not logged in, redirect to login page
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
