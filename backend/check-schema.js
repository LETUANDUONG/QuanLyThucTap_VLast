import { connectDb, sql } from './config/database.js';

async function checkSchema() {
  try {
    const pool = await connectDb();
    const result = await pool.request().query(`
      SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME IN ('NguoiDung', 'DotThucTap', 'BaoCao', 'DangKyDeTai')
    `);
    console.table(result.recordset);
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

checkSchema();
