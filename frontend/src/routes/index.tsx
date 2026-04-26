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
import Transactions from '../pages/Transactions';

function PrivateRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="stock-in" element={<StockIn />} />
        <Route path="stock-in/:id" element={<StockInDetail />} />
        <Route path="stock-out" element={<StockOut />} />
        <Route path="stock-out/:id" element={<StockOutDetail />} />
        <Route path="reports" element={<Reports />} />
        <Route path="users" element={<Users />} />
        <Route path="account" element={<Account />} />
        <Route path="transactions/:productCode" element={<Transactions />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
