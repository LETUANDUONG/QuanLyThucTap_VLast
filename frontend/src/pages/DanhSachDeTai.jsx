// src/pages/DanhSachDeTai.jsx
import React, { useState } from 'react';
import { Table, Tag, Button, message, Alert, Space, Input, Modal, Form, Spin } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

const DanhSachDeTai = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [search, setSearch] = useState('');
  const [registeringTopic, setRegisteringTopic] = useState(null);
  const [form] = Form.useForm();

  // 1. API Lấy danh sách đề tài
  const { data: deTais, isLoading } = useQuery({
    queryKey: ['danhSachDeTai', search],
    queryFn: async () => {
      const res = await apiClient.get('/detai/available', { params: { search } });
      return res.data.data;
    },
  });

  // 1.5 API Lấy thông tin đăng ký hiện tại của sinh viên
  const { data: myRegistration } = useQuery({
    queryKey: ['myRegistration'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/student/my-registration');
        return res.data.data;
      } catch (err) {
        return null;
      }
    },
    retry: false
  });

  // 1.7 API Lấy thông tin giảng viên hướng dẫn đã chọn
  const { data: myLecturer, isLoading: loadingMyLecturer } = useQuery({
    queryKey: ['myLecturerRegistration'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/student/my-lecturer');
        return res.data.data;
      } catch (err) {
        return null;
      }
    },
    retry: false,
  });

  // 2. API Đăng ký đề tài
  const mutation = useMutation({
    mutationFn: async ({ deTaiId, values }) => {
    const res = await apiClient.post('/detai/register', {
      sinh_vien_id: user.id, // LẤY ID TỪ NGƯỜI DÙNG ĐANG LOGIN
      de_tai_id: deTaiId,
      ...values,
    });
    return res.data;
  },
    onSuccess: (data, variables) => {
      message.success(data.message);
      const deTaiId = variables.deTaiId;
      if (data.data?.id) {
        queryClient.setQueryData(['myRegistration'], {
          id: data.data.id,
          de_tai_id: deTaiId,
          trang_thai_thuc_hien: data.data.trang_thai_thuc_hien || 'CHO_DUYET',
        });
      }
      queryClient.setQueryData(['danhSachDeTai', search], (old = []) =>
        old.map((item) =>
          item.id === deTaiId
            ? { ...item, so_luong_da_dang_ky: item.so_luong_da_dang_ky + 1 }
            : item
        )
      );
      queryClient.invalidateQueries({ queryKey: ['danhSachDeTai'] }); 
      queryClient.invalidateQueries({ queryKey: ['myRegistration'] }); 
      setRegisteringTopic(null);
      form.resetFields();
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra!');
    },
  });

  // 3. API Hủy đăng ký
  const cancelMutation = useMutation({
    mutationFn: async (dkId) => {
      const res = await apiClient.delete(`/detai/cancel/${dkId}`);
      return res.data;
    },
    onSuccess: (data) => {
      message.success(data.message);
      const currentRegistration = queryClient.getQueryData(['myRegistration']);
      queryClient.setQueryData(['myRegistration'], null);
      if (currentRegistration?.de_tai_id) {
        queryClient.setQueryData(['danhSachDeTai', search], (old = []) =>
          old.map((item) =>
            item.id === currentRegistration.de_tai_id
              ? { ...item, so_luong_da_dang_ky: Math.max(0, item.so_luong_da_dang_ky - 1) }
              : item
          )
        );
      }
      queryClient.invalidateQueries({ queryKey: ['danhSachDeTai'] }); 
      queryClient.invalidateQueries({ queryKey: ['myRegistration'] }); 
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra!');
    },
  });

  // Cấu hình các cột cho Bảng Ant Design
  const columns = [
    { title: 'Tên đề tài', dataIndex: 'ten_de_tai', key: 'ten_de_tai' },
    { title: 'Công nghệ', dataIndex: 'cong_nghe_su_dung', key: 'cong_nghe_su_dung',
      render: (tech) => (
        <>
          {tech.split(',').map((tag) => (
            <Tag color="blue" key={tag}>{tag.trim()}</Tag>
          ))}
        </>
      ),
    },
    { title: 'Giảng viên', dataIndex: 'ten_giang_vien', key: 'ten_giang_vien' },
    { title: 'Số lượng', key: 'so_luong',
      render: (_, record) => `${record.so_luong_da_dang_ky} / ${record.so_luong_toi_da}`
    },
    { title: 'Hành động', key: 'action',
      render: (_, record) => {
        // Nếu đã đăng ký đề tài này
        if (myRegistration && myRegistration.de_tai_id === record.id) {
           return (
             <Button 
               danger 
               loading={cancelMutation.isPending}
               onClick={() => cancelMutation.mutate(myRegistration.id)}
             >
               Hủy Đăng ký
             </Button>
           );
        }
        
        // Nếu đã đăng ký đề tài KHÁC
        if (myRegistration && myRegistration.de_tai_id !== record.id) {
           return <Button disabled>Đăng ký</Button>;
        }

        // Mặc định
        return (
          <Button 
            type="primary" 
            loading={mutation.isPending && mutation.variables?.deTaiId === record.id}
            onClick={() => setRegisteringTopic(record)}
          >
            Đăng ký
          </Button>
        );
      },
    },
  ];

  if (loadingMyLecturer) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spin size="large" tip="Đang kiểm tra thông tin..." />
      </div>
    );
  }

  if (!myLecturer) {
    return (
      <div style={{ padding: '20px' }}>
        <h2>Danh sách đề tài đang mở</h2>
        <Alert
          message="Yêu cầu chọn giảng viên hướng dẫn"
          description={
            <Space direction="vertical" style={{ marginTop: 8 }}>
              <span>Bạn cần chọn giảng viên hướng dẫn trước khi đăng ký đề tài thực tập.</span>
              <Button type="primary" onClick={() => navigate('/danh-sach-giang-vien')}>
                Chọn Giảng Viên Hướng Dẫn
              </Button>
            </Space>
          }
          type="warning"
          showIcon
        />
      </div>
    );
  }

  return (
    <div>
      <h2>Danh sách đề tài đang mở</h2>
      <Input.Search
        placeholder="Tìm theo tên đề tài, công nghệ hoặc giảng viên"
        allowClear
        enterButton="Tìm"
        style={{ maxWidth: 520, marginBottom: 16 }}
        onSearch={(value) => setSearch(value)}
      />
      
      {myRegistration && (
        <Alert
          title="Thông báo: Bạn đã đăng ký 1 đề tài"
          description={
            <Space>
              <span>Bạn chỉ có thể đăng ký 1 đề tài duy nhất. Nếu muốn chọn đề tài khác, vui lòng hủy đề tài hiện tại.</span>
              <Button 
                danger 
                loading={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate(myRegistration.id)}
              >
                Hủy Đăng ký đề tài hiện tại
              </Button>
            </Space>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Table 
        columns={columns} 
        dataSource={deTais} 
        rowKey="id" 
        loading={isLoading} 
      />

      <Modal
        title={`Đăng ký: ${registeringTopic?.ten_de_tai || ''}`}
        open={!!registeringTopic}
        onCancel={() => setRegisteringTopic(null)}
        onOk={() => form.submit()}
        confirmLoading={mutation.isPending}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => mutation.mutate({ deTaiId: registeringTopic.id, values })}
        >
          <Form.Item name="mo_ta_dang_ky" label="Mô tả đề tài / cách bạn dự định thực hiện" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="muc_tieu_nghien_cuu" label="Mục tiêu nghiên cứu" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="cong_nghe_de_xuat" label="Công nghệ sử dụng" rules={[{ required: true }]}>
            <Input placeholder="Ví dụ: React, Node.js, SQL Server" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DanhSachDeTai;
