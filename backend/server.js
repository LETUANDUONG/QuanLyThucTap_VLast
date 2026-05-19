import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { dangKyDeTai, getDanhSachDeTai, getDashboardStats, createDeTai, getApplicants, updateStatus, getMyRegistration, cancelRegistration } from './controllers/detaiController.js';
import { ensureSchema } from './config/ensureSchema.js';
import {
  getAllTopics,
  getLecturerTopics,
  updateTopicApproval,
  updateTopicProgressStatus,
  deleteTopic,
  getTopicHistory,
  getProgressItems,
  saveProgressItem,
  getAppointments,
  createAppointment,
  updateAppointmentStatus
} from './controllers/topicWorkflowController.js';
import { login } from './controllers/authController.js';
import { submitReport, gradeReport, getReports, getPendingReports } from './controllers/reportController.js';
import { getMyNotifications } from './controllers/notificationController.js';
import { getUsers, createUser, updateUser, deleteUser, getInternships, createInternship, updateInternshipStatus } from './controllers/adminController.js';
import { getLecturersWithSlots, registerLecturer, getMyLecturerRegistration, updateLecturerQuota, cancelLecturerRegistration } from './controllers/lecturerController.js';
import { authMiddleware } from './middleware/authMiddleware.js';

const app = express();

await ensureSchema();

// Middleware
app.use(cors()); // Cho phép Frontend (React) gọi API
app.use(express.json()); // Để đọc được dữ liệu JSON gửi lên từ req.body

// 1. API Xác thực (Không cần middleware)
app.post('/api/auth/login', login);

// ================= CÁC API CẦN BẢO VỆ ================= //
app.use('/api', authMiddleware);

// Thử nghiệm API đăng ký đề tài
app.post('/api/detai/register', dangKyDeTai);
app.delete('/api/detai/cancel/:id', cancelRegistration);
// 2. API Lấy danh sách đề tài (MỚI)
app.get('/api/detai/available', getDanhSachDeTai);
app.get('/api/student/my-registration', getMyRegistration);

// 3. API Lấy dữ liệu thống kê (MỚI)
app.get('/api/dashboard/stats', getDashboardStats);

// 4. API Tạo đề tài (MỚI)
app.post('/api/detai/create', createDeTai);
app.get('/api/detai/all', getAllTopics);
app.get('/api/detai/my-topics', getLecturerTopics);
app.patch('/api/detai/:id/approval', updateTopicApproval);
app.patch('/api/detai/:id/progress-status', updateTopicProgressStatus);
app.delete('/api/detai/:id', deleteTopic);
app.get('/api/detai/:id/history', getTopicHistory);

// 5. API Giảng viên quản lý đăng ký
app.get('/api/lecturer/registrations', getApplicants);
app.patch('/api/lecturer/registration/:id', updateStatus);

// 5.5 API Sinh viên đăng ký hướng dẫn từ giảng viên (FCFS)
app.get('/api/lecturer/list-with-slots', getLecturersWithSlots);
app.post('/api/lecturer/register', registerLecturer);
app.get('/api/student/my-lecturer', getMyLecturerRegistration);
app.delete('/api/student/cancel-lecturer', cancelLecturerRegistration);
app.patch('/api/admin/lecturer/quota', updateLecturerQuota); // Admin điều chỉnh quota

// 6. API Báo cáo
app.post('/api/reports/submit', submitReport);
app.patch('/api/reports/grade', gradeReport);
app.get('/api/reports/:dangKyId', getReports);
app.get('/api/lecturer/pending-reports', getPendingReports);

// 6.5 API Tiến độ và lịch hẹn
app.get('/api/progress/:dangKyId', getProgressItems);
app.post('/api/progress/:dangKyId', saveProgressItem);
app.get('/api/appointments', getAppointments);
app.post('/api/appointments', createAppointment);
app.patch('/api/appointments/:id/status', updateAppointmentStatus);

// 7. API Thông báo
app.get('/api/notifications', getMyNotifications);

// 8. API Admin (Tài khoản)
app.get('/api/admin/users', getUsers);
app.post('/api/admin/users', createUser);
app.put('/api/admin/users/:id', updateUser);
app.delete('/api/admin/users/:id', deleteUser);

// 9. API Admin (Đợt thực tập)
app.get('/api/admin/internships', getInternships);
app.post('/api/admin/internships', createInternship);
app.patch('/api/admin/internships/:id/status', updateInternshipStatus);

// Chạy server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});
