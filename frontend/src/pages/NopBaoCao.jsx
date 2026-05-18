import React, { useState } from 'react';
import { Card, Button, Table, Modal, Form, Input, Select, message, Tabs, Space } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api';
import { useParams } from 'react-router-dom';

const NopBaoCao = ({ dangKyId: propDangKyId }) => {
  const { id: paramDangKyId } = useParams();
  const dangKyId = propDangKyId || paramDangKyId;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const queryClient = useQueryClient();

  // Lấy lịch sử báo cáo
  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports', dangKyId],
    queryFn: async () => {
      const res = await apiClient.get(`/reports/${dangKyId}`);
      return res.data.data;
    }
  });

  const { data: progressItems, isLoading: isProgressLoading } = useQuery({
    queryKey: ['progressItems', dangKyId],
    queryFn: async () => {
      const res = await apiClient.get(`/progress/${dangKyId}`);
      return res.data.data;
    }
  });

  const onFinish = async (values) => {
    try {
      await apiClient.post('/reports/submit', { ...values, dang_ky_id: dangKyId });
      message.success('Đã nộp bài!');
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['reports', dangKyId] });
    } catch (err) { message.error('Lỗi nộp bài'); }
  };

  const submitProgress = async (values) => {
    try {
      await apiClient.post(`/progress/${dangKyId}`, values);
      message.success('Đã cập nhật tiến độ!');
      setIsProgressModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['progressItems', dangKyId] });
    } catch (err) {
      message.error('Lỗi cập nhật tiến độ');
    }
  };

  return (
    <Card title="Tiến độ thực tập & Báo cáo">
      <Tabs
        items={[
          {
            key: 'progress',
            label: 'Mốc tiến độ',
            children: (
              <>
                <Button type="primary" onClick={() => setIsProgressModalOpen(true)} style={{ marginBottom: 20 }}>Cập nhật tiến độ</Button>
                <Table
                  dataSource={progressItems}
                  loading={isProgressLoading}
                  rowKey="id"
                  columns={[
                    { title: 'Nội dung', dataIndex: 'tieu_de' },
                    { title: 'Mô tả', dataIndex: 'mo_ta' },
                    { title: 'Trạng thái', dataIndex: 'trang_thai' },
                    { title: 'Nhận xét GV', dataIndex: 'nhan_xet_gv' },
                  ]}
                />
              </>
            ),
          },
          {
            key: 'reports',
            label: 'Báo cáo định kỳ',
            children: (
              <>
                <Button type="primary" onClick={() => setIsModalOpen(true)} style={{ marginBottom: 20 }}>Nộp báo cáo mới</Button>
                <Table
                  dataSource={reports}
                  loading={isLoading}
                  rowKey="id"
                  columns={[
                    { title: 'Giai đoạn', dataIndex: 'loai_bao_cao' },
                    { title: 'Ngày nộp', dataIndex: 'thoi_gian_nop', render: (date) => new Date(date).toLocaleDateString() },
                    { title: 'Nhận xét GV', dataIndex: 'nhan_xet_gv' },
                    { title: 'Điểm', dataIndex: 'diem_so' }
                  ]}
                />
              </>
            ),
          },
        ]}
      />
      <Modal title="Nộp báo cáo" open={isModalOpen} onCancel={() => setIsModalOpen(false)} footer={null}>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item name="loai_bao_cao" label="Giai đoạn"><Select options={[{value:'TUAN', label:'Hàng tuần'}, {value:'GIUA_KY', label:'Giữa kỳ'}]} /></Form.Item>
          <Form.Item name="noi_dung" label="Tóm tắt công việc"><Input.TextArea /></Form.Item>
          <Form.Item name="link" label="Link tài liệu (Drive/GitHub)"><Input /></Form.Item>
          <Button type="primary" htmlType="submit" block>Gửi báo cáo</Button>
        </Form>
      </Modal>
      <Modal title="Cập nhật tiến độ" open={isProgressModalOpen} onCancel={() => setIsProgressModalOpen(false)} footer={null}>
        <Form layout="vertical" onFinish={submitProgress}>
          <Form.Item name="tieu_de" label="Nội dung công việc" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="trang_thai" label="Trạng thái" initialValue="DANG_LAM">
            <Select options={[
              { value: 'CHUA_LAM', label: 'Chưa làm' },
              { value: 'DANG_LAM', label: 'Đang làm' },
              { value: 'HOAN_THANH', label: 'Hoàn thành' },
            ]} />
          </Form.Item>
          <Form.Item name="mo_ta" label="Mô tả chi tiết">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>Lưu tiến độ</Button>
        </Form>
      </Modal>
    </Card>
  );
};

export default NopBaoCao;
