/**
 * @file store/AppContext.tsx
 * @description Estado global de la aplicación con persistencia en SQLite local.
 *
 * Al montar el provider:
 *   1. Carga fuentes de datos e historial desde `window.dbAPI` (SQLite local).
 *   2. Actualiza el estado de React con los datos cargados.
 *
 * Cada mutación (add, update, remove, addHistoryEntry) actualiza:
 *   - El estado local de React (inmediato, para la UI).
 *   - La base de datos SQLite local (persistente, via IPC).
 *
 * Los errores de persistencia se registran en consola pero no bloquean la UI,
 * para no degradar la experiencia de usuario en caso de problemas de I/O.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { DataSource, ComparisonRun, HistoryEntry } from '../types'

interface AppState {
  /** Lista de fuentes de datos registradas. Persistidas en SQLite. */
  sources: DataSource[]
  setSources: (sources: DataSource[]) => void
  addSource: (source: DataSource) => void
  updateSource: (source: DataSource) => void
  removeSource: (id: string) => void

  currentComparison: ComparisonRun | null
  setCurrentComparison: (run: ComparisonRun | null) => void
  updateCurrentComparison: (patch: Partial<ComparisonRun>) => void

  /** Historial de operaciones ejecutadas. Persistido en SQLite. */
  history: HistoryEntry[]
  addHistoryEntry: (entry: HistoryEntry) => void

  engineVersion: string
  setEngineVersion: (v: string) => void

  /** true mientras se cargan los datos iniciales desde SQLite. */
  dbLoading: boolean
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [sources, setSources] = useState<DataSource[]>([])
  const [currentComparison, setCurrentComparison] = useState<ComparisonRun | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [engineVersion, setEngineVersion] = useState<string>('—')
  const [dbLoading, setDbLoading] = useState(true)

  // ─── Carga inicial desde SQLite ─────────────────────────────────────────────

  useEffect(() => {
    async function loadPersistedData() {
      try {
        const [sourcesResult, historyResult] = await Promise.all([
          window.dbAPI.getSources(),
          window.dbAPI.getHistory()
        ])
        if (sourcesResult.success && sourcesResult.data) {
          setSources(sourcesResult.data)
        }
        if (historyResult.success && historyResult.data) {
          setHistory(historyResult.data)
        }
      } catch (err) {
        console.error('[AppContext] Error cargando datos persistidos:', err)
      } finally {
        setDbLoading(false)
      }
    }
    loadPersistedData()
  }, [])

  // ─── Mutaciones de fuentes (con persistencia) ────────────────────────────────

  const addSource = (source: DataSource) => {
    setSources((prev) => [...prev, source])
    window.dbAPI.addSource(source).catch((err) =>
      console.error('[AppContext] Error persistiendo fuente:', err)
    )
  }

  const updateSource = (source: DataSource) => {
    setSources((prev) => prev.map((s) => (s.id === source.id ? source : s)))
    window.dbAPI.updateSource(source).catch((err) =>
      console.error('[AppContext] Error actualizando fuente:', err)
    )
  }

  const removeSource = (id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id))
    window.dbAPI.removeSource(id).catch((err) =>
      console.error('[AppContext] Error eliminando fuente:', err)
    )
  }

  // ─── Mutación del historial (con persistencia) ──────────────────────────────

  const addHistoryEntry = (entry: HistoryEntry) => {
    setHistory((prev) => [entry, ...prev])
    window.dbAPI.addHistoryEntry(entry).catch((err) =>
      console.error('[AppContext] Error persistiendo entrada de historial:', err)
    )
  }

  // ─── Mutaciones de la comparación activa (solo en memoria) ──────────────────

  const updateCurrentComparison = (patch: Partial<ComparisonRun>) =>
    setCurrentComparison((prev) => (prev ? { ...prev, ...patch } : null))

  return (
    <AppContext.Provider
      value={{
        sources,
        setSources,
        addSource,
        updateSource,
        removeSource,
        currentComparison,
        setCurrentComparison,
        updateCurrentComparison,
        history,
        addHistoryEntry,
        engineVersion,
        setEngineVersion,
        dbLoading
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used within AppProvider')
  return ctx
}
