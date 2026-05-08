import { useState, useEffect } from 'react';
import { ArrowDownToLine, ArrowUpToLine, Download, Package, Table, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { exportToExcel, exportToPDF } from '../lib/export';
import CustomSelect from '../component/CustomSelect';
import api from '../lib/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [chartRange, setChartRange] = useState('7 Ngày qua');

  const [totalProducts,  setTotalProducts]  = useState<number | null>(null);
  const [todayImport,    setTodayImport]    = useState<number | null>(null);
  const [todayExport,    setTodayExport]    = useState<number | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);

    api.get('/products', { params: { limit: '1' } })
      .then(({ data }) => setTotalProducts(data.data.total))
      .catch(() => {});

    api.get('/reports/summary', { params: { from: today, to: today, limit: '500' } })
      .then(({ data }) => {
        const items = data.data.items as { totalImport: number; totalExport: number }[];
        setTodayImport(items.reduce((s, r) => s + r.totalImport, 0));
        setTodayExport(items.reduce((s, r) => s + r.totalExport, 0));
      })
      .catch(() => {});
  }, []);

  const fmt = (n: number | null) => n === null ? '...' : n.toLocaleString();

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
              <h3 className="text-2xl font-semibold text-red-600">42</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Dưới mức tối thiểu</span>
            <button className="text-[#0058be] font-medium hover:underline cursor-pointer">Xem tất cả</button>
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
            <div className="flex-1 flex items-end justify-around pb-6 px-4 relative z-10 mt-6 pt-4 h-48">
              {[{ i: 60, e: 40 }, { i: 80, e: 45 }, { i: 50, e: 65 }, { i: 90, e: 30 }, { i: 70, e: 80 }, { i: 40, e: 55 }, { i: 85, e: 70 }].map((d, idx) => (
                <div key={idx} className="flex gap-1.5 w-full justify-center h-full items-end group relative">
                  <div className="w-4 sm:w-6 bg-[#0058be] rounded-t transition-all hover:opacity-80" style={{ height: `${d.i}%` }}></div>
                  <div className="w-4 sm:w-6 bg-[#00a472] rounded-t transition-all hover:opacity-80" style={{ height: `${d.e}%` }}></div>
                </div>
              ))}
            </div>
            <div className="flex justify-around text-xs text-slate-500 font-medium px-4 mt-2">
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => <span key={d} className="w-full text-center">{d}</span>)}
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
                {[
                  { name: 'Kệ Pallet Công nghiệp', sku: 'PR-1001', qty: '1,432' },
                  { name: 'Bình điện Xe nâng 48V', sku: 'FB-4800', qty: '890' },
                  { name: 'Cuộn màng PE', sku: 'SW-500', qty: '754' },
                  { name: 'Băng tải con lăn', sku: 'CB-200', qty: '612' },
                  { name: 'Dây đai an toàn', sku: 'SH-900', qty: '420' },
                ].map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{item.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">Mã: {item.sku}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-700">{item.qty}</td>
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
