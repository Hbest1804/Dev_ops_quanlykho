import 'dotenv/config';
import { pool } from './db/Pool.js';
import { ReportService } from './services/ReportService.js';

async function runTest() {
  console.log('--- BAT DAU TEST TOP SAN PHAM (US-18) ---');
  let client;
  const testProductIds = [];

  try {
    client = await pool.connect();

    // 1. Tao 3 san pham test
    for (let i = 1; i <= 3; i++) {
      const res = await client.query(`
        INSERT INTO products (code, name, category, unit, stock) 
        VALUES ($1, $2, 'TopTest', 'Cai', 0) RETURNING id
      `, [`TOP_SP0${i}`, `San Pham Top ${i}`]);
      testProductIds.push(res.rows[0].id);
    }

    // 2. Tao cac giao dich nhap kho voi so luong khac nhau trong ky (15/04 - 20/04)
    // SP1: Nhap 100
    await client.query(`
      INSERT INTO stock_transactions (product_id, type, quantity, stock_after, created_at, snapshot_product_code, snapshot_product_name, snapshot_unit, created_by) 
      VALUES ($1, 'import', 100, 100, '2026-04-16 10:00:00', 'TOP_SP01', 'San Pham Top 1', 'Cai', 1)
    `, [testProductIds[0]]);

    // SP2: Nhap 50
    await client.query(`
      INSERT INTO stock_transactions (product_id, type, quantity, stock_after, created_at, snapshot_product_code, snapshot_product_name, snapshot_unit, created_by) 
      VALUES ($1, 'import', 50, 50, '2026-04-17 10:00:00', 'TOP_SP02', 'San Pham Top 2', 'Cai', 1)
    `, [testProductIds[1]]);

    // SP3: Nhap 200
    await client.query(`
      INSERT INTO stock_transactions (product_id, type, quantity, stock_after, created_at, snapshot_product_code, snapshot_product_name, snapshot_unit, created_by) 
      VALUES ($1, 'import', 200, 200, '2026-04-18 10:00:00', 'TOP_SP03', 'San Pham Top 3', 'Cai', 1)
    `, [testProductIds[2]]);

    // SP1: Xuat 30
    await client.query(`
      INSERT INTO stock_transactions (product_id, type, quantity, stock_after, created_at, snapshot_product_code, snapshot_product_name, snapshot_unit, created_by) 
      VALUES ($1, 'export', -30, 70, '2026-04-19 10:00:00', 'TOP_SP01', 'San Pham Top 1', 'Cai', 1)
    `, [testProductIds[0]]);

    // SP3: Xuat 80
    await client.query(`
      INSERT INTO stock_transactions (product_id, type, quantity, stock_after, created_at, snapshot_product_code, snapshot_product_name, snapshot_unit, created_by) 
      VALUES ($1, 'export', -80, 120, '2026-04-19 14:00:00', 'TOP_SP03', 'San Pham Top 3', 'Cai', 1)
    `, [testProductIds[2]]);

    client.release();

    // --- TEST 1: Top san pham NHAP ---
    console.log('\n[TEST 1] Top san pham NHAP tu 2026-04-15 den 2026-04-20');
    const importResult = await ReportService.getTopProducts({
      fromDate: '2026-04-15', toDate: '2026-04-20', type: 'import'
    });
    console.log(importResult);

    // Thu tu mong doi: SP3(200) > SP1(100) > SP2(50)
    if (importResult.length === 3 && importResult[0].code === 'TOP_SP03' && importResult[0].total_quantity === 200) {
      console.log('✅ TEST 1 PASS: Thu tu sap xep GIAM DAN chinh xac!');
    } else {
      console.log('❌ TEST 1 FAIL: Thu tu khong dung');
    }

    // --- TEST 2: Top san pham XUAT ---
    console.log('\n[TEST 2] Top san pham XUAT tu 2026-04-15 den 2026-04-20');
    const exportResult = await ReportService.getTopProducts({
      fromDate: '2026-04-15', toDate: '2026-04-20', type: 'export'
    });
    console.log(exportResult);

    // Thu tu mong doi: SP3(80) > SP1(30), SP2 khong co xuat
    if (exportResult.length === 2 && exportResult[0].code === 'TOP_SP03' && exportResult[0].total_quantity === 80) {
      console.log('✅ TEST 2 PASS: Thu tu sap xep GIAM DAN chinh xac!');
    } else {
      console.log('❌ TEST 2 FAIL: Thu tu khong dung');
    }

    // --- TEST 3: Validate type sai ---
    console.log('\n[TEST 3] Truyen type = "abc" (sai)');
    try {
      await ReportService.getTopProducts({ fromDate: '2026-04-15', toDate: '2026-04-20', type: 'abc' });
      console.log('❌ TEST 3 FAIL: Dang le phai bao loi');
    } catch (err) {
      console.log('✅ TEST 3 PASS: Da chan loi - "' + err.message + '"');
    }

  } catch (err) {
    console.error('Loi khi chay test:', err);
  } finally {
    console.log('\n--- DON DEP DU LIEU ---');
    await pool.query('DELETE FROM stock_transactions WHERE snapshot_product_code LIKE $1', ['TOP_SP0%']);
    await pool.query('DELETE FROM products WHERE category = $1', ['TopTest']);
    process.exit(0);
  }
}

runTest();
