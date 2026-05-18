import { connectDb, sql } from './config/database.js';

async function run() {
  try {
    const pool = await connectDb();
    
    console.log("Checking all users:");
    const users = await pool.request().query("SELECT id, email, mat_khau, role FROM NguoiDung");
    console.log(users.recordset);
    
    console.log("Checking specific lecturer:");
    const gv = await pool.request().query("SELECT * FROM NguoiDung WHERE role = 'LECTURER'");
    console.log(gv.recordset);

    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}

run();
