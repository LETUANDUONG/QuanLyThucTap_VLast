import 'dotenv/config';
import { connectDb, sql } from './config/database.js'; // Thêm ./config/

const testConnection = async () => {
    try {
        const pool = await connectDb();
        console.log('✅ Đã kết nối SQL Server bằng Windows Authentication!');

        // Ví dụ một câu truy vấn đơn giản
        const result = await pool.request().query('SELECT @@VERSION as version');
        console.log('Thông tin DB:', result.recordset[0].version);

    } catch (err) {
        console.error('❌ Lỗi kết nối:', err);
    } finally {
        // Đóng kết nối khi test xong
        sql.close();
    }
};

testConnection();