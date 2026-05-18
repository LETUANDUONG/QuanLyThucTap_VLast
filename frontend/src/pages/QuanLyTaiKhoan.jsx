import React, { useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Space, Popconfirm, message } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api';

const QuanLyTaiKhoan = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/users');
      return res.data.data;
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (values) => {
      if (editingUser) {
        return await apiClient.put(`/admin/users/${editingUser.id}`, values);
      }
      return await apiClient.post('/admin/users', values);
    },
    onSuccess: () => {
      message.success(editingUser ? 'Cập nhật thành công!' : 'Thêm mới thành công!');
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    },
    onError: (err) => {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => await apiClient.delete(`/admin/users/${id}`),
    onSuccess: () => {
      message.success('Xóa tài khoản thành công!');
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    },
    onError: (err) => {
      message.error(err.response?.data?.message || 'Không thể xóa!');
    }
  });

  const openModal = (record = null) => {
    setEditingUser(record);
    if (record) {
      form.setFieldsValue(record);
    } else {
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const onFinish = (values) => {
    saveMutation.mutate(values);
  };

  const columns = [
    { title: 'Mã số', dataIndex: 'ma_so' },
    { title: 'Họ tên', dataIndex: 'ho_ten' },
    { title: 'Email', dataIndex: 'email' },
    { title: 'Liên hệ', dataIndex: 'so_dien_thoai' },
    { title: 'Vai trò', dataIndex: 'role' },
    {
      title: 'Thao tác',
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => openModal(record)} />
          <Popconfirm title="Bạn có chắc chắn muốn xóa?" onConfirm={() => deleteMutation.mutate(record.id)}>
            <Button icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <Card title="Quản lý Tài khoản" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>Thêm Mới</Button>}>
      <Table 
        dataSource={users} 
        columns={columns} 
        rowKey="id" 
        loading={isLoading} 
      />

      <Modal
        title={editingUser ? "Chỉnh sửa Tài khoản" : "Thêm mới Tài khoản"}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saveMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="ma_so" label="Mã số"><Input /></Form.Item>
          <Form.Item name="ho_ten" label="Họ tên" rules={[{ required: true, message: 'Nhập họ tên' }]}><Input /></Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item>
          <Form.Item name="role" label="Vai trò" rules={[{ required: true }]}>
            <Select options={[
              { value: 'STUDENT', label: 'Sinh viên' },
              { value: 'LECTURER', label: 'Giảng viên' },
              { value: 'ADMIN', label: 'Giáo vụ (Admin)' }
            ]} />
          </Form.Item>
          <Form.Item name="lop" label="Lớp (Dành cho Sinh viên)"><Input /></Form.Item>
          <Form.Item name="khoa_hoc" label="Khóa học (Dành cho Sinh viên)"><Input /></Form.Item>
          <Form.Item name="chuyen_mon" label="Chuyên môn (Giảng viên)"><Input /></Form.Item>
          <Form.Item name="so_dien_thoai" label="Số điện thoại"><Input /></Form.Item>
          <Form.Item name="dia_chi" label="Địa chỉ / thông tin liên hệ khác"><Input /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default QuanLyTaiKhoan;
