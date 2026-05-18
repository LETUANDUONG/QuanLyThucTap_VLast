import React from 'react';
import { Card, Form, Input, Button, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { apiClient } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    try {
      const res = await apiClient.post('/auth/login', {
        email: values.email,
        password: values.password,
      });
      
      setAuth(res.data.user, res.data.token);
      message.success('Chào mừng ' + res.data.user.ho_ten);
      navigate('/dashboard');
    } catch (error) {
      message.error(error.response?.data?.message || 'Đăng nhập thất bại');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
      <Card title="HỆ THỐNG QUẢN LÝ ĐỀ TÀI" style={{ width: 400, textAlign: 'center' }}>
        <Form onFinish={onFinish}>
          <Form.Item name="email" rules={[{ required: true, message: 'Vui lòng nhập email!' }]}>
            <Input prefix={<UserOutlined />} placeholder="Email (duonglt@ptit.edu.vn)" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu (123456)" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>Đăng nhập</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;