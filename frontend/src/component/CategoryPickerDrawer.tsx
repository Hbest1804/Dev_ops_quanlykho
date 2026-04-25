import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Plus, Check, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 8;

interface CategoryPickerDrawerProps {
  open: boolean;
  onClose: () => void;
  value: string;
  onChange: (category: string) => void;
  categories: string[];
  onAddCategory: (category: string) => void;
}

export default function CategoryPickerDrawer({ open, onClose, value, onChange, categories, onAddCategory }: CategoryPickerDrawerProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [newCategory, setNewCategory] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (open) {
      setSearch('');
      setPage(1);
      setNewCategory('');
      setIsAdding(false);
    }
  }, [open]);

  const filtered = categories.filter(c => c.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleSelect = (cat: string) => {
    onChange(cat);
    onClose();
  };

  const handleAddCategory = () => {
    const trimmed = newCategory.trim();
    if (!trimmed || categories.includes(trimmed)) return;
    onAddCategory(trimmed);
    onChange(trimmed);
    onClose();
  };

  if (!open) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 bg-slate-900/30 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-xl z-50 flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-lg text-[#0b1c30]">Chọn danh mục</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={20} /></button>
        </div>

        <div className="px-4 py-3 border-b border-slate-100">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Tìm danh mục..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#0058be] focus:ring-1 focus:ring-[#0058be]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {paginated.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Không tìm thấy danh mục</p>
          ) : (
            paginated.map(cat => (
              <button
                key={cat}
                onClick={() => handleSelect(cat)}
                className="w-full flex items-center justify-between px-5 py-3 text-sm hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <span className={value === cat ? 'text-[#0058be] font-medium' : 'text-slate-700'}>{cat}</span>
                {value === cat && <Check size={16} className="text-[#0058be]" />}
              </button>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="px-4 py-2 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>
            <span>{page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        <div className="p-4 border-t border-slate-100">
          {isAdding ? (
            <div className="flex gap-2">
              <input
                autoFocus
                type="text"
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                placeholder="Tên danh mục mới..."
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#0058be] focus:ring-1 focus:ring-[#0058be]"
              />
              <button
                onClick={handleAddCategory}
                disabled={!newCategory.trim() || categories.includes(newCategory.trim())}
                className="px-3 py-2 bg-[#0058be] text-white rounded-lg text-sm font-medium hover:bg-[#2170e4] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Thêm
              </button>
              <button onClick={() => setIsAdding(false)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 cursor-pointer">
                Huỷ
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-[#0058be] hover:text-[#0058be] transition-colors cursor-pointer"
            >
              <Plus size={16} /> Thêm danh mục mới
            </button>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
