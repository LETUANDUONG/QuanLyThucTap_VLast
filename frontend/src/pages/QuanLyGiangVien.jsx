import React, { useState } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  message,
  Space,
  Tag,
  Popconfirm,
  Card,
  Row,
  Col,
  Statistic,
  Select,
  Alert,
  Divider
} from 'antd';
import { EditOutlined, SaveOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api';

const QuanLyGiangVien = () => {
  const queryClient = useQueryClient();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();

  // Lấy danh sách giảng viên với slot
  const { data: lecturers = [], isLoading, refetch } = useQuery({
    queryKey: ['lecturersWithSlots'],
    queryFn: async () => {
      const res = await apiClient.get('/lecturer/list-with-slots');
      return res.data.data || [];
    },
  });

  // Lấy danh sách tất cả người dùng để filter giảng viên
  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/admin/users');
        return res.data.data || [];
      } catch {
        return [];
      }
    },
  });

  // Mutation cập nhật quota
  const updateQuotaMutation = useMutation({
    mutationFn: async (data) => {
      const res = await apiClient.patch('/admin/lecturer/quota', {
        giang_vien_id: data.giang_vien_id,
        so_luong_toi_da: data.so_luong_toi_da,
      });
      return res.data;
    },
    onSuccess: () => {
      message.success('Cập nhật quota thành công!');
      setIsModalVisible(false);
      form.resetFields();
      setEditingId(null);
      refetch();
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Cập nhật thất bại!');
    },
  });

  // Xử lý mở modal chỉnh sửa
  const handleEdit = (record) => {
    setEditingId(record.id);
    form.setFieldsValue({
      giang_vien_id: record.id,
      ho_ten: record.ho_ten,
      so_luong_toi_da: record.so_luong_toi_da || 20,
    });
    setIsModalVisible(true);
  };

  // Xử lý mở modal thêm mới
  const handleAdd = () => {
    setEditingId(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  // Xử lý submit form
  const handleSubmit = async (values) => {
    updateQuotaMutation.mutate({
      giang_vien_id: values.giang_vien_id,
      so_luong_toi_da: values.so_luong_toi_da,
    });
  };

  // Lọc để lấy danh sách giảng viên cho select
  const lecturesForSelect = allUsers
    .filter(u => u.role === 'LECTURER')
    .map(u => ({ label: u.ho_ten, value: u.id }));

  // Tính thống kê
  const totalLecturers = lecturers.length;
  const totalSlots = lecturers.reduce((sum, l) => sum + (l.so_luong_toi_da || 0), 0);
  const totalRegistered = lecturers.reduce((sum, l) => sum + (l.so_luong_da_dang_ky || 0), 0);
  const totalRemaining = totalSlots - totalRegistered;

  // Cấu hình cột bảng
  const columns = [
    {
      title: 'Mã',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: 'Họ tên',
      dataIndex: 'ho_ten',
      key: 'ho_ten',
      width: 150,
    },
    {
      title: 'Email',
      dataIndex: 'ten_dang_nhap',
      key: 'email',
      width: 180,
    },
    {
      title: 'Tổng Slot',
      dataIndex: 'so_luong_toi_da',
      key: 'so_luong_toi_da',
      width: 80,
      render: (text) => <Tag color="blue">{text || 0}</Tag>,
    },
    {
      title: 'Đã Đăng ký',
      dataIndex: 'so_luong_da_dang_ky',
      key: 'so_luong_da_dang_ky',
      width: 100,
      render: (text) => <Tag color="cyan">{text || 0}</Tag>,
    },
    {
      title: 'Còn lại',
      dataIndex: 'so_luong_con_lai',
      key: 'so_luong_con_lai',
      width: 80,
      render: (text, record) => {
        const soConLai = (record.so_luong_toi_da || 0) - (record.so_luong_da_dang_ky || 0);
        let color = 'green';
        if (soConLai === 0) color = 'red';
        else if (soConLai <= 3) color = 'orange';
        return <Tag color={color}>{soConLai}</Tag>;
      },
    },
    {
      title: 'Tỉ lệ',
      dataIndex: 'percentage',
      key: 'percentage',
      width: 120,
      render: (_, record) => {
        const total = record.so_luong_toi_da || 0;
        const registered = record.so_luong_da_dang_ky || 0;
        const percentage = total > 0 ? Math.round((registered / total) * 100) : 0;
        return (
          <div>
            <div>{percentage}%</div>
            <div style={{ fontSize: '12px', color: '#999' }}>
              {registered}/{total}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Sửa
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '20px' }}>
      <h1>Quản lý Slot Giảng viên</h1>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Điều chỉnh số lượng sinh viên tối đa mà mỗi giảng viên có thể hướng dẫn
      </p>

      {/* Thống kê */}
      <Card style={{ marginBottom: '20px' }}>
        <Row gutter={16}>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Tổng giảng viên"
              value={totalLecturers}
              prefix="👨‍🏫"
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Tổng Slot"
              value={totalSlots}
              prefix="📊"
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Đã đăng ký"
              value={totalRegistered}
              prefix="✅"
              valueStyle={{ color: '#faad14' }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Còn lại"
              value={totalRemaining}
              prefix="⏳"
              valueStyle={{ color: totalRemaining === 0 ? '#f5222d' : '#1890ff' }}
            />
          </Col>
        </Row>
      </Card>

      <Alert
        message="💡 Mẹo: Tăng quota cho giảng viên hot để sinh viên có thêm lựa chọn"
        type="info"
        showIcon
        style={{ marginBottom: '20px' }}
      />

      <Divider />

      {/* Bảng danh sách */}
      <Table
        columns={columns}
        dataSource={lecturers}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 1200 }}
      />

      {/* Modal chỉnh sửa/thêm */}
      <Modal
        title={editingId ? 'Cập nhật Slot Giảng viên' : 'Thêm Slot cho Giảng viên'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
          setEditingId(null);
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Form.Item
            name="giang_vien_id"
            label="Giảng viên"
            rules={[{ required: true, message: 'Vui lòng chọn giảng viên' }]}
          >
            <Select
              placeholder="Chọn giảng viên"
              options={lecturesForSelect}
              disabled={!!editingId}
            />
          </Form.Item>

          <Form.Item
            name="so_luong_toi_da"
            label="Số lượng tối đa (Slot)"
            rules={[
              { required: true, message: 'Vui lòng nhập số lượng' },
              {
                pattern: /^[0-9]+$/,
                message: 'Phải là số nguyên dương',
              },
            ]}
          >
            <InputNumber
              min={1}
              max={999}
              placeholder="Ví dụ: 20"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={updateQuotaMutation.isPending}>
              <SaveOutlined /> Lưu
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default QuanLyGiangVien;
