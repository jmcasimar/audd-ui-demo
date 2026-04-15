import React from 'react'
import { Card, Table, Tag, Typography, Empty, Badge, Space } from 'antd'
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons'
import { useAppContext } from '../store/AppContext'
import type { HistoryEntry } from '../types'

const { Text } = Typography

const operationLabels: Record<HistoryEntry['operation'], string> = {
  build_ir: 'Construir IR',
  compare: 'Comparar',
  propose_resolution: 'Proponer resolución',
  apply_resolution: 'Aplicar resolución'
}

const operationColors: Record<HistoryEntry['operation'], string> = {
  build_ir: 'blue',
  compare: 'purple',
  propose_resolution: 'orange',
  apply_resolution: 'green'
}

export default function History() {
  const { history } = useAppContext()

  const columns = [
    {
      title: 'Fecha',
      dataIndex: 'date',
      key: 'date',
      render: (d: string) => new Date(d).toLocaleString(),
      sorter: (a: HistoryEntry, b: HistoryEntry) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    },
    {
      title: 'Operación',
      dataIndex: 'operation',
      key: 'operation',
      render: (op: HistoryEntry['operation']) => (
        <Tag color={operationColors[op]}>{operationLabels[op]}</Tag>
      ),
      filters: Object.entries(operationLabels).map(([value, text]) => ({ text, value })),
      onFilter: (value: unknown, record: HistoryEntry) => record.operation === value
    },
    {
      title: 'Fuente A',
      dataIndex: 'sourceAName',
      key: 'sourceAName',
      render: (n: string) => n || '—'
    },
    {
      title: 'Fuente B',
      dataIndex: 'sourceBName',
      key: 'sourceBName',
      render: (n: string) => n || '—'
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      render: (s: HistoryEntry['status']) =>
        s === 'success' ? (
          <Badge status="success" text={<><CheckCircleOutlined style={{ color: '#52c41a', marginRight: 4 }} />Éxito</>} />
        ) : (
          <Badge status="error" text={<><ExclamationCircleOutlined style={{ color: '#ff4d4f', marginRight: 4 }} />Error</>} />
        ),
      filters: [
        { text: 'Éxito', value: 'success' },
        { text: 'Error', value: 'error' }
      ],
      onFilter: (value: unknown, record: HistoryEntry) => record.status === value
    },
    {
      title: 'Notas / Error',
      key: 'notes',
      render: (_: unknown, record: HistoryEntry) => {
        if (record.error) return <Text type="danger" style={{ fontSize: 11 }}>{record.error}</Text>
        if (record.notes) return <Text type="secondary" style={{ fontSize: 11 }}>{record.notes}</Text>
        if (record.result) return <Text code style={{ fontSize: 11 }}>{record.result.slice(0, 60)}…</Text>
        return '—'
      }
    }
  ]

  return (
    <Card
      title="Historial de operaciones"
      bordered={false}
      extra={<Text type="secondary">{history.length} entradas</Text>}
    >
      {history.length === 0 ? (
        <Empty description="No hay operaciones registradas aún. Las operaciones aparecerán aquí automáticamente." />
      ) : (
        <Table
          dataSource={history}
          columns={columns as any}
          rowKey="id"
          pagination={{ pageSize: 20, showSizeChanger: true }}
          size="small"
        />
      )}
    </Card>
  )
}
