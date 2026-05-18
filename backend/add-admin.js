import { connectDb, sql } from './config/database.js';

async function addAdmin() {
  try {
    const pool = await connectDb();
    
    // Check if exists
    const check = await pool.request().query("SELECT * FROM NguoiDung WHERE email = 'admin@ptit.edu.vn'");
    if (check.recordset.length > 0) {
      console.log('Admin already exists');
    } else {
      await pool.request().query(`
        INSERT INTO NguoiDung (ma_so, ho_ten, email, mat_khau, role, chuyen_mon)
        VALUES ('ADMIN01', N'Giáo vụ Khoa', 'admin@ptit.edu.vn', '123456', 'ADMIN', N'Quản trị hệ thống')
      `);
      console.log('Admin added');
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

addAdmin();
