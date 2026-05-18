import { connectDb } from './config/database.js';

async function run() {
  const pool = await connectDb();
  await pool.request().query("UPDATE DangKyDeTai SET trang_thai_thuc_hien = 'CHO_DUYET' WHERE trang_thai_thuc_hien = 'DANG_THUC_HIEN'");
  console.log('Done');
  process.exit(0);
}

run();
