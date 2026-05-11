import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

type Product = {
  id: number;
  code: string;
  name: string;
  unit: string;
  category: string;
  stock: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (product: Product) => void;
  disableOutOfStock?: boolean;
};

const LIMIT = 10;

export default function ProductPickerModal({ open, onClose, onSelect, disableOutOfStock = false }: Props) {
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchProducts = (q: string, p: number) => {
    setLoading(true);
    api.get('/products', { params: { search: q || undefined, page: p, limit: LIMIT } })
      .then(({ data }) => {
        setProducts(data.data.items);
        setTotal(data.data.total);
      })
      .catch(() => toast.error('Không thể tải danh sách sản phẩm'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!open) return;
    setSearch('');
    setPage(1);
    fetchProducts('', 1);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open]);

  const handleSearch = (q: string) => {
    setSearch(q);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchProducts(q, 1), 300);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchProducts(search, newPage);
  };

  const handleSelect = (product: Product) => {
    onSelect(product);
    onClose();
  };

  if (!open) return null;

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h3 className="font-semibold text-lg text-[#0b1c30]">Chọn sản phẩm</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-slate-100 shrink-0">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Tìm theo mã hoặc tên sản phẩm..."
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-[#0058be] outline-none"
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-400">Đang tải...</p>
          ) : products.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Không tìm thấy sản phẩm</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="py-2 px-4 text-xs font-semibold text-slate-500 text-left w-28">Mã SP</th>
                  <th className="py-2 px-4 text-xs font-semibold text-slate-500 text-left">Tên sản phẩm</th>
                  <th className="py-2 px-4 text-xs font-semibold text-slate-500 text-left w-32">Danh mục</th>
                  <th className="py-2 px-4 text-xs font-semibold text-slate-500 text-left w-16">ĐVT</th>
                  <th className="py-2 px-4 text-xs font-semibold text-slate-500 text-right w-20">Tồn kho</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map(p => {
                  const disabled = disableOutOfStock && p.stock === 0;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => !disabled && handleSelect(p)}
                      className={disabled ? 'opacity-50 bg-slate-50 cursor-not-allowed' : 'hover:bg-[#f0f5ff] cursor-pointer transition-colors'}
                    >
                      <td className="py-2.5 px-4 font-medium text-[#0058be]">{p.code}</td>
                      <td className="py-2.5 px-4 text-slate-800">{p.name}</td>
                      <td className="py-2.5 px-4 text-slate-500">{p.category}</td>
                      <td className="py-2.5 px-4 text-slate-500">{p.unit}</td>
                      <td className="py-2.5 px-4 text-right font-medium">
                        {disabled
                          ? <span className="text-xs font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded">Hết hàng</span>
                          : <span className="text-slate-700">{p.stock.toLocaleString()}</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between shrink-0">
          <p className="text-xs text-slate-400">{total} sản phẩm</p>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="px-2 py-1 text-xs border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >←</button>
              <span className="text-xs text-slate-600">{page} / {totalPages}</span>
              <button
                type="button"
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                className="px-2 py-1 text-xs border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >→</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
