export type ExportOrderDetailItem = {
  productId: number;
  productCode: string;
  productName: string;
  quantity: number;
  unit: string;
  category: string;
  note: string | null;
};

export type ExportOrderDetail = {
  id: number;
  code: string;
  reason: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  exportDate: string;
  note: string | null;
  createdBy: string | null;
  confirmedBy: string | null;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: ExportOrderDetailItem[];
};

export type ExportOrderListItem = {
  id: number;
  code: string;
  reason: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  exportDate: string;
  createdBy: string | null;
  totalQuantity: number;
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

export type ExportOrderItem = {
  id: number;
  export_order_id: number;
  product_id: number;
  quantity: number;
  note: string;
  snapshot_product_code: string;
  snapshot_product_name: string;
  snapshot_unit: string;
  snapshot_category: string;
};
