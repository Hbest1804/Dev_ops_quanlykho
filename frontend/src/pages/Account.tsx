import { useState } from 'react';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import api from '../lib/api';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Quản trị viên',
  warehouse_staff: 'Thủ kho',
  accountant: 'Kế toán',
};

const ROLE_BADGE: Record<string, string> = {
  admin: 'bg-[#2170e4] text-white',
  warehouse_staff: 'bg-[#e5eeff] text-[#45474c]',
  accountant: 'bg-[#e5eeff] text-[#45474c]',
};

const BG_BY_ROLE: Record<string, string> = {
  admin: 'bg-[#1e293b] text-white',
  warehouse_staff: 'bg-[#545f73] text-white',
  accountant: 'bg-[#00301e] text-[#00a472]',
};

const getInitials = (name: string) =>
  name.trim().split(/\s+/).slice(-2).map(n => n[0]).join('').toUpperCase();

export default function Account() {
  const { profile, logout } = useAuth();

  const [name, setName] = useState(profile?.full_name ?? '');
  const [email, setEmail] = useState(profile?.email ?? '');
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);
  const role = profile?.role ?? 'warehouse_staff';

  const handleSaveProfile = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Vui lòng nhập họ và tên'); return; }
    if (!email.trim()) { toast.error('Vui lòng nhập email'); return; }
    toast.success('Đã cập nhật thông tin tài khoản');
  };

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentPwd) { toast.error('Vui lòng nhập mật khẩu hiện tại'); return; }
    if (!newPwd) { toast.error('Vui lòng nhập mật khẩu mới'); return; }
    if (newPwd.length < 8) { toast.error('Mật khẩu mới tối thiểu 8 ký tự'); return; }

    setChangingPwd(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: currentPwd,
        newPassword: newPwd,
      });
      toast.success('Đổi mật khẩu thành công! Vui lòng đăng nhập lại.');
      setCurrentPwd('');
      setNewPwd('');
      // Xoá token cục bộ và chuyển về trang đăng nhập sau 1.5s
      setTimeout(async () => {
        await logout();
      }, 1500);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Đổi mật khẩu thất bại');
    } finally {
      setChangingPwd(false);
    }
  };

  return (
    <div className="space-y-6 flex flex-col flex-1">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-[#0b1c30]">Thông tin tài khoản</h2>
        <p className="text-sm text-[#45474c] mt-1">Quản lý thông tin cá nhân và bảo mật tài khoản.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: avatar + role card */}
        <div className="flex flex-col gap-4">
          <div className="bg-white border border-[#c5c6cd] rounded-xl shadow-sm p-6 flex flex-col items-center text-center gap-3">
            <div className={`h-20 w-20 rounded-full flex items-center justify-center font-bold text-2xl ${BG_BY_ROLE[role]}`}>
              {getInitials(name || 'U')}
            </div>
            <div>
              <p className="font-semibold text-[#0b1c30] text-lg">{name || '—'}</p>
              <p className="text-sm text-[#45474c] mt-0.5">{email}</p>
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${ROLE_BADGE[role]}`}>
              {ROLE_LABELS[role]}
            </span>
          </div>

          <div className="bg-white border border-[#c5c6cd] rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={16} className="text-[#0058be]" />
              <h3 className="text-sm font-semibold text-[#0b1c30]">Thông tin hệ thống</h3>
            </div>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[#45474c]">Vai trò</span>
                <span className="font-medium text-[#0b1c30]">{ROLE_LABELS[role]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#45474c]">Trạng thái</span>
                <span className="inline-flex items-center gap-1 text-[#166534] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#166534]"></span>
                  Hoạt động
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: forms */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Profile form */}
          <div className="bg-white border border-[#c5c6cd] rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#e5eeff] bg-[#f8f9ff]">
              <h3 className="text-sm font-semibold text-[#0b1c30]">Thông tin cá nhân</h3>
            </div>
            <form onSubmit={handleSaveProfile} noValidate className="p-6 flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Họ và tên *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#0058be] focus:ring-1 focus:ring-[#0058be] outline-none text-sm"
                    placeholder="Nhập họ và tên đầy đủ"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#0058be] focus:ring-1 focus:ring-[#0058be] outline-none text-sm"
                    placeholder="example@congty.com"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button type="submit" className="px-5 py-2 text-sm font-medium text-white bg-[#0058be] hover:bg-[#2170e4] rounded-lg cursor-pointer transition-colors">
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>

          {/* Password form */}
          <div className="bg-white border border-[#c5c6cd] rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#e5eeff] bg-[#f8f9ff]">
              <h3 className="text-sm font-semibold text-[#0b1c30]">Đổi mật khẩu</h3>
            </div>
            <form onSubmit={handleChangePassword} noValidate className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Mật khẩu hiện tại *</label>
                <div className="relative sm:w-1/2">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPwd}
                    onChange={e => setCurrentPwd(e.target.value)}
                    className="w-full px-3 py-2 pr-10 rounded-lg border border-slate-300 focus:border-[#0058be] focus:ring-1 focus:ring-[#0058be] outline-none text-sm"
                    placeholder="Nhập mật khẩu hiện tại"
                  />
                  <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Mật khẩu mới *</label>
                <div className="relative sm:w-1/2">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPwd}
                    onChange={e => setNewPwd(e.target.value)}
                    className="w-full px-3 py-2 pr-10 rounded-lg border border-slate-300 focus:border-[#0058be] focus:ring-1 focus:ring-[#0058be] outline-none text-sm"
                    placeholder="Tối thiểu 8 ký tự"
                  />
                  <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={changingPwd}
                  className="px-5 py-2 text-sm font-medium text-white bg-[#0058be] hover:bg-[#2170e4] rounded-lg cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {changingPwd ? 'Đang xử lý...' : 'Đổi mật khẩu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
