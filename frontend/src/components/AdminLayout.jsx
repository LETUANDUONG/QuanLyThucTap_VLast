import React, { useState } from 'react';
import { Layout, Menu, theme, Typography, Dropdown, Avatar, Space, Badge, Popover, Empty } from 'antd';
import { 
  DashboardOutlined, 
  BookOutlined, 
  UserOutlined, 
  FileTextOutlined, 
  PlusCircleOutlined, 
  SettingOutlined,
  BellOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/api';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const AdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore(); // Lấy user từ Store
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();

  // Load Notifications
  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await apiClient.get('/notifications');
      return res.data.data;
    },
    refetchInterval: 30000 // Tự động load lại sau mỗi 30 giây
  });

  // Đếm số thông báo chưa đọc
  const unreadCount = notifications?.filter(n => !n.da_doc).length || 0;

  // Giao diện danh sách khi bấm vào chuông
  const notificationContent = (
    <div style={{ width: 300, maxHeight: 400, overflow: 'auto' }}>
      {(notifications || []).length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có thông báo" />
      ) : (
        notifications.map((item) => (
          <div
            key={item.id}
            style={{
              padding: '8px 0',
              borderBottom: '1px solid #f0f0f0',
              opacity: item.da_doc ? 0.6 : 1,
            }}
          >
            <div style={{ fontWeight: item.da_doc ? 'normal' : 'bold' }}>{item.tieu_de}</div>
            <div style={{ color: '#666', marginTop: 4 }}>{item.noi_dung}</div>
          </div>
        ))
      )}
    </div>
  );

  // PHÂN QUYỀN MENU: Dựa vào user.role để push các item tương ứng
  const menuItems = [
    // --- MENU CHO ADMIN ---
    ...(user?.role === 'ADMIN' ? [
      { key: '/dashboard', icon: <DashboardOutlined />, label: 'Thống kê Tổng quan' },
      { key: '/quan-ly-de-tai', icon: <BookOutlined />, label: 'Duyệt Đề tài' },
      { key: '/quan-ly-giang-vien', icon: <UserOutlined />, label: 'Quản lý Giảng viên' },
      { key: '/quan-ly-dot', icon: <SettingOutlined />, label: 'Quản lý Đợt thực tập' },
      { key: '/quan-ly-tai-khoan', icon: <UserOutlined />, label: 'Quản lý Tài khoản' },
    ] : []),

    // --- MENU CHO GIẢNG VIÊN ---
    ...(user?.role === 'LECTURER' ? [
      { key: '/dashboard', icon: <DashboardOutlined />, label: 'Thống kê Của tôi' },
      { key: '/quan-ly-de-tai', icon: <BookOutlined />, label: 'Đề tài của tôi' },
      { key: '/sinh-vien', icon: <UserOutlined />, label: 'Duyệt Đăng ký' },
      { key: '/cham-diem', icon: <FileTextOutlined />, label: 'Chấm điểm Báo cáo' },
      { key: '/lich-hen', icon: <CalendarOutlined />, label: 'Lịch hẹn' },
    ] : []),

    // --- MENU CHO SINH VIÊN ---
    ...(user?.role === 'STUDENT' ? [
      { key: '/danh-sach-giang-vien', icon: <UserOutlined />, label: 'Chọn Giảng viên' },
      { key: '/danh-sach-de-tai', icon: <BookOutlined />, label: 'Đăng ký Đề tài' },
      { key: '/them-de-tai', icon: <PlusCircleOutlined />, label: 'Tự đề xuất Đề tài' },
      { key: '/tien-do', icon: <FileTextOutlined />, label: 'Tiến độ & Nộp bài' },
      { key: '/lich-hen', icon: <CalendarOutlined />, label: 'Lịch hẹn' },
    ] : []),
  ];

  // Nút đăng xuất góc phải
  const userMenu = {
    items: [
      { key: 'logout', label: 'Đăng xuất', onClick: () => { logout(); navigate('/login'); } }
    ]
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)', borderRadius: 6 }} />
        <Menu theme="dark" mode="inline" selectedKeys={[location.pathname]} items={menuItems} onClick={({ key }) => navigate(key)} />
      </Sider>

      <Layout>
        <Header style={{ padding: '0 24px', background: colorBgContainer, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <Title level={4} style={{ margin: 0 }}>Hệ thống Quản lý Đề tài</Title>
           
           {/* THÔNG TIN USER GÓC PHẢI */}
           <Space size="large">
              <Popover placement="bottomRight" title="Thông báo" content={notificationContent} trigger="click">
                <Badge count={unreadCount} style={{ cursor: 'pointer' }}>
                  <BellOutlined style={{ fontSize: '20px', cursor: 'pointer' }} />
                </Badge>
              </Popover>
              
              <Dropdown menu={userMenu} placement="bottomRight">
                <Space style={{ cursor: 'pointer' }}>
                  <Avatar style={{ backgroundColor: '#1890ff' }}>{user?.ho_ten?.charAt(0) || 'U'}</Avatar>
                  <span style={{ fontWeight: 500 }}>{user?.ho_ten} ({user?.role})</span>
                </Space>
              </Dropdown>
           </Space>
        </Header>

        <Content style={{ margin: '16px' }}>
          <div style={{ padding: 24, minHeight: 360, background: colorBgContainer, borderRadius: borderRadiusLG }}>
            <Outlet /> 
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
