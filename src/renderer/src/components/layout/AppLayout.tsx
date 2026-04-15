import React from 'react'
import { Layout, Menu, Typography, Tag, Space } from 'antd'
import {
  DashboardOutlined,
  DatabaseOutlined,
  DiffOutlined,
  CheckCircleOutlined,
  HistoryOutlined,
  SearchOutlined
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAppContext } from '../../store/AppContext'

const { Sider, Content, Header } = Layout
const { Text } = Typography

interface AppLayoutProps {
  children: React.ReactNode
}

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/sources', icon: <DatabaseOutlined />, label: 'Fuentes de datos' },
  { key: '/ir-inspector', icon: <SearchOutlined />, label: 'Inspector IR' },
  { key: '/comparison', icon: <DiffOutlined />, label: 'Comparación' },
  { key: '/resolution', icon: <CheckCircleOutlined />, label: 'Resolución' },
  { key: '/history', icon: <HistoryOutlined />, label: 'Historial' }
]

export default function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { engineVersion } = useAppContext()

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        theme="dark"
        width={220}
        style={{ position: 'fixed', height: '100vh', left: 0, top: 0, bottom: 0 }}
      >
        <div style={{ padding: '16px 16px 8px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Text strong style={{ color: '#fff', fontSize: 16 }}>
            🔍 AUDD UI
          </Text>
          <br />
          <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>
            Demo v{engineVersion}
          </Text>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ marginTop: 8 }}
        />
      </Sider>
      <Layout style={{ marginLeft: 220 }}>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
            position: 'sticky',
            top: 0,
            zIndex: 100
          }}
        >
          <Text strong style={{ fontSize: 15 }}>
            {menuItems.find((m) => m.key === location.pathname)?.label ?? 'AUDD UI Demo'}
          </Text>
          <Space>
            <Tag color="blue">audd-node</Tag>
            <Tag color="green">v{engineVersion}</Tag>
          </Space>
        </Header>
        <Content style={{ margin: '24px', minHeight: 280 }}>{children}</Content>
      </Layout>
    </Layout>
  )
}
