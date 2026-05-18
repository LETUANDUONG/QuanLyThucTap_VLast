import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import AdminLayout from './components/AdminLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DanhSachDeTai from './pages/DanhSachDeTai';
import DanhSachGiangVien from './pages/DanhSachGiangVien';
import QuanLyGiangVien from './pages/QuanLyGiangVien';
import ThemDeTai from './pages/ThemDeTai';
import QuanLyDangKy from './pages/QuanLyDangKy';
import NopBaoCao from './pages/NopBaoCao';
import QuanLyTaiKhoan from './pages/QuanLyTaiKhoan';
import QuanLyDot from './pages/QuanLyDot';
import TienDo from './pages/TienDo';
import ChamDiem from './pages/ChamDiem';
import QuanLyDeTai from './pages/QuanLyDeTai';
import LichHen from './pages/LichHen';

function App() {
  const token = useAuthStore((state) => state.token);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!token ? <Login /> : <Navigate to="/dashboard" />} />
        
        {/* Chỉ cho vào các trang này nếu đã có token */}
        <Route path="/" element={token ? <AdminLayout /> : <Navigate to="/login" />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="danh-sach-de-tai" element={<DanhSachDeTai />} />
          <Route path="danh-sach-giang-vien" element={<DanhSachGiangVien />} />
          <Route path="quan-ly-giang-vien" element={<QuanLyGiangVien />} />
          <Route path="them-de-tai" element={<ThemDeTai />} />
          <Route path="sinh-vien" element={<QuanLyDangKy />} />
          <Route path="bao-cao/:id" element={<NopBaoCao />} />
          <Route path="quan-ly-tai-khoan" element={<QuanLyTaiKhoan />} />
          <Route path="quan-ly-dot" element={<QuanLyDot />} />
          <Route path="tien-do" element={<TienDo />} />
          <Route path="cham-diem" element={<ChamDiem />} />
          <Route path="quan-ly-de-tai" element={<QuanLyDeTai />} />
          <Route path="lich-hen" element={<LichHen />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
