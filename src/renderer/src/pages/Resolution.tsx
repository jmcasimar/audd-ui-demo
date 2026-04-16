import React, { useState } from 'react'
import {
  Card,
  Button,
  Space,
  Alert,
  Spin,
  Select,
  Form,
  Typography,
  Tag,
  Descriptions,
  Collapse,
  Switch,
  message,
  Modal,
  Result
} from 'antd'
import {
  BulbOutlined,
  CheckOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons'
import { useAppContext } from '../store/AppContext'
import { useAudd } from '../hooks/useAudd'

const { Text } = Typography
const { Option } = Select

interface ParsedPlan {
  strategy?: string
  actions?: Array<{ type: string; field?: string; value?: unknown; source?: string }>
  summary?: { total_actions?: number; conflicts_resolved?: number }
  [key: string]: unknown
}

interface ParsedApplyResult {
  success?: boolean
  applied?: number
  skipped?: number
  errors?: string[]
  [key: string]: unknown
}

function parsePlan(s: string): ParsedPlan | null {
  try { return JSON.parse(s) as ParsedPlan } catch { return null }
}

function parseApplyResult(s: string): ParsedApplyResult | null {
  try { return JSON.parse(s) as ParsedApplyResult } catch { return null }
}

export default function Resolution() {
  const { currentComparison, updateCurrentComparison, addHistoryEntry } = useAppContext()
  const { proposeResolution, applyResolution } = useAudd()
  const [loading, setLoading] = useState(false)
  const [applyLoading, setApplyLoading] = useState(false)
  const [resolveStrategy, setResolveStrategy] = useState<string>('balanced')
  const [preferSource, setPreferSource] = useState<string>('merge')
  const [dryRun, setDryRun] = useState(true)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [applyResult, setApplyResult] = useState<ParsedApplyResult | null>(null)

  const hasDiff = !!currentComparison?.diff
  const hasPlan = !!currentComparison?.plan

  const plan = currentComparison?.plan ? parsePlan(currentComparison.plan) : null

  const handlePropose = async () => {
    if (!currentComparison?.diff) return
    setLoading(true)
    try {
      const result = await proposeResolution(currentComparison.diff, {
        strategy: resolveStrategy,
        preferSource
      })
      if (result.success && result.data) {
        updateCurrentComparison({ plan: result.data })
        message.success('Plan de resolución generado')
        addHistoryEntry({
          id: `h_${Date.now()}`,
          date: new Date().toISOString(),
          sourceAName: currentComparison.sourceAName,
          sourceBName: currentComparison.sourceBName,
          operation: 'propose_resolution',
          status: 'success',
          result: result.data.slice(0, 200)
        })
      } else {
        message.error(`Error: ${result.error}`)
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  const handleApplyConfirm = async () => {
    if (!currentComparison?.plan) return
    setConfirmModalOpen(false)
    setApplyLoading(true)
    try {
      const result = await applyResolution(currentComparison.plan, { dryRun, backup: !dryRun })
      if (result.success && result.data) {
        const parsed = parseApplyResult(result.data)
        console.log('Apply result:', result);
        setApplyResult(parsed)
        message.success(dryRun ? 'Simulación completada (dry-run)' : 'Resolución aplicada exitosamente')
        addHistoryEntry({
          id: `h_${Date.now()}`,
          date: new Date().toISOString(),
          sourceAName: currentComparison.sourceAName,
          sourceBName: currentComparison.sourceBName,
          operation: 'apply_resolution',
          status: 'success',
          result: result.data.slice(0, 200)
        })
      } else {
        message.error(`Error aplicando: ${result.error}`)
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setApplyLoading(false)
    }
  }

  if (!hasDiff) {
    return (
      <Card bordered={false}>
        <Alert
          message="No hay comparación activa"
          description='Primero ejecuta una comparación desde la página "Comparación" para obtener un diff y luego generar un plan de resolución.'
          type="info"
          showIcon
        />
      </Card>
    )
  }

  return (
    <div>
      <Card
        title="Propuesta de resolución"
        bordered={false}
        style={{ marginBottom: 16 }}
        extra={
          currentComparison && (
            <Space>
              <Tag>{currentComparison.sourceAName}</Tag>
              <Text type="secondary">vs</Text>
              <Tag>{currentComparison.sourceBName}</Tag>
            </Space>
          )
        }
      >
        <Form layout="inline" style={{ marginBottom: 16 }}>
          <Form.Item label="Estrategia">
            <Select value={resolveStrategy} onChange={setResolveStrategy} style={{ width: 150 }}>
              <Option value="conservative">Conservadora</Option>
              <Option value="balanced">Balanceada</Option>
              <Option value="aggressive">Agresiva</Option>
            </Select>
          </Form.Item>
          <Form.Item label="Preferir fuente">
            <Select value={preferSource} onChange={setPreferSource} style={{ width: 150 }}>
              <Option value="a">Fuente A</Option>
              <Option value="b">Fuente B</Option>
              <Option value="merge">Combinar</Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              icon={<BulbOutlined />}
              onClick={handlePropose}
              loading={loading}
            >
              Generar propuesta
            </Button>
          </Form.Item>
        </Form>

        {loading && (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <Spin tip="Analizando diferencias y generando plan..." />
          </div>
        )}

        {plan && (
          <>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Estrategia usada">{plan.strategy ?? resolveStrategy}</Descriptions.Item>
              <Descriptions.Item label="Acciones propuestas">{plan.summary?.total_actions ?? plan.actions?.length ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Conflictos resueltos">{plan.summary?.conflicts_resolved ?? '—'}</Descriptions.Item>
            </Descriptions>

            {plan.actions && plan.actions.length > 0 && (
              <Collapse
                style={{ marginBottom: 16 }}
                items={[
                  {
                    key: 'actions',
                    label: `Ver acciones del plan (${plan.actions.length})`,
                    children: (
                      <ul style={{ paddingLeft: 20 }}>
                        {plan.actions.map((action, i) => (
                          <li key={i} style={{ marginBottom: 4 }}>
                            <Tag color="blue">{action.type}</Tag>
                            {action.field && <Text code>{action.field}</Text>}
                            {action.source && <Text type="secondary"> ← {action.source}</Text>}
                          </li>
                        ))}
                      </ul>
                    )
                  },
                  {
                    key: 'raw',
                    label: 'Plan completo (JSON)',
                    children: (
                      <pre style={{ background: '#1e1e1e', color: '#d4d4d4', padding: 16, borderRadius: 6, fontSize: 12, maxHeight: 300, overflowY: 'auto' }}>
                        {JSON.stringify(plan, null, 2)}
                      </pre>
                    )
                  }
                ]}
              />
            )}
          </>
        )}
      </Card>

      {hasPlan && (
        <Card title="Aplicar resolución" bordered={false}>
          <Alert
            message="Atención"
            description={
              <>
                La aplicación de una resolución puede modificar datos en las fuentes de destino.
                Se recomienda usar <strong>Dry Run</strong> primero para simular sin modificar nada.
              </>
            }
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Form layout="inline" style={{ marginBottom: 16 }}>
            <Form.Item label="Modo Dry Run">
              <Switch
                checked={dryRun}
                onChange={setDryRun}
                checkedChildren="Simulación"
                unCheckedChildren="Real"
              />
            </Form.Item>
            <Form.Item>
              <Button
                type={dryRun ? 'default' : 'primary'}
                danger={!dryRun}
                icon={<CheckOutlined />}
                onClick={() => setConfirmModalOpen(true)}
                loading={applyLoading}
              >
                {dryRun ? 'Simular aplicación' : 'Aplicar resolución'}
              </Button>
            </Form.Item>
          </Form>

          {applyResult && (
            <Result
              status={applyResult.success ? 'success' : 'error'}
              title={dryRun ? 'Simulación completada' : applyResult.success ? 'Resolución aplicada' : 'Error en aplicación'}
              subTitle={
                <Space direction="vertical">
                  {applyResult.applied !== undefined && (
                    <Text>Acciones aplicadas: <strong>{applyResult.applied}</strong></Text>
                  )}
                  {applyResult.skipped !== undefined && (
                    <Text>Omitidas: <strong>{applyResult.skipped}</strong></Text>
                  )}
                  {applyResult.errors && applyResult.errors.length > 0 && (
                    <ul>{applyResult.errors.map((e, i) => <li key={i}><Text type="danger">{e}</Text></li>)}</ul>
                  )}
                </Space>
              }
            />
          )}
        </Card>
      )}

      <Modal
        open={confirmModalOpen}
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: dryRun ? '#1890ff' : '#ff4d4f' }} />
            {dryRun ? 'Confirmar simulación' : 'Confirmar aplicación real'}
          </Space>
        }
        onOk={handleApplyConfirm}
        onCancel={() => setConfirmModalOpen(false)}
        okText={dryRun ? 'Simular' : 'Aplicar'}
        okButtonProps={{ danger: !dryRun }}
      >
        {dryRun
          ? 'Se ejecutará una simulación del plan sin modificar datos reales.'
          : '⚠️ Esta acción modificará datos reales en la fuente de destino. ¿Deseas continuar?'}
      </Modal>
    </div>
  )
}
