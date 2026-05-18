import { connectDb, sql } from '../config/database.js';

const activeRegistrationStatuses = "'CHO_DUYET', 'DA_CHAP_NHAN', 'DANG_THUC_HIEN', 'YEU_CAU_CHINH_SUA'";

const addHistory = async (request, deTaiId, userId, hanhDong, noiDung = null) => {
  await request
    .input(`history_de_tai_${Date.now()}`, sql.Int, deTaiId)
    .query('SELECT 1');
};

export const getAllTopics = async (req, res) => {
  try {
    const pool = await connectDb();
    const result = await pool.request().query(`
      SELECT d.*, gv.ho_ten AS ten_giang_vien, nd.ho_ten AS nguoi_de_xuat
      FROM DeTai d
      LEFT JOIN NguoiDung gv ON gv.id = d.giang_vien_hd_id
      LEFT JOIN NguoiDung nd ON nd.id = d.nguoi_de_xuat_id
      ORDER BY d.id DESC
    `);
    res.status(200).json({ data: result.recordset });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải danh sách đề tài', error: error.message });
  }
};

export const getLecturerTopics = async (req, res) => {
  try {
    const pool = await connectDb();
    const result = await pool.request()
      .input('gv_id', sql.Int, req.user.id)
      .query(`
        SELECT d.*,
          (SELECT COUNT(*) FROM DangKyDeTai dk
           WHERE dk.de_tai_id = d.id
             AND dk.trang_thai_thuc_hien IN (${activeRegistrationStatuses})) AS so_sinh_vien_active
        FROM DeTai d
        WHERE d.giang_vien_hd_id = @gv_id OR d.nguoi_de_xuat_id = @gv_id
        ORDER BY d.id DESC
      `);
    res.status(200).json({ data: result.recordset });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải đề tài của giảng viên', error: error.message });
  }
};

export const updateTopicApproval = async (req, res) => {
  const { id } = req.params;
  const { status, ghi_chu } = req.body;
  const allowed = ['DA_DUYET', 'TU_CHOI', 'CHO_DUYET'];

  if (!allowed.includes(status)) {
    return res.status(400).json({ message: 'Trạng thái duyệt không hợp lệ' });
  }

  try {
    const pool = await connectDb();
    const request = pool.request()
      .input('id', sql.Int, id)
      .input('status', sql.VarChar, status)
      .input('user_id', sql.Int, req.user.id)
      .input('noi_dung', sql.NVarChar, ghi_chu || `Cập nhật trạng thái duyệt: ${status}`);

    await request.query(`
      UPDATE DeTai SET trang_thai_duyet = @status WHERE id = @id;
      INSERT INTO LichSuDeTai (de_tai_id, user_id, hanh_dong, noi_dung)
      VALUES (@id, @user_id, N'Duyệt đề tài', @noi_dung);
    `);

    res.status(200).json({ message: 'Đã cập nhật trạng thái duyệt đề tài' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi cập nhật đề tài', error: error.message });
  }
};

export const updateTopicProgressStatus = async (req, res) => {
  const { id } = req.params;
  const { status, ghi_chu } = req.body;
  const allowed = ['CHUA_THUC_HIEN', 'DANG_THUC_HIEN', 'TAM_DUNG', 'HOAN_THANH'];

  if (!allowed.includes(status)) {
    return res.status(400).json({ message: 'Tình trạng thực hiện không hợp lệ' });
  }

  try {
    const pool = await connectDb();
    await pool.request()
      .input('id', sql.Int, id)
      .input('status', sql.VarChar, status)
      .input('user_id', sql.Int, req.user.id)
      .input('noi_dung', sql.NVarChar, ghi_chu || `Cập nhật tình trạng: ${status}`)
      .query(`
        UPDATE DeTai SET tinh_trang_thuc_hien = @status WHERE id = @id;
        INSERT INTO LichSuDeTai (de_tai_id, user_id, hanh_dong, noi_dung)
        VALUES (@id, @user_id, N'Cập nhật tình trạng', @noi_dung);
      `);

    res.status(200).json({ message: 'Đã cập nhật tình trạng thực hiện' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi cập nhật tình trạng', error: error.message });
  }
};

export const deleteTopic = async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await connectDb();
    const active = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT COUNT(*) AS total
        FROM DangKyDeTai
        WHERE de_tai_id = @id
          AND trang_thai_thuc_hien IN (${activeRegistrationStatuses})
      `);

    if (active.recordset[0].total > 0) {
      return res.status(400).json({ message: 'Không thể loại bỏ đề tài đang có sinh viên tham gia' });
    }

    await pool.request()
      .input('id', sql.Int, id)
      .query(`
        UPDATE DeTai
        SET trang_thai_duyet = 'TU_CHOI',
            tinh_trang_thuc_hien = 'TAM_DUNG'
        WHERE id = @id
      `);

    res.status(200).json({ message: 'Đã loại bỏ đề tài khỏi danh sách sử dụng' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi loại bỏ đề tài', error: error.message });
  }
};

export const getTopicHistory = async (req, res) => {
  try {
    const pool = await connectDb();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`
        SELECT ls.*, nd.ho_ten
        FROM LichSuDeTai ls
        LEFT JOIN NguoiDung nd ON nd.id = ls.user_id
        WHERE ls.de_tai_id = @id
        ORDER BY ls.thoi_gian DESC
      `);
    res.status(200).json({ data: result.recordset });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải lịch sử đề tài', error: error.message });
  }
};

export const getProgressItems = async (req, res) => {
  try {
    const pool = await connectDb();
    const result = await pool.request()
      .input('dang_ky_id', sql.Int, req.params.dangKyId)
      .query('SELECT * FROM TienDoDeTai WHERE dang_ky_id = @dang_ky_id ORDER BY id DESC');
    res.status(200).json({ data: result.recordset });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải tiến độ', error: error.message });
  }
};

export const saveProgressItem = async (req, res) => {
  const { dangKyId } = req.params;
  const { tieu_de, mo_ta, trang_thai, han_hoan_thanh, nhan_xet_gv } = req.body;

  try {
    const pool = await connectDb();
    await pool.request()
      .input('dang_ky_id', sql.Int, dangKyId)
      .input('tieu_de', sql.NVarChar, tieu_de)
      .input('mo_ta', sql.NVarChar, mo_ta || null)
      .input('trang_thai', sql.VarChar, trang_thai || 'DANG_LAM')
      .input('han', sql.DateTime, han_hoan_thanh ? new Date(han_hoan_thanh) : null)
      .input('nhan_xet', sql.NVarChar, nhan_xet_gv || null)
      .query(`
        INSERT INTO TienDoDeTai (dang_ky_id, tieu_de, mo_ta, trang_thai, han_hoan_thanh, nhan_xet_gv)
        VALUES (@dang_ky_id, @tieu_de, @mo_ta, @trang_thai, @han, @nhan_xet)
      `);
    res.status(201).json({ message: 'Đã cập nhật tiến độ' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lưu tiến độ', error: error.message });
  }
};

export const getAppointments = async (req, res) => {
  try {
    const pool = await connectDb();
    const request = pool.request().input('user_id', sql.Int, req.user.id);
    const where = req.user.role === 'LECTURER'
      ? 'lh.giang_vien_id = @user_id'
      : req.user.role === 'STUDENT'
        ? 'lh.sinh_vien_id = @user_id'
        : '1 = 1';

    const result = await request.query(`
      SELECT lh.*, sv.ho_ten AS ten_sinh_vien, gv.ho_ten AS ten_giang_vien, dt.ten_de_tai
      FROM LichHen lh
      JOIN NguoiDung sv ON sv.id = lh.sinh_vien_id
      JOIN NguoiDung gv ON gv.id = lh.giang_vien_id
      JOIN DangKyDeTai dk ON dk.id = lh.dang_ky_id
      JOIN DeTai dt ON dt.id = dk.de_tai_id
      WHERE ${where}
      ORDER BY lh.thoi_gian_bat_dau DESC
    `);
    res.status(200).json({ data: result.recordset });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải lịch hẹn', error: error.message });
  }
};

export const createAppointment = async (req, res) => {
  const { dang_ky_id, tieu_de, noi_dung, thoi_gian_bat_dau, dia_diem } = req.body;

  try {
    const pool = await connectDb();
    const info = await pool.request()
      .input('dang_ky_id', sql.Int, dang_ky_id)
      .query(`
        SELECT dk.sinh_vien_id, dt.giang_vien_hd_id
        FROM DangKyDeTai dk
        JOIN DeTai dt ON dt.id = dk.de_tai_id
        WHERE dk.id = @dang_ky_id
      `);

    if (info.recordset.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy đăng ký' });
    }

    const { sinh_vien_id, giang_vien_hd_id } = info.recordset[0];
    await pool.request()
      .input('dang_ky_id', sql.Int, dang_ky_id)
      .input('gv_id', sql.Int, giang_vien_hd_id)
      .input('sv_id', sql.Int, sinh_vien_id)
      .input('tieu_de', sql.NVarChar, tieu_de)
      .input('noi_dung', sql.NVarChar, noi_dung || null)
      .input('thoi_gian', sql.DateTime, new Date(thoi_gian_bat_dau))
      .input('dia_diem', sql.NVarChar, dia_diem || null)
      .query(`
        INSERT INTO LichHen (dang_ky_id, giang_vien_id, sinh_vien_id, tieu_de, noi_dung, thoi_gian_bat_dau, dia_diem)
        VALUES (@dang_ky_id, @gv_id, @sv_id, @tieu_de, @noi_dung, @thoi_gian, @dia_diem)
      `);
    res.status(201).json({ message: 'Đã tạo lịch hẹn' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tạo lịch hẹn', error: error.message });
  }
};

export const updateAppointmentStatus = async (req, res) => {
  const { status } = req.body;
  try {
    const pool = await connectDb();
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('status', sql.VarChar, status)
      .query('UPDATE LichHen SET trang_thai = @status WHERE id = @id');
    res.status(200).json({ message: 'Đã cập nhật lịch hẹn' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi cập nhật lịch hẹn', error: error.message });
  }
};
