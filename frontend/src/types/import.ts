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
