import { ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../component/Layout';
import Dashboard from '../pages/Dashboard';
import Login from '../pages/Login';
import Products from '../pages/Products';
import StockIn from '../pages/StockIn';
import StockInDetail from '../pages/StockInDetail';
import StockOut from '../pages/StockOut';
import StockOutDetail from '../pages/StockOutDetail';
import Reports from '../pages/Reports';
import Users from '../pages/Users';
import Account from '../pages/Account';
import { ErrorBoundary } from '../component/ErrorBoundary';

type Role = 'admin' | 'warehouse_staff' | 'accountant';

function PrivateRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function RoleRoute({ children, roles }: { children: ReactNode; roles: Role[] }) {
  const { profile } = useAuth();
  if (!profile || !roles.includes(profile.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={
          <RoleRoute roles={['admin', 'warehouse_staff']}><ErrorBoundary><Products /></ErrorBoundary></RoleRoute>
        } />
        <Route path="stock-in" element={
          <RoleRoute roles={['admin', 'warehouse_staff']}><StockIn /></RoleRoute>
        } />
        <Route path="stock-in/:id" element={
          <RoleRoute roles={['admin', 'warehouse_staff']}><StockInDetail /></RoleRoute>
        } />
        <Route path="stock-out" element={
          <RoleRoute roles={['admin', 'warehouse_staff']}><StockOut /></RoleRoute>
        } />
        <Route path="stock-out/:id" element={
          <RoleRoute roles={['admin', 'warehouse_staff']}><StockOutDetail /></RoleRoute>
        } />
        <Route path="reports" element={
          <RoleRoute roles={['admin', 'accountant']}><Reports /></RoleRoute>
        } />
        <Route path="users" element={
          <RoleRoute roles={['admin']}><Users /></RoleRoute>
        } />
        <Route path="account" element={<Account />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
