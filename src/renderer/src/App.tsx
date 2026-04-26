/**
 * @file App.tsx
 * @description Raíz de la aplicación React.
 *
 * Envuelve todo en `AppProvider` (estado global + persistencia SQLite),
 * `ConfigProvider` (tema y locale de Ant Design) y `HashRouter`.
 *
 * Muestra un spinner mientras el estado inicial se carga desde SQLite local,
 * evitando que la UI parpadee con datos vacíos al arranque.
 */

import React from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { ConfigProvider, App as AntApp, Spin } from 'antd'
import esES from 'antd/locale/es_ES'
import { AppProvider, useAppContext } from './store/AppContext'
import AppLayout from './components/layout/AppLayout'
import Dashboard from './pages/Dashboard'
import Sources from './pages/Sources'
import IRInspector from './pages/IRInspector'
import Comparison from './pages/Comparison'
import Resolution from './pages/Resolution'
import History from './pages/History'

/** Muestra un spinner centrado mientras el contexto carga los datos de SQLite. */
function AppContent() {
  const { dbLoading } = useAppContext()

  if (dbLoading) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 16
        }}
      >
        <Spin size="large" />
        <span style={{ color: '#8c8c8c' }}>Cargando datos...</span>
      </div>
    )
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/sources" element={<Sources />} />
        <Route path="/ir-inspector" element={<IRInspector />} />
        <Route path="/comparison" element={<Comparison />} />
        <Route path="/resolution" element={<Resolution />} />
        <Route path="/history" element={<History />} />
      </Routes>
    </AppLayout>
  )
}

export default function App() {
  return (
    <ConfigProvider locale={esES} theme={{ token: { colorPrimary: '#1677ff' } }}>
      <AntApp>
        <AppProvider>
          <HashRouter>
            <AppContent />
          </HashRouter>
        </AppProvider>
      </AntApp>
    </ConfigProvider>
  )
}
