import { connectDb, sql } from '../config/database.js';

// Lấy danh sách giảng viên kèm thông tin slot
export const getLecturersWithSlots = async (req, res) => {
  try {
    const pool = await connectDb();
    const sv_id = req.user?.id;

    if (req.user?.role === 'STUDENT') {
      const svInfo = await pool.request().input('sv_id', sql.Int, sv_id).query(`
        SELECT nd.dot_thuc_tap_id, dt.ngay_bd_dang_ky, dt.ngay_kt_dang_ky, dt.trang_thai 
        FROM NguoiDung nd 
        LEFT JOIN DotThucTap dt ON nd.dot_thuc_tap_id = dt.id 
        WHERE nd.id = @sv_id
      `);
      const dotInfo = svInfo.recordset[0];
      const now = new Date();

      if (!dotInfo?.dot_thuc_tap_id || dotInfo?.trang_thai !== 'ACTIVE') {
        return res.status(403).json({ success: false, message: 'Bạn chưa được phân vào đợt thực tập đang mở!' });
      }
      
      if (dotInfo.ngay_bd_dang_ky && dotInfo.ngay_kt_dang_ky) {
        if (now < new Date(dotInfo.ngay_bd_dang_ky) || now > new Date(dotInfo.ngay_kt_dang_ky)) {
          return res.status(403).json({ success: false, message: 'Hiện không trong thời gian đăng ký đợt thực tập!' });
        }
      }
    }
    
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
        nd.email as ten_dang_nhap,
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

    // 0. Kiểm tra đợt thực tập của sinh viên
    const svInfo = await request.input('sv_id_check', sql.Int, sinh_vien_id).query(`
        SELECT nd.dot_thuc_tap_id, dtt.trang_thai, dtt.ngay_bd_dang_ky, dtt.ngay_kt_dang_ky 
        FROM NguoiDung nd 
        LEFT JOIN DotThucTap dtt ON nd.dot_thuc_tap_id = dtt.id 
        WHERE nd.id = @sv_id_check
    `);
    const dotInfo = svInfo.recordset[0];
    const now = new Date();

    if (!dotInfo?.dot_thuc_tap_id || dotInfo?.trang_thai !== 'ACTIVE') {
        await transaction.rollback();
        return res.status(403).json({ success: false, message: 'Bạn chưa được phân vào đợt thực tập đang mở!' });
    }

    if (dotInfo.ngay_bd_dang_ky && dotInfo.ngay_kt_dang_ky) {
      if (now < new Date(dotInfo.ngay_bd_dang_ky) || now > new Date(dotInfo.ngay_kt_dang_ky)) {
        await transaction.rollback();
        return res.status(403).json({ success: false, message: 'Hiện không trong thời gian đăng ký đợt thực tập!' });
      }
    }

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
      await request
        .input('gv_id_insert', sql.Int, giang_vien_id)
        .input('dot_id_insert', sql.Int, dotInfo.dot_thuc_tap_id)
        .query(`
        INSERT INTO ChiTieuGiangVien (giang_vien_id, so_luong_toi_da, so_luong_da_dang_ky, version, dot_thuc_tap_id)
        VALUES (@gv_id_insert, 20, 0, 1, @dot_id_insert)
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
      .input('gv_id_update', sql.Int, giang_vien_id)
      .query(`
        UPDATE ChiTieuGiangVien 
        SET so_luong_da_dang_ky = so_luong_da_dang_ky + 1,
            version = version + 1,
            cap_nhat_luc = GETDATE()
        WHERE giang_vien_id = @gv_id_update 
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
      .input('insert_sv_id', sql.Int, sinh_vien_id)
      .input('insert_gv_id', sql.Int, giang_vien_id)
      .input('insert_dot_id', sql.Int, dotInfo.dot_thuc_tap_id)
      .query(`
        INSERT INTO DangKyHuongDan (sinh_vien_id, giang_vien_id, dot_thuc_tap_id, thoi_gian_dang_ky)
        VALUES (@insert_sv_id, @insert_gv_id, @insert_dot_id, GETDATE())
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
          nd.email as email_giang_vien,
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
  const { id } = req.params; // ID của giảng viên (NguoiDung)
  const { so_luong_toi_da } = req.body;

  try {
    const pool = await connectDb();
    
    // Kiểm tra xem giảng viên đã có bản ghi chỉ tiêu chưa
    const checkQuery = await pool.request()
      .input('giang_vien_id', sql.Int, id)
      .query(`SELECT id FROM ChiTieuGiangVien WHERE giang_vien_id = @giang_vien_id`);
      
    // Lấy đợt thực tập hiện tại của hệ thống để gán cho giảng viên (nếu cần thiết)
    // Hiện tại có thể bỏ qua nếu admin cập nhật quota cho giảng viên mà chưa biết đợt nào.
    // Nếu bảng không cho phép NULL, bắt buộc phải có giá trị. Tuy nhiên, API cập nhật quota 
    // hiện không nhận dot_thuc_tap_id, nên ta sẽ tạm dùng đợt ACTIVE gần nhất.
    const activeDot = await pool.request().query(`SELECT TOP 1 id FROM DotThucTap WHERE trang_thai = 'ACTIVE'`);
    const dot_id = activeDot.recordset.length > 0 ? activeDot.recordset[0].id : null;
      
    if (checkQuery.recordset.length > 0) {
      // Cập nhật
      await pool.request()
        .input('giang_vien_id', sql.Int, id)
        .input('so_luong_toi_da', sql.Int, so_luong_toi_da)
        .query(`
          UPDATE ChiTieuGiangVien 
          SET so_luong_toi_da = @so_luong_toi_da,
              cap_nhat_luc = GETDATE()
          WHERE giang_vien_id = @giang_vien_id
        `);
    } else {
      // Thêm mới
      await pool.request()
        .input('giang_vien_id', sql.Int, id)
        .input('so_luong_toi_da', sql.Int, so_luong_toi_da)
        .input('dot_id', sql.Int, dot_id)
        .query(`
          INSERT INTO ChiTieuGiangVien (giang_vien_id, so_luong_toi_da, so_luong_da_dang_ky, version, dot_thuc_tap_id)
          VALUES (@giang_vien_id, @so_luong_toi_da, 0, 1, @dot_id)
        `);
    }

    res.status(200).json({ success: true, message: 'Cập nhật chỉ tiêu thành công!' });
  } catch (error) {
    console.error('Lỗi cập nhật chỉ tiêu giảng viên:', error);
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

export const cancelLecturerRegistration = async (req, res) => {
  const sinh_vien_id = req.user?.id;
  
  const pool = await connectDb();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();
    const request = new sql.Request(transaction);

    // Kiểm tra thời gian đăng ký
    const svInfo = await request.input('sv_id_check', sql.Int, sinh_vien_id).query(`
        SELECT nd.dot_thuc_tap_id, dtt.ngay_bd_dang_ky, dtt.ngay_kt_dang_ky, dtt.trang_thai 
        FROM NguoiDung nd 
        LEFT JOIN DotThucTap dtt ON nd.dot_thuc_tap_id = dtt.id 
        WHERE nd.id = @sv_id_check
    `);
    const dotInfo = svInfo.recordset[0];
    const now = new Date();

    if (!dotInfo?.dot_thuc_tap_id || dotInfo?.trang_thai !== 'ACTIVE') {
        await transaction.rollback();
        return res.status(403).json({ success: false, message: 'Bạn chưa được phân vào đợt thực tập đang mở!' });
    }
    
    if (dotInfo.ngay_bd_dang_ky && dotInfo.ngay_kt_dang_ky) {
      if (now < new Date(dotInfo.ngay_bd_dang_ky) || now > new Date(dotInfo.ngay_kt_dang_ky)) {
        await transaction.rollback();
        return res.status(403).json({ success: false, message: 'Hiện không trong thời gian đăng ký, không thể hủy!' });
      }
    }

    // Kiểm tra đã đăng ký chưa
    const checkExisting = await request.query(`SELECT id, giang_vien_id FROM DangKyHuongDan WHERE sinh_vien_id = @sv_id_check`);
    if (checkExisting.recordset.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Bạn chưa đăng ký giảng viên nào!' });
    }

    const { id: dk_id, giang_vien_id } = checkExisting.recordset[0];

    // Xóa đăng ký
    await request.input('dk_id', sql.Int, dk_id).query(`DELETE FROM DangKyHuongDan WHERE id = @dk_id`);

    // Giảm số lượng
    await request.input('gv_id', sql.Int, giang_vien_id).query(`
      UPDATE ChiTieuGiangVien 
      SET so_luong_da_dang_ky = so_luong_da_dang_ky - 1 
      WHERE giang_vien_id = @gv_id AND so_luong_da_dang_ky > 0
    `);

    await transaction.commit();
    res.status(200).json({ success: true, message: 'Hủy đăng ký giảng viên thành công!' });
  } catch (error) {
    if (transaction.isActive) {
      await transaction.rollback();
    }
    console.error('Lỗi khi hủy đăng ký giảng viên:', error);
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};
