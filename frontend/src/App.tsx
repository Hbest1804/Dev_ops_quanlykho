import Layout from "./component/Layout";
import Dashboard from "./component/Dashboard";
import { useState } from "react";

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  return (  
    <Layout currentView={currentView} setView={setCurrentView} onLogout={() => {}} >
      {currentView === 'dashboard' && <Dashboard />}
    </Layout>
  );
}