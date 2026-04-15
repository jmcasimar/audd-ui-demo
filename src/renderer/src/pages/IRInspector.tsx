import React, { useState } from 'react'
import {
  Card,
  Select,
  Button,
  Space,
  Alert,
  Spin,
  Tree,
  Tabs,
  Tag,
  Descriptions,
  Empty,
  Table,
  message
} from 'antd'
import { SearchOutlined, CodeOutlined, BranchesOutlined } from '@ant-design/icons'
import { useAppContext } from '../store/AppContext'
import { useAudd } from '../hooks/useAudd'

const { Option } = Select

interface IRStructureLocal {
  version?: string
  source?: { type: string; format: string; path?: string }
  schema?: {
    fields: Array<{ name: string; type: string }>
    primary_keys: string[]
  }
  data?: unknown[]
  metadata?: { rows: number; created_at: string }
}

function buildTreeData(obj: unknown, keyLabel = 'root'): object[] {
  if (typeof obj !== 'object' || obj === null) {
    return [{ key: keyLabel, title: `${keyLabel}: ${JSON.stringify(obj)}` }]
  }
  if (Array.isArray(obj)) {
    return [
      {
        key: keyLabel,
        title: `${keyLabel} [${obj.length} items]`,
        children: obj.map((item, i) => buildTreeData(item, `[${i}]`)[0])
      }
    ]
  }
  return [
    {
      key: keyLabel,
      title: keyLabel,
      children: Object.entries(obj as Record<string, unknown>).map(
        ([k, v]) => buildTreeData(v, k)[0]
      )
    }
  ]
}

export default function IRInspector() {
  const { sources, addHistoryEntry } = useAppContext()
  const { buildIR } = useAudd()
  const [selectedSourceId, setSelectedSourceId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [irString, setIrString] = useState<string | null>(null)
  const [irParsed, setIrParsed] = useState<IRStructureLocal | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selectedSource = sources.find((s) => s.id === selectedSourceId)

  const handleBuildIR = async () => {
    if (!selectedSource) return
    setLoading(true)
    setError(null)
    setIrString(null)
    setIrParsed(null)

    try {
      const result = await buildIR(selectedSource)
      if (result.success && result.data) {
        setIrString(result.data)
        try {
          setIrParsed(JSON.parse(result.data) as IRStructureLocal)
        } catch {
          // not parseable, raw only
        }
        addHistoryEntry({
          id: `h_${Date.now()}`,
          date: new Date().toISOString(),
          sourceAName: selectedSource.name,
          sourceBName: '',
          operation: 'build_ir',
          status: 'success',
          result: result.data.slice(0, 200)
        })
        message.success('IR construido exitosamente')
      } else {
        setError(result.error ?? 'Error desconocido')
        addHistoryEntry({
          id: `h_${Date.now()}`,
          date: new Date().toISOString(),
          sourceAName: selectedSource.name,
          sourceBName: '',
          operation: 'build_ir',
          status: 'error',
          error: result.error
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  const schemaColumns = [
    { title: 'Campo', dataIndex: 'name', key: 'name' },
    {
      title: 'Tipo',
      dataIndex: 'type',
      key: 'type',
      render: (t: string) => <Tag color="blue">{t}</Tag>
    }
  ]

  const tabItems = [
    {
      key: 'tree',
      label: (
        <span>
          <BranchesOutlined /> Vista árbol
        </span>
      ),
      children: irParsed ? (
        <div style={{ maxHeight: 450, overflowY: 'auto' }}>
          <Tree
            treeData={buildTreeData(irParsed, 'IR') as any}
            defaultExpandDepth={2}
            style={{ fontSize: 13 }}
          />
        </div>
      ) : (
        <Empty description="No se pudo renderizar el árbol" />
      )
    },
    {
      key: 'schema',
      label: 'Esquema',
      children: irParsed?.schema ? (
        <div>
          <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Campos">{irParsed.schema.fields.length}</Descriptions.Item>
            <Descriptions.Item label="Claves primarias">
              {irParsed.schema.primary_keys.length > 0
                ? irParsed.schema.primary_keys.map((k) => <Tag key={k}>{k}</Tag>)
                : '—'}
            </Descriptions.Item>
          </Descriptions>
          <Table
            size="small"
            dataSource={irParsed.schema.fields.map((f, i) => ({ ...f, key: i }))}
            columns={schemaColumns}
            pagination={false}
          />
        </div>
      ) : (
        <Empty description="Sin información de esquema" />
      )
    },
    {
      key: 'metadata',
      label: 'Metadatos',
      children: irParsed?.metadata ? (
        <Descriptions bordered size="small" column={1}>
          <Descriptions.Item label="Filas">{irParsed.metadata.rows}</Descriptions.Item>
          <Descriptions.Item label="Creado">
            {new Date(irParsed.metadata.created_at).toLocaleString()}
          </Descriptions.Item>
          <Descriptions.Item label="Versión IR">{irParsed.version}</Descriptions.Item>
        </Descriptions>
      ) : (
        <Empty description="Sin metadatos" />
      )
    },
    {
      key: 'raw',
      label: (
        <span>
          <CodeOutlined /> JSON Raw
        </span>
      ),
      children: irString ? (
        <pre
          style={{
            background: '#1e1e1e',
            color: '#d4d4d4',
            padding: 16,
            borderRadius: 6,
            overflowX: 'auto',
            fontSize: 12,
            maxHeight: 500
          }}
        >
          {(() => {
            try {
              return JSON.stringify(JSON.parse(irString), null, 2)
            } catch {
              return irString
            }
          })()}
        </pre>
      ) : (
        <Empty description="Sin datos" />
      )
    }
  ]

  return (
    <div>
      <Card title="Inspector de Representación Intermedia (IR)" bordered={false}>
        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            style={{ width: 300 }}
            placeholder="Selecciona una fuente"
            value={selectedSourceId || undefined}
            onChange={setSelectedSourceId}
            showSearch
            optionFilterProp="children"
          >
            {sources.map((s) => (
              <Option key={s.id} value={s.id}>
                {s.name} ({s.type}/{s.format})
              </Option>
            ))}
          </Select>
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleBuildIR}
            loading={loading}
            disabled={!selectedSource}
          >
            Construir IR
          </Button>
        </Space>

        {sources.length === 0 && (
          <Alert
            message="No hay fuentes de datos registradas"
            description='Ve a "Fuentes de datos" para agregar una fuente antes de inspeccionar su IR.'
            type="info"
            showIcon
          />
        )}

        {error && (
          <Alert
            message="Error al construir IR"
            description={error}
            type="error"
            showIcon
            closable
            style={{ marginTop: 16 }}
            onClose={() => setError(null)}
          />
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
          </div>
        )}

        {irString && !loading && (
          <Card style={{ marginTop: 16 }} size="small">
            <Tabs items={tabItems} />
          </Card>
        )}
      </Card>
    </div>
  )
}
