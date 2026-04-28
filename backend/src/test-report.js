import 'dotenv/config';
import { pool } from './db/Pool.js';
import { ReportService } from './services/ReportService.js';

async function runTest() {
  console.log('--- BẮT ĐẦU TEST BÁO CÁO NHẬP XUẤT TỒN ---');
  let client;

  try {
    client = await pool.connect();

    // 1. Dọn dẹp dữ liệu cũ (nếu có từ các test trước)
    await client.query('DELETE FROM stock_transactions WHERE snapshot_unit = $1', ['UnitReportTest']);
    await client.query('DELETE FROM products WHERE category = $1', ['CatReportTest']);

    // 2. Tạo sản phẩm test
    const prodRes = await client.query(`
      INSERT INTO products (code, name, category, unit, stock) 
      VALUES ('REP_SP01', 'Sản phẩm Báo Cáo', 'CatReportTest', 'Cái', 0) 
      RETURNING id
    `);
    const productId = prodRes.rows[0].id;

    // 3. Tạo các transaction với các mốc thời gian khác nhau
    // Giả định: 
    // Từ ngày = 2026-04-15
    // Đến ngày = 2026-04-20

    // Giao dịch 1: Tồn đầu kỳ (Trước 15/04/2026) -> Nhập 50
    await client.query(`
      INSERT INTO stock_transactions (product_id, type, quantity, stock_after, created_at, snapshot_product_code, snapshot_product_name, snapshot_unit, created_by) 
      VALUES ($1, 'import', 50, 50, '2026-04-10 10:00:00', 'REP_SP01', 'Sản phẩm Báo Cáo', 'UnitReportTest', 1)
    `, [productId]);

    // Giao dịch 2: Phát sinh trong kỳ (Từ 15/04 đến 20/04) -> Nhập thêm 20
    await client.query(`
      INSERT INTO stock_transactions (product_id, type, quantity, stock_after, created_at, snapshot_product_code, snapshot_product_name, snapshot_unit, created_by) 
      VALUES ($1, 'import', 20, 70, '2026-04-16 10:00:00', 'REP_SP01', 'Sản phẩm Báo Cáo', 'UnitReportTest', 1)
    `, [productId]);

    // Giao dịch 3: Phát sinh trong kỳ (Từ 15/04 đến 20/04) -> Xuất 10 (Ghi số âm)
    await client.query(`
      INSERT INTO stock_transactions (product_id, type, quantity, stock_after, created_at, snapshot_product_code, snapshot_product_name, snapshot_unit, created_by) 
      VALUES ($1, 'export', -10, 60, '2026-04-18 10:00:00', 'REP_SP01', 'Sản phẩm Báo Cáo', 'UnitReportTest', 1)
    `, [productId]);

    // Giao dịch 4: Sau kỳ (Sau 20/04) -> Nhập 100 (Không được cộng vào báo cáo)
    await client.query(`
      INSERT INTO stock_transactions (product_id, type, quantity, stock_after, created_at, snapshot_product_code, snapshot_product_name, snapshot_unit, created_by) 
      VALUES ($1, 'import', 100, 160, '2026-04-25 10:00:00', 'REP_SP01', 'Sản phẩm Báo Cáo', 'UnitReportTest', 1)
    `, [productId]);

    client.release();

    // 4. Gọi Service để lấy báo cáo
    console.log('\\n[TEST 1] Lấy báo cáo từ 2026-04-15 đến 2026-04-20 (Lọc theo Category)');
    const reportData = await ReportService.getInventoryReport({
      fromDate: '2026-04-15',
      toDate: '2026-04-20',
      category: 'CatReportTest'
    });

    console.log(reportData);

    if (reportData.length === 1) {
      const data = reportData[0];
      const pass = data.opening_stock === 50 && data.total_import === 20 && data.total_export === 10 && data.closing_stock === 60;
      if (pass) {
        console.log('✅ Kết quả: CHÍNH XÁC!');
        console.log(`Tồn đầu: ${data.opening_stock} | Nhập: ${data.total_import} | Xuất: ${data.total_export} | Tồn cuối: ${data.closing_stock}`);
      } else {
        console.log('❌ LỖI: Số liệu tính toán sai!');
      }
    } else {
      console.log('❌ LỖI: Không tìm thấy dữ liệu báo cáo');
    }

  } catch (err) {
    console.error('Lỗi khi chạy test:', err);
  } finally {
    console.log('\\n--- DỌN DẸP DỮ LIỆU ---');
    await pool.query('DELETE FROM stock_transactions WHERE snapshot_unit = $1', ['UnitReportTest']);
    await pool.query('DELETE FROM products WHERE category = $1', ['CatReportTest']);
    process.exit(0);
  }
}

runTest();
