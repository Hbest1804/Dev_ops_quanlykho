import { useState, useMemo } from 'react';
import { Download, FileText, ArrowDownToLine, ArrowUpFromLine, Package, ClipboardList } from 'lucide-react';
import CustomSelect from '../component/CustomSelect';
import DatePicker from '../component/DatePicker';
import { exportToExcel, exportToPDF } from '../lib/export';
import { MOCK_IMPORT_ORDERS } from '../data/stockInMock';
import { MOCK_EXPORT_ORDERS } from '../data/stockOutMock';

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

  const handlePeriodChange = (p: string) => {
    setPeriod(p);
    const [from, to] = getPeriodDates(p);
    setDateFrom(from);
    setDateTo(to);
  };

  const reportRows = useMemo(() => {
    const map = new Map<string, {
      code: string; name: string; category: string; unit: string;
      imported: number; exported: number;
    }>();

    for (const order of MOCK_IMPORT_ORDERS) {
      if (order.status === 'cancelled') continue;
      for (const item of order.items) {
        const key = item.snapshot_product_code;
        const row = map.get(key) ?? { code: key, name: item.snapshot_product_name, category: item.snapshot_category, unit: item.snapshot_unit, imported: 0, exported: 0 };
        row.imported += item.quantity;
        map.set(key, row);
      }
    }

    for (const order of MOCK_EXPORT_ORDERS) {
      if (order.status === 'cancelled') continue;
      for (const item of order.items) {
        const key = item.snapshot_product_code;
        const row = map.get(key) ?? { code: key, name: item.snapshot_product_name, category: item.snapshot_category, unit: item.snapshot_unit, imported: 0, exported: 0 };
        row.exported += item.quantity;
        map.set(key, row);
      }
    }

    return Array.from(map.values()).sort((a, b) => (b.imported + b.exported) - (a.imported + a.exported));
  }, []);

  const totalImported = reportRows.reduce((s, r) => s + r.imported, 0);
  const totalExported = reportRows.reduce((s, r) => s + r.exported, 0);
  const importOrderCount = MOCK_IMPORT_ORDERS.filter(o => o.status !== 'cancelled').length;
  const exportOrderCount = MOCK_EXPORT_ORDERS.filter(o => o.status !== 'cancelled').length;

  const handleExportExcel = () => {
    exportToExcel(reportRows.map(r => ({
      'Mã SP': r.code,
      'Tên sản phẩm': r.name,
      'Danh mục': r.category,
      'ĐVT': r.unit,
      'Tổng nhập': r.imported,
      'Tổng xuất': r.exported,
      'Chênh lệch': r.imported - r.exported,
    })), 'BaoCaoTonKho');
  };

  return (
    <div className="space-y-6 flex flex-col flex-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-[#0b1c30]">Báo cáo thống kê</h1>
          <p className="text-sm text-[#45474c] mt-1">Xem xu hướng tồn kho và kết xuất báo cáo.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExportExcel} className="bg-white border border-[#c5c6cd] hover:bg-slate-50 text-[#0b1c30] text-sm font-medium px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer">
            <Download size={18} /> Xuất Excel
          </button>
          <button onClick={exportToPDF} className="bg-white border border-[#c5c6cd] hover:bg-slate-50 text-[#0b1c30] text-sm font-medium px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer">
            <FileText size={18} /> Xuất PDF
          </button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
        <div className="bg-white border border-[#E2E8F0] shadow-sm rounded p-5 flex flex-col justify-between h-32 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#e5eeff] rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-[#45474c] mb-1">Tổng nhập kho</p>
              <h3 className="text-[32px] font-semibold text-[#0b1c30] leading-none">{totalImported.toLocaleString()}</h3>
            </div>
            <ArrowDownToLine size={18} className="text-[#0058be] mt-1 shrink-0" />
          </div>
          <p className="text-xs text-slate-400">{importOrderCount} phiếu nhập</p>
        </div>

        <div className="bg-white border border-[#E2E8F0] shadow-sm rounded p-5 flex flex-col justify-between h-32 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#e5eeff] rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-[#45474c] mb-1">Tổng xuất kho</p>
              <h3 className="text-[32px] font-semibold text-[#0b1c30] leading-none">{totalExported.toLocaleString()}</h3>
            </div>
            <ArrowUpFromLine size={18} className="text-[#0058be] mt-1 shrink-0" />
          </div>
          <p className="text-xs text-slate-400">{exportOrderCount} phiếu xuất</p>
        </div>

        <div className="bg-white border border-[#E2E8F0] shadow-sm rounded p-5 flex flex-col justify-between h-32 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#e5eeff] rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-[#45474c] mb-1">Chênh lệch</p>
              <h3 className={`text-[32px] font-semibold leading-none ${totalImported - totalExported >= 0 ? 'text-[#166534]' : 'text-[#991b1b]'}`}>
                {totalImported - totalExported >= 0 ? '+' : ''}{(totalImported - totalExported).toLocaleString()}
              </h3>
            </div>
            <Package size={18} className="text-[#0058be] mt-1 shrink-0" />
          </div>
          <p className="text-xs text-slate-400">Nhập − Xuất</p>
        </div>

        <div className="bg-white border border-[#E2E8F0] shadow-sm rounded p-5 flex flex-col justify-between h-32 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#e5eeff] rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-[#45474c] mb-1">Tổng phiếu</p>
              <h3 className="text-[32px] font-semibold text-[#0b1c30] leading-none">{importOrderCount + exportOrderCount}</h3>
            </div>
            <ClipboardList size={18} className="text-[#0058be] mt-1 shrink-0" />
          </div>
          <p className="text-xs text-slate-400">{importOrderCount} nhập · {exportOrderCount} xuất</p>
        </div>
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
          <button className="bg-[#0058be] hover:bg-[#2170e4] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0">
            Xem báo cáo
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#c5c6cd] rounded-xl shadow-sm overflow-hidden flex flex-col flex-1 min-h-[300px]">
        <div className="px-5 py-4 border-b border-[#e5eeff] bg-[#f8f9ff] shrink-0">
          <h2 className="text-sm font-semibold text-slate-700">Tổng hợp nhập xuất theo sản phẩm</h2>
          <p className="text-xs text-slate-400 mt-0.5">Chỉ tính phiếu đã xác nhận · {dateFrom} → {dateTo}</p>
        </div>
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="bg-[#e5eeff] sticky top-0 z-10 border-b border-[#c5c6cd]">
              <tr>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#45474c] w-28">Mã SP</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#45474c]">Tên sản phẩm</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#45474c] w-36">Danh mục</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#45474c] w-16">ĐVT</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#45474c] text-right w-28">Tổng nhập</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#45474c] text-right w-28">Tổng xuất</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#45474c] text-right w-28">Chênh lệch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5eeff] text-sm">
              {reportRows.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-400">Không có dữ liệu trong khoảng thời gian đã chọn.</td></tr>
              ) : reportRows.map(row => {
                const diff = row.imported - row.exported;
                return (
                  <tr key={row.code} className="hover:bg-[#F1F5F9] transition-colors">
                    <td className="py-3 px-4 font-medium text-[#0058be]">{row.code}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{row.name}</td>
                    <td className="py-3 px-4 text-slate-500">{row.category}</td>
                    <td className="py-3 px-4 text-slate-500">{row.unit}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center gap-1 font-medium text-[#166534]">
                        <ArrowDownToLine size={13} />
                        {row.imported.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center gap-1 font-medium text-[#9a3412]">
                        <ArrowUpFromLine size={13} />
                        {row.exported.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold">
                      <span className={diff >= 0 ? 'text-[#166534]' : 'text-[#991b1b]'}>
                        {diff >= 0 ? '+' : ''}{diff.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {reportRows.length > 0 && (
              <tfoot className="bg-slate-50 border-t border-[#c5c6cd]">
                <tr className="text-sm font-semibold">
                  <td colSpan={4} className="py-3 px-4 text-slate-600 text-right">Tổng cộng</td>
                  <td className="py-3 px-4 text-right text-[#166534]">{totalImported.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-[#9a3412]">{totalExported.toLocaleString()}</td>
                  <td className={`py-3 px-4 text-right ${totalImported - totalExported >= 0 ? 'text-[#166534]' : 'text-[#991b1b]'}`}>
                    {totalImported - totalExported >= 0 ? '+' : ''}{(totalImported - totalExported).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
