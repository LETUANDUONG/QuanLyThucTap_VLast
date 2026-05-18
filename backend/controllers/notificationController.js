import { connectDb, sql } from '../config/database.js';

export const getMyNotifications = async (req, res) => {
  try {
    const pool = await connectDb();
    // Tạm thời fallback user.id = 2 (Sinh viên) hoặc 1 (Giảng viên) nếu chưa có middleware thực
    const userId = req.user ? req.user.id : 2; 

    const result = await pool.request()
      .input('user_id', sql.Int, userId)
      .query(`
        SELECT top 10 id, tieu_de, noi_dung, loai_thong_bao, da_doc, thoi_gian_tao 
        FROM ThongBao 
        WHERE user_id = @user_id 
        ORDER BY thoi_gian_tao DESC
      `);
    res.status(200).json({ data: result.recordset });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
