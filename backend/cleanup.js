import { connectDb } from './config/database.js';

async function run() {
    const pool = await connectDb();
    
    // Decrease the registered count for topics that user 2 was registered for
    const check = await pool.request().query("SELECT de_tai_id FROM DangKyDeTai WHERE sinh_vien_id = 2");
    for (const record of check.recordset) {
        await pool.request().query(`UPDATE DeTai SET so_luong_da_dang_ky = so_luong_da_dang_ky - 1 WHERE id = ${record.de_tai_id}`);
    }

    await pool.request().query("DELETE FROM DangKyDeTai WHERE sinh_vien_id = 2");
    console.log("Cleanup done");
    process.exit(0);
}

run();
