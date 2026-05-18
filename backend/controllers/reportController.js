import { connectDb, sql } from '../config/database.js';

// 1. Sinh viên nộp báo cáo
export const submitReport = async (req, res) => {
  const { dang_ky_id, loai_bao_cao, noi_dung, link } = req.body;
  try {
    const pool = await connectDb();
    await pool.request()
      .input('dk_id', sql.Int, dang_ky_id)
      .input('type', sql.NVarChar, loai_bao_cao)
      .input('content', sql.NVarChar, noi_dung)
      .input('link', sql.VarChar, link)
      .query(`
        INSERT INTO BaoCao (dang_ky_id, loai_bao_cao, noi_dung_tom_tat, link_tai_lieu)
        VALUES (@dk_id, @type, @content, @link)
      `);
    res.status(200).json({ message: 'Nộp báo cáo thành công!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// 2. Giảng viên chấm điểm & nhận xét
export const gradeReport = async (req, res) => {
  const { report_id, nhan_xet, diem } = req.body;
  try {
    const pool = await connectDb();
    await pool.request()
      .input('id', sql.Int, report_id)
      .input('note', sql.NVarChar, nhan_xet)
      .input('score', sql.Float, diem)
      .query(`
        UPDATE BaoCao SET nhan_xet_gv = @note, diem_so = @score WHERE id = @id
      `);
    res.status(200).json({ message: 'Đã lưu đánh giá!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// 3. Lấy danh sách báo cáo
export const getReports = async (req, res) => {
  const { dangKyId } = req.params;
  try {
    const pool = await connectDb();
    const result = await pool.request()
      .input('dk_id', sql.Int, dangKyId)
      .query(`
        SELECT id, loai_bao_cao, thoi_gian_nop, nhan_xet_gv, diem_so, noi_dung_tom_tat, link_tai_lieu 
        FROM BaoCao 
        WHERE dang_ky_id = @dk_id
        ORDER BY thoi_gian_nop DESC
      `);
    res.status(200).json({ data: result.recordset });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// 4. Giảng viên lấy danh sách báo cáo cần chấm
export const getPendingReports = async (req, res) => {
  try {
    const pool = await connectDb();
    const gv_id = req.user ? req.user.id : 1; // Fallback gv_id = 1

    const result = await pool.request()
      .input('gv_id', sql.Int, gv_id)
      .query(`
        SELECT 
          b.id as report_id, b.loai_bao_cao, b.noi_dung_tom_tat, b.link_tai_lieu, b.thoi_gian_nop, b.diem_so, b.nhan_xet_gv,
          sv.ho_ten as ten_sinh_vien, sv.ma_so as mssv,
          dt.ten_de_tai
        FROM BaoCao b
        JOIN DangKyDeTai dk ON b.dang_ky_id = dk.id
        JOIN NguoiDung sv ON dk.sinh_vien_id = sv.id
        JOIN DeTai dt ON dk.de_tai_id = dt.id
        WHERE dt.giang_vien_hd_id = @gv_id
        ORDER BY b.thoi_gian_nop DESC
      `);
      
    res.status(200).json({ data: result.recordset });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
