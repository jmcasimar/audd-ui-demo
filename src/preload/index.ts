/**
 * @file preload/index.ts
 * @description Preload script de Electron.
 *
 * Expone al renderer una API controlada a través de contextBridge bajo
 * `window.auddAPI`. Ningún módulo de Node.js ni de Electron queda
 * directamente accesible desde el renderer (contextIsolation: true,
 * nodeIntegration: false).
 *
 * Todos los métodos delegan en ipcRenderer.invoke y devuelven promesas
 * con la forma `{ success, data?, error?, errorCode? }`.
 */

import { contextBridge, ipcRenderer } from 'electron'
import type { BuildIROptions, CompareOptions, ResolveOptions, ApplyOptions } from 'audd-node'

/** Configuración de conexión a base de datos (sin el campo `type: 'db'`). */
type DbConnectionConfig = {
  format: 'sqlite' | 'mysql' | 'postgres'
  path?: string
  host?: string
  port?: number
  database?: string
  username?: string
  password?: string
}

/** Resultado estándar devuelto por todos los métodos de auddAPI. */
type ApiResult<T = string> = Promise<{
  success: boolean
  data?: T
  error?: string
  errorCode?: string
}>

const auddAPI = {
  /** Prueba de conectividad con el addon nativo. Devuelve "pong" si responde. */
  ping: (): ApiResult => ipcRenderer.invoke('audd:ping'),

  /** Devuelve la versión del addon nativo de AUDD. */
  getVersion: (): ApiResult => ipcRenderer.invoke('audd:getVersion'),

  /**
   * Construye un IR desde una fuente de datos.
   * @param options - BuildIROptions con source (file | db | memory).
   */
  buildIR: (options: BuildIROptions): ApiResult => ipcRenderer.invoke('audd:buildIR', options),

  /**
   * Compara dos IRs y devuelve el diff.
   * @param irA     - IR del dataset A.
   * @param irB     - IR del dataset B.
   * @param options - Opciones opcionales de comparación.
   */
  compare: (irA: string, irB: string, options?: CompareOptions): ApiResult =>
    ipcRenderer.invoke('audd:compare', { irA, irB, options }),

  /**
   * Genera un plan de resolución a partir de un diff.
   * @param diff    - Diff producido por compare.
   * @param options - Opciones opcionales de resolución.
   */
  proposeResolution: (diff: string, options?: ResolveOptions): ApiResult =>
    ipcRenderer.invoke('audd:proposeResolution', { diff, options }),

  /**
   * Aplica un plan de resolución.
   * @param plan    - Plan producido por proposeResolution.
   * @param options - `dryRun` y `backup` opcionales.
   */
  applyResolution: (plan: string, options?: ApplyOptions): ApiResult =>
    ipcRenderer.invoke('audd:applyResolution', { plan, options }),

  /**
   * Valida la estructura interna de un IR.
   * @param ir - IR a validar (JSON string).
   */
  validateIR: (
    ir: string
  ): Promise<{ success: boolean; data?: { ok: boolean; errors: string[] }; error?: string }> =>
    ipcRenderer.invoke('audd:validateIR', { ir }),

  /**
   * Prueba la conectividad a una fuente de base de datos.
   *
   * - SQLite     → verifica accesibilidad del archivo via SQLiteAdapter.checkConnection.
   * - MySQL      → intenta buildIR para validar conexión + tabla.
   * - PostgreSQL → igual que MySQL.
   *
   * Nota: MongoDB y Microsoft SQL Server son adaptadores planificados para
   * versiones futuras de audd-node y no están soportados actualmente.
   *
   * @param config - Formato y credenciales de la BD.
   */
  testConnection: (config: DbConnectionConfig): ApiResult =>
    ipcRenderer.invoke('audd:testConnection', config),

  /**
   * Abre el diálogo nativo de selección de archivos.
   * @param options.filters    - Filtros por extensión.
   * @param options.properties - openFile | openDirectory | multiSelections.
   */
  selectFile: (options?: {
    filters?: { name: string; extensions: string[] }[]
    properties?: ('openFile' | 'openDirectory' | 'multiSelections')[]
  }): Promise<{ success: boolean; data?: string[]; error?: string }> =>
    ipcRenderer.invoke('dialog:selectFile', options)
}

contextBridge.exposeInMainWorld('auddAPI', auddAPI)
