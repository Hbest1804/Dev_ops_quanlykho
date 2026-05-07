import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Package, Calendar, User, FileText, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { MOCK_IMPORT_ORDERS, type ImportOrder } from '../data/stockInMock';
import { useConfirm } from '../component/useConfirm';

const MOCK_USERS: Record<number, string> = {
  1: 'Nguyễn Văn A',
  2: 'Trần Thị B',
};

const STATUS_MAP = {
  pending:   { label: 'Chờ xử lý', classes: 'bg-orange-100 text-orange-800' },
  confirmed: { label: 'Đã duyệt',  classes: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Đã huỷ',    classes: 'bg-red-100 text-red-800' },
};

export default function StockInDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { confirm, dialog } = useConfirm();
  const [orders, setOrders] = useState<ImportOrder[]>(MOCK_IMPORT_ORDERS);

  const order = orders.find(o => o.id === Number(id));

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-slate-500">Không tìm thấy phiếu nhập.</p>
        <button onClick={() => navigate('/stock-in')} className="text-[#0058be] hover:underline text-sm cursor-pointer">← Quay lại</button>
      </div>
    );
  }

  const totalQty = order.items.reduce((acc, i) => acc + i.quantity, 0);
  const status = STATUS_MAP[order.status];

  const handleConfirm = async () => {
    if (!await confirm({ title: 'Xác nhận phiếu nhập', message: 'Kho hàng sẽ được cập nhật sau khi xác nhận.', confirmLabel: 'Xác nhận', variant: 'primary' })) return;
    setOrders(prev => prev.map(o => o.id === order.id
      ? { ...o, status: 'confirmed', confirmed_by: 1, confirmed_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      : o
    ));
    toast.success('Đã xác nhận phiếu nhập!');
  };

  const handleCancel = async () => {
    if (!await confirm({ title: 'Huỷ phiếu nhập', message: 'Bạn có chắc muốn huỷ phiếu nhập này? Hành động không thể hoàn tác.', confirmLabel: 'Huỷ phiếu', cancelLabel: 'Quay lại', variant: 'danger' })) return;
    setOrders(prev => prev.map(o => o.id === order.id
      ? { ...o, status: 'cancelled', updated_at: new Date().toISOString() }
      : o
    ));
    toast.success('Đã huỷ phiếu nhập');
  };

  return (
    <div className="space-y-6 w-full flex-1 flex flex-col min-h-0">
      {dialog}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/stock-in')} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-[#0b1c30]">{order.code}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${status.classes}`}>
                {status.label}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">Tạo lúc {new Date(order.created_at).toLocaleString('vi-VN')}</p>
          </div>
        </div>

        {order.status === 'pending' && (
          <div className="flex gap-2 shrink-0">
            <button onClick={handleCancel} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 rounded-lg transition-colors cursor-pointer">
              <XCircle size={16} /> Huỷ phiếu
            </button>
            <button onClick={handleConfirm} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0058be] hover:bg-[#2170e4] rounded-lg transition-colors cursor-pointer">
              <CheckCircle size={16} /> Xác nhận
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Thông tin phiếu</h2>
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <User size={16} className="text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Nhà cung cấp</p>
                <p className="text-sm font-medium text-slate-800">{order.supplier}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar size={16} className="text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Ngày nhập hàng</p>
                <p className="text-sm font-medium text-slate-800">{new Date(order.import_date).toLocaleDateString('vi-VN')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Package size={16} className="text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Tổng số lượng</p>
                <p className="text-sm font-medium text-slate-800">{totalQty.toLocaleString()} sản phẩm ({order.items.length} dòng hàng)</p>
              </div>
            </div>
            {order.note && (
              <div className="flex items-start gap-3">
                <FileText size={16} className="text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Ghi chú</p>
                  <p className="text-sm text-slate-700">{order.note}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Xử lý & Thời gian</h2>
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <User size={16} className="text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Người tạo</p>
                <p className="text-sm font-medium text-slate-800">{MOCK_USERS[order.created_by] ?? `User #${order.created_by}`}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock size={16} className="text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Ngày tạo</p>
                <p className="text-sm font-medium text-slate-800">{new Date(order.created_at).toLocaleString('vi-VN')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock size={16} className="text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Cập nhật lần cuối</p>
                <p className="text-sm font-medium text-slate-800">{new Date(order.updated_at).toLocaleString('vi-VN')}</p>
              </div>
            </div>
            {order.confirmed_by && (
              <div className="flex items-start gap-3">
                <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Người xác nhận</p>
                  <p className="text-sm font-medium text-slate-800">{MOCK_USERS[order.confirmed_by] ?? `User #${order.confirmed_by}`}</p>
                </div>
              </div>
            )}
            {order.confirmed_at && (
              <div className="flex items-start gap-3">
                <Clock size={16} className="text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Xác nhận lúc</p>
                  <p className="text-sm font-medium text-slate-800">{new Date(order.confirmed_at).toLocaleString('vi-VN')}</p>
                </div>
              </div>
            )}
            {order.status === 'pending' && (
              <div className="flex items-start gap-3">
                <Clock size={16} className="text-orange-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Trạng thái</p>
                  <p className="text-sm font-medium text-orange-600">Chờ xác nhận</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="px-5 py-4 border-b border-slate-100 shrink-0">
          <h2 className="text-sm font-semibold text-slate-700">Danh sách sản phẩm</h2>
        </div>
        {order.items.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">Không có sản phẩm nào trong phiếu này.</p>
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 w-8">#</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 w-28">Mã SP</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Tên sản phẩm</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 w-32">Danh mục</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 w-20">ĐVT</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right w-28">Số lượng</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {order.items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-medium text-[#0058be]">{item.snapshot_product_code}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{item.snapshot_product_name}</td>
                    <td className="py-3 px-4 text-slate-500">{item.snapshot_category}</td>
                    <td className="py-3 px-4 text-slate-500">{item.snapshot_unit}</td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-800">{item.quantity.toLocaleString()}</td>
                    <td className="py-3 px-4 text-slate-400">{item.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td colSpan={5} className="py-3 px-4 text-sm font-semibold text-slate-600 text-right">Tổng cộng</td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900">{totalQty.toLocaleString()}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
