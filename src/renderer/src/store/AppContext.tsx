import React, { createContext, useContext, useState, ReactNode } from 'react'
import type { DataSource, ComparisonRun, HistoryEntry } from '../types'

interface AppState {
  sources: DataSource[]
  setSources: (sources: DataSource[]) => void
  addSource: (source: DataSource) => void
  updateSource: (source: DataSource) => void
  removeSource: (id: string) => void
  currentComparison: ComparisonRun | null
  setCurrentComparison: (run: ComparisonRun | null) => void
  updateCurrentComparison: (patch: Partial<ComparisonRun>) => void
  history: HistoryEntry[]
  addHistoryEntry: (entry: HistoryEntry) => void
  engineVersion: string
  setEngineVersion: (v: string) => void
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [sources, setSources] = useState<DataSource[]>([])
  const [currentComparison, setCurrentComparison] = useState<ComparisonRun | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [engineVersion, setEngineVersion] = useState<string>('—')

  const addSource = (source: DataSource) => setSources((prev) => [...prev, source])
  const updateSource = (source: DataSource) =>
    setSources((prev) => prev.map((s) => (s.id === source.id ? source : s)))
  const removeSource = (id: string) => setSources((prev) => prev.filter((s) => s.id !== id))
  const updateCurrentComparison = (patch: Partial<ComparisonRun>) =>
    setCurrentComparison((prev) => (prev ? { ...prev, ...patch } : null))
  const addHistoryEntry = (entry: HistoryEntry) => setHistory((prev) => [entry, ...prev])

  return (
    <AppContext.Provider
      value={{
        sources, setSources, addSource, updateSource, removeSource,
        currentComparison, setCurrentComparison, updateCurrentComparison,
        history, addHistoryEntry,
        engineVersion, setEngineVersion
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
