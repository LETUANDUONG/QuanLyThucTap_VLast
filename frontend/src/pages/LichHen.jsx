import React, { useMemo, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Tag, Space, message } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api';
import { useAuthStore } from '../store/authStore';
import dayjs from 'dayjs';

const LichHen = () => {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: async () => {
      const res = await apiClient.get('/appointments');
      return res.data.data;
    },
  });

  const { data: applicants } = useQuery({
    queryKey: ['applicantsForAppointments'],
    queryFn: async () => {
      const res = await apiClient.get('/lecturer/registrations');
      return res.data.data;
    },
    enabled: user?.role === 'LECTURER',
  });

  const { data: myRegistration } = useQuery({
    queryKey: ['myRegistration'],
    queryFn: async () => {
      const res = await apiClient.get('/student/my-registration');
      return res.data.data;
    },
    enabled: user?.role === 'STUDENT',
    retry: false,
  });

  const registrationOptions = useMemo(() => {
    if (user?.role === 'LECTURER') {
      return (applicants || [])
        .filter((item) => ['DA_CHAP_NHAN', 'DANG_THUC_HIEN'].includes(item.trang_thai_thuc_hien))
        .map((item) => ({
          value: item.dang_ky_id,
          label: `${item.ten_sinh_vien} - ${item.ten_de_tai}`,
        }));
    }

    return myRegistration ? [{ value: myRegistration.id, label: 'Đề tài hiện tại' }] : [];
  }, [applicants, myRegistration, user?.role]);

  const createMutation = useMutation({
    mutationFn: (values) => apiClient.post('/appointments', values),
    onSuccess: () => {
      message.success('Đã tạo lịch hẹn');
      setOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (err) => message.error(err.response?.data?.message || 'Không thể tạo lịch hẹn'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => apiClient.patch(`/appointments/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] }),
  });

  const columns = [
    { title: 'Tiêu đề', dataIndex: 'tieu_de' },
    { title: 'Đề tài', dataIndex: 'ten_de_tai' },
    { title: 'Sinh viên', dataIndex: 'ten_sinh_vien' },
    { title: 'Giảng viên', dataIndex: 'ten_giang_vien' },
    { title: 'Thời gian', dataIndex: 'thoi_gian_bat_dau', render: (v) => dayjs(v).format('DD/MM/YYYY HH:mm') },
    { title: 'Địa điểm', dataIndex: 'dia_diem' },
    { title: 'Trạng thái', dataIndex: 'trang_thai', render: (v) => <Tag color={v === 'HOAN_THANH' ? 'green' : v === 'HUY' ? 'red' : 'blue'}>{v}</Tag> },
    {
      title: 'Thao tác',
      render: (_, record) => (
        <Space>
          <Button onClick={() => statusMutation.mutate({ id: record.id, status: 'HOAN_THANH' })}>Hoàn thành</Button>
          <Button danger onClick={() => statusMutation.mutate({ id: record.id, status: 'HUY' })}>Hủy</Button>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Lịch hẹn sinh viên - giảng viên"
      extra={<Button type="primary" icon={<CalendarOutlined />} onClick={() => setOpen(true)}>Tạo lịch hẹn</Button>}
    >
      <Table columns={columns} dataSource={appointments} rowKey="id" loading={isLoading} />

      <Modal title="Tạo lịch hẹn" open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={(values) => createMutation.mutate(values)}>
          <Form.Item name="dang_ky_id" label="Đăng ký đề tài" rules={[{ required: true }]}>
            <Select options={registrationOptions} />
          </Form.Item>
          <Form.Item name="tieu_de" label="Tiêu đề" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="thoi_gian_bat_dau" label="Thời gian" rules={[{ required: true }]}>
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item name="dia_diem" label="Địa điểm">
            <Input />
          </Form.Item>
          <Form.Item name="noi_dung" label="Nội dung">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default LichHen;
