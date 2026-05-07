import { ImportOrderService } from '../services/ImportOrderService.js';

// ─── DTO helpers ─────────────────────────────────────────────────────────────

function toListItem(o) {
  return {
    id:         o.id,
    code:       o.code,
    supplier:   o.supplier,
    status:     o.status,
    importDate: o.import_date,
    createdBy:  o.creator_name ?? `User #${o.created_by}`,
    createdAt:  o.created_at,
  };
}

function toDetailDto(o) {
  return {
    id:          o.id,
    code:        o.code,
    supplier:    o.supplier,
    status:      o.status,
    importDate:  o.import_date,
    note:        o.note,
    createdBy:   o.creator_name ?? `User #${o.created_by}`,
    createdAt:   o.created_at,
    confirmedBy: o.confirmed_by,
    confirmedAt: o.confirmed_at,
    updatedAt:   o.updated_at,
    items: (o.items ?? []).map(item => ({
      productId:   item.product_id,
      productName: item.snapshot_product_name,
      productCode: item.snapshot_product_code,
      quantity:    item.quantity,
      unit:        item.snapshot_unit,
      category:    item.snapshot_category,
      note:        item.note,
    })),
  };
}

// ─── Controller ──────────────────────────────────────────────────────────────

export const ImportOrderController = {

  async list(req, res, next) {
    try {
      const { status, search, from, to, page, limit } = req.query;
      const result = await ImportOrderService.findAll({
        status, search,
        from_date: from,
        to_date:   to,
        page:  Math.max(1, parseInt(page,  10) || 1),
        limit: Math.max(1, parseInt(limit, 10) || 20),
      });
      res.json({
        success: true,
        data: {
          items: result.data.map(toListItem),
          total: result.pagination.total,
          page:  result.pagination.page,
        },
        statusCounts: result.statusCounts,
      });
    } catch (err) { next(err); }
  },

  async getById(req, res, next) {
    try {
      const order = await ImportOrderService.findById(Number(req.params.id));
      res.json({ success: true, data: toDetailDto(order) });
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const { supplier, importDate, note, items } = req.body;
      const order = await ImportOrderService.create(
        {
          supplier,
          import_date: importDate,
          note,
          items: items?.map(item => ({
            product_id: item.productId,
            quantity:   item.quantity,
            note:       item.note ?? null,
          })),
        },
        req.user.sub,
      );
      res.status(201).json({
        success: true,
        data: { id: order.id, code: order.code, status: order.status, supplier: order.supplier },
      });
    } catch (err) { next(err); }
  },

  async confirm(req, res, next) {
    try {
      const order = await ImportOrderService.confirm(Number(req.params.id), req.user.sub);
      res.json({ success: true, message: 'Import order confirmed', data: { id: order.id, status: order.status } });
    } catch (err) { next(err); }
  },

  async cancel(req, res, next) {
    try {
      const order = await ImportOrderService.cancel(Number(req.params.id));
      res.json({ success: true, message: 'Import order cancelled', data: { id: order.id, status: order.status } });
    } catch (err) { next(err); }
  },
};
