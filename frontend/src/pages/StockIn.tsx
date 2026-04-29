import { useState, useEffect, useCallback, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, CheckCircle, XCircle, X, Trash2 } from 'lucide-react';
import CustomSelect from '../component/CustomSelect';
import DatePicker from '../component/DatePicker';
import { useConfirm } from '../component/useConfirm';
import toast from 'react-hot-toast';
import api from '../lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

type ImportOrderItem = {
  id: number;
  import_order_id: number;
  product_id: number;
  quantity: number;
  note: string;
  snapshot_product_code: string;
  snapshot_product_name: string;
  snapshot_unit: string;
  snapshot_category: string;
};

type ImportOrder = {
  id: number;
  code: string;
  supplier: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  import_date: string;
  note: string;
  created_by: number;
  confirmed_by: number | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
  items: ImportOrderItem[];
};

type Product = {
  id: number;
  code: string;
  name: string;
  unit: string;
  category: string;
  stock: number;
};

type FormItem = {
  product_id: number;
  snapshot_product_code: string;
  snapshot_product_name: string;
  snapshot_unit: string;
  snapshot_category: string;
  quantity: string;
  note: string;
};

type FormData = {
  supplier: string;
  import_date: string;
  note: string;
  items: FormItem[];
};

const EMPTY_FORM: FormData = {
  supplier: '',
  import_date: new Date().toISOString().slice(0, 10),
  note: '',
  items: [],
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function StockIn() {
  const navigate = useNavigate();
  const { confirm, dialog } = useConfirm();

  const [receipts, setReceipts] = useState<ImportOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Trạng thái: Tất cả');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  // ── Fetch helpers ────────────────────────────────────────────────────────

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/import-orders');
      setReceipts(data.data);
    } catch {
      toast.error('Không thể tải danh sách phiếu nhập');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const { data } = await api.get('/products');
      setProducts(data.data);
    } catch {
      // products list optional for modal; ignore silently
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchProducts();
  }, [fetchOrders, fetchProducts]);

  // ── Modal helpers ────────────────────────────────────────────────────────

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(EMPTY_FORM);
  };

  const addItem = () => setFormData(f => ({
    ...f,
    items: [...f.items, {
      product_id: 0,
      snapshot_product_code: '',
      snapshot_product_name: '',
      snapshot_unit: '',
      snapshot_category: '',
      quantity: '',
      note: '',
    }],
  }));

  const removeItem = (idx: number) => setFormData(f => ({
    ...f,
    items: f.items.filter((_, i) => i !== idx),
  }));

  const updateItem = (idx: number, patch: Partial<FormItem>) => setFormData(f => ({
    ...f,
    items: f.items.map((item, i) => i === idx ? { ...item, ...patch } : item),
  }));

  const selectProduct = (idx: number, productId: number) => {
    const p = products.find(p => p.id === productId);
    if (!p) return;
    updateItem(idx, {
      product_id: p.id,
      snapshot_product_code: p.code,
      snapshot_product_name: p.name,
      snapshot_unit: p.unit,
      snapshot_category: p.category,
    });
  };

  // ── CRUD actions ─────────────────────────────────────────────────────────

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.supplier.trim()) { toast.error('Vui lòng nhập tên nhà cung cấp'); return; }
    if (!formData.import_date)     { toast.error('Vui lòng chọn ngày nhập hàng'); return; }
    for (const item of formData.items) {
      if (!item.product_id) { toast.error('Vui lòng chọn sản phẩm cho tất cả các dòng hàng'); return; }
      if (!item.quantity || parseInt(item.quantity) <= 0) { toast.error('Số lượng phải lớn hơn 0'); return; }
    }

    setSubmitting(true);
    try {
      await api.post('/import-orders', {
        supplier: formData.supplier.trim(),
        import_date: formData.import_date,
        note: formData.note.trim(),
        items: formData.items.map(item => ({
          product_id: item.product_id,
          quantity: parseInt(item.quantity),
          note: item.note.trim(),
        })),
      });
      toast.success('Đã tạo phiếu nhập mới');
      closeModal();
      fetchOrders();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Tạo phiếu nhập thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async (id: number) => {
    if (!await confirm({
      title: 'Xác nhận phiếu nhập',
      message: 'Kho hàng sẽ được cập nhật sau khi xác nhận.',
      confirmLabel: 'Xác nhận',
      variant: 'primary',
    })) return;

    try {
      await api.post(`/import-orders/${id}/confirm`);
      toast.success('Đã xác nhận phiếu nhập!');
      fetchOrders();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Xác nhận thất bại');
    }
  };

  const handleCancel = async (id: number) => {
    if (!await confirm({
      title: 'Huỷ phiếu nhập',
      message: 'Bạn có chắc muốn huỷ phiếu nhập này? Hành động không thể hoàn tác.',
      confirmLabel: 'Huỷ phiếu',
      cancelLabel: 'Quay lại',
      variant: 'danger',
    })) return;

    try {
      await api.post(`/import-orders/${id}/cancel`);
      toast.success('Đã huỷ phiếu nhập');
      fetchOrders();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Hủy phiếu thất bại');
    }
  };

  // ── Filter ───────────────────────────────────────────────────────────────

  const STATUS_FILTER_MAP: Record<string, ImportOrder['status'] | null> = {
    'Trạng thái: Tất cả': null,
    'Chờ xử lý': 'pending',
    'Đã xác nhận': 'confirmed',
    'Đã huỷ': 'cancelled',
  };

  const filteredReceipts = receipts.filter(r => {
    const matchesSearch = r.code.toLowerCase().includes(search.toLowerCase())
      || r.supplier.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !STATUS_FILTER_MAP[statusFilter] || r.status === STATUS_FILTER_MAP[statusFilter];
    return matchesSearch && matchesStatus;
  });

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 flex flex-col flex-1">
      {dialog}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-[#0b1c30]">Quản lý Nhập kho</h1>
          <p className="text-sm text-[#45474c] mt-1">Xác nhận hàng hoá đến, tạo phiếu nhập và thêm vào hệ thống kho.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-[#0058be] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#2170e4] transition-colors shadow-sm cursor-pointer">
          <Plus size={18} />
          Tạo phiếu nhập mới
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        <div className="bg-white border border-[#E2E8F0] shadow-sm rounded p-5 flex flex-col justify-between h-32 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#e5eeff] rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
          <div>
            <p className="text-xs font-medium text-[#45474c] mb-1">Đang chờ xử lý</p>
            <h3 className="text-[32px] font-semibold text-[#0b1c30] leading-none">{receipts.filter(r => r.status === 'pending').length}</h3>
          </div>
        </div>
        <div className="bg-white border border-[#E2E8F0] shadow-sm rounded p-5 flex flex-col justify-between h-32 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#e5eeff] rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
          <div>
            <p className="text-xs font-medium text-[#45474c] mb-1">Đã xác nhận</p>
            <h3 className="text-[32px] font-semibold text-[#0b1c30] leading-none">{receipts.filter(r => r.status === 'confirmed').length}</h3>
          </div>
        </div>
        <div className="bg-white border border-[#E2E8F0] shadow-sm rounded p-5 flex flex-col justify-between h-32 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#e5eeff] rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
          <div>
            <p className="text-xs font-medium text-[#45474c] mb-1">Đã huỷ</p>
            <h3 className="text-[32px] font-semibold text-[#0b1c30] leading-none">{receipts.filter(r => r.status === 'cancelled').length}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#c5c6cd] rounded-xl shadow-sm overflow-hidden flex flex-col flex-1 min-h-[300px]">
        <div className="p-4 border-b border-[#e5eeff] bg-[#f8f9ff] flex flex-col sm:flex-row gap-4 items-center justify-between shrink-0">
          <div className="relative w-full sm:w-64">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm mã phiếu, nhà cung cấp..." className="w-full pl-9 pr-3 py-1.5 border border-[#c5c6cd] rounded text-sm outline-none focus:border-[#0058be]" />
          </div>
          <div className="w-full sm:w-48">
            <CustomSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={['Trạng thái: Tất cả', 'Chờ xử lý', 'Đã xác nhận', 'Đã huỷ']}
            />
          </div>
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-[#e5eeff] sticky top-0 z-10 border-b border-[#c5c6cd]">
              <tr>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#45474c] w-32">Mã phiếu</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#45474c] w-48">Nhà cung cấp</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#45474c] w-32">Ngày nhập</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#45474c] text-right w-24">Số lượng</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#45474c] text-center w-32">Trạng thái</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#45474c] text-right w-32">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5eeff] text-sm">
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center text-slate-500">Đang tải phiếu nhập...</td></tr>
              ) : filteredReceipts.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-slate-500">Không tìm thấy phiếu nhập.</td></tr>
              ) : filteredReceipts.map((r) => {
                const totalQty = r.items.reduce((acc, item) => acc + item.quantity, 0);
                return (
                  <tr key={r.id} onClick={() => navigate(`/stock-in/${r.id}`)} className="hover:bg-[#F1F5F9] transition-colors group cursor-pointer">
                    <td className="py-3 px-4 font-medium text-[#0058be]">{r.code}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-[#e5eeff] flex items-center justify-center text-[#75777d] text-[10px] font-bold">NCC</div>
                        {r.supplier}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium">{new Date(r.import_date).toLocaleDateString('vi-VN')}</td>
                    <td className="py-3 px-4 text-right font-medium">{totalQty.toLocaleString()}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium uppercase ${
                        r.status === 'pending'   ? 'bg-[#fed7aa] text-[#9a3412]' :
                        r.status === 'confirmed' ? 'bg-[#bbf7d0] text-[#166534]' :
                        'bg-[#fecaca] text-[#991b1b]'
                      }`}>
                        {r.status === 'pending' ? 'Chờ xử lý' : r.status === 'confirmed' ? 'Đã duyệt' : 'Đã huỷ'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {r.status === 'pending' && <button onClick={() => handleConfirm(r.id)} className="text-slate-400 hover:text-[#166534] p-1 cursor-pointer" title="Xác nhận"><CheckCircle size={18} /></button>}
                        {r.status === 'pending' && <button onClick={() => handleCancel(r.id)}  className="text-slate-400 hover:text-[#991b1b] p-1 cursor-pointer" title="Huỷ"><XCircle size={18} /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-lg text-[#0b1c30]">Tạo phiếu nhập mới</h3>
              <button type="button" onClick={closeModal} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} noValidate className="flex flex-col flex-1 min-h-0">
              <div className="p-6 flex flex-col gap-5 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label className="text-sm font-medium text-slate-700">Nhà cung cấp *</label>
                    <input
                      required
                      type="text"
                      value={formData.supplier}
                      onChange={e => setFormData({ ...formData, supplier: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#0058be] focus:ring-1 focus:ring-[#0058be] outline-none text-sm"
                      placeholder="Nhập tên nhà cung cấp"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label className="text-sm font-medium text-slate-700">Ngày nhập hàng *</label>
                    <DatePicker
                      required
                      value={formData.import_date}
                      onChange={v => setFormData({ ...formData, import_date: v })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 col-span-2">
                    <label className="text-sm font-medium text-slate-700">Ghi chú</label>
                    <textarea
                      rows={2}
                      value={formData.note}
                      onChange={e => setFormData({ ...formData, note: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#0058be] focus:ring-1 focus:ring-[#0058be] outline-none text-sm resize-none"
                      placeholder="Ghi chú thêm (không bắt buộc)"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">
                      Danh sách sản phẩm
                      {formData.items.length > 0 && <span className="ml-1.5 text-xs font-normal text-slate-400">({formData.items.length} dòng)</span>}
                    </label>
                    <button
                      type="button"
                      onClick={addItem}
                      className="flex items-center gap-1 text-xs font-medium text-[#0058be] hover:text-[#2170e4] cursor-pointer"
                    >
                      <Plus size={14} /> Thêm sản phẩm
                    </button>
                  </div>

                  {formData.items.length === 0 ? (
                    <div className="border border-dashed border-slate-300 rounded-lg py-8 text-center text-sm text-slate-400">
                      Chưa có sản phẩm nào.{' '}
                      <button type="button" onClick={addItem} className="text-[#0058be] hover:underline cursor-pointer">Thêm dòng hàng</button>
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-3 text-xs font-semibold text-slate-500 text-left">Sản phẩm</th>
                            <th className="py-2 px-3 text-xs font-semibold text-slate-500 text-right w-28">Số lượng</th>
                            <th className="py-2 px-3 text-xs font-semibold text-slate-500 text-left w-36">Ghi chú</th>
                            <th className="py-2 px-3 w-8"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {formData.items.map((item, idx) => (
                            <tr key={idx}>
                              <td className="py-2 px-3">
                                <select
                                  required
                                  value={item.product_id || ''}
                                  onChange={e => selectProduct(idx, Number(e.target.value))}
                                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:border-[#0058be] outline-none cursor-pointer bg-white"
                                >
                                  <option value="" disabled>Chọn sản phẩm...</option>
                                  {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                                  ))}
                                </select>
                                {item.snapshot_unit && (
                                  <p className="text-xs text-slate-400 mt-0.5">ĐVT: {item.snapshot_unit} · {item.snapshot_category}</p>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  required
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={e => updateItem(idx, { quantity: e.target.value })}
                                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm text-right focus:border-[#0058be] outline-none"
                                  placeholder="0"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={item.note}
                                  onChange={e => updateItem(idx, { note: e.target.value })}
                                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:border-[#0058be] outline-none"
                                  placeholder="Ghi chú..."
                                />
                              </td>
                              <td className="py-2 px-3">
                                <button type="button" onClick={() => removeItem(idx)} className="text-slate-400 hover:text-red-500 cursor-pointer">
                                  <Trash2 size={15} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between shrink-0">
                <p className="text-xs text-slate-400">
                  {formData.items.length === 0
                    ? 'Có thể thêm sản phẩm sau khi tạo phiếu'
                    : `${formData.items.length} dòng hàng · ${formData.items.reduce((s, i) => s + (parseInt(i.quantity) || 0), 0).toLocaleString()} sản phẩm`}
                </p>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">Huỷ bỏ</button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-[#0058be] hover:bg-[#2170e4] rounded-lg cursor-pointer disabled:opacity-60">
                    {submitting ? 'Đang tạo...' : 'Tạo phiếu nhập'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
