import React from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { ConfigProvider, App as AntApp } from 'antd'
import esES from 'antd/locale/es_ES'
import { AppProvider } from './store/AppContext'
import AppLayout from './components/layout/AppLayout'
import Dashboard from './pages/Dashboard'
import Sources from './pages/Sources'
import IRInspector from './pages/IRInspector'
import Comparison from './pages/Comparison'
import Resolution from './pages/Resolution'
import History from './pages/History'

export default function App() {
  return (
    <ConfigProvider locale={esES} theme={{ token: { colorPrimary: '#1677ff' } }}>
      <AntApp>
        <AppProvider>
          <HashRouter>
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
          </HashRouter>
        </AppProvider>
      </AntApp>
    </ConfigProvider>
  )
}
