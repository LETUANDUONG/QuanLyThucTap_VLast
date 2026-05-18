import React, { useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Space, message, Tag } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api';
import dayjs from 'dayjs';

const ChamDiem = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: reports, isLoading } = useQuery({
    queryKey: ['pendingReports'],
    queryFn: async () => {
      const res = await apiClient.get('/lecturer/pending-reports');
      return res.data.data;
    }
  });

  const gradeMutation = useMutation({
    mutationFn: async (values) => {
      return await apiClient.patch('/reports/grade', {
        report_id: editingReport.report_id,
        nhan_xet: values.nhan_xet,
        diem: values.diem
      });
    },
    onSuccess: () => {
      message.success('Đã lưu điểm và nhận xét!');
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['pendingReports'] });
    },
    onError: (err) => message.error(err.response?.data?.message || 'Có lỗi xảy ra!')
  });

  const openModal = (record) => {
    setEditingReport(record);
    form.setFieldsValue({
      nhan_xet: record.nhan_xet_gv,
      diem: record.diem_so
    });
    setIsModalOpen(true);
  };

  const columns = [
    { title: 'Sinh viên', render: (_, r) => <>{r.ten_sinh_vien} <br/><small>{r.mssv}</small></> },
    { title: 'Đề tài', dataIndex: 'ten_de_tai' },
    { title: 'Giai đoạn', dataIndex: 'loai_bao_cao', render: (l) => <Tag color="blue">{l}</Tag> },
    { title: 'Ngày nộp', render: (_, r) => dayjs(r.thoi_gian_nop).format('DD/MM/YYYY HH:mm') },
    { title: 'Tài liệu', render: (_, r) => r.link_tai_lieu ? <a href={r.link_tai_lieu} target="_blank" rel="noreferrer">Xem Link</a> : 'Không có' },
    { 
      title: 'Điểm', 
      render: (_, r) => r.diem_so !== null ? <b style={{color: 'green'}}>{r.diem_so}</b> : <Tag color="warning">Chưa chấm</Tag>
    },
    {
      title: 'Thao tác',
      render: (_, record) => (
        <Button 
          type={record.diem_so !== null ? "default" : "primary"} 
          icon={<CheckOutlined />} 
          onClick={() => openModal(record)}
        >
          {record.diem_so !== null ? 'Sửa điểm' : 'Chấm điểm'}
        </Button>
      )
    }
  ];

  return (
    <Card title="Quản lý Chấm điểm Báo cáo">
      <Table 
        dataSource={reports} 
        columns={columns} 
        rowKey="report_id" 
        loading={isLoading} 
      />

      <Modal
        title={`Chấm điểm: ${editingReport?.ten_sinh_vien}`}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={gradeMutation.isPending}
      >
        <div style={{ marginBottom: 16, padding: 10, background: '#f5f5f5', borderRadius: 4 }}>
          <p><b>Giai đoạn:</b> {editingReport?.loai_bao_cao}</p>
          <p><b>Tóm tắt:</b> {editingReport?.noi_dung_tom_tat}</p>
        </div>
        <Form form={form} layout="vertical" onFinish={(values) => gradeMutation.mutate(values)}>
          <Form.Item name="diem" label="Điểm số (Hệ 10)" rules={[{ required: true, message: 'Vui lòng nhập điểm' }]}>
            <InputNumber min={0} max={10} step={0.5} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="nhan_xet" label="Nhận xét của Giảng viên">
            <Input.TextArea rows={4} placeholder="Nhập lời nhận xét cho báo cáo này..." />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default ChamDiem;
