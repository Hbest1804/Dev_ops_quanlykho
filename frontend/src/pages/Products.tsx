import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Download, Plus, Search, History, Edit2, Trash2, X, ChevronRight, ArrowDownToLine, ArrowUpFromLine, Package, CalendarDays } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { exportToExcel } from '../lib/export';
import CategoryPickerDrawer from '../component/CategoryPickerDrawer';
import CustomSelect from '../component/CustomSelect';
import { useConfirm } from '../component/useConfirm';
import api from '../lib/api';

type TxItem = {
  type: 'import' | 'export';
  quantity: number;
  stockAfter: number;
  createdBy: string;
  createdAt: string;
};

type Product = {
  id: number;
  code: string;
  name: string;
  description: string;
  category: string;
  unit: string;
  stock: number;
  createdAt: string;
  updatedAt: string;
};

export default function Products() {
  const navigate = useNavigate();
  const { confirm, dialog } = useConfirm();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  const [categoryFilter, setCategoryFilter] = useState('Tất cả danh mục');
  const [statusFilter, setStatusFilter] = useState('Tất cả trạng thái');

  const [categories, setCategories] = useState<string[]>([
    'Thiết bị điện', 'Đóng gói', 'Trang phục', 'Thiết bị công nghiệp', 'Văn phòng phẩm',
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  // ── Detail drawer tabs ────────────────────────────────────────
  const [drawerTab, setDrawerTab] = useState<'info' | 'tx'>('info');
  const [txItems, setTxItems] = useState<TxItem[]>([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txLoading, setTxLoading] = useState(false);
  const [txFrom, setTxFrom] = useState('');
  const [txTo, setTxTo]   = useState('');

  const fetchTx = useCallback(async (productId: number, from: string, to: string) => {
    setTxLoading(true);
    try {
      const params: Record<string, string> = { limit: '50' };
      if (from) params.from = from;
      if (to)   params.to   = to;
      const { data } = await api.get(`/products/${productId}/transactions`, { params });
      setTxItems(data.data?.items ?? []);
      setTxTotal(data.data?.total ?? 0);
    } catch {
      toast.error('Không thể tải lịch sử giao dịch');
    } finally {
      setTxLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProduct && drawerTab === 'tx') {
      fetchTx(selectedProduct.id, txFrom, txTo);
    }
  }, [selectedProduct, drawerTab, txFrom, txTo, fetchTx]);

  const openDrawer = (p: Product) => {
    setSelectedProduct(p);
    setDrawerTab('info');
    setTxFrom('');
    setTxTo('');
    setTxItems([]);
  };

  const [formData, setFormData] = useState({
    code: '', name: '', description: '', category: '', unit: 'Cái',
  });

  // ── Helpers ───────────────────────────────────────────────────
  const STATUS_API_MAP: Record<string, string> = {
    'Còn Hàng':  'IN_STOCK',
    'Sắp Hết':   'LOW_STOCK',
    'Hết Hàng':  'OUT_OF_STOCK',
  };

  const API_ERROR_MAP: Record<string, string> = {
    'Product not found':                                        'Sản phẩm không tồn tại',
    'Product code already exists':                              'Mã sản phẩm đã tồn tại',
    'Invalid product ID':                                       'ID sản phẩm không hợp lệ',
    'code, name, category, unit and description are required':  'Vui lòng điền đầy đủ các trường bắt buộc',
    'initialStock must be a non-negative integer':              'Tồn kho ban đầu phải là số nguyên không âm',
    'Product has stock > 0':                                    'Sản phẩm còn tồn kho, không thể xoá',
    'Internal server error':                                    'Lỗi máy chủ, vui lòng thử lại',
  };

  const translateError = (err: any, fallback: string): string => {
    const msg: string = err?.response?.data?.message ?? '';
    return API_ERROR_MAP[msg] ?? fallback;
  };

  // ── Fetch danh sách sản phẩm từ API ──────────────────────────
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (categoryFilter !== 'Tất cả danh mục') params.category = categoryFilter;
      if (statusFilter !== 'Tất cả trạng thái') params.status = STATUS_API_MAP[statusFilter];

      const { data } = await api.get('/products', { params });
      const items = (data.data?.items ?? []).map((p: any) => ({
        ...p,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      }));
      setProducts(items);

      // Tự động cập nhật danh sách category từ dữ liệu thực
      if (data.data?.items?.length) {
        const cats: string[] = Array.from(new Set((data.data.items as Product[]).map(p => p.category)));
        setCategories(prev => Array.from(new Set([...prev, ...cats])));
      }
    } catch (err: any) {
      toast.error(translateError(err, 'Không thể tải danh sách sản phẩm'));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, categoryFilter, statusFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // ── Helpers ───────────────────────────────────────────────────
  const closeModal = () => {
    setIsModalOpen(false);
    setIsCategoryDrawerOpen(false);
  };

  const getStatus = (qty: number) => {
    if (qty > 20) return { label: 'Còn Hàng', classes: 'bg-green-100 text-green-800' };
    if (qty > 0) return { label: 'Sắp Hết', classes: 'bg-yellow-100 text-yellow-800' };
    return { label: 'Hết Hàng', classes: 'bg-red-100 text-red-800' };
  };

  // Lọc trạng thái đã được thực hiện phía server thông qua query param `status`.
  // Biến `filteredProducts` chỉ là alias để không phải sửa phần JSX bên dưới.
  const filteredProducts = products;

  // ── Mở modal thêm mới ────────────────────────────────────────
  const openAddModal = () => {
    setFormData({ code: '', name: '', description: '', category: categories[0] ?? '', unit: 'Cái' });
    setEditingId(null);
    setIsModalOpen(true);
  };

  // ── Mở modal chỉnh sửa ───────────────────────────────────────
  const openEditModal = (p: Product) => {
    setFormData({ code: p.code, name: p.name, description: p.description, category: p.category, unit: p.unit });
    setEditingId(p.id);
    setIsModalOpen(true);
  };

  // ── Lưu (tạo mới hoặc cập nhật) ─────────────────────────────
  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.code.trim()) { toast.error('Vui lòng nhập mã sản phẩm'); return; }
    if (!formData.name.trim()) { toast.error('Vui lòng nhập tên sản phẩm'); return; }
    if (!formData.category) { toast.error('Vui lòng chọn danh mục'); return; }
    if (!formData.description.trim()) { toast.error('Vui lòng nhập mô tả sản phẩm'); return; }

    setSaving(true);
    try {
      if (editingId) {
        // PUT /api/products/:id — lưu thay đổi vào DB
        await api.put(`/products/${editingId}`, {
          name: formData.name.trim(),
          category: formData.category,
          unit: formData.unit,
          description: formData.description.trim(),
        });
        toast.success('Đã cập nhật sản phẩm');
        await fetchProducts(); // reload từ DB để đồng bộ updated_at
      } else {
        await api.post('/products', {
          code: formData.code.trim(),
          name: formData.name.trim(),
          category: formData.category,
          unit: formData.unit,
          description: formData.description.trim(),
          initialStock: 0,
        });
        toast.success('Đã thêm sản phẩm mới');
        await fetchProducts(); // reload từ DB
      }
      closeModal();
    } catch (err: any) {
      toast.error(translateError(err, 'Có lỗi xảy ra, vui lòng thử lại'));
    } finally {
      setSaving(false);
    }
  };

  // ── Xoá (DELETE /api/products/:id) ──────────────────────────
  const handleDelete = async (id: number) => {
    if (!await confirm({
      title: 'Xoá sản phẩm',
      message: 'Bạn có chắc muốn xoá sản phẩm này? Hành động không thể hoàn tác.',
      confirmLabel: 'Xoá',
      variant: 'danger',
    })) return;
    try {
      await api.delete(`/products/${id}`);
      if (selectedProduct?.id === id) setSelectedProduct(null);
      toast.success('Đã xoá sản phẩm');
      await fetchProducts(); // reload từ DB
    } catch (err: any) {
      toast.error(translateError(err, 'Không thể xoá sản phẩm'));
    }
  };

  return (
    <div className="space-y-6 flex flex-col flex-1 relative">
      {dialog}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-semibold text-[#0b1c30]">Quản lý Sản phẩm</h2>
          <p className="text-sm text-[#45474c] mt-1">Quản lý hàng lưu kho, cấp độ tồn kho và lịch sử sản phẩm.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => exportToExcel(filteredProducts, 'DanhSachSanPham')}
            className="bg-white border border-[#c5c6cd] hover:bg-slate-50 text-[#0b1c30] text-sm font-medium px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Download size={18} />Xuất dữ liệu
          </button>
          <button
            onClick={openAddModal}
            className="bg-[#0058be] hover:bg-[#2170e4] text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Plus size={18} />Thêm sản phẩm mới
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm md:col-span-2 flex flex-col justify-center">
          <label className="text-xs font-medium text-slate-500 mb-2">Tìm kiếm sản phẩm</label>
          <div className="relative w-full">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo Mã hoặc Tên..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 focus:border-[#0058be] focus:ring-1 focus:ring-[#0058be] rounded-lg text-sm transition-colors outline-none"
            />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <label className="text-xs font-medium text-slate-500 mb-2">Lọc theo danh mục</label>
          <CustomSelect
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={['Tất cả danh mục', ...categories]}
          />
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <label className="text-xs font-medium text-slate-500 mb-2">Lọc theo trạng thái</label>
          <CustomSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={['Tất cả trạng thái', 'Còn Hàng', 'Sắp Hết', 'Hết Hàng']}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold text-xs tracking-wider uppercase text-slate-500 w-24">Mã SP</th>
                <th className="py-3 px-4 font-semibold text-xs tracking-wider uppercase text-slate-500">Tên sản phẩm</th>
                <th className="py-3 px-4 font-semibold text-xs tracking-wider uppercase text-slate-500">Mô tả</th>
                <th className="py-3 px-4 font-semibold text-xs tracking-wider uppercase text-slate-500 w-32">Danh mục</th>
                <th className="py-3 px-4 font-semibold text-xs tracking-wider uppercase text-slate-500 w-20">ĐVT</th>
                <th className="py-3 px-4 font-semibold text-xs tracking-wider uppercase text-slate-500 text-right w-28">Tồn kho</th>
                <th className="py-3 px-4 font-semibold text-xs tracking-wider uppercase text-slate-500 text-center w-32">Trạng thái</th>
                <th className="py-3 px-4 font-semibold text-xs tracking-wider uppercase text-slate-500 text-right w-36">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr><td colSpan={8} className="py-8 text-center text-slate-500">Đang tải sản phẩm...</td></tr>
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan={8} className="py-8 text-center text-slate-500">Không tìm thấy sản phẩm.</td></tr>
              ) : filteredProducts.map(p => {
                const st = getStatus(p.stock);
                return (
                  <tr key={p.id} onClick={() => openDrawer(p)} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                    <td className="py-3 px-4 font-medium text-slate-600">{p.code}</td>
                    <td className="py-3 px-4 font-medium text-slate-900">{p.name}</td>
                    <td className="py-3 px-4 text-slate-500 max-w-[200px]">
                      <span className="block truncate" title={p.description}>{p.description || '—'}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{p.category}</td>
                    <td className="py-3 px-4 text-slate-500">{p.unit}</td>
                    <td className="py-3 px-4 font-medium text-right text-slate-900">{p.stock.toLocaleString()}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${st.classes}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => navigate(`/transactions/${p.code}`)} className="text-slate-400 hover:text-blue-600 p-1 cursor-pointer" title="Lịch sử"><History size={18} /></button>
                        <button onClick={() => openEditModal(p)} className="text-slate-400 hover:text-blue-600 p-1 cursor-pointer" title="Chỉnh sửa"><Edit2 size={18} /></button>
                        <button onClick={() => handleDelete(p.id)} className="text-slate-400 hover:text-red-600 p-1 cursor-pointer" title="Xoá"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="text-sm text-slate-500">
            Hiển thị <span className="font-medium text-slate-900">{filteredProducts.length > 0 ? 1 : 0}</span> đến{' '}
            <span className="font-medium text-slate-900">{filteredProducts.length}</span> trong số{' '}
            <span className="font-medium text-slate-900">{filteredProducts.length}</span> kết quả
          </div>
        </div>
      </div>

      {/* Detail Drawer */}
      {selectedProduct && createPortal(
        <>
          <div className="fixed inset-0 bg-slate-900/30 z-40" onClick={() => setSelectedProduct(null)} />
          <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-white shadow-xl z-50 flex flex-col">
            {/* Drawer header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-semibold text-lg text-[#0b1c30]">{selectedProduct.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{selectedProduct.code} · {selectedProduct.category}</p>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={20} /></button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100 shrink-0">
              {(['info', 'tx'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setDrawerTab(tab)}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                    drawerTab === tab
                      ? 'text-[#0058be] border-b-2 border-[#0058be]'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab === 'info' ? 'Thông tin' : 'Lịch sử giao dịch'}
                </button>
              ))}
            </div>

            {/* Tab: Thông tin */}
            {drawerTab === 'info' && (
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Tên sản phẩm</p>
                    <p className="font-semibold text-slate-900 text-base">{selectedProduct.name}</p>
                  </div>
                  <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatus(selectedProduct.stock).classes}`}>
                    {getStatus(selectedProduct.stock).label}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Mã SP</p>
                  <p className="text-sm font-medium text-slate-700">{selectedProduct.code}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Mô tả</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{selectedProduct.description || '—'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Danh mục</p>
                    <p className="text-sm text-slate-700">{selectedProduct.category}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Đơn vị tính</p>
                    <p className="text-sm text-slate-700">{selectedProduct.unit}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Tồn kho</p>
                  <p className="text-2xl font-bold text-slate-900">{selectedProduct.stock.toLocaleString()}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Ngày tạo</p>
                    <p className="text-sm text-slate-700">{new Date(selectedProduct.createdAt).toLocaleString('vi-VN')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Cập nhật lần cuối</p>
                    <p className="text-sm text-slate-700">{new Date(selectedProduct.updatedAt).toLocaleString('vi-VN')}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Lịch sử giao dịch */}
            {drawerTab === 'tx' && (
              <div className="flex-1 overflow-y-auto flex flex-col">
                {/* Date filters */}
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 shrink-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <CalendarDays size={15} className="text-slate-400 shrink-0" />
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Từ</span>
                      <input
                        type="date" value={txFrom}
                        onChange={e => setTxFrom(e.target.value)}
                        className="text-xs border border-slate-200 rounded-md px-2 py-1.5 outline-none focus:border-[#0058be] bg-white cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Đến</span>
                      <input
                        type="date" value={txTo}
                        onChange={e => setTxTo(e.target.value)}
                        className="text-xs border border-slate-200 rounded-md px-2 py-1.5 outline-none focus:border-[#0058be] bg-white cursor-pointer"
                      />
                    </div>
                    {(txFrom || txTo) && (
                      <button
                        onClick={() => { setTxFrom(''); setTxTo(''); }}
                        className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer ml-auto"
                      >
                        Xoá lọc
                      </button>
                    )}
                  </div>
                </div>

                {/* Count */}
                <div className="px-4 py-2 border-b border-slate-100 shrink-0 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {txLoading ? 'Đang tải...' : `${txTotal} giao dịch`}
                  </span>
                </div>

                {/* Table */}
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left border-collapse min-w-[480px]">
                    <thead className="bg-[#e5eeff] sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-[#45474c]">Ngày</th>
                        <th className="py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-[#45474c]">Loại</th>
                        <th className="py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-[#45474c] text-right">SL</th>
                        <th className="py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-[#45474c] text-right">Tồn sau</th>
                        <th className="py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-[#45474c]">Người thực hiện</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e5eeff] text-sm">
                      {txLoading ? (
                        <tr><td colSpan={5} className="py-10 text-center text-slate-400 text-sm">Đang tải...</td></tr>
                      ) : txItems.length === 0 ? (
                        <tr>
                          <td colSpan={5}>
                            <div className="flex flex-col items-center justify-center py-14 gap-3 text-slate-400">
                              <Package size={36} strokeWidth={1.2} />
                              <p className="text-sm">Chưa có giao dịch nào.</p>
                            </div>
                          </td>
                        </tr>
                      ) : txItems.map((tx, i) => (
                        <tr key={i} className="hover:bg-[#f8f9ff] transition-colors">
                          <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">
                            {new Date(tx.createdAt).toLocaleDateString('vi-VN')}
                          </td>
                          <td className="py-2.5 px-4">
                            {tx.type === 'import' ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-[#166534] bg-[#bbf7d0] px-2 py-0.5 rounded">
                                <ArrowDownToLine size={11} /> Nhập
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-[#9a3412] bg-orange-50 px-2 py-0.5 rounded">
                                <ArrowUpFromLine size={11} /> Xuất
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-right font-semibold">
                            <span className={tx.type === 'import' ? 'text-[#166534]' : 'text-[#9a3412]'}>
                              {tx.type === 'import' ? '+' : '-'}{tx.quantity.toLocaleString()}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right text-slate-700 font-medium">
                            {tx.stockAfter.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-4 text-slate-500 text-xs truncate max-w-[120px]">{tx.createdBy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Footer actions */}
            <div className="p-4 border-t border-slate-100 flex gap-3 shrink-0">
              <button
                onClick={() => { openEditModal(selectedProduct); }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0058be] hover:bg-[#2170e4] rounded-lg transition-colors cursor-pointer"
              >
                <Edit2 size={16} /> Chỉnh sửa
              </button>
              <button
                onClick={() => handleDelete(selectedProduct.id)}
                className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Category Drawer */}
      <CategoryPickerDrawer
        open={isCategoryDrawerOpen}
        onClose={() => setIsCategoryDrawerOpen(false)}
        value={formData.category}
        onChange={cat => setFormData({ ...formData, category: cat })}
        categories={categories}
        onAddCategory={cat => setCategories(prev => [...prev, cat])}
      />

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-lg text-[#0b1c30]">{editingId ? 'Chỉnh sửa Sản phẩm' : 'Thêm Sản phẩm mới'}</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} noValidate className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Mã SP *</label>
                <input
                  required type="text"
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value })}
                  disabled={!!editingId}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#0058be] focus:ring-1 focus:ring-[#0058be] outline-none text-sm disabled:bg-slate-50 disabled:text-slate-400"
                  placeholder="VD: SP001"
                />
                {editingId && <span className="text-xs text-slate-400">Mã SP không thể thay đổi sau khi tạo.</span>}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Tên sản phẩm *</label>
                <input
                  required type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#0058be] focus:ring-1 focus:ring-[#0058be] outline-none text-sm"
                  placeholder="Nhập tên sản phẩm đầy đủ"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Mô tả *</label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#0058be] focus:ring-1 focus:ring-[#0058be] outline-none text-sm resize-none"
                  placeholder="Nhập mô tả sản phẩm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Danh mục *</label>
                  <button
                    type="button"
                    onClick={() => setIsCategoryDrawerOpen(true)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-slate-300 hover:border-[#0058be] text-sm bg-white text-left transition-colors cursor-pointer"
                  >
                    <span className={formData.category ? 'text-slate-800' : 'text-slate-400'}>
                      {formData.category || 'Chọn danh mục...'}
                    </span>
                    <ChevronRight size={16} className="text-slate-400 shrink-0" />
                  </button>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Đơn vị tính</label>
                  <CustomSelect
                    value={formData.unit}
                    onChange={v => setFormData({ ...formData, unit: v })}
                    options={['Cái', 'Bộ', 'KG', 'Hộp', 'Cuộn', 'Đôi']}
                  />
                </div>
              </div>
              <div className="pt-2 flex items-center justify-end gap-3 mt-2">
                <button
                  type="button" onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg cursor-pointer"
                >
                  Huỷ bỏ
                </button>
                <button
                  type="submit" disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#0058be] hover:bg-[#2170e4] rounded-lg cursor-pointer disabled:opacity-60"
                >
                  {saving ? 'Đang lưu...' : 'Lưu sản phẩm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
