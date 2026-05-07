export type ExportOrderItem = {
  id: number;
  export_order_id: number;
  product_id: number;
  quantity: number;
  note: string | null;
  snapshot_product_code: string;
  snapshot_product_name: string;
  snapshot_unit: string;
  snapshot_category: string;
};

export type ExportOrder = {
  id: number;
  code: string;
  reason: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  export_date: string;
  note: string | null;
  created_by: number;
  confirmed_by: number | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
  items: ExportOrderItem[];
};

export const REASON_LABELS: Record<string, string> = {
  sale: 'Bán hàng',
  internal: 'Sử dụng nội bộ',
  damaged: 'Hàng hỏng',
};

export const DEFAULT_REASON_OPTIONS = ['Bán hàng', 'Sử dụng nội bộ', 'Hàng hỏng'];

export const REASON_VALUES: Record<string, string> = {
  'Bán hàng': 'sale',
  'Sử dụng nội bộ': 'internal',
  'Hàng hỏng': 'damaged',
};

export const getReasonLabel = (reason: string) => REASON_LABELS[reason] ?? reason;

export const MOCK_EXPORT_ORDERS: ExportOrder[] = [
  {
    id: 1,
    code: 'PX001',
    reason: 'sale',
    status: 'confirmed',
    export_date: '2024-04-25',
    note: 'Giao hàng cho khách Nguyễn Văn A',
    created_by: 1,
    confirmed_by: 2,
    confirmed_at: new Date(Date.now() - 3600000).toISOString(),
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
    items: [
      { id: 1, export_order_id: 1, product_id: 1, quantity: 50, note: '', snapshot_product_code: 'PR-1001', snapshot_product_name: 'Kệ Pallet Công nghiệp', snapshot_unit: 'Cái', snapshot_category: 'Thiết bị công nghiệp' },
      { id: 2, export_order_id: 1, product_id: 3, quantity: 200, note: '', snapshot_product_code: 'SW-500', snapshot_product_name: 'Cuộn màng PE', snapshot_unit: 'Cuộn', snapshot_category: 'Đóng gói' },
    ],
  },
  {
    id: 2,
    code: 'PX002',
    reason: 'internal',
    status: 'pending',
    export_date: '2024-04-26',
    note: 'Xuất cho bộ phận sản xuất tầng 2',
    created_by: 1,
    confirmed_by: null,
    confirmed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items: [
      { id: 3, export_order_id: 2, product_id: 5, quantity: 20, note: '', snapshot_product_code: 'GL-300', snapshot_product_name: 'Găng tay bảo hộ', snapshot_unit: 'Đôi', snapshot_category: 'Bảo hộ lao động' },
      { id: 4, export_order_id: 2, product_id: 6, quantity: 10, note: '', snapshot_product_code: 'HL-110', snapshot_product_name: 'Mũ bảo hộ', snapshot_unit: 'Cái', snapshot_category: 'Bảo hộ lao động' },
    ],
  },
  {
    id: 3,
    code: 'PX003',
    reason: 'damaged',
    status: 'confirmed',
    export_date: '2024-04-23',
    note: 'Hàng bị hư hỏng trong quá trình vận chuyển',
    created_by: 2,
    confirmed_by: 1,
    confirmed_at: new Date(Date.now() - 90000000).toISOString(),
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 90000000).toISOString(),
    items: [
      { id: 5, export_order_id: 3, product_id: 2, quantity: 5, note: 'Hỏng do va đập', snapshot_product_code: 'FB-4800', snapshot_product_name: 'Bình điện Xe nâng 48V', snapshot_unit: 'Cái', snapshot_category: 'Thiết bị điện' },
    ],
  },
  {
    id: 4,
    code: 'PX004',
    reason: 'sale',
    status: 'cancelled',
    export_date: '2024-04-22',
    note: 'Khách huỷ đơn hàng',
    created_by: 1,
    confirmed_by: null,
    confirmed_at: null,
    created_at: new Date(Date.now() - 259200000).toISOString(),
    updated_at: new Date(Date.now() - 200000000).toISOString(),
    items: [],
  },
];
