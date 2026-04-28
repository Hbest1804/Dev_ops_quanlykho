import { useState, useCallback, useEffect } from 'react';
import { Download, FileText, ArrowDownToLine, ArrowUpFromLine, Package, TrendingUp, Loader2 } from 'lucide-react';
import CustomSelect from '../component/CustomSelect';
import DatePicker from '../component/DatePicker';
import toast from 'react-hot-toast';
import api from '../lib/api';

const LIMIT = 50;

type ReportItem = {
  productId: number;
  productCode: string;
  productName: string;
  openingStock: number;
  totalImport: number;
  totalExport: number;
  closingStock: number;
};

const PERIOD_OPTIONS = ['Tuần này', 'Tháng này', 'Quý này', 'Tất cả'];

const getPeriodDates = (period: string): [string, string] => {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  if (period === 'Tuần này') {
    const from = new Date(now);
    from.setDate(now.getDate() - 6);
    return [from.toISOString().slice(0, 10), to];
  }
  if (period === 'Tháng này') {
    return [`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, to];
  }
  if (period === 'Quý này') {
    const quarter = Math.floor(now.getMonth() / 3);
    const from = new Date(now.getFullYear(), quarter * 3, 1);
    return [from.toISOString().slice(0, 10), to];
  }
  return ['2024-01-01', to];
};

export default function Reports() {
  const [period, setPeriod] = useState('Tháng này');
  const [dateFrom, setDateFrom] = useState(() => getPeriodDates('Tháng này')[0]);
  const [dateTo, setDateTo] = useState(() => getPeriodDates('Tháng này')[1]);
  const [items, setItems] = useState<ReportItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const [monthImport,  setMonthImport]  = useState(0);
  const [monthExport,  setMonthExport]  = useState(0);
  const [monthClosing, setMonthClosing] = useState(0);
  const [monthTotal,   setMonthTotal]   = useState(0);
  const [loadingMonth, setLoadingMonth] = useState(true);

  const handlePeriodChange = (val: string) => {
    setPeriod(val);
    const [f, t] = getPeriodDates(val);
    setDateFrom(f);
    setDateTo(t);
  };

  const fetchReport = useCallback(async (targetPage = 1) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        from: dateFrom, to: dateTo,
        page: String(targetPage), limit: String(LIMIT),
      };
      const { data } = await api.get('/reports/summary', { params });
      setItems(data.data.items);
      setTotal(data.data.total);
      setPage(targetPage);
      setFetched(true);
    } catch (err: any) {
      const msg = err.response?.data?.message ?? 'Không thể tải báo cáo';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchReport(1); }, [fetchReport]);

  useEffect(() => {
    const now = new Date();
    const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const to = now.toISOString().slice(0, 10);
    api.get('/reports/summary', { params: { from, to, page: '1', limit: '1' } })
      .then(({ data }) => {
        setMonthImport(data.data.totals.totalImport);
        setMonthExport(data.data.totals.totalExport);
        setMonthClosing(data.data.totals.totalClosing);
        setMonthTotal(data.data.total);
      })
      .catch(() => {})
      .finally(() => setLoadingMonth(false));
  }, []);

  const totalPages  = Math.ceil(total / LIMIT);
  const totalImport  = items.reduce((s, r) => s + r.totalImport,  0);
  const totalExport  = items.reduce((s, r) => s + r.totalExport,  0);
  const totalClosing = items.reduce((s, r) => s + r.closingStock, 0);

  const handleExport = async (format: 'excel' | 'pdf') => {
    const t = toast.loading(`Đang tạo file ${format.toUpperCase()}...`);
    try {
      const response = await api.get('/reports/inventory/export', {
        params: { fromDate: dateFrom, toDate: dateTo, format },
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const ext = format === 'excel' ? 'xlsx' : 'pdf';
      link.setAttribute('download', `BaoCaoInventory_${dateFrom}_${dateTo}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`Xuất file ${format.toUpperCase()} thành công`, { id: t });
    } catch (error: any) {
      toast.error(`Lỗi khi xuất file ${format.toUpperCase()}`, { id: t });
    }
  };

  return (
    <div className="space-y-6 flex flex-col flex-1">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-[#0b1c30]">Báo cáo thống kê</h1>
          <p className="text-sm text-[#45474c] mt-1">Xem xu hướng tồn kho và kết xuất báo cáo.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => handleExport('excel')} 
            className="bg-white border border-[#c5c6cd] hover:bg-slate-50 text-[#0b1c30] text-sm font-medium px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            disabled={loading || items.length === 0}
          >
            <Download size={18} /> Xuất Excel
          </button>
          <button 
            onClick={() => handleExport('pdf')} 
            className="bg-white border border-[#c5c6cd] hover:bg-slate-50 text-[#0b1c30] text-sm font-medium px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            disabled={loading || items.length === 0}
          >
            <FileText size={18} /> Xuất PDF
          </button>
        </div>
      </div>

      {/* Summary cards — luôn hiển thị tháng hiện tại */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
        {[
          { label: 'Nhập kho tháng này',  value: monthImport,  icon: <ArrowDownToLine size={18} className="text-[#0058be] mt-1 shrink-0" /> },
          { label: 'Xuất kho tháng này',  value: monthExport,  icon: <ArrowUpFromLine  size={18} className="text-[#0058be] mt-1 shrink-0" /> },
          { label: 'Tồn cuối tháng này',  value: monthClosing, icon: <Package          size={18} className="text-[#0058be] mt-1 shrink-0" /> },
          { label: 'Sản phẩm có phát sinh', value: monthTotal, icon: <TrendingUp       size={18} className="text-[#0058be] mt-1 shrink-0" /> },
        ].map(card => (
          <div key={card.label} className="bg-white border border-[#E2E8F0] shadow-sm rounded p-5 flex flex-col justify-between h-32 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#e5eeff] rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-[#45474c] mb-1">{card.label}</p>
                <h3 className="text-[32px] font-semibold text-[#0b1c30] leading-none">
                  {loadingMonth ? '...' : card.value.toLocaleString()}
                </h3>
              </div>
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="bg-white border border-[#c5c6cd] rounded-xl shadow-sm p-4 shrink-0">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex flex-col gap-1.5 w-full sm:w-44">
            <label className="text-xs font-medium text-[#45474c]">Khoảng thời gian</label>
            <CustomSelect value={period} onChange={handlePeriodChange} options={PERIOD_OPTIONS} />
          </div>
          <div className="flex flex-col gap-1.5 w-full sm:w-44">
            <label className="text-xs font-medium text-[#45474c]">Từ ngày</label>
            <DatePicker value={dateFrom} onChange={setDateFrom} />
          </div>
          <div className="flex flex-col gap-1.5 w-full sm:w-44">
            <label className="text-xs font-medium text-[#45474c]">Đến ngày</label>
            <DatePicker value={dateTo} onChange={setDateTo} />
          </div>
          <button 
            onClick={() => fetchReport(1)}
            disabled={loading}
            className="bg-[#0058be] hover:bg-[#2170e4] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : 'Xem báo cáo'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#c5c6cd] rounded-xl shadow-sm overflow-hidden flex flex-col flex-1 min-h-[300px]">
        <div className="px-5 py-4 border-b border-[#e5eeff] bg-[#f8f9ff] shrink-0">
          <h2 className="text-sm font-semibold text-slate-700">Tổng hợp nhập xuất tồn theo sản phẩm</h2>
          <p className="text-xs text-slate-400 mt-0.5">{fetched ? `${dateFrom} → ${dateTo} · ${total} sản phẩm` : 'Chọn khoảng thời gian và nhấn Xem báo cáo'}</p>
        </div>
        <div className="overflow-x-auto flex-1 min-h-0">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-[#e5eeff] sticky top-0 z-10 border-b border-[#c5c6cd]">
              <tr>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#45474c] w-28">Mã SP</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#45474c]">Tên sản phẩm</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#45474c] text-right w-28">Tồn đầu kỳ</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#45474c] text-right w-28">Tổng nhập</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#45474c] text-right w-28">Tổng xuất</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#45474c] text-right w-28">Tồn cuối kỳ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5eeff] text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-[#0058be]">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="animate-spin" size={32} />
                      <span className="text-sm font-medium">Đang tải dữ liệu báo cáo...</span>
                    </div>
                  </td>
                </tr>
              ) : !fetched ? (
                <tr><td colSpan={6} className="py-12 text-center text-slate-400">Nhấn "Xem báo cáo" để tải dữ liệu.</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-slate-400">Không có dữ liệu trong khoảng thời gian đã chọn.</td></tr>
              ) : items.map(row => (
                <tr key={row.productId} className="hover:bg-[#F1F5F9] transition-colors">
                  <td className="py-3 px-4 font-medium text-[#0058be]">{row.productCode}</td>
                  <td className="py-3 px-4 font-medium text-slate-800">{row.productName}</td>
                  <td className="py-3 px-4 text-right text-slate-600">{row.openingStock.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right">
                    <span className="inline-flex items-center gap-1 font-medium text-[#166534]">
                      <ArrowDownToLine size={13} />{row.totalImport.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="inline-flex items-center gap-1 font-medium text-[#9a3412]">
                      <ArrowUpFromLine size={13} />{row.totalExport.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-[#0b1c30]">{row.closingStock.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            {items.length > 0 && (
              <tfoot className="bg-slate-50 border-t border-[#c5c6cd]">
                <tr className="text-sm font-semibold">
                  <td colSpan={2} className="py-3 px-4 text-slate-600 text-right">Tổng cộng (trang này)</td>
                  <td className="py-3 px-4 text-right text-slate-600">{items.reduce((s, r) => s + r.openingStock, 0).toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-[#166534]">{totalImport.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-[#9a3412]">{totalExport.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-[#0b1c30]">{totalClosing.toLocaleString()}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-[#e5eeff] flex items-center justify-between text-sm shrink-0">
            <span className="text-slate-500">
              {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)} / {total} sản phẩm
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchReport(page - 1)}
                disabled={page === 1 || loading}
                className="px-3 py-1.5 border border-[#c5c6cd] rounded text-sm disabled:opacity-40 hover:bg-slate-50 cursor-pointer disabled:cursor-default"
              >
                ← Trước
              </button>
              <span className="text-slate-500">Trang {page} / {totalPages}</span>
              <button
                onClick={() => fetchReport(page + 1)}
                disabled={page >= totalPages || loading}
                className="px-3 py-1.5 border border-[#c5c6cd] rounded text-sm disabled:opacity-40 hover:bg-slate-50 cursor-pointer disabled:cursor-default"
              >
                Sau →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
