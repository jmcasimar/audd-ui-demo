import React, { useEffect, useState } from 'react'
import { Row, Col, Card, Statistic, Alert, Button, Space, Typography, Badge, Spin } from 'antd'
import {
  DatabaseOutlined,
  DiffOutlined,
  HistoryOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAudd } from '../hooks/useAudd'
import { useAppContext } from '../store/AppContext'

const { Paragraph, Text } = Typography

export default function Dashboard() {
  const navigate = useNavigate()
  const { ping, getVersion } = useAudd()
  const { sources, history, engineVersion, setEngineVersion } = useAppContext()
  const [engineStatus, setEngineStatus] = useState<'checking' | 'ok' | 'error'>('checking')
  const [pingResult, setPingResult] = useState<string>('')

  useEffect(() => {
    async function checkEngine() {
      try {
        const versionResult = await getVersion()
        if (versionResult.success && versionResult.data) {
          setEngineVersion(versionResult.data)
        }
        const pingRes = await ping()
        if (pingRes.success) {
          setEngineStatus('ok')
          setPingResult(pingRes.data ?? '')
        } else {
          setEngineStatus('error')
        }
      } catch {
        setEngineStatus('error')
      }
    }
    checkEngine()
  }, [getVersion, ping, setEngineVersion])

  const successCount = history.filter((h) => h.status === 'success').length
  const errorCount = history.filter((h) => h.status === 'error').length

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          {engineStatus === 'checking' && (
            <Alert
              message={<><Spin size="small" style={{ marginRight: 8 }} />Verificando motor AUDD...</>}
              type="info"
            />
          )}
          {engineStatus === 'ok' && (
            <Alert
              message={`Motor AUDD activo — ${pingResult} — versión ${engineVersion}`}
              type="success"
              showIcon
              icon={<CheckCircleOutlined />}
            />
          )}
          {engineStatus === 'error' && (
            <Alert
              message="No se pudo conectar con el motor AUDD. Revisa la instalación de audd-node."
              type="error"
              showIcon
              icon={<ExclamationCircleOutlined />}
            />
          )}
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Fuentes registradas" value={sources.length} prefix={<DatabaseOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Operaciones ejecutadas" value={history.length} prefix={<DiffOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Éxitos" value={successCount} valueStyle={{ color: '#3f8600' }} prefix={<CheckCircleOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Errores" value={errorCount} valueStyle={{ color: errorCount > 0 ? '#cf1322' : undefined }} prefix={<ExclamationCircleOutlined />} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title="Acciones rápidas" bordered={false}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Button block icon={<DatabaseOutlined />} onClick={() => navigate('/sources')}>
                Gestionar fuentes de datos
              </Button>
              <Button block icon={<DiffOutlined />} type="primary" onClick={() => navigate('/comparison')}>
                Nueva comparación
              </Button>
              <Button block icon={<HistoryOutlined />} onClick={() => navigate('/history')}>
                Ver historial
              </Button>
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Acerca de AUDD" bordered={false}>
            <Paragraph>
              <Text strong>AUDD (Automated Universal Data Diff)</Text> es un motor de comparación y reconciliación de fuentes de datos heterogéneas.
            </Paragraph>
            <Paragraph>
              Esta interfaz permite probar las capacidades del motor de forma visual, sin depender exclusivamente de scripts o línea de comandos.
            </Paragraph>
            <Space wrap>
              <Badge status="success" text="Construir IR" />
              <Badge status="success" text="Comparar fuentes" />
              <Badge status="success" text="Proponer resolución" />
              <Badge status="success" text="Aplicar resolución" />
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
