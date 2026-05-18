import React from 'react';
import { Form, Input, InputNumber, Button, Select, Card, message } from 'antd';
import { apiClient } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';

const ThemDeTai = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const { data: users } = useQuery({
    queryKey: ['adminUsersForTopicForm'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/users');
      return res.data.data;
    },
    enabled: user?.role !== 'LECTURER',
  });

  const lecturerOptions = (users || [])
    .filter((item) => item.role === 'LECTURER')
    .map((item) => ({ value: item.id, label: `${item.ho_ten} - ${item.chuyen_mon || 'Giảng viên'}` }));

  const onFinish = async (values) => {
    try {
      await apiClient.post('/detai/create', values);
      message.success(user?.role === 'ADMIN' ? 'Đã tạo đề tài!' : 'Đã gửi đề tài chờ khoa duyệt!');
      navigate(user?.role === 'ADMIN' ? '/quan-ly-de-tai' : '/danh-sach-de-tai');
    } catch (error) {
      message.error('Lỗi khi thêm đề tài');
    }
  };

  return (
    <Card title={user?.role === 'STUDENT' ? 'Tự đề xuất đề tài mới' : 'Thêm đề tài thực tập mới'} style={{ maxWidth: 800, margin: '0 auto' }}>
      <Form layout="vertical" onFinish={onFinish}>
        <Form.Item name="ten_de_tai" label="Tên đề tài" rules={[{ required: true }]}>
          <Input placeholder="Nhập tên đề tài..." />
        </Form.Item>
        
        <Form.Item name="cong_nghe_su_dung" label="Công nghệ sử dụng">
          <Input placeholder="Ví dụ: React, Node.js, SQL Server" />
        </Form.Item>

        <Form.Item name="so_luong_toi_da" label="Số lượng sinh viên tối đa" initialValue={1}>
          <InputNumber min={1} max={5} />
        </Form.Item>

        {user?.role !== 'LECTURER' && (
          <Form.Item name="giang_vien_hd_id" label="Giảng viên hướng dẫn" rules={[{ required: true }]}>
            <Select options={lecturerOptions} placeholder="Chọn giảng viên hướng dẫn" />
          </Form.Item>
        )}

        <Form.Item name="mo_ta" label="Mô tả chi tiết">
          <Input.TextArea rows={4} />
        </Form.Item>

        <Form.Item name="muc_tieu" label="Mục tiêu nghiên cứu">
          <Input.TextArea rows={3} />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" block>{user?.role === 'ADMIN' ? 'Tạo đề tài' : 'Gửi đề xuất'}</Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default ThemDeTai;
