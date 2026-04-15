export type SourceType = 'file' | 'db'
export type FileFormat = 'json' | 'csv'
export type DbFormat = 'sqlite' | 'mysql' | 'postgres'

export interface FileSource {
  id: string
  name: string
  type: 'file'
  format: FileFormat
  path: string
  encoding?: string
  delimiter?: string
  hasHeader?: boolean
  createdAt: string
}

export interface DbSource {
  id: string
  name: string
  type: 'db'
  format: DbFormat
  path?: string
  host?: string
  port?: number
  database?: string
  username?: string
  password?: string
  table: string
  query?: string
  createdAt: string
}

export type DataSource = FileSource | DbSource

export interface ComparisonRun {
  id: string
  sourceAId: string
  sourceAName: string
  sourceBId: string
  sourceBName: string
  irA?: string
  irB?: string
  diff?: string
  plan?: string
  applyResult?: string
  status: 'idle' | 'building_ir' | 'comparing' | 'proposing' | 'applying' | 'done' | 'error'
  error?: string
  strategy?: string
  threshold?: number
  createdAt: string
  completedAt?: string
}

export interface HistoryEntry {
  id: string
  date: string
  sourceAName: string
  sourceBName: string
  operation: 'build_ir' | 'compare' | 'propose_resolution' | 'apply_resolution'
  status: 'success' | 'error'
  result?: string
  error?: string
  notes?: string
}
