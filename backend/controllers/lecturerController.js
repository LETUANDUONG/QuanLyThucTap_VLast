import { connectDb, sql } from '../config/database.js';

// Lấy danh sách giảng viên kèm thông tin slot
export const getLecturersWithSlots = async (req, res) => {
  try {
    const pool = await connectDb();
    
    // Kiểm tra bảng ChiTieuGiangVien tồn tại hay không
    const tableCheck = await pool.request().query(`
      SELECT OBJECT_ID('ChiTieuGiangVien') as table_exists
    `);
    
    if (tableCheck.recordset[0].table_exists === null) {
      console.warn('Bảng ChiTieuGiangVien chưa được tạo');
      // Nếu bảng chưa tồn tại, trả về danh sách GV không có slot info
      const result = await pool.request().query(`
        SELECT 
          id,
          email as ten_dang_nhap,
          ho_ten,
          role,
          NULL as chi_tieu_id,
          20 as so_luong_toi_da,
          0 as so_luong_da_dang_ky,
          1 as version,
          20 as so_luong_con_lai,
          GETDATE() as tao_luc,
          GETDATE() as cap_nhat_luc
        FROM NguoiDung
        WHERE role = 'LECTURER'
        ORDER BY ho_ten
      `);
      return res.status(200).json({
        success: true,
        data: result.recordset
      });
    }
    
    const result = await pool.request().query(`
      SELECT 
        nd.id,
        nd.ten_dang_nhap,
        nd.ho_ten,
        nd.role,
        COALESCE(ctgv.id, 0) as chi_tieu_id,
        COALESCE(ctgv.so_luong_toi_da, 20) as so_luong_toi_da,
        COALESCE(ctgv.so_luong_da_dang_ky, 0) as so_luong_da_dang_ky,
        COALESCE(ctgv.version, 1) as version,
        (COALESCE(ctgv.so_luong_toi_da, 20) - COALESCE(ctgv.so_luong_da_dang_ky, 0)) as so_luong_con_lai,
        COALESCE(ctgv.tao_luc, GETDATE()) as tao_luc,
        COALESCE(ctgv.cap_nhat_luc, GETDATE()) as cap_nhat_luc
      FROM NguoiDung nd
      LEFT JOIN ChiTieuGiangVien ctgv ON nd.id = ctgv.giang_vien_id
      WHERE nd.role = 'LECTURER'
      ORDER BY nd.ho_ten
    `);

    res.status(200).json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách giảng viên:', error);
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

// Đăng ký hướng dẫn từ giảng viên (FCFS + Optimistic Locking)
export const registerLecturer = async (req, res) => {
  const { giang_vien_id } = req.body;
  const sinh_vien_id = req.user?.id;

  if (!sinh_vien_id) {
    return res.status(401).json({ success: false, message: 'Chưa xác thực người dùng' });
  }

  if (!giang_vien_id) {
    return res.status(400).json({ success: false, message: 'Thiếu thông tin giảng viên' });
  }

  const pool = await connectDb();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();
    const request = new sql.Request(transaction);

    // 1. Kiểm tra sinh viên đã đăng ký giảng viên nào rồi chưa
    const checkExisting = await request
      .input('sv_id', sql.Int, sinh_vien_id)
      .query(`
        SELECT dkh.id FROM DangKyHuongDan dkh
        WHERE dkh.sinh_vien_id = @sv_id
      `);

    if (checkExisting.recordset.length > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Bạn đã đăng ký hướng dẫn từ một giảng viên khác rồi!'
      });
    }

    // 2. Lấy hoặc tạo ChiTieuGiangVien
    const getOrCreateSlot = await request
      .input('gv_id', sql.Int, giang_vien_id)
      .query(`
        SELECT id, so_luong_toi_da, so_luong_da_dang_ky, version 
        FROM ChiTieuGiangVien 
        WHERE giang_vien_id = @gv_id
      `);

    let slotInfo;
    if (getOrCreateSlot.recordset.length === 0) {
      // Tạo chỉ tiêu mới cho giảng viên
      await request.query(`
        INSERT INTO ChiTieuGiangVien (giang_vien_id, so_luong_toi_da, so_luong_da_dang_ky, version)
        VALUES (@gv_id, 20, 0, 1)
      `);
      slotInfo = { so_luong_toi_da: 20, so_luong_da_dang_ky: 0, version: 1 };
    } else {
      slotInfo = getOrCreateSlot.recordset[0];
    }

    // 3. Kiểm tra còn slot không
    if (slotInfo.so_luong_da_dang_ky >= slotInfo.so_luong_toi_da) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: 'Giảng viên này đã hết slot. Vui lòng chọn giảng viên khác!'
      });
    }

    // 4. XỬ LÝ TƯƠNG TRANH (Optimistic Locking)
    const updateResult = await request
      .input('current_version', sql.Int, slotInfo.version)
      .query(`
        UPDATE ChiTieuGiangVien 
        SET so_luong_da_dang_ky = so_luong_da_dang_ky + 1,
            version = version + 1,
            cap_nhat_luc = GETDATE()
        WHERE giang_vien_id = @gv_id 
          AND version = @current_version 
          AND so_luong_da_dang_ky < so_luong_toi_da
      `);

    if (updateResult.rowsAffected[0] === 0) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: 'Slot vừa bị lấy mất! Vui lòng thử lại ngay.'
      });
    }

    // 5. Ghi nhận đăng ký thành công
    await request
      .input('sinh_vien_id', sql.Int, sinh_vien_id)
      .input('giang_vien_id', sql.Int, giang_vien_id)
      .query(`
        INSERT INTO DangKyHuongDan (sinh_vien_id, giang_vien_id, thoi_gian_dang_ky)
        VALUES (@sinh_vien_id, @giang_vien_id, GETDATE())
      `);

    await transaction.commit();

    res.status(200).json({
      success: true,
      message: 'Đăng ký hướng dẫn thành công!'
    });

  } catch (error) {
    if (transaction.isActive) {
      try {
        await transaction.rollback();
      } catch (err) {
        console.error('Lỗi rollback:', err);
      }
    }
    console.error('Lỗi đăng ký hướng dẫn:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

// Lấy thông tin sinh viên đã đăng ký với giảng viên nào
export const getMyLecturerRegistration = async (req, res) => {
  const sinh_vien_id = req.user?.id;

  if (!sinh_vien_id) {
    return res.status(401).json({ success: false, message: 'Chưa xác thực người dùng' });
  }

  try {
    const pool = await connectDb();
    
    const result = await pool.request()
      .input('sv_id', sql.Int, sinh_vien_id)
      .query(`
        SELECT 
          dkh.id,
          dkh.sinh_vien_id,
          dkh.giang_vien_id,
          nd.ho_ten as ten_giang_vien,
          nd.ten_dang_nhap as email_giang_vien,
          dkh.thoi_gian_dang_ky
        FROM DangKyHuongDan dkh
        INNER JOIN NguoiDung nd ON dkh.giang_vien_id = nd.id
        WHERE dkh.sinh_vien_id = @sv_id
      `);

    res.status(200).json({
      success: true,
      data: result.recordset[0] || null
    });
  } catch (error) {
    console.error('Lỗi lấy thông tin đăng ký:', error);
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

// Admin cập nhật số lượng slot cho giảng viên
export const updateLecturerQuota = async (req, res) => {
  const { giang_vien_id, so_luong_toi_da } = req.body;

  if (!giang_vien_id || so_luong_toi_da === undefined) {
    return res.status(400).json({ success: false, message: 'Thiếu thông tin' });
  }

  if (so_luong_toi_da < 1) {
    return res.status(400).json({ success: false, message: 'Số lượng phải >= 1' });
  }

  try {
    const pool = await connectDb();
    
    // Nếu chưa có chỉ tiêu, tạo mới. Nếu có rồi, cập nhật
    await pool.request()
      .input('gv_id', sql.Int, giang_vien_id)
      .input('so_luong', sql.Int, so_luong_toi_da)
      .query(`
        IF EXISTS (SELECT 1 FROM ChiTieuGiangVien WHERE giang_vien_id = @gv_id)
          UPDATE ChiTieuGiangVien 
          SET so_luong_toi_da = @so_luong,
              cap_nhat_luc = GETDATE()
          WHERE giang_vien_id = @gv_id
        ELSE
          INSERT INTO ChiTieuGiangVien (giang_vien_id, so_luong_toi_da)
          VALUES (@gv_id, @so_luong)
      `);

    res.status(200).json({
      success: true,
      message: 'Cập nhật số lượng slot thành công!'
    });
  } catch (error) {
    console.error('Lỗi cập nhật quota:', error);
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};
