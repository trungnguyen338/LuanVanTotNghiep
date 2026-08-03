import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from './layouts/AuthLayout';
import MainLayout from './layouts/MainLayout';
import AdminLogin from './pages/Auth/AdminLogin';
import CustomerLogin from './pages/Auth/CustomerLogin';
import Dashboard from './pages/Dashboard/Dashboard';
import HRManagement from './pages/HR/HRManagement';
import PartnerManagement from './pages/Partner/PartnerManagement';
import CustomerManagement from './pages/Customer/CustomerManagement';
import ProjectCategoryManagement from './pages/ProjectCategory/ProjectCategoryManagement';
import ProjectManagement from './pages/Project/ProjectManagement';
import ProjectDetail from './pages/Project/ProjectDetail';
import ProjectTaskDetail from './pages/Project/ProjectTaskDetail';
import ContractManagement from './pages/Contract/ContractManagement';
import ContractDetail from './pages/Contract/ContractDetail';
import SubContractDetail from './pages/Contract/SubContractDetail';
import SubcontractorTasks from './pages/Project/SubcontractorTasks';
import ProtectedRoute from './components/ProtectedRoute';
import DocumentManagement from './pages/Document/DocumentManagement';
import AcceptanceManagement from './pages/Acceptance/AcceptanceManagement';
import FinanceManagement from './pages/Finance/FinanceManagement';
import CustomerProtectedRoute from './components/CustomerProtectedRoute';
import CustomerPortal from './pages/Customer/CustomerPortal';

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
          <Route path="/customers" element={<CustomerManagement />} />
          <Route path="/partners" element={<PartnerManagement />} />
          <Route path="/project-categories" element={<ProjectCategoryManagement />} />
          <Route path="/projects" element={<ProjectManagement />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/projects/:projectId/tasks/:taskId" element={<ProjectTaskDetail />} />
          <Route path="/contracts" element={<ContractManagement />} />
          <Route path="/contracts/:id" element={<ContractDetail />} />
          <Route path="/sub-contracts/:id" element={<SubContractDetail />} />
          <Route path="/subcontractor/tasks" element={<SubcontractorTasks />} />
          <Route path="/documents" element={<DocumentManagement />} />
          <Route path="/acceptances" element={<AcceptanceManagement />} />
          <Route path="/finances" element={<FinanceManagement />} />
          {/* Add other protected routes here later: /materials, etc. */}
        </Route>

        {/* Customer Portal Route */}
        <Route 
          path="/portal" 
          element={
            <CustomerProtectedRoute>
              <CustomerPortal />
            </CustomerProtectedRoute>
          } 
        />

        {/* 404 Route */}
        <Route path="*" element={<div style={{padding: 24}}><h1>404 - Not Found</h1></div>} />
      </Routes>
    </Router>
  );
}

export default App;
