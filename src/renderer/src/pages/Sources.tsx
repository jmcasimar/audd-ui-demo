/**
 * @file pages/Sources.tsx
 * @description Página de gestión de fuentes de datos.
 *
 * Permite registrar, editar y eliminar fuentes de dos tipos:
 *   - Archivos: JSON, CSV
 *   - Bases de datos: SQLite, MySQL, PostgreSQL
 *
 * Para las fuentes de base de datos incluye un botón "Probar conexión" que
 * invoca el canal IPC `audd:testConnection` y muestra el resultado en pantalla
 * antes de guardar la configuración.
 *
 * Adaptadores planificados para versiones futuras de audd-node:
 *   - MongoDB  (pendiente en el core de AUDD)
 *   - Microsoft SQL Server  (pendiente en el core de AUDD)
 */

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
  Col,
  Alert,
  Tooltip,
  Divider
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FileOutlined,
  DatabaseOutlined,
  FolderOpenOutlined,
  ApiOutlined,
  InfoCircleOutlined
} from '@ant-design/icons'
import { useAppContext } from '../store/AppContext'
import { useAudd } from '../hooks/useAudd'
import type { DataSource, DbSource } from '../types'

const { Text } = Typography
const { Option } = Select

function generateId() {
  return `src_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

/** Puerto por defecto según el motor de base de datos. */
const DEFAULT_PORTS: Record<string, number> = {
  mysql: 3306,
  postgres: 5432
}

export default function Sources() {
  const { sources, addSource, updateSource, removeSource } = useAppContext()
  const { selectFile, testConnection } = useAudd()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingSource, setEditingSource] = useState<DataSource | null>(null)
  const [form] = Form.useForm()
  const [sourceType, setSourceType] = useState<'file' | 'db'>('file')
  const [dbFormat, setDbFormat] = useState<'sqlite' | 'mysql' | 'postgres'>('sqlite')

  // Estado para la prueba de conexión
  const [testingConn, setTestingConn] = useState(false)
  const [connTestResult, setConnTestResult] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  // ─── Apertura del drawer ───────────────────────────────────────────────────

  const openAddDrawer = () => {
    setEditingSource(null)
    form.resetFields()
    setSourceType('file')
    setDbFormat('sqlite')
    setConnTestResult(null)
    setDrawerOpen(true)
  }

  const openEditDrawer = (source: DataSource) => {
    setEditingSource(source)
    setSourceType(source.type)
    if (source.type === 'db') {
      setDbFormat(source.format as 'sqlite' | 'mysql' | 'postgres')
    }
    form.setFieldsValue(source)
    setConnTestResult(null)
    setDrawerOpen(true)
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
    setConnTestResult(null)
  }

  // ─── Cambio de tipo de fuente ──────────────────────────────────────────────

  const handleSourceTypeChange = (value: 'file' | 'db') => {
    setSourceType(value)
    setConnTestResult(null)
    if (value === 'file') {
      form.setFieldValue('format', 'json')
    } else {
      form.setFieldValue('format', 'sqlite')
      setDbFormat('sqlite')
    }
  }

  // ─── Cambio de motor de base de datos ─────────────────────────────────────

  const handleDbFormatChange = (value: 'sqlite' | 'mysql' | 'postgres') => {
    setDbFormat(value)
    setConnTestResult(null)
    // Establecer puerto por defecto si no hay uno configurado
    if (value !== 'sqlite' && !form.getFieldValue('port')) {
      form.setFieldValue('port', DEFAULT_PORTS[value])
    }
  }

  // ─── Selector de archivo nativo ───────────────────────────────────────────

  const handleSelectFile = async (extensions = ['json', 'csv']) => {
    const result = await selectFile({ filters: [{ name: 'Archivos de datos', extensions }] })
    if (result.success && result.data?.[0]) {
      form.setFieldValue('path', result.data[0])
      setConnTestResult(null)
    }
  }

  // ─── Prueba de conexión ───────────────────────────────────────────────────

  /**
   * Lee los valores actuales del formulario y prueba la conexión sin guardar.
   *
   * Para SQLite usa SQLiteAdapter.checkConnection (solo verifica el archivo).
   * Para MySQL / PostgreSQL ejecuta engine.buildIR (valida servidor + tabla).
   */
  const handleTestConnection = async () => {
    let values: Record<string, unknown>
    try {
      values = await form.validateFields()
    } catch {
      return // form validation UI handles feedback
    }

    setTestingConn(true)
    setConnTestResult(null)

    const config = {
      format: values.format as 'sqlite' | 'mysql' | 'postgres',
      path: values.path as string | undefined,
      host: values.host as string | undefined,
      port: values.port as number | undefined,
      database: values.database as string | undefined,
      username: values.username as string | undefined,
      password: values.password as string | undefined,
      table: values.table as string,
      query: values.query as string | undefined
    }

    const result = await testConnection(config)

    setConnTestResult({
      type: result.success ? 'success' : 'error',
      message: result.success
        ? (result.data ?? 'Conexión exitosa')
        : (result.error ?? 'Error de conexión')
    })

    setTestingConn(false)
  }

  // ─── Guardar fuente ───────────────────────────────────────────────────────

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
      closeDrawer()
    } catch {
      // form validation handles UI feedback
    }
  }

  // ─── Columnas de la tabla ─────────────────────────────────────────────────

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
        if (db.format === 'sqlite') {
          return <Text code style={{ fontSize: 11 }}>{db.path}</Text>
        }
        return (
          <Text code style={{ fontSize: 11 }}>
            {db.host}:{db.port ?? DEFAULT_PORTS[db.format as 'mysql' | 'postgres']}/{db.database}
          </Text>
        )
      }
    },
    {
      title: 'Tabla / Ruta',
      key: 'table',
      render: (_: unknown, record: DataSource) => {
        if (record.type === 'db') {
          return <Text code style={{ fontSize: 11 }}>{(record as DbSource).table}</Text>
        }
        return null
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

  // ─── Render ───────────────────────────────────────────────────────────────

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
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Fuentes soportadas"
          description={
            <>
              <strong>Archivos:</strong> JSON, CSV &nbsp;|&nbsp;
              <strong>Bases de datos:</strong> SQLite, MySQL, PostgreSQL.&nbsp;
              <Text type="secondary">
                Los adaptadores para <strong>MongoDB</strong> y{' '}
                <strong>Microsoft SQL Server</strong> están planificados en el roadmap de audd-node
                y se integrarán cuando estén disponibles en el motor AUDD.
              </Text>
            </>
          }
        />

        <Table
          dataSource={sources}
          columns={columns}
          rowKey="id"
          locale={{ emptyText: 'No hay fuentes registradas. Agrega una para comenzar.' }}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* ─── Drawer de alta / edición ──────────────────────────────────────── */}
      <Drawer
        title={editingSource ? 'Editar fuente' : 'Nueva fuente de datos'}
        open={drawerOpen}
        onClose={closeDrawer}
        width={500}
        footer={
          <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
            <Button onClick={closeDrawer}>Cancelar</Button>
            <Button type="primary" onClick={handleSubmit}>
              {editingSource ? 'Actualizar' : 'Registrar'}
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">

          {/* ── Nombre ────────────────────────────────────────────────────── */}
          <Form.Item name="name" label="Nombre" rules={[{ required: true, message: 'Requerido' }]}>
            <Input placeholder="Mi fuente de datos" />
          </Form.Item>

          {/* ── Tipo de fuente ────────────────────────────────────────────── */}
          <Form.Item label="Tipo de fuente">
            <Select value={sourceType} onChange={handleSourceTypeChange}>
              <Option value="file">
                <FileOutlined /> &nbsp;Archivo
              </Option>
              <Option value="db">
                <DatabaseOutlined /> &nbsp;Base de datos
              </Option>
            </Select>
          </Form.Item>

          {/* ══════════════════════════════════════════════════════════════════
              SECCIÓN: ARCHIVO
          ══════════════════════════════════════════════════════════════════ */}
          {sourceType === 'file' && (
            <>
              <Form.Item name="format" label="Formato" rules={[{ required: true }]}>
                <Select>
                  <Option value="json">JSON</Option>
                  <Option value="csv">CSV</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="path"
                label="Ruta del archivo"
                rules={[{ required: true, message: 'Requerido' }]}
              >
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

          {/* ══════════════════════════════════════════════════════════════════
              SECCIÓN: BASE DE DATOS
          ══════════════════════════════════════════════════════════════════ */}
          {sourceType === 'db' && (
            <>
              {/* Motor de BD */}
              <Form.Item
                name="format"
                label={
                  <Space>
                    Motor de base de datos
                    <Tooltip title="MongoDB y Microsoft SQL Server estarán disponibles en versiones futuras de audd-node.">
                      <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                    </Tooltip>
                  </Space>
                }
                rules={[{ required: true }]}
              >
                <Select onChange={handleDbFormatChange}>
                  <Option value="sqlite">SQLite</Option>
                  <Option value="mysql">MySQL</Option>
                  <Option value="postgres">PostgreSQL</Option>
                </Select>
              </Form.Item>

              {/* ── SQLite: solo ruta del archivo ──────────────────────── */}
              {dbFormat === 'sqlite' && (
                <Form.Item
                  name="path"
                  label="Ruta del archivo SQLite"
                  tooltip="Ruta absoluta o relativa al archivo .db / .sqlite"
                  rules={[{ required: true, message: 'Requerido' }]}
                >
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
              )}

              {/* ── MySQL / PostgreSQL: host, puerto, credenciales ─────── */}
              {dbFormat !== 'sqlite' && (
                <>
                  <Row gutter={8}>
                    <Col span={16}>
                      <Form.Item
                        name="host"
                        label="Host"
                        rules={[{ required: true, message: 'Requerido' }]}
                      >
                        <Input placeholder="localhost" />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name="port" label="Puerto">
                        <InputNumber
                          style={{ width: '100%' }}
                          min={1}
                          max={65535}
                          placeholder={String(DEFAULT_PORTS[dbFormat as 'mysql' | 'postgres'])}
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item
                    name="database"
                    label="Base de datos"
                    rules={[{ required: true, message: 'Requerido' }]}
                  >
                    <Input placeholder="mi_base" />
                  </Form.Item>

                  <Row gutter={8}>
                    <Col span={12}>
                      <Form.Item
                        name="username"
                        label="Usuario"
                        rules={[{ required: true, message: 'Requerido' }]}
                      >
                        <Input placeholder="root" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="password" label="Contraseña">
                        <Input.Password placeholder="••••••••" />
                      </Form.Item>
                    </Col>
                  </Row>
                </>
              )}

              {/* Tabla (requerida para todos los motores) */}
              <Form.Item
                name="table"
                label="Tabla"
                tooltip="Nombre de la tabla que AUDD leerá para construir el IR"
                rules={[{ required: true, message: 'Requerido' }]}
              >
                <Input placeholder="mi_tabla" />
              </Form.Item>

              {/* Query personalizada */}
              <Form.Item
                name="query"
                label="Query personalizada (opcional)"
                tooltip="Si se proporciona, sobreescribe la lectura estándar de la tabla"
              >
                <Input.TextArea rows={3} placeholder="SELECT * FROM tabla WHERE activo = 1" />
              </Form.Item>

              <Divider />

              {/* ── Prueba de conexión ─────────────────────────────────── */}
              <Form.Item label="Verificar conexión">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space>
                    <Button
                      icon={<ApiOutlined />}
                      onClick={handleTestConnection}
                      loading={testingConn}
                    >
                      {dbFormat === 'sqlite' ? 'Verificar archivo' : 'Probar conexión'}
                    </Button>
                    {dbFormat !== 'sqlite' && (
                      <Tooltip title="Para MySQL y PostgreSQL, la prueba ejecuta un buildIR completo que valida la conexión al servidor y el acceso a la tabla configurada.">
                        <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                      </Tooltip>
                    )}
                  </Space>

                  {connTestResult && (
                    <Alert
                      type={connTestResult.type}
                      message={connTestResult.message}
                      showIcon
                      closable
                      onClose={() => setConnTestResult(null)}
                    />
                  )}
                </Space>
              </Form.Item>
            </>
          )}
        </Form>
      </Drawer>
    </div>
  )
}
