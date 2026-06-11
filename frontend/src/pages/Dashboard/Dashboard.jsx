import React from 'react';
import { Row, Col, Card, Typography, Progress, Table, Tag } from 'antd';
import {
  BankOutlined,
  TeamOutlined,
  DollarCircleOutlined,
  WalletOutlined,
  ArrowUpOutlined
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

const { Title, Text } = Typography;

const Dashboard = () => {
  // --- Dummy Data ---
  const revenueData = [
    { name: 'T1', 'Doanh thu': 19, 'Chi phí': 14 },
    { name: 'T2', 'Doanh thu': 25, 'Chi phí': 20 },
    { name: 'T3', 'Doanh thu': 33, 'Chi phí': 26 },
    { name: 'T4', 'Doanh thu': 30, 'Chi phí': 28 },
    { name: 'T5', 'Doanh thu': 40, 'Chi phí': 30 },
    { name: 'T6', 'Doanh thu': 44, 'Chi phí': 32 },
  ];

  const tasksData = [
    {
      key: '1',
      taskName: 'Đổ bê tông móng',
      project: 'Tòa nhà văn phòng APEX',
      deadline: 'Hôm nay',
      status: 'urgent',
    },
    {
      key: '2',
      taskName: 'Lắp đặt hệ thống ME',
      project: 'Khu đô thị sinh thái xanh',
      deadline: 'Ngày mai',
      status: 'warning',
    },
    {
      key: '3',
      taskName: 'Nghiệm thu giai đoạn 1',
      project: 'Trường liên cấp quốc tế',
      deadline: '15/10/2026',
      status: 'normal',
    },
    {
      key: '4',
      taskName: 'Giải phóng mặt bằng',
      project: 'Cầu vượt cao tốc QL1A',
      deadline: 'Quá hạn 2 ngày',
      status: 'overdue',
    },
  ];

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

  // --- Reusable Components ---
  const StatCard = ({ title, value, unit, icon, iconBg, trend }) => (
    <Card bordered={false} style={{ borderRadius: 12, height: '100%', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 8, background: iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24
        }}>
          {icon}
        </div>
        {trend && (
          <div style={{ background: '#f6ffed', color: '#52c41a', padding: '4px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
            <ArrowUpOutlined /> {trend}
          </div>
        )}
      </div>
      <Text type="secondary" style={{ fontSize: 14 }}>{title}</Text>
      <div style={{ marginTop: 8 }}>
        <span style={{ fontSize: 32, fontWeight: 700, color: '#1f1f1f' }}>{value}</span>
        {unit && <span style={{ fontSize: 16, color: '#595959', marginLeft: 4 }}>{unit}</span>}
      </div>
    </Card>
  );

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Tổng quan dự án</Title>
        <Text type="secondary">Chào mừng trở lại, đây là tóm tắt hiệu suất dự án hôm nay</Text>
      </div>

      {/* Top Stats Row */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Tổng số dự án"
            value="32"
            icon={<BankOutlined style={{ color: '#1677ff' }} />}
            iconBg="#e6f4ff"
            trend="12%"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Dự án đang thực hiện"
            value="24"
            icon={<TeamOutlined style={{ color: '#fa8c16' }} />}
            iconBg="#fff7e6"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Tổng doanh thu"
            value="45,2"
            unit="Tỷ"
            icon={<DollarCircleOutlined style={{ color: '#faad14' }} />}
            iconBg="#fffbe6"
            trend="8%"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Tổng chi phí"
            value="32,7"
            unit="Tỷ"
            icon={<WalletOutlined style={{ color: '#595959' }} />}
            iconBg="#f5f5f5"
          />
        </Col>
      </Row>

      {/* Middle Row: Progress and Chart */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={10}>
          <Card
            title="Tiến độ 10 dự án gần nhất"
            bordered={false}
            style={{ borderRadius: 12, height: '100%', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
          >
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text strong style={{ fontSize: 13 }}>Khu đô thị sinh thái xanh</Text>
              </div>
              <Progress percent={100} showInfo={false} strokeColor="#52c41a" size="small" />
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text strong style={{ fontSize: 13 }}>Tòa nhà văn phòng APEX</Text>
              </div>
              <Progress percent={75} showInfo={false} strokeColor="#1677ff" size="small" />
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text strong style={{ fontSize: 13 }}>Cầu vượt cao tốc QL1A</Text>
              </div>
              <Progress percent={45} showInfo={false} strokeColor="#1677ff" size="small" />
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text strong style={{ fontSize: 13 }}>Trường liên cấp quốc tế</Text>
              </div>
              <Progress percent={90} showInfo={false} strokeColor="#1677ff" size="small" />
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text strong style={{ fontSize: 13 }}>Bệnh viện đa khoa trung tâm</Text>
              </div>
              <Progress percent={25} showInfo={false} strokeColor="#f5222d" size="small" />
            </div>
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
                <BarChart data={revenueData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
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
          dataSource={tasksData}
          pagination={false}
        />
      </Card>

    </div>
  );
};

export default Dashboard;
