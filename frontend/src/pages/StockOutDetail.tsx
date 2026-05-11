import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Package, Calendar, User, FileText, Clock, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import { getReasonLabel } from '../constants/reasons';
import type { ExportOrderDetail } from '../types/export';
import { useConfirm } from '../component/useConfirm';
import api from '../lib/api';

const API_ERROR_MAP: Record<string, string> = {
  'Export order not found': 'Không tìm thấy phiếu xuất',
  'Order is not in pending status': 'Phiếu không ở trạng thái chờ xác nhận',
  'Insufficient stock at confirmation time': 'Tồn kho không đủ tại thời điểm xác nhận',
  'Export order has no items': 'Phiếu xuất không có sản phẩm nào',
  'Product not found or deleted': 'Sản phẩm không tồn tại hoặc đã bị xóa',
};

function translateError(msg: string): string {
  return API_ERROR_MAP[msg] ?? msg;
}

const STATUS_MAP = {
  pending:   { label: 'Chờ xử lý', classes: 'bg-orange-100 text-orange-800' },
  confirmed: { label: 'Đã duyệt',  classes: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Đã huỷ',    classes: 'bg-red-100 text-red-800' },
};

const REASON_BADGE: Record<string, string> = {
  sale:     'bg-blue-50 text-blue-700',
  internal: 'bg-purple-50 text-purple-700',
  damaged:  'bg-orange-50 text-orange-700',
};

export default function StockOutDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { confirm, dialog } = useConfirm();
  const [order, setOrder] = useState<ExportOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.get(`/export-orders/${id}`)
      .then(({ data }) => setOrder(data.data))
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleConfirm = async () => {
    if (!order) return;
    if (!await confirm({ title: 'Xác nhận phiếu xuất', message: 'Tồn kho sẽ được cập nhật sau khi xác nhận.', confirmLabel: 'Xác nhận', variant: 'primary' })) return;
    try {
      await api.put(`/export-orders/${order.id}/confirm`);
      const { data } = await api.get(`/export-orders/${order.id}`);
      setOrder(data.data);
      toast.success('Đã xác nhận phiếu xuất!');
    } catch (err: any) {
      const msg = err.response?.data?.message ?? 'Không thể xác nhận phiếu xuất';
      toast.error(translateError(msg));
    }
  };

  const handleCancel = async () => {
    if (!order) return;
    if (!await confirm({ title: 'Huỷ phiếu xuất', message: 'Bạn có chắc muốn huỷ phiếu xuất này? Hành động không thể hoàn tác.', confirmLabel: 'Huỷ phiếu', cancelLabel: 'Quay lại', variant: 'danger' })) return;
    try {
      await api.post(`/export-orders/${order.id}/cancel`);
      const { data } = await api.get(`/export-orders/${order.id}`);
      setOrder(data.data);
      toast.success('Đã huỷ phiếu xuất');
    } catch (err: any) {
      const msg = err.response?.data?.message ?? 'Không thể huỷ phiếu xuất';
      toast.error(translateError(msg));
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Đang tải...</div>;
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-slate-500">Không tìm thấy phiếu xuất.</p>
        <button onClick={() => navigate('/stock-out')} className="text-[#0058be] hover:underline text-sm cursor-pointer">← Quay lại</button>
      </div>
    );
  }

  const totalQty = order.items.reduce((acc, i) => acc + i.quantity, 0);
  const status = STATUS_MAP[order.status];

  return (
    <div className="space-y-6 w-full flex-1 flex flex-col min-h-0">
      {dialog}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/stock-out')} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-[#0b1c30]">{order.code}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${status.classes}`}>
                {status.label}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">Tạo lúc {new Date(order.createdAt).toLocaleString('vi-VN')}</p>
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

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Thông tin phiếu</h2>
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <Tag size={16} className="text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Lý do xuất</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-0.5 ${REASON_BADGE[order.reason] ?? 'bg-slate-100 text-slate-600'}`}>
                  {getReasonLabel(order.reason)}
                </span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar size={16} className="text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Ngày xuất hàng</p>
                <p className="text-sm font-medium text-slate-800">{new Date(order.exportDate).toLocaleDateString('vi-VN')}</p>
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
            {order.createdBy && (
              <div className="flex items-start gap-3">
                <User size={16} className="text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Người tạo</p>
                  <p className="text-sm font-medium text-slate-800">{order.createdBy}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <Clock size={16} className="text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Ngày tạo</p>
                <p className="text-sm font-medium text-slate-800">{new Date(order.createdAt).toLocaleString('vi-VN')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock size={16} className="text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Cập nhật lần cuối</p>
                <p className="text-sm font-medium text-slate-800">{new Date(order.updatedAt).toLocaleString('vi-VN')}</p>
              </div>
            </div>
            {order.confirmedBy && (
              <div className="flex items-start gap-3">
                <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Người xác nhận</p>
                  <p className="text-sm font-medium text-slate-800">{order.confirmedBy}</p>
                </div>
              </div>
            )}
            {order.confirmedAt && (
              <div className="flex items-start gap-3">
                <Clock size={16} className="text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Xác nhận lúc</p>
                  <p className="text-sm font-medium text-slate-800">{new Date(order.confirmedAt).toLocaleString('vi-VN')}</p>
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

      {/* Items table */}
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
                  <tr key={item.productId} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-medium text-[#0058be]">{item.productCode}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{item.productName}</td>
                    <td className="py-3 px-4 text-slate-500">{item.category}</td>
                    <td className="py-3 px-4 text-slate-500">{item.unit}</td>
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
