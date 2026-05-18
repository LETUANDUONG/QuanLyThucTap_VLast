import { connectDb, sql } from './config/database.js';

async function run() {
  try {
    const pool = await connectDb();
    
    const users = await pool.request().query("SELECT id, ho_ten, email, mat_khau, role FROM NguoiDung WITH (NOLOCK)");
    console.log("=== DANH SÁCH USER TRONG DB ===");
    console.table(users.recordset);
    
    sql.close();
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}

run();
