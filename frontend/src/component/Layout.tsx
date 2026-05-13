import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Package, LayoutDashboard, PackageSearch, ArrowDownToLine, ArrowUpFromLine, Users, LogOut, User, BarChart2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const ALL_MENU_ITEMS = [
  { path: '/', label: 'Bảng điều khiển', icon: LayoutDashboard, roles: ['admin', 'warehouse_staff', 'accountant'], end: true },
  { path: '/products', label: 'Sản phẩm', icon: PackageSearch, roles: ['admin', 'warehouse_staff'] },
  { path: '/stock-in', label: 'Nhập kho', icon: ArrowDownToLine, roles: ['admin', 'warehouse_staff'] },
  { path: '/stock-out', label: 'Xuất kho', icon: ArrowUpFromLine, roles: ['admin', 'warehouse_staff'] },
  { path: '/reports', label: 'Báo cáo', icon: BarChart2, roles: ['admin', 'accountant'] },
  { path: '/users', label: 'Người dùng', icon: Users, roles: ['admin'] },
];

export default function Layout() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  const userRole = profile?.role || 'warehouse_staff';

  const roleLabels: Record<string, string> = {
    admin: 'Quản trị viên',
    warehouse_staff: 'Thủ kho',
    accountant: 'Kế toán'
  };

  const MENU_ITEMS = ALL_MENU_ITEMS.filter(item => item.roles.includes(userRole));

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-screen bg-[#f8f9ff] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col hidden md:flex shrink-0 print:hidden">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded bg-[#1e293b] text-white flex items-center justify-center shadow-sm">
              <Package size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">Quản Lý Kho</h1>
              <p className="text-xs text-slate-500 font-medium tracking-wide">{roleLabels[userRole]?.toUpperCase()}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-blue-700 bg-blue-50 border-l-4 border-blue-600 rounded-l-none'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={20} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                    {item.label}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        <div className="p-4 border-t border-slate-200 flex flex-col gap-1">
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
            <LogOut size={20} className="text-red-500" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 shrink-0 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between md:justify-end z-10 sticky top-0 shadow-sm">
          <div className="md:hidden flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded bg-[#1e293b] text-white flex items-center justify-center shadow-sm shrink-0">
              <Package size={18} />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-slate-900 leading-tight truncate">Quản Lý Kho</h1>
              <p className="text-[10px] text-slate-500 font-medium tracking-wide truncate">{roleLabels[userRole]?.toUpperCase()}</p>
            </div>
          </div>
          <button onClick={() => navigate('/account')} className="h-8 w-8 rounded-full bg-blue-100 border border-slate-200 overflow-hidden flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-[#0058be] transition-all">
            <User size={18} className="text-blue-600" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 md:pb-6 bg-[#f8f9ff] flex flex-col">
          <div className="max-w-[1600px] w-full mx-auto flex-1 flex flex-col">
            <Outlet />
          </div>
        </main>

        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 shadow-[0_-4px_16px_rgba(15,23,42,0.08)] print:hidden">
          <div className="flex overflow-x-auto px-2 py-2 gap-1">
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    `min-w-[72px] flex flex-col items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                      isActive ? 'text-blue-700 bg-blue-50' : 'text-slate-500'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={18} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                      <span className="truncate max-w-[68px]">{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
