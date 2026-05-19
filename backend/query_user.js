import { connectDb, sql } from './config/database.js';

async function queryUser() {
  const pool = await connectDb();
  try {
    const result = await pool.request().query("SELECT TOP 5 id, email, mat_khau, role FROM NguoiDung WHERE role = 'STUDENT'");
    console.log(result.recordset);
    
    const adminResult = await pool.request().query("SELECT TOP 1 id, email, mat_khau, role FROM NguoiDung WHERE role = 'ADMIN'");
    console.log(adminResult.recordset);
  } catch(e) {
    console.error('Lỗi:', e.message);
  }
  process.exit();
}

queryUser();
