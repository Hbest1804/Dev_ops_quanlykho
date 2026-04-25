import { ArrowDownToLine, ArrowUpToLine, Download, Package, Table, TrendingDown, TrendingUp, AlertTriangle, MoreHorizontal } from 'lucide-react';
import { exportToExcel, exportToPDF } from '../lib/export';

export default function Dashboard() {

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-[#0b1c30]">Tổng quan</h1>
                    <p className="text-sm text-[#45474c] mt-1">Chỉ số thống kê kho hàng theo thời gian thực.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={exportToPDF} className="flex items-center gap-2 border border-[#c5c6cd] bg-white px-4 py-2 rounded text-sm font-medium text-[#0b1c30] hover:bg-gray-50 transition-colors">
                        <Download size={16} /> Xuất PDF
                    </button>
                    <button onClick={() => exportToExcel} className="flex items-center gap-2 border border-[#c5c6cd] bg-white px-4 py-2 rounded text-sm font-medium text-[#0b1c30] hover:bg-gray-50 transition-colors">
                        <Table size={16} /> Xuất Excel
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Products */}
                <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <p className="text-xs font-medium text-slate-500 mb-1">Tổng sản phẩm</p>
                            <h3 className="text-2xl font-semibold text-slate-900">12,485</h3>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#0058be]">
                            <Package size={20} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <TrendingUp size={16} className="text-[#00a472]" />
                        <span className="text-[#00a472] font-medium">+2.4%</span>
                        <span className="text-slate-500">so với tháng trước</span>
                    </div>
                </div>

                {/* Stock-In Today */}
                <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <p className="text-xs font-medium text-slate-500 mb-1">Nhập kho hôm nay</p>
                            <h3 className="text-2xl font-semibold text-slate-900">1,240</h3>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#0058be]">
                            <ArrowDownToLine size={20} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <TrendingUp size={16} className="text-[#00a472]" />
                        <span className="text-[#00a472] font-medium">+14%</span>
                        <span className="text-slate-500">so với hôm qua</span>
                    </div>
                </div>

                {/* Stock-Out Today */}
                <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <p className="text-xs font-medium text-slate-500 mb-1">Xuất kho hôm nay</p>
                            <h3 className="text-2xl font-semibold text-slate-900">856</h3>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#0058be]">
                            <ArrowUpToLine size={20} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <TrendingDown size={16} className="text-red-600" />
                        <span className="text-red-600 font-medium">-5.2%</span>
                        <span className="text-slate-500">so với hôm qua</span>
                    </div>
                </div>

                {/* Alerts */}
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
                        <button className="text-[#0058be] font-medium hover:underline">Xem tất cả</button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col min-h-[400px]">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="text-lg font-semibold text-slate-900">Xu hướng Nhập / Xuất</h3>
                        <select className="text-sm border border-slate-200 bg-white rounded px-3 py-1 outline-none text-slate-600">
                            <option>7 Ngày qua</option>
                            <option>30 Ngày qua</option>
                        </select>
                    </div>
                    <div className="p-5 flex-1 relative flex flex-col pt-10">
                        <div className="absolute top-0 right-5 flex gap-4 text-xs font-medium mt-3">
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#0058be]"></div>Nhập</div>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#00a472]"></div>Xuất</div>
                        </div>

                        <div className="absolute inset-x-5 top-10 bottom-8 flex flex-col justify-between pointer-events-none">
                            {[0, 1, 2, 3, 4].map(i => (
                                <div key={i} className="w-full h-px bg-slate-100"></div>
                            ))}
                        </div>

                        <div className="flex-1 flex items-end justify-around pb-6 px-4 relative z-10 mt-6 pt-4 h-48">
                            {[
                                { i: 60, e: 40 },
                                { i: 80, e: 45 },
                                { i: 50, e: 65 },
                                { i: 90, e: 30 },
                                { i: 70, e: 80 },
                                { i: 40, e: 55 },
                                { i: 85, e: 70 },
                            ].map((d, idx) => (
                                <div key={idx} className="flex gap-1.5 w-full justify-center h-full items-end group relative">
                                    <div className="w-4 sm:w-6 bg-[#0058be] rounded-t transition-all hover:opacity-80" style={{ height: `${d.i}%` }}></div>
                                    <div className="w-4 sm:w-6 bg-[#00a472] rounded-t transition-all hover:opacity-80" style={{ height: `${d.e}%` }}></div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-around text-xs text-slate-500 font-medium px-4 mt-2">
                            <span className="w-full text-center">T2</span>
                            <span className="w-full text-center">T3</span>
                            <span className="w-full text-center">T4</span>
                            <span className="w-full text-center">T5</span>
                            <span className="w-full text-center">T6</span>
                            <span className="w-full text-center">T7</span>
                            <span className="w-full text-center">CN</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-slate-900">Sản phẩm xuất nhiều</h3>
                        <button className="text-slate-400 hover:text-slate-600 transition-colors"><MoreHorizontal size={20} /></button>
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
                        <button className="text-sm font-medium text-[#0058be] hover:underline w-full py-1">Xem chi tiết</button>
                    </div>
                </div>
            </div>
        </div>
    )
}