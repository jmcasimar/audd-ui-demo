/// <reference types="vite/client" />

/**
 * Configuración de conexión a base de datos expuesta al renderer.
 *
 * Formatos soportados actualmente (via audd-node):
 *   - sqlite   → requiere `path`
 *   - mysql    → requiere `host`, `database`, `username`, `password`
 *   - postgres → requiere `host`, `database`, `username`, `password`
 *
 * Formatos planificados para futuras versiones de audd-node:
 *   - mongodb  (pendiente en el core de AUDD)
 *   - mssql    (pendiente en el core de AUDD)
 */
type DbConnectionConfig = {
  format: 'sqlite' | 'mysql' | 'postgres'
  path?: string
  host?: string
  port?: number
  database?: string
  username?: string
  password?: string
}

interface Window {
  auddAPI: {
    /** Prueba de conectividad con el addon nativo. */
    ping: () => Promise<{ success: boolean; data?: string; error?: string }>

    /** Versión del addon nativo de AUDD. */
    getVersion: () => Promise<{ success: boolean; data?: string; error?: string }>

    /** Construye un IR desde una fuente de datos (file | db | memory). */
    buildIR: (options: {
      source: {
        type: 'file' | 'db' | 'memory'
        format: string
        path?: string
        host?: string
        port?: number
        database?: string
        username?: string
        password?: string
        encoding?: string
        delimiter?: string
        hasHeader?: boolean
        data?: unknown
      }
    }) => Promise<{ success: boolean; data?: string; error?: string }>

    /** Compara dos IRs y devuelve el diff. */
    compare: (
      irA: string,
      irB: string,
      options?: { threshold?: number; strategy?: string; ignoreFields?: string[] }
    ) => Promise<{ success: boolean; data?: string; error?: string }>

    /** Genera un plan de resolución desde un diff. */
    proposeResolution: (
      diff: string,
      options?: { strategy?: string; preferSource?: string }
    ) => Promise<{ success: boolean; data?: string; error?: string }>

    /** Aplica un plan de resolución. Usa `dryRun: true` para simular. */
    applyResolution: (
      plan: string,
      options?: { dryRun?: boolean; backup?: boolean }
    ) => Promise<{ success: boolean; data?: string; error?: string }>

    /** Valida la estructura de un IR. */
    validateIR: (ir: string) => Promise<{
      success: boolean
      data?: { ok: boolean; errors: string[] }
      error?: string
    }>

    /**
     * Prueba la conectividad a una fuente de base de datos.
     * - SQLite     → verifica accesibilidad del archivo.
     * - MySQL      → intenta buildIR (valida conexión + tabla).
     * - PostgreSQL → igual que MySQL.
     */
    testConnection: (config: DbConnectionConfig) => Promise<{
      success: boolean
      data?: string
      error?: string
      errorCode?: string
    }>

    /** Abre el diálogo nativo de selección de archivos. */
    selectFile: (options?: {
      filters?: { name: string; extensions: string[] }[]
      properties?: string[]
    }) => Promise<{ success: boolean; data?: string[]; error?: string }>
  }
}
