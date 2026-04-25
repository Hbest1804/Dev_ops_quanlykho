import { useState, useEffect, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Download, Plus, Search, ChevronDown, History, Edit2, Trash2, X, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { exportToExcel } from '../lib/export';
import CategoryPickerDrawer from '../component/CategoryPickerDrawer';
import CustomSelect from '../component/CustomSelect';

type Product = {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  unit: string;
  stock_quantity: number;
  created_at: string;
  updated_at: string;
};

// Mock data items
const INITIAL_PRODUCTS: Product[] = [
  { id: '1', sku: 'PR-1001', name: 'Kệ Pallet Công nghiệp', description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.", category: 'Thiết bị công nghiệp', unit: 'Cái', stock_quantity: 1432, created_at: '2024-01-10T08:00:00Z', updated_at: '2024-03-15T14:30:00Z' },
  { id: '2', sku: 'FB-4800', name: 'Bình điện Xe nâng 48V', description: '', category: 'Thiết bị điện', unit: 'Cái', stock_quantity: 890, created_at: '2024-02-01T09:00:00Z', updated_at: '2024-04-01T10:00:00Z' },
  { id: '3', sku: 'SW-500', name: 'Cuộn màng PE', description: '', category: 'Đóng gói', unit: 'Cuộn', stock_quantity: 15, created_at: '2024-02-20T11:00:00Z', updated_at: '2024-04-10T16:00:00Z' },
  { id: '4', sku: 'CB-200', name: 'Băng tải con lăn', description: '', category: 'Thiết bị công nghiệp', unit: 'Bộ', stock_quantity: 0, created_at: '2024-03-05T07:30:00Z', updated_at: '2024-04-20T09:15:00Z' }
];

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Tất cả danh mục');
  const [status, setStatus] = useState('Tất cả trạng thái');
  
  const [categories, setCategories] = useState(['Thiết bị điện', 'Đóng gói', 'Trang phục', 'Thiết bị công nghiệp', 'Văn phòng phẩm']);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState(false);

  const closeModal = () => {
    setIsModalOpen(false);
    setIsCategoryDrawerOpen(false);
  };
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const [formData, setFormData] = useState({
    sku: '', name: '', description: '', category: '', unit: 'Cái', stock_quantity: 0
  });

  useEffect(() => {
    // Generate delay for mock data
    setTimeout(() => {
      setProducts(INITIAL_PRODUCTS);
      setLoading(false);
    }, 500);
  }, []);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setProducts(products.map(p => p.id === editingId ? { ...p, ...formData, updated_at: new Date().toISOString() } : p));
      toast.success('Đã cập nhật sản phẩm');
    } else {
      const now = new Date().toISOString();
      const newProduct: Product = {
        ...formData,
        id: Math.random().toString(36).substring(2, 9),
        created_at: now,
        updated_at: now,
      };
      setProducts([newProduct, ...products]);
      toast.success('Đã thêm sản phẩm mới');
    }
    closeModal();
  };

  const handleDelete = (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xoá sản phẩm này?')) return;
    setProducts(products.filter(p => p.id !== id));
    toast.success('Đã xoá sản phẩm');
  };

  const openAddModal = () => {
    setFormData({ sku: '', name: '', description: '', category: 'Thiết bị công nghiệp', unit: 'Cái', stock_quantity: 0 });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setFormData({ sku: p.sku, name: p.name, description: p.description, category: p.category, unit: p.unit, stock_quantity: p.stock_quantity });
    setEditingId(p.id);
    setIsModalOpen(true);
  };

  const getStatus = (qty: number) => {
    if (qty > 20) return { label: 'Còn Hàng', classes: 'bg-green-100 text-green-800' };
    if (qty > 0) return { label: 'Sắp Hết', classes: 'bg-yellow-100 text-yellow-800' };
    return { label: 'Hết Hàng', classes: 'bg-red-100 text-red-800' };
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCat = category === 'Tất cả danh mục' || p.category === category;
    const s = getStatus(p.stock_quantity).label;
    const matchesStatus = status === 'Tất cả trạng thái' || s === status;
    return matchesSearch && matchesCat && matchesStatus;
  });

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-theme(spacing.32))] relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-semibold text-[#0b1c30]">Quản lý Sản phẩm</h2>
          <p className="text-sm text-[#45474c] mt-1">Quản lý hàng lưu kho, cấp độ tồn kho và lịch sử sản phẩm.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => exportToExcel(filteredProducts, 'DanhSachSanPham')}
            className="bg-white border border-[#c5c6cd] hover:bg-slate-50 text-[#0b1c30] text-sm font-medium px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer">
            <Download size={18} />
            Xuất dữ liệu
          </button>
          <button onClick={openAddModal} className="bg-[#0058be] hover:bg-[#2170e4] text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer">
            <Plus size={18} />
            Thêm sản phẩm mới
          </button>
        </div>
      </div>

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
          {/* revert: <select value={category} onChange={e => setCategory(e.target.value)} className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-lg appearance-none text-sm bg-white outline-none cursor-pointer"><option>Tất cả danh mục</option>...</select> */}
          <CustomSelect
            value={category}
            onChange={setCategory}
            options={['Tất cả danh mục', ...categories]}
          />
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <label className="text-xs font-medium text-slate-500 mb-2">Lọc theo trạng thái</label>
          {/* revert: <select className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-lg appearance-none text-sm bg-white outline-none cursor-pointer"><option>Tất cả trạng thái</option>...</select> */}
          <CustomSelect
            value={status}
            onChange={setStatus}
            options={['Tất cả trạng thái', 'Còn Hàng', 'Sắp Hết', 'Hết Hàng']}
          />
        </div>
      </div>

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
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">Đang tải sản phẩm...</td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">Không tìm thấy sản phẩm.</td>
                </tr>
              ) : filteredProducts.map((p) => {
                const status = getStatus(p.stock_quantity);
                return (
                <tr key={p.id} onClick={() => setSelectedProduct(p)} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                  <td className="py-3 px-4 font-medium text-slate-600">{p.sku}</td>
                  <td className="py-3 px-4 font-medium text-slate-900">{p.name}</td>
                  <td className="py-3 px-4 text-slate-500 max-w-[200px]">
                    <span className="block truncate" title={p.description}>{p.description || '—'}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{p.category}</td>
                  <td className="py-3 px-4 text-slate-500">{p.unit}</td>
                  <td className="py-3 px-4 font-medium text-right text-slate-900">{p.stock_quantity.toLocaleString()}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${status.classes}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="text-slate-400 hover:text-blue-600 p-1 cursor-pointer" title="Lịch sử"><History size={18} /></button>
                      <button onClick={() => openEditModal(p)} className="text-slate-400 hover:text-blue-600 p-1 cursor-pointer" title="Chỉnh sửa"><Edit2 size={18} /></button>
                      <button onClick={() => handleDelete(p.id)} className="text-slate-400 hover:text-red-600 p-1 cursor-pointer" title="Xoá"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="text-sm text-slate-500">
            Hiển thị <span className="font-medium text-slate-900">{filteredProducts.length > 0 ? 1 : 0}</span> đến <span className="font-medium text-slate-900">{filteredProducts.length}</span> trong số <span className="font-medium text-slate-900">{filteredProducts.length}</span> kết quả
          </div>
        </div>
      </div>

      {selectedProduct && createPortal(
        <>
          <div className="fixed inset-0 bg-slate-900/30 z-40" onClick={() => setSelectedProduct(null)} />
          <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-xl z-50 flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-lg text-[#0b1c30]">Chi tiết sản phẩm</h3>
              <button onClick={() => setSelectedProduct(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Tên sản phẩm</p>
                  <p className="font-semibold text-slate-900 text-base">{selectedProduct.name}</p>
                </div>
                <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatus(selectedProduct.stock_quantity).classes}`}>
                  {getStatus(selectedProduct.stock_quantity).label}
                </span>
              </div>

              <div>
                <p className="text-xs text-slate-500 mb-1">Mã SP (SKU)</p>
                <p className="text-sm font-medium text-slate-700">{selectedProduct.sku}</p>
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
                <p className="text-2xl font-bold text-slate-900">{selectedProduct.stock_quantity.toLocaleString()}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Ngày tạo</p>
                  <p className="text-sm text-slate-700">{new Date(selectedProduct.created_at).toLocaleString('vi-VN')}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Cập nhật lần cuối</p>
                  <p className="text-sm text-slate-700">{new Date(selectedProduct.updated_at).toLocaleString('vi-VN')}</p>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => openEditModal(selectedProduct)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0058be] hover:bg-[#2170e4] rounded-lg transition-colors cursor-pointer"
              >
                <Edit2 size={16} /> Chỉnh sửa
              </button>
              <button
                onClick={() => { handleDelete(selectedProduct.id); setSelectedProduct(null); }}
                className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </>,
        document.body
      )}

      <CategoryPickerDrawer
        open={isCategoryDrawerOpen}
        onClose={() => setIsCategoryDrawerOpen(false)}
        value={formData.category}
        onChange={cat => setFormData({ ...formData, category: cat })}
        categories={categories}
        onAddCategory={cat => setCategories(prev => [...prev, cat])}
      />

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-lg text-[#0b1c30]">{editingId ? 'Chỉnh sửa Sản phẩm' : 'Thêm Sản phẩm mới'}</h3>
              <button onClick={() => closeModal()} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Mã SP (SKU) *</label>
                <input required type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#0058be] focus:ring-1 focus:ring-[#0058be] outline-none text-sm" placeholder="VD: PRD-1001" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Tên sản phẩm *</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#0058be] focus:ring-1 focus:ring-[#0058be] outline-none text-sm" placeholder="Nhập tên sản phẩm đầy đủ" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Mô tả</label>
                <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#0058be] focus:ring-1 focus:ring-[#0058be] outline-none text-sm resize-none" placeholder="Mô tả sản phẩm (tuỳ chọn)" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Danh mục</label>
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
                  <select value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#0058be] focus:ring-1 focus:ring-[#0058be] outline-none text-sm bg-white cursor-pointer">
                    <option>Cái</option>
                    <option>Bộ</option>
                    <option>KG</option>
                    <option>Hộp</option>
                    <option>Cuộn</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Số lượng</label>
                <input type="number" min="0" value={formData.stock_quantity} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 outline-none text-sm text-slate-500 cursor-not-allowed" disabled />
                <span className="text-xs text-amber-600">Số lượng kho được quản lý thông qua giao dịch nhập/xuất kho.</span>
              </div>
              <div className="pt-2 flex items-center justify-end gap-3 mt-2">
                <button type="button" onClick={() => closeModal()} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">Huỷ bỏ</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-[#0058be] hover:bg-[#2170e4] rounded-lg cursor-pointer">Lưu sản phẩm</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
