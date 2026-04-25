import { ReactNode } from 'react';
import { Package, LayoutDashboard, PackageSearch, ArrowDownToLine, ArrowUpFromLine, Users, LogOut, Plus, Search, Bell, User, BarChart2 } from 'lucide-react';
// import { useAuth } from '../contexts/AuthContext';

const ALL_MENU_ITEMS = [
  { id: 'dashboard', label: 'Bảng điều khiển', icon: LayoutDashboard, roles: ['admin', 'warehouse_staff', 'accountant'] },
  { id: 'products', label: 'Sản phẩm', icon: PackageSearch, roles: ['admin', 'warehouse_staff'] },
  { id: 'stock-in', label: 'Nhập kho', icon: ArrowDownToLine, roles: ['admin', 'warehouse_staff'] },
  { id: 'stock-out', label: 'Xuất kho', icon: ArrowUpFromLine, roles: ['admin', 'warehouse_staff'] },
  { id: 'reports', label: 'Báo cáo', icon: BarChart2, roles: ['admin', 'accountant'] },
  { id: 'users', label: 'Người dùng', icon: Users, roles: ['admin'] },
];

export default function Layout({ currentView, setView, onLogout, children }: { currentView: string, setView: (v: string) => void, onLogout: () => void, children: ReactNode }) {
//  const { profile } = useAuth();
  
//  const userRole = profile?.role || 'warehouse_staff';
  const roleLabels: Record<string, string> = {
    admin: 'Quản trị viên',
    warehouse_staff: 'Thủ kho',
    accountant: 'Kế toán'
  };
  
//   const MENU_ITEMS = ALL_MENU_ITEMS.filter(item => item.roles.includes(userRole));

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
              {/* <p className="text-xs text-slate-500 font-medium tracking-wide">{roleLabels[userRole]?.toUpperCase()}</p> */}
            </div>
          </div>
          {/* {['admin', 'warehouse_staff'].includes(userRole) && (
            <button className="w-full bg-[#0058be] hover:bg-[#2170e4] text-white py-2.5 rounded flex items-center justify-center gap-2 text-sm font-medium transition-colors shadow-sm">
              <Plus size={18} />
              Giao dịch mới
            </button>
          )} */}
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1">
          {/* {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-blue-700 bg-blue-50 border-l-4 border-blue-600 rounded-l-none'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                {item.label}
              </button>
            );
          })} */}
        </div>
        
        <div className="p-4 border-t border-slate-200 flex flex-col gap-1">
          <button onClick={onLogout} className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
            <LogOut size={20} className="text-red-500" />
            Đăng xuất
          </button>
        </div>
      </aside>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 shrink-0 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-10 sticky top-0 shadow-sm">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-full max-w-md hidden md:block">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Tìm kiếm..." 
                className="w-full pl-10 pr-4 py-2 flex-1 bg-slate-50 border border-slate-200 rounded-md text-sm outline-none focus:border-[#0058be] focus:ring-1 focus:ring-[#0058be]"
              />
            </div>
            <h2 className="font-bold md:hidden text-lg">Quản Lý Kho</h2>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-full relative transition-colors">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
            <div className="h-8 w-8 rounded-full bg-blue-100 border border-slate-200 overflow-hidden flex items-center justify-center ml-2">
              <User size={18} className="text-blue-600 cursor-pointer" />
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-6 bg-[#f8f9ff]">
          <div className="max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
