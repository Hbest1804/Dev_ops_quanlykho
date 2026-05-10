import { ReportRepository } from '../repositories/ReportRepository.js';
import { BadRequest } from '../utils/AppError.js';
import XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function toItemDto(row) {
  const opening = Number(row.opening_stock);
  const imported = Number(row.total_import);
  const exported = Number(row.total_export);
  return {
    productId:    row.product_id,
    productCode:  row.product_code,
    productName:  row.product_name,
    openingStock: opening,
    totalImport:  imported,
    totalExport:  exported,
    closingStock: opening + imported - exported,
  };
}

export const ReportService = {
  async getSummary({ from, to, category, page, limit }) {
    if (!from || !to) throw BadRequest('from and to are required');

    const [rows, total, totals] = await Promise.all([
      ReportRepository.findSummary({ from, to, category, page, limit }),
      ReportRepository.countSummary({ from, to, category }),
      ReportRepository.findTotals({ from, to, category }),
    ]);

    return {
      period: { from, to },
      items: rows.map(toItemDto),
      total,
      totals,
    };
  },

  async getTopProducts({ fromDate, toDate, type }) {
    if (!fromDate || !toDate) {
      throw BadRequest('Vui lòng cung cấp đầy đủ fromDate và toDate');
    }

    if (!type || !['import', 'export'].includes(type)) {
      throw BadRequest('Loại giao dịch (type) phải là "import" hoặc "export"');
    }

    if (new Date(fromDate).toString() === 'Invalid Date' || new Date(toDate).toString() === 'Invalid Date') {
      throw BadRequest('Định dạng ngày tháng không hợp lệ');
    }

    if (fromDate > toDate) {
      throw BadRequest('Ngày bắt đầu không được lớn hơn ngày kết thúc');
    }

    const rows = await ReportRepository.getTopProducts(fromDate, toDate, type);
    return rows;
  },

  async getInventoryReport({ fromDate, toDate, category }) {
    if (!fromDate || !toDate) throw BadRequest('fromDate and toDate are required');
    const allRows = [];
    let page = 1;
    const limit = 5000;
    while (true) {
      const rows = await ReportRepository.findSummary({ from: fromDate, to: toDate, category, page, limit });
      if (rows.length === 0) break;
      allRows.push(...rows);
      if (rows.length < limit) break;
      page++;
    }
    return allRows.map(r => ({
      code: r.product_code,
      name: r.product_name,
      category: r.category,
      unit: r.unit,
      opening_stock: Number(r.opening_stock),
      total_import: Number(r.total_import),
      total_export: Number(r.total_export),
      closing_stock: Number(r.opening_stock) + Number(r.total_import) - Number(r.total_export),
    }));
  },

  async exportInventoryExcel({ fromDate, toDate, category }) {
    const data = await this.getInventoryReport({ fromDate, toDate, category });
    
    const excelData = data.map(r => ({
      'Mã SP': r.code,
      'Tên sản phẩm': r.name,
      'Danh mục': r.category,
      'ĐVT': r.unit,
      'Tồn đầu': r.opening_stock,
      'Tổng nhập': r.total_import,
      'Tổng xuất': r.total_export,
      'Tồn cuối': r.closing_stock
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "InventoryReport");
    
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
  },

  async exportInventoryPDF({ fromDate, toDate, category }) {
    const data = await this.getInventoryReport({ fromDate, toDate, category });
    
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', err => reject(err));

      const fontRegular = path.join(__dirname, '../../assets/fonts/Roboto-Regular.ttf');
      const fontBold = path.join(__dirname, '../../assets/fonts/Roboto-Bold.ttf');

      // Header
      doc.font(fontBold).fontSize(18).text('BÁO CÁO TỔNG HỢP NHẬP XUẤT TỒN', { align: 'center' });
      doc.moveDown();
      doc.font(fontRegular).fontSize(12).text(`Thời gian: ${fromDate} đến ${toDate}`, { align: 'center' });
      if (category) doc.font(fontRegular).text(`Danh mục: ${category}`, { align: 'center' });
      doc.moveDown();

      const colWidths = [60, 150, 80, 50, 50, 50, 50];
      const headers = ['Mã SP', 'Tên sản phẩm', 'ĐVT', 'Đầu', 'Nhập', 'Xuất', 'Cuối'];
      
      const drawHeader = (startY) => {
        let hX = 30;
        doc.fontSize(10).font(fontBold);
        headers.forEach((h, i) => {
          doc.text(h, hX, startY);
          hX += colWidths[i];
        });
        doc.moveTo(30, startY + 15).lineTo(560, startY + 15).stroke();
        return startY + 25;
      };

      let y = drawHeader(150);

      // Rows
      doc.font(fontRegular);
      data.forEach(r => {
        const textOptions = { width: colWidths[1] - 5, lineBreak: true };
        const nameHeight = doc.heightOfString(r.name, textOptions);
        const rowHeight = Math.max(20, nameHeight + 5);

        if (y + rowHeight > 750) {
          doc.addPage();
          y = drawHeader(50);
          doc.font(fontRegular);
        }

        let x = 30;
        doc.text(r.code, x, y);
        x += colWidths[0];
        doc.text(r.name, x, y, textOptions);
        x += colWidths[1];
        doc.text(r.unit, x, y);
        x += colWidths[2];
        doc.text(r.opening_stock.toString(), x, y, { width: colWidths[3], align: 'right' });
        x += colWidths[3];
        doc.text(r.total_import.toString(), x, y, { width: colWidths[4], align: 'right' });
        x += colWidths[4];
        doc.text(r.total_export.toString(), x, y, { width: colWidths[5], align: 'right' });
        x += colWidths[5];
        doc.text(r.closing_stock.toString(), x, y, { width: colWidths[6], align: 'right' });
        
        y += rowHeight;
      });

      doc.end();
    });
  }
};
