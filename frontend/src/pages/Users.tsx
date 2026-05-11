import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UserPlus, Search, X, Eye, EyeOff, KeyRound } from 'lucide-react';
import CustomSelect from '../component/CustomSelect';
import toast from 'react-hot-toast';
import api from '../lib/api';

type User = {
  id: number;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'warehouse_staff' | 'accountant';
  status: 'active' | 'disabled';
  created_at: string;
  updated_at: string;
};

const ROLE_LABELS: Record<User['role'], string> = {
  admin: 'Quản trị viên',
  warehouse_staff: 'Thủ kho',
  accountant: 'Kế toán',
};

const ROLE_VALUES: Record<string, User['role']> = {
  'Quản trị viên': 'admin',
  'Thủ kho': 'warehouse_staff',
  'Kế toán': 'accountant',
};

const ROLE_BADGE: Record<User['role'], string> = {
  admin: 'bg-[#2170e4] text-white',
  warehouse_staff: 'bg-[#e5eeff] text-[#45474c]',
  accountant: 'bg-[#e5eeff] text-[#45474c]',
};

const BG_BY_ROLE: Record<User['role'], string> = {
  admin: 'bg-[#1e293b] text-white',
  warehouse_staff: 'bg-[#545f73] text-white',
  accountant: 'bg-[#00301e] text-[#00a472]',
};

const getInitials = (name: string) =>
  name.trim().split(/\s+/).slice(-2).map(n => n[0]).join('').toUpperCase();

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });


type AddForm = { name: string; email: string; password: string; role: string; };
const EMPTY_ADD: AddForm = { name: '', email: '', password: '', role: 'Thủ kho' };

type EditForm = { name: string; email: string; password: string; role: string; status: string; };

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/users').then(({ data }) => setUsers(data.data)).catch(() => toast.error('Không tải được danh sách người dùng'));
  }, []);

  // Add modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>(EMPTY_ADD);
  const [showAddPwd, setShowAddPwd] = useState(false);

  // Detail drawer
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: '', email: '', password: '', role: '', status: '' });
  const [showEditPwd, setShowEditPwd] = useState(false);

  // Reset password modal
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetPwd, setResetPwd] = useState('');
  const [showResetPwd, setShowResetPwd] = useState(false);
  const [resetting, setResetting] = useState(false);

  const openAddModal = () => {
    setAddForm(EMPTY_ADD);
    setShowAddPwd(false);
    setIsAddOpen(true);
  };

  const closeAddModal = () => {
    setIsAddOpen(false);
  };

  const openDrawer = (u: User) => {
    setEditForm({
      name: u.name,
      email: u.email,
      password: '',
      role: ROLE_LABELS[u.role],
      status: u.status === 'active' ? 'Hoạt động' : 'Vô hiệu hoá',
    });
    setShowEditPwd(false);
    setSelectedUser(u);
  };

  const closeDrawer = () => setSelectedUser(null);

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!addForm.name.trim()) { toast.error('Vui lòng nhập họ và tên'); return; }
    if (!addForm.email.trim()) { toast.error('Vui lòng nhập email'); return; }
    if (!addForm.password.trim()) { toast.error('Vui lòng nhập mật khẩu'); return; }
    if (addForm.password.length < 8) { toast.error('Mật khẩu tối thiểu 8 ký tự'); return; }
    try {
      const { data } = await api.post('/users', {
        name: addForm.name.trim(),
        email: addForm.email.trim(),
        password: addForm.password,
        role: ROLE_VALUES[addForm.role],
      });
      setUsers(prev => [data.data, ...prev]);
      toast.success('Đã thêm người dùng mới');
      closeAddModal();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      if (err.response?.status === 409) toast.error('Email đã được sử dụng');
      else toast.error(msg || 'Thêm người dùng thất bại');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!editForm.name.trim()) { toast.error('Vui lòng nhập họ và tên'); return; }
    if (!editForm.email.trim()) { toast.error('Vui lòng nhập email'); return; }

    try {
      const payload: any = {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        role: ROLE_VALUES[editForm.role],
        status: editForm.status === 'Hoạt động' ? 'active' : 'disabled',
      };
      
      if (editForm.password.trim()) {
        if (editForm.password.length < 8) { toast.error('Mật khẩu tối thiểu 8 ký tự'); return; }
        payload.password = editForm.password;
      }

      const { data } = await api.patch(`/users/${selectedUser.id}`, payload);
      const updated = data.data;
      
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? updated : u));
      setSelectedUser(updated);
      toast.success('Đã cập nhật người dùng');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Cập nhật thất bại');
    }
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!resetPwd) { toast.error('Vui lòng nhập mật khẩu mới'); return; }
    if (resetPwd.length < 8) { toast.error('Mật khẩu tối thiểu 8 ký tự'); return; }

    setResetting(true);
    try {
      await api.post(`/auth/reset-password/${selectedUser.id}`, { newPassword: resetPwd });
      toast.success(`Reset mật khẩu thành công! Người dùng ${selectedUser.name} cần đăng nhập lại.`);
      setIsResetOpen(false);
      setResetPwd('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Reset mật khẩu thất bại');
    } finally {
      setResetting(false);
    }
  };

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 flex flex-col flex-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-semibold text-[#0b1c30]">Quản lý Người dùng</h2>
          <p className="text-sm text-[#45474c] mt-1">Quản lý quyền truy cập hệ thống và các vai trò trong tổ chức.</p>
        </div>
        <button onClick={openAddModal} className="bg-[#0058be] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:bg-[#2170e4] transition-colors flex items-center gap-2 cursor-pointer">
          <UserPlus size={18} />
          Thêm người dùng mới
        </button>
      </div>

      <div className="flex-1 min-h-0">
        <div className="bg-white border border-[#c5c6cd] rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[300px]">
          <div className="p-4 border-b border-[#e5eeff] bg-[#f8f9ff] flex items-center justify-between shrink-0">
            <h3 className="text-sm font-semibold text-[#0b1c30]">Nhân sự đang hoạt động</h3>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm người dùng..."
                className="pl-8 pr-3 py-1.5 border border-[#c5c6cd] rounded text-sm focus:border-[#0058be] outline-none w-56"
              />
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead className="bg-[#e5eeff] sticky top-0 z-10 border-b border-[#c5c6cd]">
                <tr>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#45474c]">Người dùng</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#45474c] w-36">Vai trò</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#45474c] w-36">Trạng thái</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#45474c] w-40">Ngày tạo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5eeff] text-sm">
                {filtered.length === 0 ? (
                  <tr><td colSpan={4} className="py-8 text-center text-slate-400">Không tìm thấy người dùng.</td></tr>
                ) : filtered.map(u => (
                  <tr
                    key={u.id}
                    onClick={() => openDrawer(u)}
                    className={`hover:bg-[#F1F5F9] transition-colors cursor-pointer ${selectedUser?.id === u.id ? 'bg-[#f0f6ff]' : ''}`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${BG_BY_ROLE[u.role]}`}>
                          {getInitials(u.name)}
                        </div>
                        <div>
                          <p className="font-medium text-[#0b1c30]">{u.name}</p>
                          <p className="text-xs text-[#45474c]">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ROLE_BADGE[u.role]}`}>
                        {ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${u.status === 'active' ? 'bg-[#bbf7d0] text-[#166534]' : 'bg-[#fecaca] text-[#991b1b]'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-[#166534]' : 'bg-[#991b1b]'}`}></span>
                        {u.status === 'active' ? 'Hoạt động' : 'Vô hiệu hoá'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">{formatDate(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-[#c5c6cd] bg-[#f8f9ff] shrink-0">
            <span className="text-sm text-[#45474c]">Hiển thị {filtered.length} trong {users.length} người dùng</span>
          </div>
        </div>
      </div>

      {/* Detail drawer */}
      {selectedUser && createPortal(
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/30" onClick={closeDrawer} />
          <div className="relative bg-white w-full max-w-md shadow-2xl flex flex-col h-full overflow-y-auto">
            {/* Drawer header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4 shrink-0">
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${BG_BY_ROLE[selectedUser.role]}`}>
                  {getInitials(selectedUser.name)}
                </div>
                <div>
                  <p className="font-semibold text-[#0b1c30] text-base">{selectedUser.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ROLE_BADGE[selectedUser.role]}`}>
                      {ROLE_LABELS[selectedUser.role]}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${selectedUser.status === 'active' ? 'bg-[#bbf7d0] text-[#166534]' : 'bg-[#fecaca] text-[#991b1b]'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${selectedUser.status === 'active' ? 'bg-[#166534]' : 'bg-[#991b1b]'}`}></span>
                      {selectedUser.status === 'active' ? 'Hoạt động' : 'Vô hiệu hoá'}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={closeDrawer} className="text-slate-400 hover:text-slate-600 cursor-pointer shrink-0 mt-0.5">
                <X size={20} />
              </button>
            </div>

            {/* Read-only info */}
            <div className="px-6 py-4 border-b border-slate-100 bg-[#f8f9ff] shrink-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#45474c] mb-3">Thông tin hệ thống</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">ID</p>
                  <p className="font-medium text-[#0b1c30]">#{selectedUser.id}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Email</p>
                  <p className="font-medium text-[#0b1c30] break-all">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Ngày tạo</p>
                  <p className="font-medium text-[#0b1c30]">{formatDate(selectedUser.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Cập nhật lần cuối</p>
                  <p className="font-medium text-[#0b1c30]">{formatDate(selectedUser.updated_at)}</p>
                </div>
              </div>
            </div>

            {/* Edit form */}
            <form onSubmit={handleSaveEdit} noValidate className="flex flex-col flex-1">
              <div className="px-6 py-5 flex flex-col gap-4 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#45474c]">Chỉnh sửa thông tin</p>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Họ và tên *</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#0058be] focus:ring-1 focus:ring-[#0058be] outline-none text-sm"
                    placeholder="Nhập họ và tên đầy đủ"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Email *</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#0058be] focus:ring-1 focus:ring-[#0058be] outline-none text-sm"
                    placeholder="example@congty.com"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    Mật khẩu mới
                    <span className="text-xs font-normal text-slate-400 ml-1">(để trống nếu không đổi)</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showEditPwd ? 'text' : 'password'}
                      value={editForm.password}
                      onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                      className="w-full px-3 py-2 pr-10 rounded-lg border border-slate-300 focus:border-[#0058be] focus:ring-1 focus:ring-[#0058be] outline-none text-sm"
                      placeholder="Nhập mật khẩu mới..."
                    />
                    <button type="button" onClick={() => setShowEditPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                      {showEditPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">Vai trò *</label>
                    <CustomSelect
                      value={editForm.role}
                      onChange={v => setEditForm({ ...editForm, role: v })}
                      options={['Quản trị viên', 'Thủ kho', 'Kế toán']}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">Trạng thái</label>
                    <CustomSelect
                      value={editForm.status}
                      onChange={v => setEditForm({ ...editForm, status: v })}
                      options={['Hoạt động', 'Vô hiệu hoá']}
                    />
                  </div>
                </div>
              </div>

              {/* Drawer footer */}
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => { setResetPwd(''); setShowResetPwd(false); setIsResetOpen(true); }}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 border border-amber-200 rounded-lg cursor-pointer transition-colors"
                >
                  <KeyRound size={14} />
                  Reset mật khẩu
                </button>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={closeDrawer} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                    Huỷ bỏ
                  </button>
                  <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-[#0058be] hover:bg-[#2170e4] rounded-lg cursor-pointer">
                    Lưu thay đổi
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Reset Password Modal */}
      {isResetOpen && selectedUser && createPortal(
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base text-[#0b1c30]">Reset mật khẩu</h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedUser.name} · {selectedUser.email}</p>
              </div>
              <button onClick={() => setIsResetOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleResetPassword} noValidate className="p-6 flex flex-col gap-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800">
                ⚠️ Sau khi reset, người dùng sẽ bị đăng xuất và cần đăng nhập lại với mật khẩu mới.
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Mật khẩu mới *</label>
                <div className="relative">
                  <input
                    type={showResetPwd ? 'text' : 'password'}
                    value={resetPwd}
                    onChange={e => setResetPwd(e.target.value)}
                    autoFocus
                    className="w-full px-3 py-2 pr-10 rounded-lg border border-slate-300 focus:border-[#0058be] focus:ring-1 focus:ring-[#0058be] outline-none text-sm"
                    placeholder="Tối thiểu 8 ký tự"
                  />
                  <button type="button" onClick={() => setShowResetPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                    {showResetPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {resetPwd.length > 0 && resetPwd.length < 8 && (
                  <p className="text-xs text-red-500">Mật khẩu phải có ít nhất 8 ký tự</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setIsResetOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg cursor-pointer"
                >
                  Huỷ bỏ
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {resetting ? 'Đang xử lý...' : 'Xác nhận reset'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Add modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-lg text-[#0b1c30]">Thêm người dùng mới</h3>
              <button onClick={closeAddModal} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAdd} noValidate className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Họ và tên *</label>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#0058be] focus:ring-1 focus:ring-[#0058be] outline-none text-sm"
                  placeholder="Nhập họ và tên đầy đủ"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Email *</label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={e => setAddForm({ ...addForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#0058be] focus:ring-1 focus:ring-[#0058be] outline-none text-sm"
                  placeholder="example@congty.com"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Mật khẩu *</label>
                <div className="relative">
                  <input
                    type={showAddPwd ? 'text' : 'password'}
                    value={addForm.password}
                    onChange={e => setAddForm({ ...addForm, password: e.target.value })}
                    className="w-full px-3 py-2 pr-10 rounded-lg border border-slate-300 focus:border-[#0058be] focus:ring-1 focus:ring-[#0058be] outline-none text-sm"
                    placeholder="Tối thiểu 8 ký tự"
                  />
                  <button type="button" onClick={() => setShowAddPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                    {showAddPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Vai trò *</label>
                <CustomSelect
                  value={addForm.role}
                  onChange={v => setAddForm({ ...addForm, role: v })}
                  options={['Quản trị viên', 'Thủ kho', 'Kế toán']}
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button type="button" onClick={closeAddModal} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                  Huỷ bỏ
                </button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-[#0058be] hover:bg-[#2170e4] rounded-lg cursor-pointer">
                  Thêm người dùng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
