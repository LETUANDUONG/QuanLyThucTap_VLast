import React, { useState } from 'react';
import { Card, Table, Button, Space, Tag, Modal, Form, Input, Select, Popconfirm, message } from 'antd';
import { CheckOutlined, CloseOutlined, DeleteOutlined, HistoryOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api';
import { useAuthStore } from '../store/authStore';
import dayjs from 'dayjs';

const approvalColors = {
  DA_DUYET: 'green',
  CHO_DUYET: 'gold',
  TU_CHOI: 'red',
};

const progressOptions = [
  { value: 'CHUA_THUC_HIEN', label: 'Chưa thực hiện' },
  { value: 'DANG_THUC_HIEN', label: 'Đang thực hiện' },
  { value: 'TAM_DUNG', label: 'Tạm dừng' },
  { value: 'HOAN_THANH', label: 'Hoàn thành' },
];

const QuanLyDeTai = () => {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [historyTopic, setHistoryTopic] = useState(null);

  const queryKey = user?.role === 'ADMIN' ? ['allTopics'] : ['myTopics'];
  const { data: topics, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await apiClient.get(user?.role === 'ADMIN' ? '/detai/all' : '/detai/my-topics');
      return res.data.data;
    },
  });

  const { data: history } = useQuery({
    queryKey: ['topicHistory', historyTopic?.id],
    queryFn: async () => {
      const res = await apiClient.get(`/detai/${historyTopic.id}/history`);
      return res.data.data;
    },
    enabled: !!historyTopic,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const approvalMutation = useMutation({
    mutationFn: ({ id, status }) => apiClient.patch(`/detai/${id}/approval`, { status }),
    onSuccess: () => {
      message.success('Đã cập nhật trạng thái duyệt');
      invalidate();
    },
  });

  const progressMutation = useMutation({
    mutationFn: ({ id, status }) => apiClient.patch(`/detai/${id}/progress-status`, { status }),
    onSuccess: () => {
      message.success('Đã cập nhật tình trạng');
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/detai/${id}`),
    onSuccess: () => {
      message.success('Đã loại bỏ đề tài');
      invalidate();
    },
    onError: (err) => message.error(err.response?.data?.message || 'Không thể loại bỏ đề tài'),
  });

  const columns = [
    { title: 'Tên đề tài', dataIndex: 'ten_de_tai' },
    { title: 'Giảng viên', dataIndex: 'ten_giang_vien' },
    { title: 'Người đề xuất', dataIndex: 'nguoi_de_xuat' },
    {
      title: 'Duyệt',
      dataIndex: 'trang_thai_duyet',
      render: (status) => <Tag color={approvalColors[status] || 'default'}>{status}</Tag>,
    },
    {
      title: 'Tình trạng',
      dataIndex: 'tinh_trang_thuc_hien',
      render: (status, record) => (
        <Select
          value={status || 'CHUA_THUC_HIEN'}
          options={progressOptions}
          style={{ width: 170 }}
          onChange={(value) => progressMutation.mutate({ id: record.id, status: value })}
        />
      ),
    },
    {
      title: 'Thao tác',
      render: (_, record) => (
        <Space>
          {user?.role === 'ADMIN' && (
            <>
              <Button icon={<CheckOutlined />} onClick={() => approvalMutation.mutate({ id: record.id, status: 'DA_DUYET' })} />
              <Button danger icon={<CloseOutlined />} onClick={() => approvalMutation.mutate({ id: record.id, status: 'TU_CHOI' })} />
            </>
          )}
          <Button icon={<HistoryOutlined />} onClick={() => setHistoryTopic(record)} />
          <Popconfirm title="Loại bỏ đề tài này?" onConfirm={() => deleteMutation.mutate(record.id)}>
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card title={user?.role === 'ADMIN' ? 'Duyệt và quản lý đề tài' : 'Đề tài của tôi'}>
      <Table columns={columns} dataSource={topics} rowKey="id" loading={isLoading} />

      <Modal
        title={`Lịch sử: ${historyTopic?.ten_de_tai || ''}`}
        open={!!historyTopic}
        onCancel={() => setHistoryTopic(null)}
        footer={null}
      >
        <Table
          size="small"
          dataSource={history}
          rowKey="id"
          pagination={false}
          columns={[
            { title: 'Thời gian', dataIndex: 'thoi_gian', render: (v) => dayjs(v).format('DD/MM/YYYY HH:mm') },
            { title: 'Hành động', dataIndex: 'hanh_dong' },
            { title: 'Nội dung', dataIndex: 'noi_dung' },
            { title: 'Người làm', dataIndex: 'ho_ten' },
          ]}
        />
      </Modal>
    </Card>
  );
};

export default QuanLyDeTai;
