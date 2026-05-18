import { connectDb, sql } from '../config/database.js';
import jwt from 'jsonwebtoken';

const SECRET_KEY = 'YOUR_SUPER_SECRET_KEY'; // Trong thực tế nên để ở file .env

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const pool = await connectDb();
    const result = await pool.request()
      .input('email', sql.VarChar, email)
      .input('password', sql.VarChar, password)
      .query('SELECT id, ho_ten, role, ma_so FROM NguoiDung WHERE email = @email AND mat_khau = @password');

    if (result.recordset.length === 0) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác!' });
    }

    const user = result.recordset[0];

    // Tạo Token (có hiệu lực trong 24 giờ)
    const token = jwt.sign(
      { id: user.id, role: user.role },
      SECRET_KEY,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      message: 'Đăng nhập thành công',
      token,
      user: {
        id: user.id,
        ho_ten: user.ho_ten,
        role: user.role,
        ma_so: user.ma_so
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};