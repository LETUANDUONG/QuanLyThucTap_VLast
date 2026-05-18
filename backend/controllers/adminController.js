import { connectDb, sql } from '../config/database.js';

// ================= USER MANAGEMENT ================= //

export const getUsers = async (req, res) => {
  try {
    const pool = await connectDb();
    const result = await pool.request().query('SELECT id, ma_so, ho_ten, email, role, lop, khoa_hoc, chuyen_mon, so_dien_thoai, dia_chi FROM NguoiDung');
    res.status(200).json({ data: result.recordset });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

export const createUser = async (req, res) => {
  const { ma_so, ho_ten, email, role, lop, khoa_hoc, chuyen_mon, so_dien_thoai, dia_chi } = req.body;
  try {
    const pool = await connectDb();
    
    // Kiểm tra email tồn tại
    const checkEmail = await pool.request()
      .input('email', sql.VarChar, email)
      .query('SELECT id FROM NguoiDung WHERE email = @email');
      
    if (checkEmail.recordset.length > 0) {
      return res.status(400).json({ message: 'Email đã tồn tại' });
    }

    await pool.request()
      .input('ma_so', sql.VarChar, ma_so || null)
      .input('ho_ten', sql.NVarChar, ho_ten)
      .input('email', sql.VarChar, email)
      .input('mat_khau', sql.VarChar, '123456') // Mặc định
      .input('role', sql.VarChar, role)
      .input('lop', sql.VarChar, lop || null)
      .input('khoa_hoc', sql.VarChar, khoa_hoc || null)
      .input('chuyen_mon', sql.NVarChar, chuyen_mon || null)
      .input('so_dien_thoai', sql.VarChar, so_dien_thoai || null)
      .input('dia_chi', sql.NVarChar, dia_chi || null)
      .query(`
        INSERT INTO NguoiDung (ma_so, ho_ten, email, mat_khau, role, lop, khoa_hoc, chuyen_mon, so_dien_thoai, dia_chi)
        VALUES (@ma_so, @ho_ten, @email, @mat_khau, @role, @lop, @khoa_hoc, @chuyen_mon, @so_dien_thoai, @dia_chi)
      `);
      
    res.status(201).json({ message: 'Thêm tài khoản thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

export const updateUser = async (req, res) => {
  const { id } = req.params;
  const { ma_so, ho_ten, email, role, lop, khoa_hoc, chuyen_mon, so_dien_thoai, dia_chi } = req.body;
  try {
    const pool = await connectDb();
    await pool.request()
      .input('id', sql.Int, id)
      .input('ma_so', sql.VarChar, ma_so || null)
      .input('ho_ten', sql.NVarChar, ho_ten)
      .input('email', sql.VarChar, email)
      .input('role', sql.VarChar, role)
      .input('lop', sql.VarChar, lop || null)
      .input('khoa_hoc', sql.VarChar, khoa_hoc || null)
      .input('chuyen_mon', sql.NVarChar, chuyen_mon || null)
      .input('so_dien_thoai', sql.VarChar, so_dien_thoai || null)
      .input('dia_chi', sql.NVarChar, dia_chi || null)
      .query(`
          UPDATE NguoiDung 
          SET ma_so = @ma_so, ho_ten = @ho_ten, email = @email, role = @role, 
            lop = @lop, khoa_hoc = @khoa_hoc, chuyen_mon = @chuyen_mon,
            so_dien_thoai = @so_dien_thoai, dia_chi = @dia_chi
          WHERE id = @id
      `);
    res.status(200).json({ message: 'Cập nhật tài khoản thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

export const deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await connectDb();
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM NguoiDung WHERE id = @id');
    res.status(200).json({ message: 'Xóa tài khoản thành công' });
  } catch (error) {
    // Lỗi khóa ngoại thường có mã 547
    if (error.number === 547) {
      return res.status(400).json({ message: 'Không thể xóa vì tài khoản này đang được sử dụng ở nơi khác' });
    }
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};


// ================= INTERNSHIP PERIOD MANAGEMENT ================= //

export const getInternships = async (req, res) => {
  try {
    const pool = await connectDb();
    const result = await pool.request().query('SELECT * FROM DotThucTap ORDER BY id DESC');
    res.status(200).json({ data: result.recordset });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

export const createInternship = async (req, res) => {
  const { 
    ten_dot, 
    ngay_bd_de_xuat, ngay_kt_de_xuat, 
    ngay_bd_dang_ky, ngay_kt_dang_ky, 
    ngay_han_chot_bao_cao 
  } = req.body;
  
  try {
    const pool = await connectDb();
    await pool.request()
      .input('ten_dot', sql.NVarChar, ten_dot)
      .input('ngay_bd_de_xuat', sql.DateTime, ngay_bd_de_xuat)
      .input('ngay_kt_de_xuat', sql.DateTime, ngay_kt_de_xuat)
      .input('ngay_bd_dang_ky', sql.DateTime, ngay_bd_dang_ky)
      .input('ngay_kt_dang_ky', sql.DateTime, ngay_kt_dang_ky)
      .input('ngay_han_chot_bao_cao', sql.DateTime, ngay_han_chot_bao_cao)
      .query(`
        INSERT INTO DotThucTap (ten_dot, ngay_bd_de_xuat, ngay_kt_de_xuat, ngay_bd_dang_ky, ngay_kt_dang_ky, ngay_han_chot_bao_cao, trang_thai)
        VALUES (@ten_dot, @ngay_bd_de_xuat, @ngay_kt_de_xuat, @ngay_bd_dang_ky, @ngay_kt_dang_ky, @ngay_han_chot_bao_cao, 'DRAFT')
      `);
    res.status(201).json({ message: 'Tạo đợt thực tập thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

export const updateInternshipStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'ACTIVE', 'CLOSED', 'DRAFT'
  try {
    const pool = await connectDb();
    await pool.request()
      .input('id', sql.Int, id)
      .input('status', sql.VarChar, status)
      .query('UPDATE DotThucTap SET trang_thai = @status WHERE id = @id');
    res.status(200).json({ message: 'Cập nhật trạng thái thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
