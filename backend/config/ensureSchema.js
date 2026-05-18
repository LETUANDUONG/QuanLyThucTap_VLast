import { connectDb } from './database.js';

export const ensureSchema = async () => {
  try {
    const pool = await connectDb();

    await pool.request().query(`
      IF COL_LENGTH('NguoiDung', 'so_dien_thoai') IS NULL
        ALTER TABLE NguoiDung ADD so_dien_thoai varchar(20) NULL;

      IF COL_LENGTH('NguoiDung', 'dia_chi') IS NULL
        ALTER TABLE NguoiDung ADD dia_chi nvarchar(255) NULL;

      IF COL_LENGTH('DangKyDeTai', 'mo_ta_dang_ky') IS NULL
        ALTER TABLE DangKyDeTai ADD mo_ta_dang_ky nvarchar(max) NULL;

      IF COL_LENGTH('DangKyDeTai', 'muc_tieu_nghien_cuu') IS NULL
        ALTER TABLE DangKyDeTai ADD muc_tieu_nghien_cuu nvarchar(max) NULL;

      IF COL_LENGTH('DangKyDeTai', 'cong_nghe_de_xuat') IS NULL
        ALTER TABLE DangKyDeTai ADD cong_nghe_de_xuat nvarchar(500) NULL;

      IF COL_LENGTH('DeTai', 'tinh_trang_thuc_hien') IS NULL
        ALTER TABLE DeTai ADD tinh_trang_thuc_hien varchar(50) NULL CONSTRAINT DF_DeTai_TinhTrang DEFAULT ('CHUA_THUC_HIEN');

      IF OBJECT_ID('LichSuDeTai', 'U') IS NULL
        CREATE TABLE LichSuDeTai (
          id int IDENTITY(1,1) PRIMARY KEY,
          de_tai_id int NOT NULL,
          user_id int NULL,
          hanh_dong nvarchar(100) NOT NULL,
          noi_dung nvarchar(max) NULL,
          thoi_gian datetime NOT NULL DEFAULT GETDATE(),
          CONSTRAINT FK_LichSuDeTai_DeTai FOREIGN KEY (de_tai_id) REFERENCES DeTai(id),
          CONSTRAINT FK_LichSuDeTai_NguoiDung FOREIGN KEY (user_id) REFERENCES NguoiDung(id)
        );

      IF OBJECT_ID('TienDoDeTai', 'U') IS NULL
        CREATE TABLE TienDoDeTai (
          id int IDENTITY(1,1) PRIMARY KEY,
          dang_ky_id int NOT NULL,
          tieu_de nvarchar(255) NOT NULL,
          mo_ta nvarchar(max) NULL,
          trang_thai varchar(30) NOT NULL DEFAULT 'CHUA_LAM',
          han_hoan_thanh datetime NULL,
          ngay_cap_nhat datetime NOT NULL DEFAULT GETDATE(),
          nhan_xet_gv nvarchar(max) NULL,
          CONSTRAINT FK_TienDo_DangKy FOREIGN KEY (dang_ky_id) REFERENCES DangKyDeTai(id)
        );

      IF OBJECT_ID('LichHen', 'U') IS NULL
        CREATE TABLE LichHen (
          id int IDENTITY(1,1) PRIMARY KEY,
          dang_ky_id int NOT NULL,
          giang_vien_id int NOT NULL,
          sinh_vien_id int NOT NULL,
          tieu_de nvarchar(255) NOT NULL,
          noi_dung nvarchar(max) NULL,
          thoi_gian_bat_dau datetime NOT NULL,
          dia_diem nvarchar(255) NULL,
          trang_thai varchar(30) NOT NULL DEFAULT 'SAP_DIEN_RA',
          tao_luc datetime NOT NULL DEFAULT GETDATE(),
          CONSTRAINT FK_LichHen_DangKy FOREIGN KEY (dang_ky_id) REFERENCES DangKyDeTai(id),
          CONSTRAINT FK_LichHen_GiangVien FOREIGN KEY (giang_vien_id) REFERENCES NguoiDung(id),
          CONSTRAINT FK_LichHen_SinhVien FOREIGN KEY (sinh_vien_id) REFERENCES NguoiDung(id)
        );

      IF OBJECT_ID('ChiTieuGiangVien', 'U') IS NULL
        CREATE TABLE ChiTieuGiangVien (
          id int IDENTITY(1,1) PRIMARY KEY,
          giang_vien_id int NOT NULL,
          dot_thuc_tap_id int NULL,
          so_luong_toi_da int NOT NULL DEFAULT 20,
          so_luong_da_dang_ky int NOT NULL DEFAULT 0,
          version int NOT NULL DEFAULT 1,
          tao_luc datetime NOT NULL DEFAULT GETDATE(),
          cap_nhat_luc datetime NOT NULL DEFAULT GETDATE(),
          CONSTRAINT FK_ChiTieu_GiangVien FOREIGN KEY (giang_vien_id) REFERENCES NguoiDung(id),
          CONSTRAINT UQ_ChiTieu UNIQUE(giang_vien_id, dot_thuc_tap_id)
        );

      IF OBJECT_ID('DangKyHuongDan', 'U') IS NULL
        CREATE TABLE DangKyHuongDan (
          id int IDENTITY(1,1) PRIMARY KEY,
          sinh_vien_id int NOT NULL,
          giang_vien_id int NOT NULL,
          dot_thuc_tap_id int NULL,
          thoi_gian_dang_ky datetime NOT NULL DEFAULT GETDATE(),
          CONSTRAINT FK_DangKyHD_SinhVien FOREIGN KEY (sinh_vien_id) REFERENCES NguoiDung(id),
          CONSTRAINT FK_DangKyHD_GiangVien FOREIGN KEY (giang_vien_id) REFERENCES NguoiDung(id),
          CONSTRAINT UQ_DangKyHD UNIQUE(sinh_vien_id, dot_thuc_tap_id)
        );
    `);
    console.log('✅ Schema đã được kiểm tra và cập nhật thành công');
  } catch (error) {
    console.error('❌ Lỗi ensureSchema:', error.message);
    throw error;
  }
};
