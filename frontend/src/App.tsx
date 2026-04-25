import Layout from "./component/Layout";
import Dashboard from "./component/Dashboard";
import { useState } from "react";
import { useAuth } from "./contexts/AuthContext";
import { LogIn } from "lucide-react";

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const { user, loading, logout } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center font-medium text-slate-500">Đang tải dữ liệu hệ thống...</div>;
  }

  if (!user) {
    <LogIn />
  }

  return (  
    <Layout currentView={currentView} setView={setCurrentView} onLogout={logout} >
      {currentView === 'dashboard' && <Dashboard />}
    </Layout>
  );
}