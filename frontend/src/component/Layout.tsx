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
        <header className="h-16 shrink-0 bg-white border-b border-slate-200 px-6 flex items-center justify-end z-10 sticky top-0 shadow-sm">
          <button onClick={() => navigate('/account')} className="h-8 w-8 rounded-full bg-blue-100 border border-slate-200 overflow-hidden flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-[#0058be] transition-all">
            <User size={18} className="text-blue-600" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-6 bg-[#f8f9ff] flex flex-col">
          <div className="max-w-[1600px] w-full mx-auto flex-1 flex flex-col">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
