import { connectDb, sql } from './config/database.js';

async function createTestAccounts() {
  try {
    const pool = await connectDb();
    
    // Kiểm tra xem tài khoản test đã tồn tại chưa
    const checkAdmin = await pool.request()
      .input('email', sql.VarChar, 'admin@test.com')
      .query('SELECT id FROM NguoiDung WHERE email = @email');
    
    if (checkAdmin.recordset.length === 0) {
      // Tạo admin
      await pool.request()
        .input('ho_ten', sql.NVarChar, 'Admin Test')
        .input('email', sql.VarChar, 'admin@test.com')
        .input('mat_khau', sql.VarChar, '123456')
        .input('role', sql.VarChar, 'ADMIN')
        .input('ma_so', sql.VarChar, 'ADMIN001')
        .query(`
          INSERT INTO NguoiDung (ho_ten, email, mat_khau, role, ma_so)
          VALUES (@ho_ten, @email, @mat_khau, @role, @ma_so)
        `);
      console.log('✅ Tạo admin test: admin@test.com / 123456');
    } else {
      console.log('⚠️ Admin test đã tồn tại');
    }

    // Kiểm tra lecturer
    const checkLecturer = await pool.request()
      .input('email', sql.VarChar, 'lecturer@test.com')
      .query('SELECT id FROM NguoiDung WHERE email = @email');
    
    if (checkLecturer.recordset.length === 0) {
      await pool.request()
        .input('ho_ten', sql.NVarChar, 'Ths. Nguyễn Văn A')
        .input('email', sql.VarChar, 'lecturer@test.com')
        .input('password', sql.VarChar, '123456')
        .input('role', sql.VarChar, 'LECTURER')
        .input('ma_so', sql.VarChar, 'GV001')
        .query(`
          INSERT INTO NguoiDung (ho_ten, email, mat_khau, role, ma_so)
          VALUES (@ho_ten, @email, @password, @role, @ma_so)
        `);
      console.log('✅ Tạo giảng viên test: lecturer@test.com / 123456');
    } else {
      console.log('⚠️ Giảng viên test đã tồn tại');
    }

    // Kiểm tra student
    const checkStudent = await pool.request()
      .input('email', sql.VarChar, 'student@test.com')
      .query('SELECT id FROM NguoiDung WHERE email = @email');
    
    if (checkStudent.recordset.length === 0) {
      await pool.request()
        .input('ho_ten', sql.NVarChar, 'Nguyễn Văn Sinh Viên')
        .input('email', sql.VarChar, 'student@test.com')
        .input('password', sql.VarChar, '123456')
        .input('role', sql.VarChar, 'STUDENT')
        .input('ma_so', sql.VarChar, 'SV001')
        .query(`
          INSERT INTO NguoiDung (ho_ten, email, mat_khau, role, ma_so)
          VALUES (@ho_ten, @email, @password, @role, @ma_so)
        `);
      console.log('✅ Tạo sinh viên test: student@test.com / 123456');
    } else {
      console.log('⚠️ Sinh viên test đã tồn tại');
    }

    console.log('\n📋 Các tài khoản test:');
    console.log('- Admin: admin@test.com / 123456');
    console.log('- Lecturer: lecturer@test.com / 123456');
    console.log('- Student: student@test.com / 123456');

    process.exit(0);
  } catch(e) {
    console.error('❌ Lỗi:', e);
    process.exit(1);
  }
}

createTestAccounts();
