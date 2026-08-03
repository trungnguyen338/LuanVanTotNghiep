import React from 'react';
import { Row, Col, Card, Typography, Progress, Table, Tag, Spin } from 'antd';
import {
  BankOutlined,
  TeamOutlined,
  DollarCircleOutlined,
  WalletOutlined,
  ArrowUpOutlined,
  UserOutlined,
  ContactsOutlined
} from '@ant-design/icons';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import projectService from '../../services/projectService';

const { Title, Text } = Typography;

// --- Reusable Components ---
const StatCard = ({ title, value, unit, icon, iconBg, trend, compact }) => (
  <Card bordered={false} style={{ borderRadius: 12, height: '100%', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
      <div style={{
        width: 44, height: 44, borderRadius: 8, background: iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22
      }}>
        {icon}
      </div>
      {trend && (
        <div style={{ background: '#f6ffed', color: '#52c41a', padding: '4px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
          <ArrowUpOutlined /> {trend}
        </div>
      )}
    </div>
    <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>{title}</Text>
    <div style={{ marginTop: 4, lineHeight: 1.2 }}>
      <span style={{
        fontSize: compact ? 22 : 28,
        fontWeight: 700,
        color: '#1f1f1f',
        wordBreak: 'break-word',
        display: 'block'
      }}>{value}</span>
      {unit && <span style={{ fontSize: 14, color: '#595959' }}>{unit}</span>}
    </div>
  </Card>
);

const Dashboard = () => {
  const { data: stats = {}, isLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: projectService.getDashboardStats
  });

  const columns = [
    {
      title: 'TÊN CÔNG VIỆC',
      dataIndex: 'taskName',
      key: 'taskName',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'DỰ ÁN',
      dataIndex: 'project',
      key: 'project',
    },
    {
      title: 'HẠN CHÓT',
      dataIndex: 'deadline',
      key: 'deadline',
      render: (text, record) => {
        let color = '#595959';
        if (record.status === 'urgent' || record.status === 'overdue') color = '#f5222d';
        else if (record.status === 'warning') color = '#fa8c16';
        return <span style={{ color, fontWeight: 500 }}>{text}</span>;
      },
    },
  ];

  const formatCurrency = (val) => {
    if (!val) return '0 VNĐ';
    return new Intl.NumberFormat('vi-VN').format(val) + ' VNĐ';
  };

  // Format gọn: 46.3 tỷ / 500 triệu / 123.000
  const formatCurrencyCompact = (val) => {
    if (!val) return '0';
    if (val >= 1_000_000_000) {
      const formatted = (val / 1_000_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 });
      return { value: formatted, unit: 'tỷ VNĐ' };
    }
    if (val >= 1_000_000) {
      const formatted = (val / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 });
      return { value: formatted, unit: 'triệu VNĐ' };
    }
    return { value: new Intl.NumberFormat('vi-VN').format(val), unit: 'VNĐ' };
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" tip="Đang tải dữ liệu tổng quan..." />
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Tổng quan dự án</Title>
        <Text type="secondary">Chào mừng trở lại, đây là tóm tắt hiệu suất dự án hôm nay</Text>
      </div>

      {/* Top Stats Row */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={4}>
          <StatCard
            title="Tổng số dự án"
            value={stats.total_projects || 0}
            icon={<BankOutlined style={{ color: '#1677ff' }} />}
            iconBg="#e6f4ff"
          />
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <StatCard
            title="Dự án đang thực hiện"
            value={stats.active_projects || 0}
            icon={<TeamOutlined style={{ color: '#fa8c16' }} />}
            iconBg="#fff7e6"
          />
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <StatCard
            title="Khách hàng"
            value={stats.total_customers || 0}
            icon={<UserOutlined style={{ color: '#52c41a' }} />}
            iconBg="#f6ffed"
          />
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <StatCard
            title="Nhà thầu phụ"
            value={stats.total_subcontractors || 0}
            icon={<ContactsOutlined style={{ color: '#722ed1' }} />}
            iconBg="#f9f0ff"
          />
        </Col>
        <Col xs={24} sm={12} lg={4}>
          {(() => {
            const rev = formatCurrencyCompact(stats.total_revenue);
            return (
              <StatCard
                title="Tổng doanh thu"
                value={rev.value}
                unit={rev.unit}
                icon={<DollarCircleOutlined style={{ color: '#faad14' }} />}
                iconBg="#fffbe6"
                compact
              />
            );
          })()}
        </Col>
        <Col xs={24} sm={12} lg={4}>
          {(() => {
            const cost = formatCurrencyCompact(stats.total_costs);
            return (
              <StatCard
                title="Tổng chi phí"
                value={cost.value}
                unit={cost.unit}
                icon={<WalletOutlined style={{ color: '#595959' }} />}
                iconBg="#f5f5f5"
                compact
              />
            );
          })()}
        </Col>
      </Row>

      {/* Middle Row: Progress and Chart */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={10}>
          <Card
            title="Tiến độ các dự án gần đây"
            bordered={false}
            style={{ borderRadius: 12, height: '100%', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
            extra={
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#595959' }}>
                  <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#faad14' }} />
                  Dưới 30%
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#595959' }}>
                  <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#13c2c2' }} />
                  Đang tiến hành
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#595959' }}>
                  <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#389e0d' }} />
                  Hoàn thành
                </span>
              </div>
            }
          >
            {stats.recent_projects && stats.recent_projects.length > 0 ? (
              stats.recent_projects.map((proj) => {
                let strokeColor = '#13c2c2';
                if (proj.progress === 100) strokeColor = '#389e0d';
                else if (proj.progress < 30) strokeColor = '#faad14';

                return (
                  <div key={proj.id} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text strong style={{ fontSize: 13 }}>{proj.name}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>{proj.progress}%</Text>
                    </div>
                    <Progress percent={proj.progress} showInfo={false} strokeColor={strokeColor} size="small" />
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '24px 0', textAlign: 'center', color: '#8c8c8c' }}>
                Chưa có dự án nào được khởi tạo
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          <Card
            title="Doanh thu & Chi phí"
            bordered={false}
            style={{ borderRadius: 12, height: '100%', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
          >
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.monthly_data || []} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8c8c8c' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8c8c8c' }} tickFormatter={(value) => `${value} tỷ`} />
                  <Tooltip cursor={{ fill: '#f5f5f5' }} />
                  <Legend iconType="square" wrapperStyle={{ top: -30, right: 0 }} />
                  <Bar dataKey="Doanh thu" fill="#1677ff" radius={[4, 4, 0, 0]} barSize={12} />
                  <Bar dataKey="Chi phí" fill="#f5222d" radius={[4, 4, 0, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Bottom Row: Table */}
      <Card
        title="Công việc sắp đến hạn"
        bordered={false}
        style={{ borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
        bodyStyle={{ padding: 0 }}
      >
        <Table
          columns={columns}
          dataSource={stats.upcoming_tasks || []}
          pagination={false}
          loading={isLoading}
        />
      </Card>
    </div>
  );
};

export default Dashboard;
