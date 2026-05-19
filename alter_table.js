import { connectDb, sql } from './backend/config/database.js';

async function alterTable() {
  const pool = await connectDb();
  try {
    await pool.request().query("ALTER TABLE ChiTieuGiangVien ALTER COLUMN dot_thuc_tap_id int NULL;");
    console.log("ALTER TABLE ChiTieuGiangVien SUCCESS");
  } catch(e) {
    console.error('Lỗi 1:', e.message);
  }
  
  try {
    await pool.request().query("ALTER TABLE DangKyHuongDan ALTER COLUMN dot_thuc_tap_id int NULL;");
    console.log("ALTER TABLE DangKyHuongDan SUCCESS");
  } catch(e) {
    console.error('Lỗi 2:', e.message);
  }
  
  process.exit();
}

alterTable();
