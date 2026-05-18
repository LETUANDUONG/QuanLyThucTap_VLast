import React, { useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, DatePicker, Select, Space, message, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api';
import dayjs from 'dayjs';

const QuanLyDot = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: internships, isLoading } = useQuery({
    queryKey: ['adminInternships'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/internships');
      return res.data.data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (values) => {
      // Format dates
      const formattedValues = {
        ten_dot: values.ten_dot,
        ngay_bd_de_xuat: values.ngay_bd_de_xuat.toISOString(),
        ngay_kt_de_xuat: values.ngay_kt_de_xuat.toISOString(),
        ngay_bd_dang_ky: values.ngay_bd_dang_ky.toISOString(),
        ngay_kt_dang_ky: values.ngay_kt_dang_ky.toISOString(),
        ngay_han_chot_bao_cao: values.ngay_han_chot_bao_cao.toISOString(),
      };
      return await apiClient.post('/admin/internships', formattedValues);
    },
    onSuccess: () => {
      message.success('Thêm đợt thực tập thành công!');
      setIsModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['adminInternships'] });
    },
    onError: (err) => message.error(err.response?.data?.message || 'Có lỗi xảy ra!')
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }) => await apiClient.patch(`/admin/internships/${id}/status`, { status }),
    onSuccess: () => {
      message.success('Cập nhật trạng thái thành công!');
      queryClient.invalidateQueries({ queryKey: ['adminInternships'] });
    },
    onError: (err) => message.error(err.response?.data?.message || 'Có lỗi xảy ra!')
  });

  const columns = [
    { title: 'Tên đợt', dataIndex: 'ten_dot' },
    { title: 'Đề xuất đề tài', render: (_, r) => `${dayjs(r.ngay_bd_de_xuat).format('DD/MM')} - ${dayjs(r.ngay_kt_de_xuat).format('DD/MM')}` },
    { title: 'Đăng ký đề tài', render: (_, r) => `${dayjs(r.ngay_bd_dang_ky).format('DD/MM')} - ${dayjs(r.ngay_kt_dang_ky).format('DD/MM')}` },
    { title: 'Hạn chót báo cáo', dataIndex: 'ngay_han_chot_bao_cao', render: (d) => dayjs(d).format('DD/MM/YYYY') },
    { 
      title: 'Trạng thái', 
      dataIndex: 'trang_thai',
      render: (status) => {
        let color = status === 'ACTIVE' ? 'green' : status === 'CLOSED' ? 'red' : 'default';
        return <Tag color={color}>{status}</Tag>;
      }
    },
    {
      title: 'Thao tác',
      render: (_, record) => (
        <Select 
          value={record.trang_thai} 
          onChange={(val) => statusMutation.mutate({ id: record.id, status: val })}
          style={{ width: 110 }}
          options={[
            { value: 'DRAFT', label: 'Bản nháp' },
            { value: 'ACTIVE', label: 'Hoạt động' },
            { value: 'CLOSED', label: 'Khóa' }
          ]}
        />
      )
    }
  ];

  return (
    <Card title="Quản lý Đợt thực tập" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>Thêm đợt mới</Button>}>
      <Table 
        dataSource={internships} 
        columns={columns} 
        rowKey="id" 
        loading={isLoading} 
      />

      <Modal
        title="Tạo Đợt Thực Tập Mới"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={(values) => createMutation.mutate(values)}>
          <Form.Item name="ten_dot" label="Tên đợt (VD: Thực tập cơ sở Kỳ 1 2026)" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="ngay_bd_de_xuat" label="Ngày bắt đầu Đề xuất Đề tài" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="ngay_kt_de_xuat" label="Ngày kết thúc Đề xuất Đề tài" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="ngay_bd_dang_ky" label="Ngày bắt đầu Sinh viên Đăng ký" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="ngay_kt_dang_ky" label="Ngày kết thúc Sinh viên Đăng ký" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="ngay_han_chot_bao_cao" label="Hạn chót Nộp báo cáo cuối kỳ" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default QuanLyDot;
