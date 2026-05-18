import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Spin, Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';
import NopBaoCao from './NopBaoCao';

const TienDo = () => {
  const navigate = useNavigate();
  
  const { data: registration, isLoading, isError } = useQuery({
    queryKey: ['myRegistration'],
    queryFn: async () => {
      const res = await apiClient.get('/student/my-registration');
      return res.data.data;
    },
    retry: false
  });

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '50px auto' }} />;
  
  if (isError || !registration) {
    return (
      <Result
        status="warning"
        title="Bạn chưa đăng ký đề tài nào!"
        subTitle="Vui lòng quay lại trang danh sách để chọn đề tài thực tập."
        extra={<Button type="primary" onClick={() => navigate('/danh-sach-de-tai')}>Đăng ký ngay</Button>}
      />
    );
  }

  if (registration.trang_thai_thuc_hien === 'CHO_DUYET') {
    return (
      <Result
        status="info"
        title="Đề tài đang chờ Giảng viên phê duyệt"
        subTitle="Bạn chỉ có thể nộp báo cáo sau khi giảng viên đã duyệt đăng ký của bạn."
      />
    );
  }

  if (registration.trang_thai_thuc_hien === 'TU_CHOI') {
    return (
      <Result
        status="error"
        title="Đề tài đã bị từ chối"
        subTitle="Giảng viên đã từ chối yêu cầu của bạn. Vui lòng đăng ký đề tài khác."
        extra={<Button type="primary" onClick={() => navigate('/danh-sach-de-tai')}>Đăng ký đề tài khác</Button>}
      />
    );
  }

  // Nếu đã duyệt ('DA_CHAP_NHAN' hoặc 'DANG_THUC_HIEN')
  return <NopBaoCao dangKyId={registration.id} />;
};

export default TienDo;
