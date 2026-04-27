import { useState, FormEvent } from 'react';
import { Package, User, Lock, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error('Vui lòng nhập email'); return; }
    if (!password) { toast.error('Vui lòng nhập mật khẩu'); return; }
    if (password.length < 8) { toast.error('Mật khẩu tối thiểu 8 ký tự'); return; }
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#f8f9ff]">
      <main className="w-full max-w-[420px] bg-white rounded-lg border border-[#c5c6cd] shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center border-b border-[#c5c6cd]/30">
          <div className="w-12 h-12 bg-[#e5eeff] rounded flex items-center justify-center mb-4 text-[#091426]">
            <Package size={28} />
          </div>
          <h1 className="text-2xl font-semibold text-[#0b1c30] tracking-tight mb-1">Quản Lý Kho</h1>
          <p className="text-sm text-[#45474c]">Chào mừng bạn trở lại</p>
        </div>

        <div className="p-6 flex flex-col">
          <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#45474c]">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User size={20} className="text-[#75777d]" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="nhanvien@congty.com"
                  className="w-full h-12 pl-10 pr-4 rounded border border-[#c5c6cd] bg-white text-[#0b1c30] text-sm placeholder:text-[#75777d] focus:border-[#091426] focus:ring-1 focus:ring-[#091426] outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#45474c]">Mật khẩu</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={20} className="text-[#75777d]" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-12 pl-10 pr-4 rounded border border-[#c5c6cd] bg-white text-[#0b1c30] text-sm placeholder:text-[#75777d] focus:border-[#091426] focus:ring-1 focus:ring-[#091426] outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded border-[#c5c6cd] text-[#091426] focus:ring-0 bg-white" />
                <span className="text-sm text-[#45474c] group-hover:text-[#0b1c30]">Ghi nhớ tôi</span>
              </label>
              <a href="#" className="text-sm text-[#0058be] hover:underline">Quên mật khẩu?</a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-1 bg-[#091426] text-white text-sm font-medium rounded flex items-center justify-center gap-2 hover:bg-[#213145] transition-colors focus:outline-none focus:ring-2 focus:ring-[#091426] focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>{loading ? 'Đang xử lý...' : 'Đăng Nhập'}</span>
              <LogIn size={18} />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
