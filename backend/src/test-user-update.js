import 'dotenv/config';
import { pool } from './db/Pool.js';
import { UserService } from './services/UserService.js';

async function runTest() {
  console.log('--- BAT DAU TEST SUA NGUOI DUNG (US-21) ---');
  let testUserId;

  try {
    // 1. Tao user test
    const user = await UserService.create({
      name: 'User Test Update',
      email: 'test_update@example.com',
      password: 'password123',
      role: 'warehouse_staff'
    });
    testUserId = user.id;
    console.log('1. Da tao user test, ID:', testUserId);

    // 2. Cap nhat ten va vai tro
    const updated = await UserService.update(testUserId, {
      name: 'User Da Sua Ten',
      role: 'accountant',
      status: 'disabled'
    });
    
    if (updated.name === 'User Da Sua Ten' && updated.role === 'accountant' && updated.status === 'disabled') {
      console.log('2. ✅ Cap nhat thong tin co ban thanh cong');
    } else {
      console.log('2. ❌ Cap nhat thong tin that bai', updated);
    }

    // 3. Test doi mat khau (bang cach thu lay lai user va xem mat khau trong DB co doi ko)
    // Vi Service ko tra ve password, ta phai query truc tiep vao pool
    const { rows: [userInDbBefore] } = await pool.query('SELECT password FROM users WHERE id = $1', [testUserId]);
    const oldHash = userInDbBefore.password;

    await UserService.update(testUserId, { password: 'new_password_456' });
    
    const { rows: [userInDbAfter] } = await pool.query('SELECT password FROM users WHERE id = $1', [testUserId]);
    const newHash = userInDbAfter.password;

    if (oldHash !== newHash) {
      console.log('3. ✅ Doi mat khau thanh cong (Hash da thay doi)');
    } else {
      console.log('3. ❌ Doi mat khau that bai (Hash khong doi)');
    }

    // 4. Test trung email (Dung email cua admin mac dinh)
    console.log('4. Thu cap nhat email trung voi admin (a@a.a)');
    try {
      await UserService.update(testUserId, { email: 'a@a.a' });
      console.log('4. ❌ FAIL: Dang le phai bao loi Conflict');
    } catch (err) {
      console.log('4. ✅ PASS: Da chan trung email - "' + err.message + '"');
    }

  } catch (err) {
    console.error('Loi khi chay test:', err);
  } finally {
    console.log('\n--- DON DEP DU LIEU ---');
    if (testUserId) {
      await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
      console.log('Da xoa user test ID:', testUserId);
    }
    process.exit(0);
  }
}

runTest();
