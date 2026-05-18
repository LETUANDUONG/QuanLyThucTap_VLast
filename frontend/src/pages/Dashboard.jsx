// src/pages/Dashboard.jsx
import React from 'react';
import { Card, Row, Col, Statistic, Spin } from 'antd';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const Dashboard = () => {
  // Gọi API lấy dữ liệu thống kê
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const res = await apiClient.get('/dashboard/stats');
      return res.data.data;
    },
  });

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '50px auto' }} />;
  if (isError) return <div>Lỗi tải dữ liệu!</div>;

  const { tong_quan, tien_do } = data;

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card>
            <Statistic title="Tổng số đề tài đã duyệt" value={tong_quan.tong_de_tai} />
          </Card>
        </Col>
        <Col span={12}>
          <Card>
            <Statistic title="Sinh viên đã đăng ký" value={tong_quan.tong_sinh_vien_dang_ky} />
          </Card>
        </Col>
      </Row>

      <Card title="Biểu đồ trạng thái thực hiện">
        <div style={{ width: '100%', minWidth: 0, height: 300 }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <PieChart>
              <Pie
                data={tien_do}
                dataKey="so_luong"
                nameKey="trang_thai_thuc_hien"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {tien_do.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;
