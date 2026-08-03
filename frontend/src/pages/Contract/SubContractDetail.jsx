import React, { useState } from 'react';
import { 
  Typography, Card, Row, Col, Table, Button, Breadcrumb, Tag, 
  Modal, Form, Input, message, Popconfirm, Space, DatePicker, Upload, Select
} from 'antd';
import { 
  ArrowLeftOutlined, PlusOutlined, DeleteOutlined, EditOutlined,
  FilePdfOutlined, FileTextOutlined, UploadOutlined,
  UserOutlined, DollarOutlined, CheckCircleOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import subContractService from '../../services/subContractService';
import documentService from '../../services/documentService';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const formatCurrency = (value) => {
  if (value === undefined || value === null) return '0 VNĐ';
  const numVal = Number(value);
  return new Intl.NumberFormat('vi-VN').format(numVal) + ' VNĐ';
};

const SubContractDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingAddendum, setEditingAddendum] = useState(null);
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [contractFileList, setContractFileList] = useState([]);

  // Queries
  const { data: contract = {}, isLoading: loadingContract } = useQuery({
    queryKey: ['subContract', id],
    queryFn: () => subContractService.getSubContract(id)
  });

  const { data: addendums = [], isLoading: loadingAddendums } = useQuery({
    queryKey: ['subContractAddendums', id],
    queryFn: () => subContractService.getAddendums(id)
  });

  const handleOpenDocument = async (document) => {
    try {
      await documentService.openDocumentFile(document);
    } catch (error) {
      message.error(error.response?.data?.message || error.message || 'Không thể mở tệp tài liệu');
    }
  };

  // Mutations
  const createAddendumMutation = useMutation({
    mutationFn: (data) => subContractService.createAddendum(id, data),
    onSuccess: () => {
      message.success('Lập phụ lục hợp đồng thầu phụ mới thành công');
      setIsModalVisible(false);
      form.resetFields();
      setFileList([]);
      queryClient.invalidateQueries(['subContractAddendums', id]);
      queryClient.invalidateQueries(['subContract', id]);
      queryClient.invalidateQueries(['subContracts']);
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra khi tạo phụ lục');
    }
  });

  const updateAddendumMutation = useMutation({
    mutationFn: ({ addendumId, data }) => subContractService.updateAddendum(addendumId, data),
    onSuccess: () => {
      message.success('Cập nhật phụ lục thành công');
      setIsModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries(['subContractAddendums', id]);
      queryClient.invalidateQueries(['subContract', id]);
      queryClient.invalidateQueries(['subContracts']);
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật phụ lục');
    }
  });

  const deleteAddendumMutation = useMutation({
    mutationFn: subContractService.deleteAddendum,
    onSuccess: () => {
      message.success('Xóa phụ lục hợp đồng thầu phụ thành công');
      queryClient.invalidateQueries(['subContractAddendums', id]);
      queryClient.invalidateQueries(['subContract', id]);
      queryClient.invalidateQueries(['subContracts']);
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Không thể xóa phụ lục này');
    }
  });

  const uploadContractFileMutation = useMutation({
    mutationFn: (formData) => subContractService.uploadDocuments(id, formData),
    onSuccess: () => {
      message.success('Tải lên tài liệu thành công');
      setContractFileList([]);
      queryClient.invalidateQueries(['subContract', id]);
    }
  });

  // Handlers
  const handleOpenAddendumModal = (addendum = null) => {
    setEditingAddendum(addendum);
    if (addendum) {
      form.setFieldsValue({
        title: addendum.title,
        value_adjustment: addendum.value_adjustment,
        signed_date: addendum.signed_date ? dayjs(addendum.signed_date) : null,
        status: addendum.status
      });
    } else {
      form.resetFields();
    }
    setFileList([]);
    setIsModalVisible(true);
  };

  const handleSaveAddendum = (values) => {
    if (editingAddendum) {
      const updateData = {
        title: values.title,
        value_adjustment: values.value_adjustment,
        signed_date: values.signed_date ? values.signed_date.format('YYYY-MM-DD') : null,
        status: values.status || editingAddendum.status
      };
      updateAddendumMutation.mutate({ addendumId: editingAddendum.id, data: updateData });
    } else {
      const formData = new FormData();
      formData.append('title', values.title);
      formData.append('value_adjustment', values.value_adjustment);
      if (values.signed_date) {
        formData.append('signed_date', values.signed_date.format('YYYY-MM-DD'));
      }
      fileList.forEach(file => {
        formData.append('document_files[]', file.originFileObj);
      });
      createAddendumMutation.mutate(formData);
    }
  };

  const handleUploadContractFile = () => {
    if (contractFileList.length === 0) return;
    setUploading(true);
    const formData = new FormData();
    contractFileList.forEach(file => {
      formData.append('document_files[]', file.originFileObj);
    });
    
    uploadContractFileMutation.mutate(formData, {
      onSuccess: () => {
        setUploading(false);
      },
      onError: (error) => {
        setUploading(false);
        message.error(error.response?.data?.message || 'Lỗi khi tải lên tài liệu');
      }
    });
  };

  const renderStatus = (status) => {
    const config = {
      DRAFT: { text: 'Bản nháp', color: 'default' },
      ACTIVE: { text: 'Đang hiệu lực', color: 'success' },
      COMPLETED: { text: 'Đã hoàn thành', color: 'processing' },
      TERMINATED: { text: 'Chấm dứt', color: 'error' },
      REJECTED: { text: 'Đã huỷ bỏ', color: 'warning' }
    };
    const item = config[status] || config.DRAFT;
    return (
      <Tag color={item.color} style={{ borderRadius: 12, padding: '2px 10px', fontWeight: 600, border: 'none' }}>
        {item.text}
      </Tag>
    );
  };

  // Columns for Addendums table
  const columns = [
    {
      title: 'STT',
      key: 'stt',
      width: '5%',
      render: (_, __, index) => (
        <Text style={{ color: '#595959', fontWeight: 500 }}>
          {String(index + 1).padStart(2, '0')}
        </Text>
      )
    },
    {
      title: 'Mã phụ lục',
      dataIndex: 'addendum_code',
      key: 'addendum_code',
      width: '12%',
      render: (text) => <Text strong style={{ color: '#1f1f1f' }}>{text}</Text>
    },
    {
      title: 'Tiêu đề phụ lục',
      dataIndex: 'title',
      key: 'title',
      width: '20%',
      render: (text) => <Text strong style={{ color: '#1f1f1f' }}>{text}</Text>
    },
    {
      title: 'Giá trị điều chỉnh',
      dataIndex: 'value_adjustment',
      key: 'value_adjustment',
      width: '15%',
      render: (val) => {
        const isNegative = Number(val) < 0;
        return (
          <Text strong style={{ color: isNegative ? '#ff4d4f' : '#52c41a' }}>
            {isNegative ? '' : '+'}{formatCurrency(val)}
          </Text>
        );
      }
    },
    {
      title: 'Ngày ký',
      dataIndex: 'signed_date',
      key: 'signed_date',
      width: '12%',
      render: (date) => <Text style={{ color: '#595959' }}>{date ? dayjs(date).format('DD/MM/YYYY') : '---'}</Text>
    },
    {
      title: 'Tài liệu',
      key: 'documents',
      width: '12%',
      render: (_, record) => {
        if (!record.documents || record.documents.length === 0) return <Text type="secondary">---</Text>;
        return (
          <Space direction="vertical" size="small">
            {record.documents.map(doc => (
              <a 
                key={doc.id} 
                href={doc.download_url || doc.file_url}
                onClick={(event) => { event.preventDefault(); handleOpenDocument(doc); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                {doc.file_url?.endsWith('.pdf') ? <FilePdfOutlined style={{ color: '#ff4d4f' }} /> : <FileTextOutlined style={{ color: '#1890ff' }} />}
                <span style={{ fontSize: '13px' }}>Tải xuống</span>
              </a>
            ))}
          </Space>
        );
      }
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: '10%',
      render: (status) => renderStatus(status)
    },
    {
      title: 'Thao tác',
      key: 'action',
      align: 'right',
      width: '10%',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="text"
            icon={<EditOutlined style={{ color: '#595959', fontSize: 16 }} />} 
            onClick={() => handleOpenAddendumModal(record)}
            title="Chỉnh sửa phụ lục"
          />
          {['ACTIVE', 'Có hiệu lực'].includes(record.status) ? (
            <Button
              type="text"
              danger
              disabled
              icon={<DeleteOutlined style={{ fontSize: 16 }} />}
              title="Không thể xóa phụ lục đang hiệu lực"
            />
          ) : (
            <Popconfirm
              title="Xóa phụ lục hợp đồng"
              description="Bạn có chắc chắn muốn xóa phụ lục này?"
              onConfirm={() => deleteAddendumMutation.mutate(record.id)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button
                type="text"
                danger
                icon={<DeleteOutlined style={{ fontSize: 16 }} />}
                title="Xóa phụ lục"
              />
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  const renderSubcontractorLabel = () => {
    const subs = contract.subcontractors || [];
    if (subs.length === 0) return 'Chưa liên kết';
    const mainSub = subs.find(s => s.pivot?.role_in_contract === 'MAIN') || subs[0];
    if (subs.length === 1) {
      return mainSub.name;
    }
    return `${mainSub.name} (+${subs.length - 1} đối tác)`;
  };

  return (
    <div style={{ width: '100%' }}>
      <style>{`
        .addendum-table .ant-table-thead > tr > th {
          font-weight: 700;
          color: #1f1f1f;
          background-color: #fafafa;
        }
        .addendum-table .ant-table-tbody > tr:hover > td {
          background-color: #fafafa !important;
        }
        .summary-row {
          background-color: #101626 !important;
          color: #fff !important;
          font-weight: bold !important;
        }
        .summary-row td {
          color: #fff !important;
          background-color: #101626 !important;
          padding: 16px !important;
        }
      `}</style>

      {/* Breadcrumb */}
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item style={{ cursor: 'pointer' }} onClick={() => navigate('/contracts')}>
          Quản lý hợp đồng
        </Breadcrumb.Item>
        <Breadcrumb.Item>Chi tiết hợp đồng nhà thầu phụ</Breadcrumb.Item>
      </Breadcrumb>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/contracts')}
            style={{ borderRadius: 4 }}
          />
          <Title level={3} style={{ margin: 0, color: '#1f1f1f', fontWeight: 800 }}>
            Hợp đồng Thầu phụ - {contract.contract_code || '...'}
          </Title>
        </div>
        
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => handleOpenAddendumModal()}
          style={{ backgroundColor: '#8c3a00', borderColor: '#8c3a00', borderRadius: 4, fontWeight: 600, height: 40 }}
        >
          Lập phụ lục mới
        </Button>
      </div>

      {/* Thống kê chỉ số */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={24}>
          <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 4, backgroundColor: '#f5f5f5', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', color: '#8c3a00' }}>
                <UserOutlined style={{ fontSize: 20 }} />
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>NHÀ THẦU PHỤ THỰC HIỆN</Text>
                <Text strong style={{ fontSize: 16, color: '#1f1f1f' }}>
                  {renderSubcontractorLabel()}
                </Text>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 4, backgroundColor: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8c3a00' }}>
                <DollarOutlined style={{ fontSize: 18 }} />
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>GIÁ TRỊ HỢP ĐỒNG GỐC</Text>
                <Text strong style={{ fontSize: 14, color: '#1f1f1f' }}>
                  {formatCurrency(contract.original_value)}
                </Text>
              </div>
            </div>
          </Card>
        </Col>
        
        <Col span={6}>
          <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 4, backgroundColor: '#fff1f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff4d4f' }}>
                <DollarOutlined style={{ fontSize: 18 }} />
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>GIÁ TRỊ GIẢM TRỪ</Text>
                <Text strong style={{ fontSize: 14, color: '#ff4d4f' }}>
                  {formatCurrency(contract.reduction_value)}
                </Text>
              </div>
            </div>
          </Card>
        </Col>

        <Col span={6}>
          <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 4, backgroundColor: '#f6ffed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52c41a' }}>
                <DollarOutlined style={{ fontSize: 18 }} />
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>GIÁ TRỊ THÊM VÀO</Text>
                <Text strong style={{ fontSize: 14, color: '#52c41a' }}>
                  {formatCurrency(contract.addition_value)}
                </Text>
              </div>
            </div>
          </Card>
        </Col>

        <Col span={6}>
          <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 4, backgroundColor: '#e6f7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1890ff' }}>
                <DollarOutlined style={{ fontSize: 18 }} />
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>THỰC TẾ CẦN CHI</Text>
                <Text strong style={{ fontSize: 14, color: '#1890ff' }}>
                  {formatCurrency(contract.actual_value)}
                </Text>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Thông tin chung */}
      <Card bordered={false} title={<Text strong style={{ fontSize: 16 }}>Thông tin chung hợp đồng</Text>} style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)', marginBottom: 24 }}>
        <Row gutter={[24, 16]}>
          <Col span={12}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>TÊN HỢP ĐỒNG</Text>
              <Text strong style={{ fontSize: 14, color: '#1f1f1f' }}>{contract.contract_name || '---'}</Text>
            </div>
          </Col>
          <Col span={12}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>DỰ ÁN ÁP DỤNG</Text>
              <Text strong style={{ fontSize: 14, color: '#1f1f1f' }}>
                {contract.project ? `${contract.project.name} (${contract.project.project_code})` : '---'}
              </Text>
            </div>
          </Col>
          <Col span={12}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>NGÀY KÝ HỢP ĐỒNG</Text>
              <Text strong style={{ fontSize: 14, color: '#1f1f1f' }}>
                {contract.signed_date ? dayjs(contract.signed_date).format('DD/MM/YYYY') : '---'}
              </Text>
            </div>
          </Col>
          <Col span={12}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>TRẠNG THÁI HIỆU LỰC</Text>
              <div>{renderStatus(contract.status)}</div>
            </div>
          </Col>
        </Row>
      </Card>



      {/* Danh sách Phụ Lục */}
      <Card 
        bordered={false} 
        title={<Text strong style={{ fontSize: 16 }}>Danh sách Phụ lục hợp đồng</Text>}
        style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)', marginBottom: 24 }}
      >
        <Table 
          className="addendum-table"
          columns={columns} 
          dataSource={addendums} 
          rowKey="id" 
          loading={loadingAddendums || loadingContract}
          pagination={{
            showTotal: (total, range) => `Hiển thị ${range[0]}-${range[1]} trong số ${total} phụ lục`,
            pageSize: 10,
            showSizeChanger: false
          }}
          summary={(pageData) => {
            let totalAdjustment = 0;
            pageData.forEach(({ value_adjustment, status }) => {
              if (status === 'ACTIVE') {
                totalAdjustment += Number(value_adjustment || 0);
              }
            });
            const isNegative = totalAdjustment < 0;
            return (
              <Table.Summary fixed>
                <Table.Summary.Row className="summary-row">
                  <Table.Summary.Cell index={0} colSpan={3} align="center">
                    TỔNG GIÁ TRỊ PHỤ LỤC ĐANG HIỆU LỰC
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="left" colSpan={5}>
                    <Text strong style={{ color: '#fff', fontSize: 15 }}>
                      {isNegative ? '' : '+'}{formatCurrency(totalAdjustment)}
                    </Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            );
          }}
        />
      </Card>

      {/* Tài liệu đính kèm */}
      <Card 
        bordered={false} 
        title={<Text strong style={{ fontSize: 16 }}>📁 Tài liệu đính kèm hợp đồng thầu phụ</Text>}
        style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
        extra={
          <Space>
            <Upload
              beforeUpload={() => false}
              onChange={({ fileList }) => setContractFileList(fileList)}
              fileList={contractFileList}
              multiple
              maxCount={10}
            >
              <Button icon={<UploadOutlined />} size="small">Chọn file</Button>
            </Upload>
            {contractFileList.length > 0 && (
              <Button 
                type="primary" 
                size="small" 
                onClick={handleUploadContractFile} 
                loading={uploading}
                style={{ backgroundColor: '#8c3a00', borderColor: '#8c3a00' }}
              >
                Tải lên
              </Button>
            )}
          </Space>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {contract.documents && contract.documents.length > 0 ? (
            contract.documents.map((doc) => (
              <div 
                key={doc.id}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 16, 
                  padding: '12px 16px', 
                  border: '1px solid #f0f0f0', 
                  borderRadius: 6,
                  backgroundColor: '#fafafa'
                }}
              >
                <div style={{ fontSize: 24, color: '#ff4d4f' }}>
                  {doc.file_url?.endsWith('.pdf') ? <FilePdfOutlined /> : <FileTextOutlined style={{ color: '#1890ff' }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <a href={doc.download_url || doc.file_url} onClick={(event) => { event.preventDefault(); handleOpenDocument(doc); }} style={{ fontWeight: 600, color: '#1890ff', display: 'block' }}>
                    {doc.document_name || 'Tài liệu đính kèm'}
                  </a>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Loại: {doc.document_type?.type_name || 'Tài liệu'} • Trạng thái: {doc.status}
                  </Text>
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: '20px 0', textAlign: 'center' }}>
              <Text type="secondary">Chưa có tài liệu đính kèm nào được tải lên cho hợp đồng thầu phụ này.</Text>
            </div>
          )}
        </div>
      </Card>

      {/* Modal Lập Phụ Lục */}
      <Modal
        title={editingAddendum ? 'Chỉnh sửa phụ lục' : 'Lập phụ lục hợp đồng mới'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        destroyOnClose
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveAddendum}
          style={{ marginTop: 20 }}
        >
          <Form.Item
            name="title"
            label="Tiêu đề phụ lục"
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề phụ lục' }]}
          >
            <Input placeholder="Ví dụ: Phụ lục điều chỉnh phát sinh khối lượng móng" size="large" />
          </Form.Item>

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="value_adjustment"
              label="Giá trị điều chỉnh (VNĐ)"
              rules={[{ required: true, message: 'Vui lòng nhập giá trị điều chỉnh' }]}
              style={{ flex: 1 }}
              extra="Ghi số âm (ví dụ: -50000000) nếu giảm giá trị"
            >
              <Input type="number" placeholder="Ví dụ: 250000000" size="large" />
            </Form.Item>

            <Form.Item
              name="signed_date"
              label="Ngày ký phụ lục"
              style={{ flex: 1 }}
            >
              <DatePicker size="large" style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày ký" />
            </Form.Item>
          </div>

          {editingAddendum && (
            <Form.Item
              name="status"
              label="Trạng thái phụ lục"
              rules={[{ required: true }]}
            >
              <Select size="large">
                <Option value="DRAFT">Bản nháp</Option>
                <Option value="ACTIVE">Đang hiệu lực</Option>
                <Option value="REJECTED">Đã huỷ bỏ</Option>
              </Select>
            </Form.Item>
          )}

          {!editingAddendum && (
            <Form.Item
              label="File phụ lục đính kèm"
              extra="Hỗ trợ file PDF, DOC, DOCX, ZIP tối đa 20MB"
            >
              <Upload
                beforeUpload={() => false}
                onChange={({ fileList }) => setFileList(fileList)}
                fileList={fileList}
                multiple
              >
                <Button icon={<UploadOutlined />} size="large">Chọn tệp tin</Button>
              </Upload>
            </Form.Item>
          )}

          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: 24 }}>
            <Button onClick={() => setIsModalVisible(false)} style={{ marginRight: 8 }}>
              Hủy
            </Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={createAddendumMutation.isPending || updateAddendumMutation.isPending}
              style={{ backgroundColor: '#8c3a00', borderColor: '#8c3a00' }}
            >
              Lập phụ lục
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SubContractDetail;
