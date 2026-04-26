import React, { useState } from 'react'
import {
  Card,
  Select,
  Button,
  Space,
  Steps,
  Alert,
  Spin,
  Row,
  Col,
  Typography,
  Tag,
  Divider,
  Form,
  InputNumber,
  Table,
  message,
  Badge,
  Collapse
} from 'antd'
import {
  PlayCircleOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons'
import { useAppContext } from '../store/AppContext'
import { useAudd } from '../hooks/useAudd'
import type { ComparisonRun } from '../types'

const { Option } = Select
const { Text } = Typography

function generateId() {
  return `run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

interface DiffItem {
  field?: string
  type?: string
  value_a?: unknown
  value_b?: unknown
  status?: string
}

interface ParsedDiff {
  summary?: {
    total?: number
    matches?: number
    differences?: number
    conflicts?: number
    missing_a?: number
    missing_b?: number
  }
  items?: DiffItem[]
  [key: string]: unknown
}

function parseDiff(diffString: string): ParsedDiff | null {
  try {
    return JSON.parse(diffString) as ParsedDiff
  } catch {
    return null
  }
}

function getDiffStatusColor(status?: string): 'success' | 'warning' | 'error' | 'default' {
  switch (status) {
    case 'match': return 'success'
    case 'difference': return 'warning'
    case 'conflict': return 'error'
    default: return 'default'
  }
}

export default function Comparison() {
  const { sources, setCurrentComparison, updateCurrentComparison, addHistoryEntry, currentComparison } = useAppContext()
  const { buildIR, compare } = useAudd()
  const [sourceAId, setSourceAId] = useState<string>('')
  const [sourceBId, setSourceBId] = useState<string>('')
  const [threshold, setThreshold] = useState<number>(0.8)
  const [strategy, setStrategy] = useState<string>('structural')
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  const sourceA = sources.find((s) => s.id === sourceAId)
  const sourceB = sources.find((s) => s.id === sourceBId)

  const handleRunComparison = async () => {
    if (!sourceA || !sourceB) return
    setLoading(true)
    setCurrentStep(0)

    const run: ComparisonRun = {
      id: generateId(),
      sourceAId: sourceA.id,
      sourceAName: sourceA.name,
      sourceBId: sourceB.id,
      sourceBName: sourceB.name,
      status: 'building_ir',
      strategy,
      threshold,
      createdAt: new Date().toISOString()
    }
    setCurrentComparison(run)

    try {
      setCurrentStep(0)
      updateCurrentComparison({ status: 'building_ir' })
      const irAResult = await buildIR(sourceA)
      if (!irAResult.success) throw new Error(`Error en IR A: ${irAResult.error}`)
      updateCurrentComparison({ irA: irAResult.data })

      setCurrentStep(1)
      const irBResult = await buildIR(sourceB)
      if (!irBResult.success) throw new Error(`Error en IR B: ${irBResult.error}`)
      updateCurrentComparison({ irB: irBResult.data })

      setCurrentStep(2)
      updateCurrentComparison({ status: 'comparing' })
      const diffResult = await compare(irAResult.data!, irBResult.data!, { threshold, strategy })
      if (!diffResult.success) throw new Error(`Error en comparación: ${diffResult.error}`)
      updateCurrentComparison({ diff: diffResult.data, status: 'done', completedAt: new Date().toISOString() })

      setCurrentStep(3)
      message.success('Comparación completada')

      addHistoryEntry({
        id: `h_${Date.now()}`,
        date: new Date().toISOString(),
        sourceAName: sourceA.name,
        sourceBName: sourceB.name,
        operation: 'compare',
        status: 'success',
        result: diffResult.data?.slice(0, 200)
      })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error inesperado'
      updateCurrentComparison({ status: 'error', error: errorMsg })
      message.error(errorMsg)
      addHistoryEntry({
        id: `h_${Date.now()}`,
        date: new Date().toISOString(),
        sourceAName: sourceA.name,
        sourceBName: sourceB.name,
        operation: 'compare',
        status: 'error',
        error: errorMsg
      })
    } finally {
      setLoading(false)
    }
  }

  const diff = currentComparison?.diff ? parseDiff(currentComparison.diff) : null

  const diffColumns = [
    { title: 'Campo', dataIndex: 'field', key: 'field' },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => <Badge status={getDiffStatusColor(s)} text={s ?? '—'} />
    },
    {
      title: 'Valor A',
      dataIndex: 'value_a',
      key: 'value_a',
      render: (v: unknown) => <Text code style={{ fontSize: 11 }}>{JSON.stringify(v)}</Text>
    },
    {
      title: 'Valor B',
      dataIndex: 'value_b',
      key: 'value_b',
      render: (v: unknown) => <Text code style={{ fontSize: 11 }}>{JSON.stringify(v)}</Text>
    }
  ]

  const stepsItems = [
    {
      title: 'IR Fuente A',
      description: sourceA?.name ?? '—',
      status: (currentStep > 0 ? 'finish' : currentStep === 0 && loading ? 'process' : 'wait') as 'finish' | 'process' | 'wait'
    },
    {
      title: 'IR Fuente B',
      description: sourceB?.name ?? '—',
      status: (currentStep > 1 ? 'finish' : currentStep === 1 && loading ? 'process' : 'wait') as 'finish' | 'process' | 'wait'
    },
    {
      title: 'Comparar',
      description: `Estrategia: ${strategy}`,
      status: (currentStep > 2 ? 'finish' : currentStep === 2 && loading ? 'process' : 'wait') as 'finish' | 'process' | 'wait'
    },
    {
      title: 'Resultado',
      status: (currentComparison?.status === 'done' ? 'finish' : currentComparison?.status === 'error' ? 'error' : 'wait') as 'finish' | 'error' | 'wait'
    }
  ]

  return (
    <div>
      <Card title="Configuración de comparación" bordered={false} style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col xs={24} md={10}>
            <Form.Item label="Fuente A">
              <Select
                style={{ width: '100%' }}
                placeholder="Selecciona fuente A"
                value={sourceAId || undefined}
                onChange={setSourceAId}
              >
                {sources.filter((s) => s.id !== sourceBId).map((s) => (
                  <Option key={s.id} value={s.id}>
                    {s.name} ({s.type}/{s.format})
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={4} style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowRightOutlined style={{ fontSize: 24, color: '#1890ff' }} />
          </Col>
          <Col xs={24} md={10}>
            <Form.Item label="Fuente B">
              <Select
                style={{ width: '100%' }}
                placeholder="Selecciona fuente B"
                value={sourceBId || undefined}
                onChange={setSourceBId}
              >
                {sources.filter((s) => s.id !== sourceAId).map((s) => (
                  <Option key={s.id} value={s.id}>
                    {s.name} ({s.type}/{s.format})
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item label="Estrategia">
              <Select value={strategy} onChange={setStrategy}>
                <Option value="structural">Estructural</Option>
                <Option value="semantic">Semántica</Option>
                <Option value="hybrid">Híbrida</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label={`Threshold de similitud: ${threshold}`}>
              <InputNumber
                min={0}
                max={1}
                step={0.05}
                value={threshold}
                onChange={(v) => setThreshold(v ?? 0.8)}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>

        {sources.length < 2 && (
          <Alert
            message="Necesitas al menos 2 fuentes registradas para comparar."
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          onClick={handleRunComparison}
          loading={loading}
          disabled={!sourceA || !sourceB || sourceA.id === sourceB.id}
          size="large"
        >
          Ejecutar comparación
        </Button>
      </Card>

      {(currentComparison || loading) && (
        <Card title="Progreso" bordered={false} style={{ marginBottom: 16 }}>
          <Steps items={stepsItems} current={currentStep} />
          {loading && (
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <Spin tip="Procesando..." />
            </div>
          )}
          {currentComparison?.status === 'error' && (
            <Alert
              message="Error en la comparación"
              description={currentComparison.error}
              type="error"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
        </Card>
      )}

      {currentComparison?.diff && (
        <Card title="Resultados de comparación" bordered={false}>
          {diff?.summary && (
            <Row gutter={16} style={{ marginBottom: 16 }}>
              {Object.entries(diff.summary).map(([key, val]) => (
                <Col key={key} xs={12} sm={8} md={4}>
                  <Card size="small" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{val as number}</div>
                    <div style={{ fontSize: 11, color: '#666' }}>{key.replace(/_/g, ' ')}</div>
                  </Card>
                </Col>
              ))}
            </Row>
          )}

          {diff?.items && diff.items.length > 0 ? (
            <Table
              dataSource={diff.items.map((item, i) => ({ ...item, key: i }))}
              columns={diffColumns}
              size="small"
              pagination={{ pageSize: 20 }}
            />
          ) : (
            <Collapse
              items={[
                {
                  key: 'raw',
                  label: 'Ver resultado completo (JSON)',
                  children: (
                    <pre style={{ background: '#1e1e1e', color: '#d4d4d4', padding: 16, borderRadius: 6, fontSize: 12, maxHeight: 400, overflowY: 'auto' }}>
                      {JSON.stringify(diff ?? (currentComparison.diff ? JSON.parse(currentComparison.diff) : {}), null, 2)}
                    </pre>
                  )
                }
              ]}
            />
          )}

          <Divider />
          <Button
            type="primary"
            onClick={() => message.info('Ve a la página de Resolución para proponer y aplicar un plan.')}
          >
            Continuar a Resolución →
          </Button>
        </Card>
      )}
    </div>
  )
}
