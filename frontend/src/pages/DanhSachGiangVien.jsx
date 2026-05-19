import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Button,
  Progress,
  message,
  Spin,
  Empty,
  Tag,
  Badge,
  Avatar,
  Tooltip,
  Modal,
  Alert,
  Space,
  Divider
} from 'antd';
import { UserOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api';
import { useAuthStore } from '../store/authStore';

const DanhSachGiangVien = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [registeredLecturer, setRegisteredLecturer] = useState(null);

  // Lấy danh sách giảng viên
  const { data: lecturers = [], isLoading: loadingLecturers, error: errorLecturers } = useQuery({
    queryKey: ['lecturersWithSlots'],
    queryFn: async () => {
      const res = await apiClient.get('/lecturer/list-with-slots');
      return res.data.data || [];
    },
    retry: false,
  });

  // Lấy thông tin sinh viên đã đăng ký giảng viên nào
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

  useEffect(() => {
    if (myLecturer) {
      setRegisteredLecturer(myLecturer.giang_vien_id);
    }
  }, [myLecturer]);

  // Mutation đăng ký giảng viên
  const registerMutation = useMutation({
    mutationFn: async (giangVienId) => {
      const res = await apiClient.post('/lecturer/register', {
        giang_vien_id: giangVienId,
      });
      return res.data;
    },
    onSuccess: (data) => {
      message.success(data.message || 'Đăng ký thành công!');
      queryClient.invalidateQueries({ queryKey: ['myLecturerRegistration'] });
      queryClient.invalidateQueries({ queryKey: ['lecturersWithSlots'] });
    },
    onError: (error) => {
      const errorMsg = error.response?.data?.message || error.message || 'Đăng ký thất bại!';
      message.error(errorMsg);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.delete('/student/cancel-lecturer');
      return res.data;
    },
    onSuccess: (data) => {
      message.success(data.message || 'Hủy đăng ký thành công!');
      setRegisteredLecturer(null);
      queryClient.setQueryData(['myLecturerRegistration'], null);
      queryClient.invalidateQueries({ queryKey: ['myLecturerRegistration'] });
      queryClient.invalidateQueries({ queryKey: ['lecturersWithSlots'] });
    },
    onError: (error) => {
      const errorMsg = error.response?.data?.message || error.message || 'Hủy đăng ký thất bại!';
      message.error(errorMsg);
    },
  });

  if (loadingLecturers || loadingMyLecturer) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spin size="large" tip="Đang tải..." />
      </div>
    );
  }

  if (errorLecturers) {
    return (
      <div style={{ padding: '20px' }}>
        <Alert
          message="Không thể hiển thị danh sách"
          description={errorLecturers.response?.data?.message || 'Có lỗi xảy ra'}
          type="error"
          showIcon
        />
      </div>
    );
  }

  if (!lecturers || lecturers.length === 0) {
    return <Empty description="Không có giảng viên nào" />;
  }

  const isStudentRegistered = !!registeredLecturer;

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1>Chọn Giảng Viên Hướng Dẫn</h1>
        <p style={{ color: '#666' }}>
          Chọn giảng viên mà bạn muốn được hướng dẫn. Ai nhanh tay thì được! (First Come, First Served)
        </p>
        
        {isStudentRegistered && myLecturer && (
          <Alert
            message={`Bạn đã đăng ký: ${myLecturer.ten_giang_vien}`}
            description={
              <div style={{ marginTop: '10px' }}>
                <Button 
                  danger 
                  loading={cancelMutation.isPending}
                  onClick={() => {
                    Modal.confirm({
                      title: 'Xác nhận hủy đăng ký',
                      content: 'Bạn có chắc chắn muốn hủy giảng viên này không? Bạn có thể bị mất slot nếu người khác đăng ký!',
                      okText: 'Có, Hủy',
                      cancelText: 'Không',
                      onOk: () => cancelMutation.mutate(),
                    });
                  }}
                >
                  Hủy đăng ký giảng viên
                </Button>
              </div>
            }
            type="success"
            icon={<CheckCircleOutlined />}
            showIcon
            style={{ marginBottom: '16px' }}
          />
        )}
      </div>

      <Row gutter={[24, 24]}>
        {lecturers.map((lecturer) => {
          const soLuongConLai = lecturer.so_luong_con_lai || 0;
          const soLuongToiDa = lecturer.so_luong_toi_da || 0;
          const soLuongDaDangKy = lecturer.so_luong_da_dang_ky || 0;
          const percentageUsed = soLuongToiDa > 0 ? Math.round((soLuongDaDangKy / soLuongToiDa) * 100) : 0;
          const isHot = soLuongConLai <= 3; // Cảnh báo khi chỉ còn 3 slot trở xuống
          const isFulled = soLuongConLai === 0;
          const isRegistered = registeredLecturer === lecturer.id;

          return (
            <Col key={lecturer.id} xs={24} sm={12} md={8} lg={6}>
              <Card
                hoverable={!isFulled && !isStudentRegistered}
                style={{
                  borderColor: isRegistered ? '#52c41a' : isFulled ? '#f5222d' : isHot ? '#faad14' : '#d9d9d9',
                  borderWidth: isRegistered ? '2px' : '1px',
                  cursor: isFulled || isStudentRegistered ? 'not-allowed' : 'pointer',
                  opacity: isFulled || (isStudentRegistered && !isRegistered) ? 0.7 : 1,
                }}
                cover={
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '20px',
                    backgroundColor: isRegistered ? '#f6ffed' : '#fafafa',
                  }}>
                    <Avatar
                      size={80}
                      icon={<UserOutlined />}
                      style={{
                        backgroundColor: isRegistered ? '#52c41a' : '#1890ff',
                      }}
                    />
                  </div>
                }
              >
                <div style={{ position: 'relative', marginBottom: '12px' }}>
                  <h3 style={{ margin: '0 0 4px 0' }}>{lecturer.ho_ten}</h3>
                  <p style={{ margin: '0', fontSize: '12px', color: '#999' }}>
                    {lecturer.ten_dang_nhap}
                  </p>
                </div>

                {isRegistered && (
                  <Tag icon={<CheckCircleOutlined />} color="success" style={{ marginBottom: '12px' }}>
                    Đã chọn
                  </Tag>
                )}

                <Divider style={{ margin: '12px 0' }} />

                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '500' }}>Slot còn lại</span>
                    <Badge
                      count={soLuongConLai}
                      style={{
                        backgroundColor: isFulled ? '#f5222d' : isHot ? '#faad14' : '#52c41a',
                      }}
                    />
                  </div>
                  <Progress
                    percent={percentageUsed}
                    strokeColor={{
                      '0%': '#52c41a',
                      '50%': '#faad14',
                      '100%': '#f5222d',
                    }}
                    format={() => `${soLuongDaDangKy}/${soLuongToiDa}`}
                    size="small"
                  />
                </div>

                {isFulled ? (
                  <Button type="default" block disabled>
                    Hết Slot
                  </Button>
                ) : isStudentRegistered && !isRegistered ? (
                  <Tooltip title="Bạn đã chọn giảng viên khác">
                    <Button type="default" block disabled>
                      Không Thể Chọn
                    </Button>
                  </Tooltip>
                ) : isRegistered ? (
                  <Button type="primary" block disabled>
                    Đã Chọn
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    block
                    loading={registerMutation.isPending}
                    onClick={() => {
                      Modal.confirm({
                        title: 'Xác nhận chọn giảng viên',
                        content: `Bạn có chắc chắn muốn chọn ${lecturer.ho_ten} làm giảng viên hướng dẫn không?`,
                        okText: 'Có, chọn',
                        cancelText: 'Hủy',
                        onOk() {
                          registerMutation.mutate(lecturer.id);
                        },
                      });
                    }}
                    danger={isHot}
                  >
                    {isHot ? '⚡ Chọn Ngay' : 'Chọn'}
                  </Button>
                )}
              </Card>
            </Col>
          );
        })}
      </Row>

      {lecturers.length > 0 && (
        <Alert
          message="💡 Mẹo: Chỉ còn ít slot? Bấm 'Chọn Ngay' ngay lập tức, kẻo hết!"
          type="info"
          showIcon
          style={{ marginTop: '24px' }}
        />
      )}
    </div>
  );
};

export default DanhSachGiangVien;
