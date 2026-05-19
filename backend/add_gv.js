import { connectDb, sql } from './config/database.js';

async function addLecturers() {
  const pool = await connectDb();
  try {
    await pool.request().query(`
      INSERT INTO NguoiDung (ma_so, ho_ten, email, mat_khau, role, chuyen_mon)
      VALUES 
      ('GV001', N'Trần Văn An', 'tranvanan@example.com', '123456', 'LECTURER', N'Khoa học máy tính'),
      ('GV002', N'Lê Thị Bích', 'lethibich@example.com', '123456', 'LECTURER', N'Kỹ thuật phần mềm'),
      ('GV003', N'Nguyễn Hoàng Dũng', 'nguyenhoangdung@example.com', '123456', 'LECTURER', N'Mạng máy tính'),
      ('GV004', N'Phạm Minh Châu', 'phamminhchau@example.com', '123456', 'LECTURER', N'Hệ thống thông tin')
    `);
    console.log('Thêm GV thành công');
  } catch(e) {
    console.error('Lỗi:', e.message);
  }
  process.exit();
}

addLecturers();
