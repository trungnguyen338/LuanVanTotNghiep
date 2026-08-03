import React, { useState } from 'react';
import { 
  Typography, Card, Row, Col, Table, Button, Breadcrumb, Tag, 
  Modal, Form, Input, message, Popconfirm, Space, Upload, DatePicker, Select
} from 'antd';
import { 
  ArrowLeftOutlined, PlusOutlined, DeleteOutlined, EditOutlined,
  FilePdfOutlined, FileTextOutlined, UploadOutlined,
  UserOutlined, DollarOutlined, CheckCircleOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import clientContractService from '../../services/clientContractService';
import documentService from '../../services/documentService';
import dayjs from 'dayjs';

const { Option } = Select;

const { Title, Text } = Typography;

const formatCurrency = (value) => {
  if (value === undefined || value === null || value === '') return '0 VNĐ';
  const numVal = Number(value);
  return new Intl.NumberFormat('vi-VN').format(numVal) + ' VNĐ';
};

const ContractDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Item states
  const [editingItem, setEditingItem] = useState(null);

  // Render Status Tag
  const renderStatus = (status) => {
    const config = {
      DRAFT: { text: 'Bản nháp', color: 'default' },
      ACTIVE: { text: 'Đang hiệu lực', color: 'success' },
      COMPLETED: { text: 'Đã hoàn thành', color: 'processing' },
      TERMINATED: { text: 'Chấm dứt', color: 'error' },
      CANCELLED: { text: 'Đã hủy', color: 'error' }
    };

    const item = config[status] || config.DRAFT;

    return (
      <Tag 
        color={item.color} 
        style={{ 
          borderRadius: 12, 
          padding: '2px 10px', 
          fontWeight: 600, 
          border: 'none',
          backgroundColor: status === 'ACTIVE' ? '#e6f7ff' : undefined,
          color: status === 'ACTIVE' ? '#0958d9' : undefined
        }}
      >
        {item.text}
      </Tag>
    );
  };

  // Addendum states
  const [isAddendumModalVisible, setIsAddendumModalVisible] = useState(false);
  const [editingAddendum, setEditingAddendum] = useState(null);
  const [addendumFileList, setAddendumFileList] = useState([]);
  const [addendumForm] = Form.useForm();

  // Queries
  const { data: contract = {}, isLoading: loadingContract } = useQuery({
    queryKey: ['clientContract', id],
    queryFn: () => clientContractService.getContract(id)
  });

  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ['contractItems', id],
    queryFn: () => clientContractService.getItems(id)
  });

  const { data: addendums = [], isLoading: loadingAddendums } = useQuery({
    queryKey: ['clientContractAddendums', id],
    queryFn: () => clientContractService.getAddendums(id)
  });

  const handleOpenDocument = async (document) => {
    try {
      await documentService.openDocumentFile(document);
    } catch (error) {
      message.error(error.response?.data?.message || error.message || 'Không thể mở tệp tài liệu');
    }
  };

  // Mutations
  const createItemMutation = useMutation({
    mutationFn: (data) => clientContractService.createItem(id, data),
    onSuccess: () => {
      message.success('Thêm hạng mục công việc thành công');
      setIsModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries(['contractItems']);
      queryClient.invalidateQueries(['clientContract', id]);
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: clientContractService.deleteItem,
    onSuccess: () => {
      message.success('Xóa hạng mục công việc thành công');
      queryClient.invalidateQueries(['contractItems']);
      queryClient.invalidateQueries(['clientContract', id]);
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Không thể xóa hạng mục này');
    }
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, data }) => clientContractService.updateItem(itemId, data),
    onSuccess: () => {
      message.success('Cập nhật hạng mục công việc thành công');
      setIsModalVisible(false);
      setEditingItem(null);
      form.resetFields();
      queryClient.invalidateQueries(['contractItems']);
      queryClient.invalidateQueries(['clientContract', id]);
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  });

  const uploadFileMutation = useMutation({
    mutationFn: (formData) => clientContractService.uploadDocuments(id, formData),
    onSuccess: () => {
      message.success('Tải lên tài liệu thành công');
      setFileList([]);
      queryClient.invalidateQueries(['clientContract', id]);
    }
  });

  const createAddendumMutation = useMutation({
    mutationFn: (data) => clientContractService.createAddendum(id, data),
    onSuccess: () => {
      message.success('Lập phụ lục hợp đồng khách hàng mới thành công');
      setIsAddendumModalVisible(false);
      addendumForm.resetFields();
      setAddendumFileList([]);
      queryClient.invalidateQueries(['clientContractAddendums', id]);
      queryClient.invalidateQueries(['clientContract', id]);
      queryClient.invalidateQueries(['project']);
      queryClient.invalidateQueries(['projects']);
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra khi tạo phụ lục');
    }
  });

  const updateAddendumMutation = useMutation({
    mutationFn: ({ addendumId, data }) => clientContractService.updateAddendum(addendumId, data),
    onSuccess: () => {
      message.success('Cập nhật phụ lục thành công');
      setIsAddendumModalVisible(false);
      addendumForm.resetFields();
      queryClient.invalidateQueries(['clientContractAddendums', id]);
      queryClient.invalidateQueries(['clientContract', id]);
      queryClient.invalidateQueries(['project']);
      queryClient.invalidateQueries(['projects']);
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật phụ lục');
    }
  });

  const deleteAddendumMutation = useMutation({
    mutationFn: clientContractService.deleteAddendum,
    onSuccess: () => {
      message.success('Xóa phụ lục hợp đồng khách hàng thành công');
      queryClient.invalidateQueries(['clientContractAddendums', id]);
      queryClient.invalidateQueries(['clientContract', id]);
      queryClient.invalidateQueries(['project']);
      queryClient.invalidateQueries(['projects']);
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Không thể xóa phụ lục này');
    }
  });

  // Handlers
  const handleOpenItemModal = (item = null) => {
    setEditingItem(item);
    if (item) {
      form.setFieldsValue({
        item_name: item.item_name,
        volume: item.volume,
        unit_price: item.unit_price,
        status: item.status || 'active'
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ status: 'active' });
    }
    setIsModalVisible(true);
  };

  const handleItemSubmit = (values) => {
    const newPrice = values.status === 'cancelled' ? 0 : Number(values.unit_price || 0);
    
    // Sum only active items, excluding the one being edited
    const activeItems = items.filter(item => item.status !== 'cancelled' && (!editingItem || item.id !== editingItem.id));
    const totalActivePrice = activeItems.reduce((acc, item) => acc + Number(item.price || 0), 0);
    
    // Limit = original_value + addition_value
    const limit = Number(contract.original_value || 0) + Number(contract.addition_value || 0);
    
    if (totalActivePrice + newPrice > limit) {
      message.error(`Tổng giá trị các hạng mục (${formatCurrency(totalActivePrice + newPrice)}) không được vượt quá hạn mức hợp đồng (${formatCurrency(limit)})`);
      return;
    }
    
    if (editingItem) {
      updateItemMutation.mutate({ itemId: editingItem.id, data: values });
    } else {
      createItemMutation.mutate(values);
    }
  };

  const handleUpload = () => {
    if (fileList.length === 0) return;
    setUploading(true);
    const formData = new FormData();
    fileList.forEach(file => {
      formData.append('document_files[]', file.originFileObj);
    });
    
    uploadFileMutation.mutate(formData, {
      onSuccess: () => {
        setUploading(false);
      },
      onError: (error) => {
        setUploading(false);
        message.error(error.response?.data?.message || 'Lỗi khi tải lên tài liệu');
      }
    });
  };

  const handleOpenAddendumModal = (addendum = null) => {
    setEditingAddendum(addendum);
    if (addendum) {
      addendumForm.setFieldsValue({
        title: addendum.title,
        value_adjustment: addendum.value_adjustment,
        signed_date: addendum.signed_date ? dayjs(addendum.signed_date) : null,
        status: addendum.status
      });
    } else {
      addendumForm.resetFields();
    }
    setAddendumFileList([]);
    setIsAddendumModalVisible(true);
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
      addendumFileList.forEach(file => {
        formData.append('document_files[]', file.originFileObj);
      });
      createAddendumMutation.mutate(formData);
    }
  };

  const renderAddendumStatus = (status) => {
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

  const addendumColumns = [
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
      render: (status) => renderAddendumStatus(status)
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

  // Columns for Items table
  const columns = [
    {
      title: 'STT',
      key: 'stt',
      width: '8%',
      render: (_, __, index) => (
        <Text style={{ color: '#595959', fontWeight: 500 }}>
          {String(index + 1).padStart(2, '0')}
        </Text>
      )
    },
    {
      title: 'Tên hạng mục',
      dataIndex: 'item_name',
      key: 'item_name',
      width: '30%',
      render: (text) => <Text strong style={{ color: '#1f1f1f' }}>{text}</Text>
    },
    {
      title: 'Số lượng',
      dataIndex: 'volume',
      key: 'volume',
      width: '15%',
      render: (val) => <Text style={{ color: '#1f1f1f' }}>{new Intl.NumberFormat('vi-VN').format(val)}</Text>
    },
    {
      title: 'Đơn giá (VNĐ)',
      dataIndex: 'unit_price',
      key: 'unit_price',
      width: '18%',
      render: (val) => <Text style={{ color: '#1f1f1f' }}>{new Intl.NumberFormat('vi-VN').format(val)}</Text>
    },
    {
      title: 'Thành tiền (VNĐ)',
      dataIndex: 'price',
      key: 'price',
      width: '19%',
      render: (price) => (
        <Text strong style={{ color: '#1f1f1f' }}>
          {new Intl.NumberFormat('vi-VN').format(price)}
        </Text>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: '12%',
      render: (status) => (
        <Tag color={status === 'cancelled' ? 'error' : 'success'} style={{ borderRadius: 12, padding: '1px 10px', fontWeight: 600, border: 'none' }}>
          {status === 'cancelled' ? 'Đã hủy' : 'Hoạt động'}
        </Tag>
      )
    },
    {
      title: 'Thao tác',
      key: 'action',
      align: 'right',
      width: '15%',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="text"
            icon={<EditOutlined style={{ color: '#595959', fontSize: 16 }} />} 
            onClick={() => handleOpenItemModal(record)}
            title="Chỉnh sửa hạng mục"
          />
          <Popconfirm
            title="Xóa hạng mục công việc"
            description="Bạn có chắc chắn muốn xóa hạng mục này khỏi hợp đồng?"
            onConfirm={() => deleteItemMutation.mutate(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button 
              type="text"
              danger
              icon={<DeleteOutlined style={{ fontSize: 16 }} />} 
              title="Xóa hạng mục"
            />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ width: '100%' }}>
      <style>{`
        .item-table .ant-table-thead > tr > th,
        .addendum-table .ant-table-thead > tr > th {
          font-weight: 700;
          color: #1f1f1f;
          background-color: #fafafa;
        }
        .item-table .ant-table-tbody > tr:hover > td,
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
        <Breadcrumb.Item>Chi tiết hợp đồng khách hàng</Breadcrumb.Item>
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
            Chi tiết Hợp đồng - {contract.contract_code || '...'}
          </Title>
        </div>
        
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => handleOpenItemModal()}
          style={{ backgroundColor: '#8c3a00', borderColor: '#8c3a00', borderRadius: 4, fontWeight: 600, height: 40 }}
        >
          Thêm hạng mục mới
        </Button>
      </div>

      {/* Header info cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 4, backgroundColor: '#f5f5f5', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', color: '#8c3a00' }}>
                <UserOutlined style={{ fontSize: 20 }} />
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>KHÁCH HÀNG</Text>
                <Text strong style={{ fontSize: 14, color: '#1f1f1f' }}>
                  {contract.project?.customer?.full_name || 'Đang tải...'}
                </Text>
              </div>
            </div>
          </Card>
        </Col>
        
        <Col span={12}>
          <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 4, backgroundColor: '#f5f5f5', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', color: '#8c3a00' }}>
                <CheckCircleOutlined style={{ fontSize: 20 }} />
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>TRẠNG THÁI HIỆU LỰC</Text>
                <div>
                  <Tag 
                    color={contract.status === 'ACTIVE' ? 'success' : 'default'} 
                    style={{ 
                      borderRadius: 12, 
                      padding: '1px 10px', 
                      fontWeight: 600, 
                      border: 'none',
                      backgroundColor: contract.status === 'ACTIVE' ? '#e6f7ff' : undefined,
                      color: contract.status === 'ACTIVE' ? '#0958d9' : undefined,
                      margin: 0
                    }}
                  >
                    {contract.status === 'ACTIVE' ? 'Đang hiệu lực' : (contract.status || '...')}
                  </Tag>
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 4 Financial Stats Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 4, backgroundColor: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8c3a00' }}>
                <DollarOutlined style={{ fontSize: 18 }} />
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>GIÁ TRỊ HỢP ĐỒNG GỐC</Text>
                <Text strong style={{ fontSize: 13, color: '#1f1f1f' }}>
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
                <Text strong style={{ fontSize: 13, color: '#ff4d4f' }}>
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
                <Text strong style={{ fontSize: 13, color: '#52c41a' }}>
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
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>THỰC TẾ CẦN THU</Text>
                <Text strong style={{ fontSize: 13, color: '#1890ff' }}>
                  {formatCurrency(contract.actual_value)}
                </Text>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Thông tin chung */}
      <Card bordered={false} title={<Text strong style={{ fontSize: 16 }}>Thông tin chi tiết hợp đồng</Text>} style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)', marginBottom: 24 }}>
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
              <Text type="secondary" style={{ fontSize: 12 }}>KHÁCH HÀNG</Text>
              <Text strong style={{ fontSize: 14, color: '#1f1f1f' }}>
                {contract.project?.customer?.full_name || '---'}
              </Text>
            </div>
          </Col>
          <Col span={12}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>SỐ ĐIỆN THOẠI KHÁCH HÀNG</Text>
              <Text strong style={{ fontSize: 14, color: '#1f1f1f' }}>
                {contract.project?.customer?.phone || '---'}
              </Text>
            </div>
          </Col>
          <Col span={12}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>ĐỊA CHỈ KHÁCH HÀNG</Text>
              <Text strong style={{ fontSize: 14, color: '#1f1f1f' }}>
                {contract.project?.customer?.address || '---'}
              </Text>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Items Table */}
      <Card 
        bordered={false} 
        title={<Text strong style={{ fontSize: 16 }}>Danh sách Hạng mục công việc</Text>}
        style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)', marginBottom: 24 }}
        extra={
          <Input 
            placeholder="Tìm kiếm hạng mục..." 
            style={{ width: 220, borderRadius: 4 }}
            size="small"
          />
        }
      >
        {(() => {
          const totalItemsPrice = items.reduce((acc, item) => acc + Number(item.price || 0), 0);
          const limit = Number(contract.original_value || 0) + Number(contract.addition_value || 0);
          const isSumMatching = Math.abs(totalItemsPrice - limit) < 0.01;
          if (isSumMatching) return null;
          return (
            <div style={{ marginBottom: 16, padding: '12px 16px', backgroundColor: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
              <InfoCircleOutlined style={{ color: '#faad14', fontSize: 16 }} />
              <Text type="warning" style={{ fontSize: 13, fontWeight: 500 }}>
                Tổng giá trị các hạng mục ({formatCurrency(totalItemsPrice)}) hiện {totalItemsPrice < limit ? 'thấp hơn' : 'cao hơn'} hạn mức hợp đồng sau phụ lục ({formatCurrency(limit)}). Vui lòng điều chỉnh để khớp chính xác.
              </Text>
            </div>
          );
        })()}
        <Table 
          className="item-table"
          columns={columns} 
          dataSource={items} 
          rowKey="id" 
          loading={loadingItems || loadingContract}
          pagination={{
            showTotal: (total, range) => `Hiển thị ${range[0]}-${range[1]} trong số ${total} hạng mục`,
            pageSize: 10,
            showSizeChanger: false
          }}
          summary={(pageData) => {
            let total = 0;
            pageData.forEach(({ price }) => {
              total += Number(price || 0);
            });
            return (
              <Table.Summary fixed>
                <Table.Summary.Row className="summary-row">
                  <Table.Summary.Cell index={0} colSpan={3} align="center">
                    TỔNG CỘNG GIÁ TRỊ HẠNG MỤC
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="left">
                    <Text strong style={{ color: '#fff' }}>
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(total)}
                    </Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2} />
                </Table.Summary.Row>
              </Table.Summary>
            );
          }}
        />
      </Card>

      {/* Danh sách Phụ Lục */}
      <Card 
        bordered={false} 
        title={<Text strong style={{ fontSize: 16 }}>Danh sách Phụ lục hợp đồng</Text>}
        style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)', marginBottom: 24 }}
        extra={
          <Button 
            type="primary" 
            size="small"
            icon={<PlusOutlined />} 
            onClick={() => handleOpenAddendumModal()}
            style={{ backgroundColor: '#8c3a00', borderColor: '#8c3a00', borderRadius: 4 }}
          >
            Lập phụ lục mới
          </Button>
        }
      >
        <Table 
          className="addendum-table"
          columns={addendumColumns} 
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

      {/* Attachment Section */}
      <Card 
        bordered={false} 
        title={<Text strong style={{ fontSize: 16 }}>📁 Tài liệu đính kèm</Text>}
        style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
        extra={
          <Space>
            <Upload
              beforeUpload={() => false}
              onChange={({ fileList }) => setFileList(fileList)}
              fileList={fileList}
              multiple
              maxCount={10}
            >
              <Button icon={<UploadOutlined />} size="small">Chọn file</Button>
            </Upload>
            {fileList.length > 0 && (
              <Button 
                type="primary" 
                size="small" 
                onClick={handleUpload} 
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
                    Loại: {doc.document_type?.type_name || 'Hợp đồng'} • Trạng thái: {doc.status}
                  </Text>
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: '20px 0', textAlign: 'center' }}>
              <Text type="secondary">Chưa có tài liệu đính kèm nào được tải lên cho hợp đồng này.</Text>
            </div>
          )}
        </div>
      </Card>

      {/* Add/Edit Item Modal */}
      <Modal
        title={editingItem ? 'Chỉnh sửa hạng mục công việc' : 'Thêm hạng mục công việc mới'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingItem(null);
        }}
        footer={null}
        destroyOnClose
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleItemSubmit}
          style={{ marginTop: 20 }}
        >
          <Form.Item
            name="item_name"
            label="Tên hạng mục công việc"
            rules={[{ required: true, message: 'Vui lòng nhập tên hạng mục' }]}
          >
            <Input placeholder="Ví dụ: Thi công khoan cọc nhồi" size="large" />
          </Form.Item>

          <Form.Item
            name="volume"
            label="Số lượng"
            rules={[{ required: true, message: 'Vui lòng nhập số lượng' }]}
          >
            <Input type="number" placeholder="Ví dụ: 15.5" size="large" />
          </Form.Item>

          <Form.Item
            name="unit_price"
            label="Đơn giá (VNĐ)"
            rules={[{ required: true, message: 'Vui lòng nhập đơn giá' }]}
          >
            <Input type="number" placeholder="Ví dụ: 16000000" size="large" />
          </Form.Item>

          {editingItem && (
            <Form.Item
              name="status"
              label="Trạng thái hạng mục"
              rules={[{ required: true }]}
            >
              <Select size="large">
                <Option value="active">Hoạt động</Option>
                <Option value="cancelled">Đã hủy</Option>
              </Select>
            </Form.Item>
          )}

          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: 24 }}>
            <Button onClick={() => {
              setIsModalVisible(false);
              setEditingItem(null);
            }} style={{ marginRight: 8 }}>
              Hủy
            </Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={createItemMutation.isPending || updateItemMutation.isPending}
              style={{ backgroundColor: '#8c3a00', borderColor: '#8c3a00' }}
            >
              {editingItem ? 'Lưu thay đổi' : 'Thêm hạng mục'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Lập Phụ Lục */}
      <Modal
        title={editingAddendum ? 'Chỉnh sửa phụ lục' : 'Lập phụ lục hợp đồng mới'}
        open={isAddendumModalVisible}
        onCancel={() => setIsAddendumModalVisible(false)}
        footer={null}
        destroyOnClose
        width={500}
      >
        <Form
          form={addendumForm}
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
                onChange={({ fileList }) => setAddendumFileList(fileList)}
                fileList={addendumFileList}
                multiple
              >
                <Button icon={<UploadOutlined />} size="large">Chọn tệp tin</Button>
              </Upload>
            </Form.Item>
          )}

          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: 24 }}>
            <Button onClick={() => setIsAddendumModalVisible(false)} style={{ marginRight: 8 }}>
              Hủy
            </Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={createAddendumMutation.isPending || updateAddendumMutation.isPending}
              style={{ backgroundColor: '#8c3a00', borderColor: '#8c3a00' }}
            >
              {editingAddendum ? 'Cập nhật' : 'Lập phụ lục'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ContractDetail;
