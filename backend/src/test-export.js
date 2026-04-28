import 'dotenv/config';
import { pool } from './db/Pool.js';
import { ExportOrderService } from './services/ExportOrderService.js';

async function runTest() {
  console.log('--- BẮT ĐẦU TEST CHỨC NĂNG XÁC NHẬN PHIẾU XUẤT ---');
  let client;
  let testUserId;
  let testProductId;
  let testOrderIdSuccess;
  let testOrderIdFail;

  try {
    client = await pool.connect();
    
    // 1. Tạo user test
    const userRes = await client.query(`
      INSERT INTO users (name, email, password, role) 
      VALUES ('Test User', 'test.export@example.com', 'password', 'warehouse_staff') 
      RETURNING id
    `);
    testUserId = userRes.rows[0].id;

    // 2. Tạo sản phẩm test (Tồn kho: 10)
    const prodRes = await client.query(`
      INSERT INTO products (code, name, category, unit, stock) 
      VALUES ('TEST_SP01', 'Sản phẩm Test', 'Test', 'Cái', 10) 
      RETURNING id
    `);
    testProductId = prodRes.rows[0].id;

    // 3. Tạo phiếu xuất hợp lệ (Xuất 4 cái -> Còn 6)
    const order1Res = await client.query(`
      INSERT INTO export_orders (code, reason, status, export_date, created_by) 
      VALUES ('PX_TEST_01', 'sale', 'pending', CURRENT_DATE, $1) 
      RETURNING id
    `, [testUserId]);
    testOrderIdSuccess = order1Res.rows[0].id;

    await client.query(`
      INSERT INTO export_order_items (export_order_id, product_id, quantity, snapshot_product_code, snapshot_product_name, snapshot_unit, snapshot_category) 
      VALUES ($1, $2, 4, 'TEST_SP01', 'Sản phẩm Test', 'Cái', 'Test')
    `, [testOrderIdSuccess, testProductId]);

    // 4. Tạo phiếu xuất không hợp lệ (Xuất 10 cái -> Thiếu hàng vì chỉ còn 6)
    const order2Res = await client.query(`
      INSERT INTO export_orders (code, reason, status, export_date, created_by) 
      VALUES ('PX_TEST_02', 'sale', 'pending', CURRENT_DATE, $1) 
      RETURNING id
    `, [testUserId]);
    testOrderIdFail = order2Res.rows[0].id;

    await client.query(`
      INSERT INTO export_order_items (export_order_id, product_id, quantity, snapshot_product_code, snapshot_product_name, snapshot_unit, snapshot_category) 
      VALUES ($1, $2, 10, 'TEST_SP01', 'Sản phẩm Test', 'Cái', 'Test')
    `, [testOrderIdFail, testProductId]);

    client.release(); // Nhả connection để service xài
    
    // --- BẮT ĐẦU CHẠY LOGIC SERVICE ---
    
    console.log('\n[TEST 1] Xác nhận phiếu xuất ĐỦ HÀNG (PX_TEST_01 - Xuất 4/10)');
    const successResult = await ExportOrderService.confirmExportOrder(testOrderIdSuccess, testUserId);
    console.log('✅ Kết quả: Thành công! Phiếu đã chuyển sang trạng thái:', successResult.status);

    // Kiểm tra lại tồn kho
    const checkStock = await pool.query('SELECT stock FROM products WHERE id = $1', [testProductId]);
    console.log('📦 Tồn kho sau Test 1 (Mong đợi: 6, Thực tế: ' + checkStock.rows[0].stock + ')');

    console.log('\n[TEST 2] Xác nhận phiếu xuất THIẾU HÀNG (PX_TEST_02 - Xuất 10 nhưng chỉ còn 6)');
    try {
      await ExportOrderService.confirmExportOrder(testOrderIdFail, testUserId);
      console.log('❌ LỖI: Test này đáng lẽ phải văng lỗi nhưng lại thành công!');
    } catch (err) {
      console.log('✅ Kết quả: Đã chặn thành công với thông báo lỗi:');
      console.log('   "' + err.message + '"');
    }

    // Kiểm tra lại tồn kho để chắc chắn không bị trừ sai
    const finalStock = await pool.query('SELECT stock FROM products WHERE id = $1', [testProductId]);
    console.log('📦 Tồn kho sau Test 2 (Mong đợi không đổi: 6, Thực tế: ' + finalStock.rows[0].stock + ')');

    // Kiểm tra log giao dịch
    const logs = await pool.query('SELECT * FROM stock_transactions WHERE ref_id = $1', [testOrderIdSuccess]);
    console.log('\n[TEST 3] Kiểm tra Log ghi nhận vào bảng stock_transactions:');
    if (logs.rows.length === 1 && logs.rows[0].quantity === -4) {
      console.log('✅ Kết quả: Đã ghi log chính xác (Số lượng thay đổi: ' + logs.rows[0].quantity + ', Tồn sau: ' + logs.rows[0].stock_after + ')');
    } else {
      console.log('❌ LỖI: Ghi log không chính xác');
    }

  } catch (err) {
    console.error('Lỗi khi chạy test:', err);
  } finally {
    console.log('\n--- KẾT THÚC TEST, DỌN DẸP DỮ LIỆU ---');
    // Dọn dẹp data test
    if (testUserId) {
      await pool.query('DELETE FROM users WHERE email = $1', ['test.export@example.com']); // CASCADE sẽ tự xóa orders và items
      await pool.query('DELETE FROM products WHERE code = $1', ['TEST_SP01']);
    }
    process.exit(0);
  }
}

runTest();
