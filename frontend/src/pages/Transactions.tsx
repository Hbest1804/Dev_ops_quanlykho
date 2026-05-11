import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowDownToLine, ArrowUpFromLine, Package } from 'lucide-react';
import CustomSelect from '../component/CustomSelect';
import DatePicker from '../component/DatePicker';
import { MOCK_IMPORT_ORDERS } from '../data/stockInMock';
import { MOCK_EXPORT_ORDERS, getReasonLabel } from '../data/stockOutMock';

type TxRow = {
  date: string;
  type: 'in' | 'out';
  orderCode: string;
  orderId: number;
  quantity: number;
  unit: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  note: string;
  detail: string;
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  cancelled: 'Đã huỷ',
};

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  confirmed: 'bg-[#bbf7d0] text-[#166534]',
  cancelled: 'bg-[#fecaca] text-[#991b1b]',
};

const TYPE_OPTIONS = ['Tất cả', 'Nhập kho', 'Xuất kho'];
const STATUS_OPTIONS = ['Tất cả', 'Chờ xác nhận', 'Đã xác nhận', 'Đã huỷ'];

export default function Transactions() {
  const { productCode } = useParams<{ productCode: string }>();
  const navigate = useNavigate();

  const [typeFilter, setTypeFilter] = useState('Tất cả');
  const [statusFilter, setStatusFilter] = useState('Tất cả');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const allRows = useMemo<TxRow[]>(() => {
    const rows: TxRow[] = [];

    for (const order of MOCK_IMPORT_ORDERS) {
      for (const item of order.items) {
        if (item.snapshot_product_code !== productCode) continue;
        rows.push({
          date: order.import_date,
          type: 'in',
          orderCode: order.code,
          orderId: order.id,
          quantity: item.quantity,
          unit: item.snapshot_unit,
          status: order.status,
          note: item.note || order.note,
          detail: `NCC: ${order.supplier}`,
        });
      }
    }

    for (const order of MOCK_EXPORT_ORDERS) {
      for (const item of order.items) {
        if (item.snapshot_product_code !== productCode) continue;
        rows.push({
          date: order.export_date,
          type: 'out',
          orderCode: order.code,
          orderId: order.id,
          quantity: item.quantity,
          unit: item.snapshot_unit,
          status: order.status,
          note: item.note || order.note,
          detail: `Lý do: ${getReasonLabel(order.reason)}`,
        });
      }
    }

    return rows.sort((a, b) => b.date.localeCompare(a.date));
  }, [productCode]);

  const productName = useMemo(() => {
    for (const o of MOCK_IMPORT_ORDERS) {
      const item = o.items.find(i => i.snapshot_product_code === productCode);
      if (item) return item.snapshot_product_name;
    }
    for (const o of MOCK_EXPORT_ORDERS) {
      const item = o.items.find(i => i.snapshot_product_code === productCode);
      if (item) return item.snapshot_product_name;
    }
    return productCode;
  }, [productCode]);

  const filtered = useMemo(() => allRows.filter(r => {
    if (typeFilter === 'Nhập kho' && r.type !== 'in') return false;
    if (typeFilter === 'Xuất kho' && r.type !== 'out') return false;
    if (statusFilter !== 'Tất cả') {
      const match = Object.entries(STATUS_LABEL).find(([, v]) => v === statusFilter)?.[0];
      if (match && r.status !== match) return false;
    }
    if (dateFrom && r.date < dateFrom) return false;
    if (dateTo && r.date > dateTo) return false;
    return true;
  }), [allRows, typeFilter, statusFilter, dateFrom, dateTo]);

  const confirmed = allRows.filter(r => r.status === 'confirmed');
  const totalIn = confirmed.filter(r => r.type === 'in').reduce((s, r) => s + r.quantity, 0);
  const totalOut = confirmed.filter(r => r.type === 'out').reduce((s, r) => s + r.quantity, 0);
  const unit = allRows[0]?.unit ?? '';

  return (
    <div className="space-y-6 flex flex-col flex-1">
      {/* Header */}
      <div className="flex items-start gap-4 shrink-0">
        <button onClick={() => navigate('/products')} className="mt-1 p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer transition-colors shrink-0">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-semibold text-[#0b1c30]">Lịch sử giao dịch</h2>
          <p className="text-sm text-[#45474c] mt-1">
            <span className="font-medium text-[#0058be]">{productCode}</span> · {productName}
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 shrink-0">
        <div className="bg-white border border-[#E2E8F0] shadow-sm rounded-xl p-5 flex flex-col justify-between h-28 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-[#e5eeff] rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-[#45474c] mb-1">Tổng nhập</p>
              <h3 className="text-3xl font-semibold text-[#166534] leading-none">{totalIn.toLocaleString()}</h3>
            </div>
            <ArrowDownToLine size={18} className="text-[#0058be] mt-1 shrink-0" />
          </div>
          <p className="text-xs text-slate-400">{unit} · đã xác nhận</p>
        </div>

        <div className="bg-white border border-[#E2E8F0] shadow-sm rounded-xl p-5 flex flex-col justify-between h-28 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-[#e5eeff] rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-[#45474c] mb-1">Tổng xuất</p>
              <h3 className="text-3xl font-semibold text-[#9a3412] leading-none">{totalOut.toLocaleString()}</h3>
            </div>
            <ArrowUpFromLine size={18} className="text-[#0058be] mt-1 shrink-0" />
          </div>
          <p className="text-xs text-slate-400">{unit} · đã xác nhận</p>
        </div>

        <div className="bg-white border border-[#E2E8F0] shadow-sm rounded-xl p-5 flex flex-col justify-between h-28 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-[#e5eeff] rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-[#45474c] mb-1">Chênh lệch</p>
              <h3 className={`text-3xl font-semibold leading-none ${totalIn - totalOut >= 0 ? 'text-[#166534]' : 'text-[#991b1b]'}`}>
                {totalIn - totalOut >= 0 ? '+' : ''}{(totalIn - totalOut).toLocaleString()}
              </h3>
            </div>
            <Package size={18} className="text-[#0058be] mt-1 shrink-0" />
          </div>
          <p className="text-xs text-slate-400">{unit} · nhập − xuất</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#c5c6cd] rounded-xl shadow-sm p-4 shrink-0">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1.5 w-36">
            <label className="text-xs font-medium text-[#45474c]">Loại giao dịch</label>
            <CustomSelect value={typeFilter} onChange={setTypeFilter} options={TYPE_OPTIONS} />
          </div>
          <div className="flex flex-col gap-1.5 w-40">
            <label className="text-xs font-medium text-[#45474c]">Trạng thái</label>
            <CustomSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
          </div>
          <div className="flex flex-col gap-1.5 w-40">
            <label className="text-xs font-medium text-[#45474c]">Từ ngày</label>
            <DatePicker value={dateFrom} onChange={setDateFrom} />
          </div>
          <div className="flex flex-col gap-1.5 w-40">
            <label className="text-xs font-medium text-[#45474c]">Đến ngày</label>
            <DatePicker value={dateTo} onChange={setDateTo} />
          </div>
          {(dateFrom || dateTo || typeFilter !== 'Tất cả' || statusFilter !== 'Tất cả') && (
            <button
              onClick={() => { setTypeFilter('Tất cả'); setStatusFilter('Tất cả'); setDateFrom(''); setDateTo(''); }}
              className="text-sm text-slate-500 hover:text-slate-700 cursor-pointer self-end pb-2"
            >
              Xoá bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#c5c6cd] rounded-xl shadow-sm overflow-hidden flex flex-col flex-1 min-h-[300px]">
        <div className="px-5 py-4 border-b border-[#e5eeff] bg-[#f8f9ff] shrink-0 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Danh sách giao dịch</h3>
          <span className="text-xs text-slate-400">{filtered.length} giao dịch</span>
        </div>
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="bg-[#e5eeff] sticky top-0 z-10 border-b border-[#c5c6cd]">
              <tr>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#45474c] w-32">Ngày</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#45474c] w-24">Loại</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#45474c] w-28">Mã phiếu</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#45474c]">Chi tiết</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#45474c] text-right w-28">Số lượng</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#45474c] w-36">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5eeff] text-sm">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-slate-400">Không có giao dịch nào phù hợp.</td></tr>
              ) : filtered.map((r, i) => (
                <tr
                  key={i}
                  onClick={() => navigate(`/${r.type === 'in' ? 'stock-in' : 'stock-out'}/${r.orderId}`)}
                  className="hover:bg-[#F1F5F9] transition-colors cursor-pointer"
                >
                  <td className="py-3 px-4 text-slate-600">{r.date}</td>
                  <td className="py-3 px-4">
                    {r.type === 'in' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#166534] bg-[#bbf7d0] px-2 py-0.5 rounded">
                        <ArrowDownToLine size={12} /> Nhập
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#9a3412] bg-orange-50 px-2 py-0.5 rounded">
                        <ArrowUpFromLine size={12} /> Xuất
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-medium text-[#0058be]">{r.orderCode}</td>
                  <td className="py-3 px-4 text-slate-500 text-xs">
                    <p>{r.detail}</p>
                    {r.note && <p className="text-slate-400 mt-0.5 truncate max-w-xs">{r.note}</p>}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold">
                    <span className={r.type === 'in' ? 'text-[#166534]' : 'text-[#9a3412]'}>
                      {r.type === 'in' ? '+' : '-'}{r.quantity.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-400 ml-1">{r.unit}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[r.status]}`}>
                      {STATUS_LABEL[r.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
