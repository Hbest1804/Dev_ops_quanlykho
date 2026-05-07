import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, CheckCircle, XCircle, X, Trash2 } from 'lucide-react';
import CustomSelect from '../component/CustomSelect';
import DatePicker from '../component/DatePicker';
import ProductPickerModal from '../component/ProductPickerModal';
import { useConfirm } from '../component/useConfirm';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { MOCK_EXPORT_ORDERS, REASON_VALUES, getReasonLabel, type ExportOrder } from '../data/stockOutMock';

type Product = {
  id: number;
  code: string;
  name: string;
  unit: string;
  category: string;
  stock: number;
};

type FormItem = {
  product: Product | null;
  quantity: string;
  note: string;
};

type FormData = {
  reason: string;
  export_date: string;
  note: string;
  items: FormItem[];
};

const EMPTY_FORM: FormData = {
  reason: 'Bán hàng',
  export_date: new Date().toISOString().slice(0, 10),
  note: '',
  items: [],
};

const REASON_OPTIONS = ['Bán hàng', 'Sử dụng nội bộ', 'Hàng hỏng'];

const STATUS_FILTER_MAP: Record<string, ExportOrder['status'] | null> = {
  'Trạng thái: Tất cả': null,
  'Chờ xử lý': 'pending',
  'Đã xác nhận': 'confirmed',
  'Đã huỷ': 'cancelled',
};

const API_ERROR_MAP: Record<string, string> = {
  'Export date is required': 'Vui lòng chọn ngày xuất hàng',
  'Items must not be empty': 'Danh sách sản phẩm không được rỗng',
  'Quantity must be a positive integer': 'Số lượng phải là số nguyên dương',
  'Reason must be sale|internal|damaged': 'Lý do xuất không hợp lệ',
};

function translateError(msg: string): string {
  if (msg.startsWith('Insufficient stock')) return msg;
  return API_ERROR_MAP[msg] ?? msg;
}

export default function StockOut() {
  const navigate = useNavigate();
  const { confirm, dialog } = useConfirm();

  const [orders, setOrders] = useState<ExportOrder[]>(MOCK_EXPORT_ORDERS);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Trạng thái: Tất cả');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [pickerIdx, setPickerIdx] = useState<number | null>(null);

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(EMPTY_FORM);
  };

  const addItem = () => setFormData(f => ({
    ...f,
    items: [...f.items, { product: null, quantity: '', note: '' }],
  }));

  const removeItem = (idx: number) => setFormData(f => ({
    ...f,
    items: f.items.filter((_, i) => i !== idx),
  }));

  const updateItem = (idx: number, patch: Partial<FormItem>) => setFormData(f => ({
    ...f,
    items: f.items.map((item, i) => i === idx ? { ...item, ...patch } : item),
  }));

  const handleConfirm = async (id: number) => {
    if (!await confirm({ title: 'Xác nhận phiếu xuất', message: 'Tồn kho sẽ được cập nhật sau khi xác nhận.', confirmLabel: 'Xác nhận', variant: 'primary' })) return;
    setOrders(orders.map(o => o.id === id ? { ...o, status: 'confirmed' as const, confirmed_by: 1, confirmed_at: new Date().toISOString(), updated_at: new Date().toISOString() } : o));
    toast.success('Đã xác nhận phiếu xuất!');
  };

  const handleCancel = async (id: number) => {
    if (!await confirm({ title: 'Huỷ phiếu xuất', message: 'Bạn có chắc muốn huỷ phiếu xuất này? Hành động không thể hoàn tác.', confirmLabel: 'Huỷ phiếu', cancelLabel: 'Quay lại', variant: 'danger' })) return;
    setOrders(orders.map(o => o.id === id ? { ...o, status: 'cancelled' as const, updated_at: new Date().toISOString() } : o));
    toast.success('Đã huỷ phiếu xuất');
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.export_date) { toast.error('Vui lòng chọn ngày xuất hàng'); return; }
    if (formData.items.length === 0) { toast.error('Danh sách sản phẩm không được rỗng'); return; }
    for (const item of formData.items) {
      if (!item.product) { toast.error('Vui lòng chọn sản phẩm cho tất cả các dòng hàng'); return; }
      if (!item.quantity || parseInt(item.quantity) <= 0) { toast.error('Số lượng phải lớn hơn 0'); return; }
    }

    setSubmitting(true);
    try {
      const { data } = await api.post('/export-orders', {
        reason: REASON_VALUES[formData.reason] ?? formData.reason,
        exportDate: formData.export_date,
        note: formData.note.trim() || null,
        items: formData.items.map(item => ({
          productId: item.product!.id,
          quantity: parseInt(item.quantity),
          note: item.note.trim() || null,
        })),
      });
      const newOrder: ExportOrder = {
        ...data.data,
        items: formData.items.map((item, idx) => ({
          id: Date.now() + idx,
          export_order_id: data.data.id,
          product_id: item.product!.id,
          quantity: parseInt(item.quantity),
          note: item.note.trim() || '',
          snapshot_product_code: item.product!.code,
          snapshot_product_name: item.product!.name,
          snapshot_unit: item.product!.unit,
          snapshot_category: item.product!.category,
        })),
      };
      setOrders(prev => [newOrder, ...prev]);
      toast.success('Đã tạo phiếu xuất mới');
      closeModal();
    } catch (err: any) {
      const msg = err.response?.data?.message ?? 'Không thể tạo phiếu xuất';
      toast.error(translateError(msg));
    } finally {
      setSubmitting(false);
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.code.toLowerCase().includes(search.toLowerCase()) || getReasonLabel(o.reason).toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !STATUS_FILTER_MAP[statusFilter] || o.status === STATUS_FILTER_MAP[statusFilter];
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 flex flex-col flex-1">
      {dialog}

      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-[#0b1c30]">Quản lý Xuất kho</h1>
          <p className="text-sm text-[#45474c] mt-1">Quản lý các phiếu xuất hàng và theo dõi việc giảm trừ tồn kho.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-[#0058be] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#2170e4] transition-colors shadow-sm cursor-pointer">
          <Plus size={18} />
          Tạo phiếu xuất mới
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        <div className="bg-white border border-[#E2E8F0] shadow-sm rounded p-5 flex flex-col justify-between h-32 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#e5eeff] rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
          <div>
            <p className="text-xs font-medium text-[#45474c] mb-1">Đang chờ xử lý</p>
            <h3 className="text-[32px] font-semibold text-[#0b1c30] leading-none">{orders.filter(o => o.status === 'pending').length}</h3>
          </div>
        </div>
        <div className="bg-white border border-[#E2E8F0] shadow-sm rounded p-5 flex flex-col justify-between h-32 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#e5eeff] rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
          <div>
            <p className="text-xs font-medium text-[#45474c] mb-1">Đã xác nhận</p>
            <h3 className="text-[32px] font-semibold text-[#0b1c30] leading-none">{orders.filter(o => o.status === 'confirmed').length}</h3>
          </div>
        </div>
        <div className="bg-white border border-[#E2E8F0] shadow-sm rounded p-5 flex flex-col justify-between h-32 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#e5eeff] rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
          <div>
            <p className="text-xs font-medium text-[#45474c] mb-1">Đã huỷ</p>
            <h3 className="text-[32px] font-semibold text-[#0b1c30] leading-none">{orders.filter(o => o.status === 'cancelled').length}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#c5c6cd] rounded-xl shadow-sm overflow-hidden flex flex-col flex-1 min-h-[300px]">
        <div className="p-4 border-b border-[#e5eeff] bg-[#f8f9ff] flex flex-col sm:flex-row gap-4 items-center justify-between shrink-0">
          <div className="relative w-full sm:w-64">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm mã phiếu, lý do xuất..." className="w-full pl-9 pr-3 py-1.5 border border-[#c5c6cd] rounded text-sm outline-none focus:border-[#0058be]" />
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
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#45474c] w-40">Lý do xuất</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#45474c] w-32">Ngày xuất</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#45474c] text-right w-24">Số lượng</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#45474c] text-center w-32">Trạng thái</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#45474c] text-right w-32">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5eeff] text-sm">
              {filteredOrders.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-slate-500">Không tìm thấy phiếu xuất.</td></tr>
              ) : filteredOrders.map((o) => {
                const totalQty = o.items.reduce((acc, item) => acc + item.quantity, 0);
                return (
                  <tr key={o.id} onClick={() => navigate(`/stock-out/${o.id}`)} className="hover:bg-[#F1F5F9] transition-colors group cursor-pointer">
                    <td className="py-3 px-4 font-medium text-[#0058be]">{o.code}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        o.reason === 'sale' ? 'bg-blue-50 text-blue-700' :
                        o.reason === 'internal' ? 'bg-purple-50 text-purple-700' :
                        o.reason === 'damaged' ? 'bg-orange-50 text-orange-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {getReasonLabel(o.reason)}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium">{new Date(o.export_date).toLocaleDateString('vi-VN')}</td>
                    <td className="py-3 px-4 text-right font-medium">{totalQty.toLocaleString()}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium uppercase ${
                        o.status === 'pending' ? 'bg-[#fed7aa] text-[#9a3412]' :
                        o.status === 'confirmed' ? 'bg-[#bbf7d0] text-[#166534]' :
                        'bg-[#fecaca] text-[#991b1b]'
                      }`}>
                        {o.status === 'pending' ? 'Chờ xử lý' : o.status === 'confirmed' ? 'Đã duyệt' : 'Đã huỷ'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {o.status === 'pending' && <button onClick={() => handleConfirm(o.id)} className="text-slate-400 hover:text-[#166534] p-1 cursor-pointer" title="Xác nhận"><CheckCircle size={18} /></button>}
                        {o.status === 'pending' && <button onClick={() => handleCancel(o.id)} className="text-slate-400 hover:text-[#991b1b] p-1 cursor-pointer" title="Huỷ"><XCircle size={18} /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-lg text-[#0b1c30]">Tạo phiếu xuất mới</h3>
              <button type="button" onClick={closeModal} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} noValidate className="flex flex-col flex-1 min-h-0">
              <div className="p-6 flex flex-col gap-5 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label className="text-sm font-medium text-slate-700">Lý do xuất *</label>
                    <CustomSelect
                      value={formData.reason}
                      onChange={v => setFormData({ ...formData, reason: v })}
                      options={REASON_OPTIONS}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label className="text-sm font-medium text-slate-700">Ngày xuất hàng *</label>
                    <DatePicker
                      required
                      value={formData.export_date}
                      onChange={v => setFormData({ ...formData, export_date: v })}
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
                      Danh sách sản phẩm *
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
                                {item.product ? (
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <p className="font-medium text-slate-800">{item.product.code} — {item.product.name}</p>
                                      <p className="text-xs text-slate-400 mt-0.5">ĐVT: {item.product.unit} · {item.product.category} · Tồn: {item.product.stock.toLocaleString()}</p>
                                    </div>
                                    <button type="button" onClick={() => setPickerIdx(idx)} className="text-xs text-[#0058be] hover:underline shrink-0 cursor-pointer mt-0.5">Đổi</button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setPickerIdx(idx)}
                                    className="w-full text-left px-2 py-1.5 border border-dashed border-slate-300 rounded text-sm text-slate-400 hover:border-[#0058be] hover:text-[#0058be] transition-colors cursor-pointer"
                                  >
                                    + Chọn sản phẩm
                                  </button>
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
                  {formData.items.length === 0 ? 'Thêm ít nhất 1 sản phẩm' : `${formData.items.length} dòng hàng · ${formData.items.reduce((s, i) => s + (parseInt(i.quantity) || 0), 0).toLocaleString()} sản phẩm`}
                </p>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">Huỷ bỏ</button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-[#0058be] hover:bg-[#2170e4] rounded-lg cursor-pointer disabled:opacity-60">
                    {submitting ? 'Đang tạo...' : 'Tạo phiếu xuất'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <ProductPickerModal
        open={pickerIdx !== null}
        onClose={() => setPickerIdx(null)}
        onSelect={product => {
          if (pickerIdx !== null) updateItem(pickerIdx, { product });
          setPickerIdx(null);
        }}
        disableOutOfStock
      />
    </div>
  );
}
