import { useState, useEffect } from 'react';
import { ArrowDownToLine, ArrowUpToLine, Download, Package, Table, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { exportToExcel, exportToPDF } from '../lib/export';
import CustomSelect from '../component/CustomSelect';
import api from '../lib/api';

type TrendPoint = {
  label: string;
  importQty: number;
  exportQty: number;
};

type TopProduct = {
  id: number;
  code: string;
  name: string;
  total_quantity: number;
};

const formatDateParam = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getRangeDays = (range: string) => range === '30 Ngày qua' ? 30 : 7;
const getBarHeight = (value: number, max: number) => value === 0 ? 0 : Math.max(4, (value / max) * 100);
const getTrendMinWidth = (points: number) => points > 7 ? `${points * 44}px` : '100%';

export default function Dashboard() {
  const navigate = useNavigate();
  const [chartRange, setChartRange] = useState('7 Ngày qua');

  const [totalProducts,  setTotalProducts]  = useState<number | null>(null);
  const [todayImport,    setTodayImport]    = useState<number | null>(null);
  const [todayExport,    setTodayExport]    = useState<number | null>(null);
  const [lowStockCount,  setLowStockCount]  = useState<number | null>(null);
  const [trendData,      setTrendData]      = useState<TrendPoint[]>([]);
  const [trendLoading,   setTrendLoading]   = useState(true);
  const [topProducts,    setTopProducts]    = useState<TopProduct[]>([]);
  const [topLoading,     setTopLoading]     = useState(true);

  useEffect(() => {
    const today = formatDateParam(new Date());

    api.get('/products', { params: { limit: '1' } })
      .then(({ data }) => setTotalProducts(data.data.total))
      .catch(() => {});

    api.get('/products', { params: { status: 'LOW_STOCK', limit: '1' } })
      .then(({ data }) => setLowStockCount(data.data.total))
      .catch(() => {});

    api.get('/reports/summary', { params: { from: today, to: today, limit: '1' } })
      .then(({ data }) => {
        setTodayImport(data.data.totals.totalImport);
        setTodayExport(data.data.totals.totalExport);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const days = getRangeDays(chartRange);
    const end = new Date();
    const dates = Array.from({ length: days }, (_, idx) => {
      const date = new Date(end);
      date.setDate(end.getDate() - (days - 1 - idx));
      return date;
    });

    setTrendLoading(true);
    Promise.all(dates.map(date => {
      const day = formatDateParam(date);
      return api.get('/reports/summary', {
        params: { from: day, to: day, limit: '1' },
        signal: controller.signal,
      }).then(({ data }) => ({
        label: days === 7
          ? date.toLocaleDateString('vi-VN', { weekday: 'short' })
          : date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
        importQty: Number(data.data.totals.totalImport) || 0,
        exportQty: Number(data.data.totals.totalExport) || 0,
      }));
    }))
      .then(setTrendData)
      .catch(() => {
        if (!controller.signal.aborted) setTrendData([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setTrendLoading(false);
      });

    return () => controller.abort();
  }, [chartRange]);

  useEffect(() => {
    const to = formatDateParam(new Date());
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 29);
    const from = formatDateParam(fromDate);

    setTopLoading(true);
    api.get('/reports/top-products', { params: { fromDate: from, toDate: to, type: 'export' } })
      .then(({ data }) => setTopProducts((data.data ?? []).slice(0, 5)))
      .catch(() => setTopProducts([]))
      .finally(() => setTopLoading(false));
  }, []);

  const fmt = (n: number | null) => n === null ? '...' : n.toLocaleString();
  const maxTrendValue = Math.max(1, ...trendData.flatMap(d => [d.importQty, d.exportQty]));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#0b1c30]">Tổng quan</h1>
          <p className="text-sm text-[#45474c] mt-1">Chỉ số thống kê kho hàng theo thời gian thực.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportToPDF} className="flex items-center gap-2 border border-[#c5c6cd] bg-white px-4 py-2 rounded text-sm font-medium text-[#0b1c30] hover:bg-gray-50 transition-colors cursor-pointer">
            <Download size={16} /> Xuất PDF
          </button>
          <button onClick={() => exportToExcel([], 'Dashboard')} className="flex items-center gap-2 border border-[#c5c6cd] bg-white px-4 py-2 rounded text-sm font-medium text-[#0b1c30] hover:bg-gray-50 transition-colors cursor-pointer">
            <Table size={16} /> Xuất Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Tổng sản phẩm</p>
              <h3 className="text-2xl font-semibold text-slate-900">{fmt(totalProducts)}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#0058be]">
              <Package size={20} />
            </div>
          </div>
          <p className="text-sm text-slate-400">Đang hoạt động</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Nhập kho hôm nay</p>
              <h3 className="text-2xl font-semibold text-slate-900">{fmt(todayImport)}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#0058be]">
              <ArrowDownToLine size={20} />
            </div>
          </div>
          <p className="text-sm text-slate-400">Tổng số lượng nhập</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Xuất kho hôm nay</p>
              <h3 className="text-2xl font-semibold text-slate-900">{fmt(todayExport)}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#0058be]">
              <ArrowUpToLine size={20} />
            </div>
          </div>
          <p className="text-sm text-slate-400">Tổng số lượng xuất</p>
        </div>

        <div className="bg-white rounded-lg border border-red-200 p-5 shadow-sm relative overflow-hidden bg-gradient-to-br from-red-50 to-transparent">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Cảnh báo sắp hết hàng</p>
              <h3 className="text-2xl font-semibold text-red-600">{fmt(lowStockCount)}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Dưới mức tối thiểu</span>
            <button
              onClick={() => navigate('/products?status=LOW_STOCK')}
              className="text-[#0058be] font-medium hover:underline cursor-pointer"
            >
              Xem tất cả
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col min-h-[400px]">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="text-lg font-semibold text-slate-900">Xu hướng Nhập / Xuất</h3>
            <div className="w-36">
              <CustomSelect value={chartRange} onChange={setChartRange} options={['7 Ngày qua', '30 Ngày qua']} />
            </div>
          </div>
          <div className="p-5 flex-1 relative flex flex-col pt-10">
            <div className="absolute top-0 right-5 flex gap-4 text-xs font-medium mt-3">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#0058be]"></div>Nhập</div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#00a472]"></div>Xuất</div>
            </div>
            <div className="absolute inset-x-5 top-10 bottom-8 flex flex-col justify-between pointer-events-none">
              {[0, 1, 2, 3, 4].map(i => <div key={i} className="w-full h-px bg-slate-100"></div>)}
            </div>
            <div className="overflow-x-auto overflow-y-hidden relative z-10 mt-6">
              <div
                className="flex flex-col"
                style={{ minWidth: getTrendMinWidth(trendData.length) }}
              >
                <div className="flex items-end justify-around pb-6 px-4 pt-4 h-48">
                  {trendLoading ? (
                    <div className="w-full self-center text-center text-sm text-slate-400">Đang tải...</div>
                  ) : trendData.length === 0 ? (
                    <div className="w-full self-center text-center text-sm text-slate-400">Không có dữ liệu.</div>
                  ) : trendData.map((d, idx) => (
                    <div key={`${d.label}-${idx}`} className="flex gap-1 w-10 shrink-0 justify-center h-full items-end group relative">
                      <div className="w-3 sm:w-3.5 bg-[#0058be] rounded-t transition-all hover:opacity-80" style={{ height: `${getBarHeight(d.importQty, maxTrendValue)}%` }} title={`Nhập: ${d.importQty.toLocaleString()}`}></div>
                      <div className="w-3 sm:w-3.5 bg-[#00a472] rounded-t transition-all hover:opacity-80" style={{ height: `${getBarHeight(d.exportQty, maxTrendValue)}%` }} title={`Xuất: ${d.exportQty.toLocaleString()}`}></div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-around text-xs text-slate-500 font-medium px-4 mt-2">
                  {trendData.map((d, idx) => (
                    <span key={`${d.label}-${idx}`} className="w-10 shrink-0 text-center whitespace-nowrap text-[11px]">
                      {d.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-lg font-semibold text-slate-900">Sản phẩm xuất nhiều</h3>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/50 border-b border-slate-100 sticky top-0">
                <tr>
                  <th className="py-3 px-4 font-semibold text-[12px] uppercase text-slate-500 tracking-wider">Tên sản phẩm</th>
                  <th className="py-3 px-4 font-semibold text-[12px] uppercase text-slate-500 tracking-wider text-right">SL Đã xuất</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13px]">
                {topLoading ? (
                  <tr><td colSpan={2} className="py-8 px-4 text-center text-slate-400">Đang tải...</td></tr>
                ) : topProducts.length === 0 ? (
                  <tr><td colSpan={2} className="py-8 px-4 text-center text-slate-400">Không có dữ liệu.</td></tr>
                ) : topProducts.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{item.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">Mã: {item.code}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-700">{Number(item.total_quantity).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-t border-slate-100 bg-slate-50/50 text-center">
            <button onClick={() => navigate('/reports')} className="text-sm font-medium text-[#0058be] hover:underline w-full py-1 cursor-pointer">Xem chi tiết</button>
          </div>
        </div>
      </div>
    </div>
  );
}
