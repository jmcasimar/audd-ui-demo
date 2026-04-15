import React, { useState } from 'react'
import {
  Table,
  Button,
  Space,
  Tag,
  Form,
  Input,
  Select,
  InputNumber,
  Popconfirm,
  Typography,
  Card,
  message,
  Drawer,
  Row,
  Col
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FileOutlined,
  DatabaseOutlined,
  FolderOpenOutlined
} from '@ant-design/icons'
import { useAppContext } from '../store/AppContext'
import { useAudd } from '../hooks/useAudd'
import type { DataSource, DbSource } from '../types'

const { Text } = Typography
const { Option } = Select

function generateId() {
  return `src_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

export default function Sources() {
  const { sources, addSource, updateSource, removeSource } = useAppContext()
  const { selectFile } = useAudd()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingSource, setEditingSource] = useState<DataSource | null>(null)
  const [form] = Form.useForm()
  const [sourceType, setSourceType] = useState<'file' | 'db'>('file')
  const [dbFormat, setDbFormat] = useState<'sqlite' | 'mysql' | 'postgres'>('sqlite')

  const openAddDrawer = () => {
    setEditingSource(null)
    form.resetFields()
    setSourceType('file')
    setDbFormat('sqlite')
    setDrawerOpen(true)
  }

  const openEditDrawer = (source: DataSource) => {
    setEditingSource(source)
    setSourceType(source.type)
    if (source.type === 'db') setDbFormat(source.format as 'sqlite' | 'mysql' | 'postgres')
    form.setFieldsValue(source)
    setDrawerOpen(true)
  }

  const handleSelectFile = async (extensions = ['json', 'csv']) => {
    const result = await selectFile({ filters: [{ name: 'Archivos de datos', extensions }] })
    if (result.success && result.data?.[0]) {
      form.setFieldValue('path', result.data[0])
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const now = new Date().toISOString()

      if (editingSource) {
        const updated: DataSource = { ...editingSource, ...values, type: sourceType }
        updateSource(updated)
        message.success('Fuente actualizada')
      } else {
        const newSource = {
          id: generateId(),
          createdAt: now,
          type: sourceType,
          ...values
        } as DataSource
        addSource(newSource)
        message.success('Fuente registrada')
      }
      setDrawerOpen(false)
    } catch {
      // form validation handles UI feedback
    }
  }

  const columns = [
    {
      title: 'Nombre',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: DataSource) => (
        <Space>
          {record.type === 'file' ? <FileOutlined /> : <DatabaseOutlined />}
          <Text strong>{name}</Text>
        </Space>
      )
    },
    {
      title: 'Tipo',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'file' ? 'blue' : 'purple'}>
          {type === 'file' ? 'Archivo' : 'Base de datos'}
        </Tag>
      )
    },
    {
      title: 'Formato',
      dataIndex: 'format',
      key: 'format',
      render: (format: string) => <Tag>{format.toUpperCase()}</Tag>
    },
    {
      title: 'Origen',
      key: 'origin',
      render: (_: unknown, record: DataSource) => {
        if (record.type === 'file') {
          return <Text code style={{ fontSize: 11 }}>{record.path}</Text>
        }
        const db = record as DbSource
        if (db.format === 'sqlite') return <Text code style={{ fontSize: 11 }}>{db.path}</Text>
        return (
          <Text code style={{ fontSize: 11 }}>
            {db.host}:{db.port}/{db.database}
          </Text>
        )
      }
    },
    {
      title: 'Creado',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string) => new Date(v).toLocaleString()
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_: unknown, record: DataSource) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => openEditDrawer(record)} />
          <Popconfirm
            title="¿Eliminar fuente?"
            description="Esta acción no se puede deshacer."
            onConfirm={() => removeSource(record.id)}
            okText="Eliminar"
            cancelText="Cancelar"
          >
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div>
      <Card
        title="Fuentes de datos"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openAddDrawer}>
            Nueva fuente
          </Button>
        }
        bordered={false}
      >
        <Table
          dataSource={sources}
          columns={columns}
          rowKey="id"
          locale={{ emptyText: 'No hay fuentes registradas. Agrega una para comenzar.' }}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Drawer
        title={editingSource ? 'Editar fuente' : 'Nueva fuente de datos'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={480}
        footer={
          <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
            <Button onClick={() => setDrawerOpen(false)}>Cancelar</Button>
            <Button type="primary" onClick={handleSubmit}>
              {editingSource ? 'Actualizar' : 'Registrar'}
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Nombre" rules={[{ required: true, message: 'Requerido' }]}>
            <Input placeholder="Mi fuente de datos" />
          </Form.Item>

          <Form.Item label="Tipo de fuente">
            <Select
              value={sourceType}
              onChange={(v) => {
                setSourceType(v)
                form.setFieldValue('format', v === 'file' ? 'json' : 'sqlite')
              }}
            >
              <Option value="file">Archivo</Option>
              <Option value="db">Base de datos</Option>
            </Select>
          </Form.Item>

          {sourceType === 'file' && (
            <>
              <Form.Item name="format" label="Formato" rules={[{ required: true }]}>
                <Select>
                  <Option value="json">JSON</Option>
                  <Option value="csv">CSV</Option>
                </Select>
              </Form.Item>
              <Form.Item name="path" label="Ruta del archivo" rules={[{ required: true, message: 'Requerido' }]}>
                <Input
                  placeholder="/ruta/al/archivo.json"
                  addonAfter={
                    <Button
                      size="small"
                      icon={<FolderOpenOutlined />}
                      onClick={() => handleSelectFile(['json', 'csv'])}
                      type="link"
                      style={{ height: 'auto', padding: 0 }}
                    >
                      Examinar
                    </Button>
                  }
                />
              </Form.Item>
              <Form.Item name="encoding" label="Encoding">
                <Select defaultValue="utf8" allowClear>
                  <Option value="utf8">UTF-8</Option>
                  <Option value="latin1">Latin-1</Option>
                </Select>
              </Form.Item>
            </>
          )}

          {sourceType === 'db' && (
            <>
              <Form.Item name="format" label="Motor de BD" rules={[{ required: true }]}>
                <Select onChange={(v) => setDbFormat(v as 'sqlite' | 'mysql' | 'postgres')}>
                  <Option value="sqlite">SQLite</Option>
                  <Option value="mysql">MySQL</Option>
                  <Option value="postgres">PostgreSQL</Option>
                </Select>
              </Form.Item>

              {dbFormat === 'sqlite' ? (
                <Form.Item name="path" label="Ruta del archivo SQLite" rules={[{ required: true, message: 'Requerido' }]}>
                  <Input
                    placeholder="/ruta/base.db"
                    addonAfter={
                      <Button
                        size="small"
                        icon={<FolderOpenOutlined />}
                        onClick={() => handleSelectFile(['db', 'sqlite', 'sqlite3'])}
                        type="link"
                        style={{ height: 'auto', padding: 0 }}
                      >
                        Examinar
                      </Button>
                    }
                  />
                </Form.Item>
              ) : (
                <>
                  <Row gutter={8}>
                    <Col span={16}>
                      <Form.Item name="host" label="Host" rules={[{ required: true }]}>
                        <Input placeholder="localhost" />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name="port" label="Puerto">
                        <InputNumber
                          style={{ width: '100%' }}
                          placeholder={dbFormat === 'mysql' ? '3306' : '5432'}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item name="database" label="Base de datos" rules={[{ required: true }]}>
                    <Input placeholder="mi_base" />
                  </Form.Item>
                  <Form.Item name="username" label="Usuario" rules={[{ required: true }]}>
                    <Input placeholder="root" />
                  </Form.Item>
                  <Form.Item name="password" label="Contraseña">
                    <Input.Password placeholder="••••••••" />
                  </Form.Item>
                </>
              )}

              <Form.Item name="table" label="Tabla" rules={[{ required: true, message: 'Requerido' }]}>
                <Input placeholder="mi_tabla" />
              </Form.Item>
              <Form.Item name="query" label="Query personalizada (opcional)">
                <Input.TextArea rows={3} placeholder="SELECT * FROM tabla WHERE ..." />
              </Form.Item>
            </>
          )}
        </Form>
      </Drawer>
    </div>
  )
}
