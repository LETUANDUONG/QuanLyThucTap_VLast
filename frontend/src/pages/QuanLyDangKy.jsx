import React, { useState } from 'react';
import { Table, Button, Space, Tag, message, Modal, Form, Input } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api';

const QuanLyDangKy = () => {
  const queryClient = useQueryClient();
  const [editingRequest, setEditingRequest] = useState(null);
  const [form] = Form.useForm();

  const { data: applicants, isLoading } = useQuery({
    queryKey: ['applicants'],
    queryFn: async () => {
      const res = await apiClient.get('/lecturer/registrations');
      return res.data.data;
    }
  });

  const mutation = useMutation({
    mutationFn: async ({ id, status, nhan_xet }) => {
      return apiClient.patch(`/lecturer/registration/${id}`, { status, nhan_xet });
    },
    onSuccess: () => {
      message.success('Đã cập nhật trạng thái!');
      queryClient.invalidateQueries({ queryKey: ['applicants'] });
    }
  });

  const columns = [
    { title: 'Sinh viên', dataIndex: 'ten_sinh_vien', key: 'name' },
    { title: 'MSSV', dataIndex: 'mssv', key: 'mssv' },
    { title: 'Đề tài đăng ký', dataIndex: 'ten_de_tai', key: 'topic' },
    { title: 'Mô tả đăng ký', dataIndex: 'mo_ta_dang_ky', ellipsis: true },
    { title: 'Mục tiêu', dataIndex: 'muc_tieu_nghien_cuu', ellipsis: true },
    { title: 'Công nghệ', dataIndex: 'cong_nghe_de_xuat' },
    { title: 'Trạng thái', dataIndex: 'trang_thai_thuc_hien', key: 'status',
      render: (status) => (
        <Tag color={status === 'DA_CHAP_NHAN' ? 'green' : status === 'TU_CHOI' ? 'red' : 'gold'}>
          {status}
        </Tag>
      )
    },
    { title: 'Thao tác', key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="primary" 
            disabled={record.trang_thai_thuc_hien !== 'CHO_DUYET'}
            onClick={() => mutation.mutate({ id: record.dang_ky_id, status: 'DA_CHAP_NHAN' })}
          >
            Duyệt
          </Button>
          <Button 
            danger 
            disabled={record.trang_thai_thuc_hien !== 'CHO_DUYET'}
            onClick={() => mutation.mutate({ id: record.dang_ky_id, status: 'TU_CHOI' })}
          >
            Từ chối
          </Button>
          <Button
            disabled={record.trang_thai_thuc_hien !== 'CHO_DUYET'}
            onClick={() => {
              setEditingRequest(record);
              form.resetFields();
            }}
          >
            Yêu cầu sửa
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Table columns={columns} dataSource={applicants} loading={isLoading} rowKey="dang_ky_id" />
      <Modal
        title={`Yêu cầu chỉnh sửa: ${editingRequest?.ten_sinh_vien || ''}`}
        open={!!editingRequest}
        onCancel={() => setEditingRequest(null)}
        onOk={() => form.submit()}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            mutation.mutate({
              id: editingRequest.dang_ky_id,
              status: 'YEU_CAU_CHINH_SUA',
              nhan_xet: values.nhan_xet,
            });
            setEditingRequest(null);
          }}
        >
          <Form.Item name="nhan_xet" label="Nội dung cần chỉnh sửa" rules={[{ required: true }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default QuanLyDangKy;
