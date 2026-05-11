export type MockProduct = {
  id: number;
  code: string;
  name: string;
  unit: string;
  category: string;
};

export const MOCK_PRODUCTS: MockProduct[] = [
  { id: 1, code: 'PR-1001', name: 'Kệ Pallet Công nghiệp', unit: 'Cái', category: 'Thiết bị công nghiệp' },
  { id: 2, code: 'FB-4800', name: 'Bình điện Xe nâng 48V', unit: 'Cái', category: 'Thiết bị điện' },
  { id: 3, code: 'SW-500', name: 'Cuộn màng PE', unit: 'Cuộn', category: 'Đóng gói' },
  { id: 4, code: 'CB-200', name: 'Băng tải con lăn', unit: 'Bộ', category: 'Thiết bị công nghiệp' },
  { id: 5, code: 'GL-300', name: 'Găng tay bảo hộ', unit: 'Đôi', category: 'Bảo hộ lao động' },
  { id: 6, code: 'HL-110', name: 'Mũ bảo hộ', unit: 'Cái', category: 'Bảo hộ lao động' },
];

export type ImportOrderItem = {
  id: number;
  import_order_id: number;
  product_id: number;
  quantity: number;
  note: string;
  snapshot_product_code: string;
  snapshot_product_name: string;
  snapshot_unit: string;
  snapshot_category: string;
};

export type ImportOrder = {
  id: number;
  code: string;
  supplier: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  import_date: string;
  note: string;
  created_by: number;
  confirmed_by: number | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
  items: ImportOrderItem[];
};

export const MOCK_IMPORT_ORDERS: ImportOrder[] = [
  {
    id: 1,
    code: 'PN001',
    supplier: 'Nhà cung cấp Toàn Cầu',
    status: 'pending',
    import_date: '2024-04-25',
    note: 'Lô hàng Q2 2024, giao trong giờ hành chính',
    created_by: 1,
    confirmed_by: null,
    confirmed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items: [
      { id: 1, import_order_id: 1, product_id: 1, quantity: 800, note: '', snapshot_product_code: 'PR-1001', snapshot_product_name: 'Kệ Pallet Công nghiệp', snapshot_unit: 'Cái', snapshot_category: 'Thiết bị công nghiệp' },
      { id: 2, import_order_id: 1, product_id: 2, quantity: 450, note: 'Kiểm tra kỹ trước khi nhập', snapshot_product_code: 'FB-4800', snapshot_product_name: 'Bình điện Xe nâng 48V', snapshot_unit: 'Cái', snapshot_category: 'Thiết bị điện' },
    ],
  },
  {
    id: 2,
    code: 'PN002',
    supplier: 'Công ty Thương Mại Thái Bình',
    status: 'confirmed',
    import_date: '2024-04-24',
    note: '',
    created_by: 1,
    confirmed_by: 2,
    confirmed_at: new Date(Date.now() - 3600000).toISOString(),
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
    items: [
      { id: 3, import_order_id: 2, product_id: 3, quantity: 845, note: '', snapshot_product_code: 'SW-500', snapshot_product_name: 'Cuộn màng PE', snapshot_unit: 'Cuộn', snapshot_category: 'Đóng gói' },
    ],
  },
  {
    id: 3,
    code: 'PN003',
    supplier: 'Vật tư Phương Bắc',
    status: 'confirmed',
    import_date: '2024-04-23',
    note: 'Giao 2 đợt',
    created_by: 1,
    confirmed_by: 1,
    confirmed_at: new Date(Date.now() - 90000000).toISOString(),
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 90000000).toISOString(),
    items: [
      { id: 4, import_order_id: 3, product_id: 4, quantity: 1200, note: '', snapshot_product_code: 'CB-200', snapshot_product_name: 'Băng tải con lăn', snapshot_unit: 'Bộ', snapshot_category: 'Thiết bị công nghiệp' },
      { id: 5, import_order_id: 3, product_id: 1, quantity: 900, note: 'Đợt 2', snapshot_product_code: 'PR-1001', snapshot_product_name: 'Kệ Pallet Công nghiệp', snapshot_unit: 'Cái', snapshot_category: 'Thiết bị công nghiệp' },
    ],
  },
  {
    id: 4,
    code: 'PN004',
    supplier: 'Sản xuất Đỉnh Cao',
    status: 'cancelled',
    import_date: '2024-04-22',
    note: 'Huỷ do nhà cung cấp không giao đúng hạn',
    created_by: 1,
    confirmed_by: null,
    confirmed_at: null,
    created_at: new Date(Date.now() - 259200000).toISOString(),
    updated_at: new Date(Date.now() - 200000000).toISOString(),
    items: [],
  },
];
