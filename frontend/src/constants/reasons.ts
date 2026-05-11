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
