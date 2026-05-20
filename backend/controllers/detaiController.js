import { connectDb, sql } from '../config/database.js';

export const dangKyDeTai = async (req, res) => {
    const { sinh_vien_id, de_tai_id, mo_ta_dang_ky, muc_tieu_nghien_cuu, cong_nghe_de_xuat } = req.body;
    const studentId = req.user?.id || sinh_vien_id;
    const pool = await connectDb();

    // Khởi tạo Transaction
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();
        const request = new sql.Request(transaction);

        if (!studentId) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Không xác định được sinh viên đăng ký!' });
        }

        // Kiểm tra xem sinh viên đã chọn giảng viên hướng dẫn chưa
        request.input('sinh_vien_id', sql.Int, studentId);
        const lecturerCheck = await request.query(`
            SELECT giang_vien_id FROM DangKyHuongDan WHERE sinh_vien_id = @sinh_vien_id
        `);

        if (lecturerCheck.recordset.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Bạn phải chọn giảng viên hướng dẫn trước khi đăng ký đề tài!' });
        }
        const gv_id = lecturerCheck.recordset[0].giang_vien_id;

        // 1. Lấy thông tin đề tài và version hiện tại
        request.input('de_tai_id', sql.Int, de_tai_id);
        request.input('mo_ta_dang_ky', sql.NVarChar, mo_ta_dang_ky || null);
        request.input('muc_tieu_nghien_cuu', sql.NVarChar, muc_tieu_nghien_cuu || null);
        request.input('cong_nghe_de_xuat', sql.NVarChar, cong_nghe_de_xuat || null);
        const resultDeTai = await request.query(`
          SELECT dt.so_luong_toi_da, dt.so_luong_da_dang_ky, dt.version, dt.giang_vien_hd_id, dot.ngay_bd_dang_ky, dot.ngay_kt_dang_ky
          FROM DeTai dt
          LEFT JOIN DotThucTap dot ON dt.dot_thuc_tap_id = dot.id
          WHERE dt.id = @de_tai_id
        `);

        if (resultDeTai.recordset.length === 0) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Không tìm thấy đề tài!' });
        }

        const detai = resultDeTai.recordset[0];

        // Kiểm tra đề tài thuộc về giảng viên đã chọn
        if (detai.giang_vien_hd_id !== gv_id) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Bạn chỉ được đăng ký đề tài của giảng viên hướng dẫn đã chọn!' });
        }
        const now = new Date();
        
        // 1.1 Kiểm tra thời gian đăng ký của Đợt thực tập
        if (detai.ngay_bd_dang_ky && detai.ngay_kt_dang_ky) {
            if (now < new Date(detai.ngay_bd_dang_ky) || now > new Date(detai.ngay_kt_dang_ky)) {
                await transaction.rollback();
                return res.status(400).json({ message: 'Ngoài thời gian đăng ký của đợt thực tập!' });
            }
        }

        // 1.2 Kiểm tra sinh viên đã có đề tài nào đang active chưa (1 sinh viên = 1 đề tài)
        request.input('sinh_vien_id', sql.Int, studentId);
        const checkActive = await request.query(`
            SELECT id FROM DangKyDeTai 
            WHERE sinh_vien_id = @sinh_vien_id AND trang_thai_thuc_hien IN ('CHO_DUYET', 'DA_CHAP_NHAN', 'DANG_THUC_HIEN')
        `);
        
        if (checkActive.recordset.length > 0) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Bạn đã đăng ký 1 đề tài khác rồi! Vui lòng huỷ trước khi đăng ký mới.' });
        }

        const existingInactive = await request.query(`
            SELECT TOP 1 id
            FROM DangKyDeTai
            WHERE sinh_vien_id = @sinh_vien_id
              AND de_tai_id = @de_tai_id
              AND trang_thai_thuc_hien NOT IN ('CHO_DUYET', 'DA_CHAP_NHAN', 'DANG_THUC_HIEN')
            ORDER BY id DESC
        `);

        // 2. Kiểm tra số lượng
        if (detai.so_luong_da_dang_ky >= detai.so_luong_toi_da) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Đề tài đã đủ số lượng sinh viên!' });
        }

        // 3. CẬP NHẬT ĐỀ TÀI VÀ KIỂM TRA TƯƠNG TRANH (Optimistic Locking)
        request.input('version_hien_tai', sql.Int, detai.version);
        const resultUpdate = await request.query(`
      UPDATE DeTai 
      SET so_luong_da_dang_ky = so_luong_da_dang_ky + 1,
          version = version + 1
      WHERE id = @de_tai_id AND version = @version_hien_tai
    `);

        // Nếu rowsAffected[0] === 0 nghĩa là trong tích tắc vừa rồi, có người khác đã đăng ký và làm version thay đổi
        if (resultUpdate.rowsAffected[0] === 0) {
            await transaction.rollback();
            return res.status(409).json({
                message: 'Hệ thống đang bận hoặc đề tài vừa có người đăng ký. Vui lòng thử lại!'
            });
        }

        // 4. Bỏ qua kiểm tra cũ (đã gộp vào 1.2)

        let registrationResult;
        if (existingInactive.recordset.length > 0) {
            request.input('dang_ky_id', sql.Int, existingInactive.recordset[0].id);
            registrationResult = await request.query(`
      UPDATE DangKyDeTai
      SET trang_thai_thuc_hien = 'CHO_DUYET',
          mo_ta_dang_ky = @mo_ta_dang_ky,
          muc_tieu_nghien_cuu = @muc_tieu_nghien_cuu,
          cong_nghe_de_xuat = @cong_nghe_de_xuat,
          link_bao_cao = NULL,
          nhan_xet_giang_vien = NULL,
          diem_so = NULL,
          thoi_gian_dang_ky = GETDATE()
      WHERE id = @dang_ky_id

      SELECT @dang_ky_id AS id,
             @de_tai_id AS de_tai_id,
             'CHO_DUYET' AS trang_thai_thuc_hien
    `);
        } else {
            registrationResult = await request.query(`
      DECLARE @new_id int;
      INSERT INTO DangKyDeTai (de_tai_id, sinh_vien_id, trang_thai_thuc_hien)
      VALUES (@de_tai_id, @sinh_vien_id, 'CHO_DUYET')
      SET @new_id = CAST(SCOPE_IDENTITY() AS int);

      UPDATE DangKyDeTai
      SET mo_ta_dang_ky = @mo_ta_dang_ky,
          muc_tieu_nghien_cuu = @muc_tieu_nghien_cuu,
          cong_nghe_de_xuat = @cong_nghe_de_xuat
      WHERE id = @new_id

      SELECT @new_id AS id,
             @de_tai_id AS de_tai_id,
             'CHO_DUYET' AS trang_thai_thuc_hien
    `);
        }

        // Lưu mọi thay đổi vào DB
        await transaction.commit();
        res.status(200).json({
            message: 'Đăng ký đề tài thành công!',
            data: registrationResult.recordset[0]
        });

    } catch (error) {
        // Nếu có lỗi bất ngờ, rollback lại toàn bộ
        if (transaction.isActive) {
            await transaction.rollback();
        }
        console.error('Lỗi khi đăng ký đề tài:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};
// Thêm vào dưới hàm dangKyDeTai trong detaiController.js

export const getDanhSachDeTai = async (req, res) => {
  try {
    const pool = await connectDb();
    const sv_id = req.user?.id;
    const search = `%${req.query.search || ''}%`;
    
    let gv_id = null;
    if (req.user?.role === 'STUDENT') {
      const lecturerCheck = await pool.request()
        .input('sv_id', sql.Int, sv_id)
        .query('SELECT giang_vien_id FROM DangKyHuongDan WHERE sinh_vien_id = @sv_id');

      if (lecturerCheck.recordset.length === 0) {
        return res.status(200).json({
          message: 'Sinh viên chưa đăng ký giảng viên hướng dẫn',
          data: [],
          requiresLecturer: true
        });
      }
      gv_id = lecturerCheck.recordset[0].giang_vien_id;
    }

    let queryStr = `
      SELECT 
        d.id, 
        d.ten_de_tai, 
        d.mo_ta, 
        d.cong_nghe_su_dung, 
        d.so_luong_toi_da, 
        d.so_luong_da_dang_ky, 
        gv.ho_ten as ten_giang_vien
      FROM DeTai d
      JOIN NguoiDung gv ON d.giang_vien_hd_id = gv.id
      JOIN DotThucTap dt ON d.dot_thuc_tap_id = dt.id
      WHERE d.trang_thai_duyet = 'DA_DUYET' 
        AND dt.trang_thai = 'ACTIVE'
    `;

    const request = pool.request()
      .input('sv_id', sql.Int, sv_id)
      .input('search', sql.NVarChar, search);

    if (gv_id) {
      request.input('gv_id', sql.Int, gv_id);
      queryStr += ` AND d.giang_vien_hd_id = @gv_id`;
    }

    queryStr += `
        AND (
          d.ten_de_tai LIKE @search
          OR d.cong_nghe_su_dung LIKE @search
          OR d.mo_ta LIKE @search
          OR gv.ho_ten LIKE @search
        )
        AND (
          d.so_luong_da_dang_ky < d.so_luong_toi_da
          OR EXISTS (
            SELECT 1 FROM DangKyDeTai dk
            WHERE dk.de_tai_id = d.id
              AND dk.sinh_vien_id = @sv_id
              AND dk.trang_thai_thuc_hien IN ('CHO_DUYET', 'DA_CHAP_NHAN', 'DANG_THUC_HIEN')
          )
        )
    `;

    const result = await request.query(queryStr);

    res.status(200).json({
      message: 'Lấy danh sách thành công',
      data: result.recordset
    });

  } catch (error) {
    console.error('Lỗi lấy danh sách đề tài:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Thêm tiếp vào cuối file detaiController.js

export const getDashboardStats = async (req, res) => {
  try {
    const pool = await connectDb();

    // 1. Thống kê tiến độ thực hiện (Đang làm, Đã nộp, Hoàn thành...)
    const tienDoResult = await pool.request().query(`
      SELECT trang_thai_thuc_hien, COUNT(id) as so_luong
      FROM DangKyDeTai
      GROUP BY trang_thai_thuc_hien
    `);

    // 2. Lấy vài con số tổng quan (Tổng số đề tài, Tổng sinh viên tham gia)
    const tongQuanResult = await pool.request().query(`
      SELECT 
        (SELECT COUNT(id) FROM DeTai WHERE trang_thai_duyet = 'DA_DUYET') as tong_de_tai,
        (SELECT COUNT(id) FROM DangKyDeTai) as tong_sinh_vien_dang_ky
    `);

    res.status(200).json({
      message: 'Lấy thống kê thành công',
      data: {
        tien_do: tienDoResult.recordset,
        tong_quan: tongQuanResult.recordset[0]
      }
    });

  } catch (error) {
    console.error('Lỗi lấy dữ liệu dashboard:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

export const createDeTai = async (req, res) => {
  const { ten_de_tai, mo_ta, muc_tieu, cong_nghe_su_dung, dot_thuc_tap_id, so_luong_toi_da, giang_vien_hd_id } = req.body;
  const user = req.user || { role: 'LECTURER', id: 1 }; // Fallback nếu chưa có middleware

  try {
    const pool = await connectDb();
    
    const trang_thai = user.role === 'ADMIN' ? 'DA_DUYET' : 'CHO_DUYET';
    const gv_id = user.role === 'LECTURER' ? user.id : giang_vien_hd_id || null; 

    if (!gv_id) {
      return res.status(400).json({ message: 'Vui lòng chọn giảng viên hướng dẫn' });
    }

    await pool.request()
      .input('ten', sql.NVarChar, ten_de_tai)
      .input('mo_ta', sql.NVarChar, mo_ta)
      .input('muc_tieu', sql.NVarChar, muc_tieu)
      .input('tech', sql.NVarChar, cong_nghe_su_dung)
      .input('gv_id', sql.Int, gv_id)
      .input('dot_id', sql.Int, dot_thuc_tap_id || 1) // Fallback nếu client không gửi dot_id
      .input('max_sv', sql.Int, so_luong_toi_da)
      .input('status', sql.VarChar, trang_thai)
      .input('nguoi_tao', sql.Int, user.id)
      .query(`
        INSERT INTO DeTai (ten_de_tai, mo_ta, muc_tieu, cong_nghe_su_dung, giang_vien_hd_id, dot_thuc_tap_id, so_luong_toi_da, trang_thai_duyet, nguoi_de_xuat_id)
        VALUES (@ten, @mo_ta, @muc_tieu, @tech, @gv_id, @dot_id, @max_sv, @status, @nguoi_tao)
      `);

    res.status(201).json({ message: user.role === 'ADMIN' ? 'Tạo đề tài thành công!' : 'Đã gửi đề tài chờ khoa duyệt!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi tạo đề tài', error: error.message });
  }
};

export const getApplicants = async (req, res) => {
  try {
    const pool = await connectDb();
    const gv_id = req.user ? req.user.id : 1; // Fallback nếu chưa có middleware
    
    const result = await pool.request()
      .input('gv_id', sql.Int, gv_id) 
      .query(`
        SELECT 
          dk.id as dang_ky_id,
          sv.ho_ten as ten_sinh_vien,
          sv.ma_so as mssv,
          dt.ten_de_tai,
          dk.mo_ta_dang_ky,
          dk.muc_tieu_nghien_cuu,
          dk.cong_nghe_de_xuat,
          dk.trang_thai_thuc_hien,
          dk.thoi_gian_dang_ky
        FROM DangKyDeTai dk
        JOIN DeTai dt ON dk.de_tai_id = dt.id
        JOIN NguoiDung sv ON dk.sinh_vien_id = sv.id
        WHERE dt.giang_vien_hd_id = @gv_id
        ORDER BY dk.thoi_gian_dang_ky DESC
      `);

    res.status(200).json({ data: result.recordset });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

export const updateStatus = async (req, res) => {
  const { id } = req.params; // ID của bản ghi DangKyDeTai
  const { status, nhan_xet } = req.body; // 'DA_CHAP_NHAN', 'TU_CHOI' hoặc 'YEU_CAU_CHINH_SUA'

  let transaction;
  try {
    const pool = await connectDb();
    
    // Nếu từ chối hoặc yêu cầu chỉnh sửa, giảm số lượng đã đăng ký ở bảng DeTai
    if (status === 'TU_CHOI' || status === 'YEU_CAU_CHINH_SUA') {
      transaction = new sql.Transaction(pool);
      await transaction.begin();
      const request = new sql.Request(transaction);

      // Lấy de_tai_id, sinh_vien_id và giang_vien_hd_id từ bản ghi đăng ký
      const info = await request.input('dk_id', sql.Int, id).query(`
        SELECT dk.de_tai_id, dk.sinh_vien_id, dt.giang_vien_hd_id 
        FROM DangKyDeTai dk
        JOIN DeTai dt ON dk.de_tai_id = dt.id
        WHERE dk.id = @dk_id
      `);
      
      const de_tai_id = info.recordset[0].de_tai_id;
      const sinh_vien_id = info.recordset[0].sinh_vien_id;
      const gv_id = info.recordset[0].giang_vien_hd_id;

      // Cập nhật trạng thái đăng ký
      await request
        .input('status', sql.VarChar, status)
        .input('nhan_xet', sql.NVarChar, nhan_xet || null)
        .query(`
        UPDATE DangKyDeTai
        SET trang_thai_thuc_hien = @status,
            nhan_xet_giang_vien = @nhan_xet
        WHERE id = @dk_id
      `);

      // Giảm số lượng ở bảng DeTai
      await request.input('dt_id', sql.Int, de_tai_id).query(`
        UPDATE DeTai
        SET so_luong_da_dang_ky = CASE
          WHEN so_luong_da_dang_ky > 0 THEN so_luong_da_dang_ky - 1
          ELSE 0
        END
        WHERE id = @dt_id
      `);

      // Nếu giảng viên từ chối hẳn, đồng thời giải phóng quota giảng viên
      if (status === 'TU_CHOI' && gv_id) {
        await request.input('gv_id', sql.Int, gv_id).query(`
          UPDATE ChiTieuGiangVien
          SET so_luong_da_dang_ky = CASE WHEN so_luong_da_dang_ky > 0 THEN so_luong_da_dang_ky - 1 ELSE 0 END
          WHERE giang_vien_id = @gv_id;
          
          DELETE FROM DangKyHuongDan WHERE sinh_vien_id = @sinh_vien_id;
        `);
      }
      
      // Thêm thông báo
      await request.input('sv_id', sql.Int, sinh_vien_id).query(`
        INSERT INTO ThongBao (user_id, tieu_de, noi_dung, loai_thong_bao)
        VALUES (
          @sv_id,
          N'Cập nhật đăng ký',
          CASE WHEN @status = 'YEU_CAU_CHINH_SUA'
            THEN N'Giảng viên yêu cầu chỉnh sửa thông tin đăng ký đề tài.'
            ELSE N'Đề tài của bạn đã bị từ chối!'
          END,
          'HE_THONG'
        )
      `);

      await transaction.commit();
    } else {
      // Lấy thông tin sinh_vien_id trước
      const svInfo = await pool.request().input('dk_id', sql.Int, id).query('SELECT sinh_vien_id FROM DangKyDeTai WHERE id = @dk_id');
      const sinh_vien_id = svInfo.recordset[0]?.sinh_vien_id;

      // Nếu chấp nhận, chỉ cần cập nhật trạng thái
      await pool.request()
        .input('dk_id', sql.Int, id)
        .input('status', sql.VarChar, status)
        .input('nhan_xet', sql.NVarChar, nhan_xet || null)
        .query('UPDATE DangKyDeTai SET trang_thai_thuc_hien = @status, nhan_xet_giang_vien = @nhan_xet WHERE id = @dk_id');
        
      if (sinh_vien_id) {
         await pool.request().input('sv_id', sql.Int, sinh_vien_id).query(`
            INSERT INTO ThongBao (user_id, tieu_de, noi_dung, loai_thong_bao)
            VALUES (@sv_id, N'Cập nhật đăng ký', N'Đề tài của bạn đã được Giảng viên phê duyệt!', 'HE_THONG')
         `);
      }
    }

    res.status(200).json({ message: 'Cập nhật trạng thái thành công!' });
  } catch (error) {
    if (transaction && transaction.isActive) {
        await transaction.rollback();
    }
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

export const getMyRegistration = async (req, res) => {
  try {
    const pool = await connectDb();
    const sv_id = req.user ? req.user.id : 2; // Fallback sinh viên id = 2

    const result = await pool.request()
      .input('sv_id', sql.Int, sv_id)
      .query(`
        SELECT TOP 1 id, trang_thai_thuc_hien, de_tai_id 
        FROM DangKyDeTai 
        WHERE sinh_vien_id = @sv_id 
          AND trang_thai_thuc_hien IN ('CHO_DUYET', 'DA_CHAP_NHAN', 'DANG_THUC_HIEN')
        ORDER BY id DESC
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Chưa đăng ký đề tài' });
    }

    res.status(200).json({ data: result.recordset[0] });
  } catch (error) {
    console.error('Lỗi lấy đăng ký hiện tại:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

export const cancelRegistration = async (req, res) => {
  const { id } = req.params; // ID của bảng DangKyDeTai
  let transaction;
  try {
    const pool = await connectDb();
    transaction = new sql.Transaction(pool);
    await transaction.begin();
    const request = new sql.Request(transaction);

    // 1. Kiểm tra trạng thái đăng ký hiện tại
    const dkInfo = await request.input('dk_id', sql.Int, id).query(`
      SELECT dk.de_tai_id, dk.trang_thai_thuc_hien, dk.sinh_vien_id, dt.giang_vien_hd_id 
      FROM DangKyDeTai dk
      JOIN DeTai dt ON dk.de_tai_id = dt.id
      WHERE dk.id = @dk_id
    `);

    if (dkInfo.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Không tìm thấy đăng ký!' });
    }

    const { de_tai_id, sinh_vien_id, giang_vien_hd_id } = dkInfo.recordset[0];

    // 2. Giữ lịch sử đăng ký và đánh dấu đã hủy để sinh viên có thể đăng ký lại.
    await request.query(`
      UPDATE DangKyDeTai
      SET trang_thai_thuc_hien = 'HUY'
      WHERE id = @dk_id
    `);

    // 3. Giảm số lượng đã đăng ký trong DeTai
    await request.input('dt_id', sql.Int, de_tai_id).query(`
      UPDATE DeTai
      SET so_luong_da_dang_ky = CASE
        WHEN so_luong_da_dang_ky > 0 THEN so_luong_da_dang_ky - 1
        ELSE 0
      END
      WHERE id = @dt_id
    `);

    // 4. Giải phóng slot ChiTieuGiangVien và DangKyHuongDan
    if (giang_vien_hd_id) {
      await request.input('gv_id', sql.Int, giang_vien_hd_id)
        .input('sv_id', sql.Int, sinh_vien_id)
        .query(`
          UPDATE ChiTieuGiangVien
          SET so_luong_da_dang_ky = CASE WHEN so_luong_da_dang_ky > 0 THEN so_luong_da_dang_ky - 1 ELSE 0 END
          WHERE giang_vien_id = @gv_id;
          
          DELETE FROM DangKyHuongDan WHERE sinh_vien_id = @sv_id;
        `);
    }

    await transaction.commit();
    res.status(200).json({ message: 'Đã hủy đăng ký thành công!' });
  } catch (error) {
    if (transaction && transaction.isActive) {
      await transaction.rollback();
    }
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
