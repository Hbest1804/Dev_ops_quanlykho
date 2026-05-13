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
