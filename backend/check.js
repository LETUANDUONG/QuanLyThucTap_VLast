import { connectDb } from './config/database.js';

async function run() {
    const pool = await connectDb();
    const res = await pool.request().query("SELECT COUNT(*) as count FROM DangKyDeTai WHERE sinh_vien_id = 2");
    console.log("Count:", res.recordset[0].count);
    process.exit(0);
}

run();
