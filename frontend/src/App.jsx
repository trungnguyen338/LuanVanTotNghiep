import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from './layouts/AuthLayout';
import MainLayout from './layouts/MainLayout';
import AdminLogin from './pages/Auth/AdminLogin';
import CustomerLogin from './pages/Auth/CustomerLogin';
import Dashboard from './pages/Dashboard/Dashboard';
import HRManagement from './pages/HR/HRManagement';
import PartnerManagement from './pages/Partner/PartnerManagement';
import ProjectCategoryManagement from './pages/ProjectCategory/ProjectCategoryManagement';
import ProjectManagement from './pages/Project/ProjectManagement';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        {/* Redirect root to admin login for now */}
        <Route path="/" element={<Navigate to="/admin/login" replace />} />

        {/* Authentication Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/customer/login" element={<CustomerLogin />} />
        </Route>

        {/* Protected Admin Routes */}
        <Route 
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/hr" element={<HRManagement />} />
          <Route path="/partners" element={<PartnerManagement />} />
          <Route path="/project-categories" element={<ProjectCategoryManagement />} />
          <Route path="/projects" element={<ProjectManagement />} />
          {/* Add other protected routes here later: /materials, etc. */}
        </Route>

        {/* Placeholder routes for customer portal */}
        <Route path="/portal" element={<div style={{padding: 24}}><h1>Customer Portal</h1></div>} />

        {/* 404 Route */}
        <Route path="*" element={<div style={{padding: 24}}><h1>404 - Not Found</h1></div>} />
      </Routes>
    </Router>
  );
}

export default App;
