/**
 * @file types/index.ts
 * @description Tipos del dominio de la aplicación AUDD UI Demo.
 *
 * Estos tipos son exclusivos del renderer y del store local.
 * Los tipos de bajo nivel del motor (IR, Diff, Plan, etc.) se importan
 * directamente desde 'audd-node' cuando son necesarios en el proceso principal.
 */

// ─── Configuración de conexión a base de datos ────────────────────────────────

/**
 * Parámetros mínimos necesarios para probar la conectividad a una base de datos.
 * Usado por `useAudd().testConnection()` y el canal IPC `audd:testConnection`.
 *
 * Formatos soportados: sqlite | mysql | postgres
 * Pendientes: mongodb | mssql (aún no disponibles en audd-node)
 */
export interface DbConnectionConfig {
  format: 'sqlite' | 'mysql' | 'postgres'
  /** Ruta al archivo (SQLite). */
  path?: string
  /** Host del servidor (MySQL / PostgreSQL). */
  host?: string
  /** Puerto del servidor. */
  port?: number
  /** Nombre de la base de datos. */
  database?: string
  /** Usuario de conexión. */
  username?: string
  /** Contraseña de conexión. */
  password?: string
  /** Tabla a verificar (opcional). */
  table?: string
  /** Query personalizada opcional. */
  query?: string
}

// ─── Fuentes de datos ─────────────────────────────────────────────────────────

export type SourceType = 'file' | 'db'

/** Formatos de archivo soportados por audd-node. */
export type FileFormat = 'json' | 'csv'

/**
 * Formatos de base de datos soportados.
 *
 * Motores con adaptador completo en audd-node (prueba de conexión y buildIR disponibles):
 *   sqlite, mysql, postgres
 *
 * Motores almacenables en la configuración local pero cuyo adaptador en
 * audd-node aún está en desarrollo (sin prueba de conexión ni buildIR):
 *   - `'mongodb'`  → MongoDB
 *   - `'mssql'`    → Microsoft SQL Server
 */
export type DbFormat = 'sqlite' | 'mysql' | 'postgres' | 'mongodb' | 'mssql'

/**
 * Fuente de datos basada en archivo (JSON o CSV).
 *
 * Documentación audd-node:
 * ```ts
 * engine.buildIR({ source: { type: 'file', format: 'json', path: './data.json' } })
 * engine.buildIR({ source: { type: 'file', format: 'csv', path: './data.csv', delimiter: ',', hasHeader: true } })
 * ```
 */
export interface FileSource {
  id: string
  name: string
  type: 'file'
  format: FileFormat
  path: string
  /** Codificación del archivo. Por defecto utf8. */
  encoding?: string
  /** Delimitador de columnas (solo CSV). Por defecto ','. */
  delimiter?: string
  /** Indica si la primera fila es encabezado (solo CSV). Por defecto true. */
  hasHeader?: boolean
  createdAt: string
}

/**
 * Fuente de datos basada en base de datos.
 *
 * Documentación audd-node:
 * ```ts
 * // SQLite
 * engine.buildIR({ source: { type: 'db', format: 'sqlite', path: './db.sqlite' } })
 *
 * // MySQL
 * engine.buildIR({ source: { type: 'db', format: 'mysql',
 *   host: 'localhost', port: 3306, database: 'mydb',
 *   username: 'user', password: 'pass' } })
 *
 * // PostgreSQL
 * engine.buildIR({ source: { type: 'db', format: 'postgres',
 *   host: 'localhost', port: 5432, database: 'mydb',
 *   username: 'user', password: 'pass' } })
 * ```
 *
 * Formatos futuros (pendientes en audd-node): mongodb, mssql.
 */
export interface DbSource {
  id: string
  name: string
  type: 'db'
  format: DbFormat
  /** Ruta al archivo .db / .sqlite (solo SQLite). */
  path?: string
  /** Host del servidor (MySQL / PostgreSQL). */
  host?: string
  /** Puerto del servidor. MySQL default: 3306, PostgreSQL default: 5432. */
  port?: number
  /** Nombre de la base de datos (MySQL / PostgreSQL). */
  database?: string
  /** Usuario de conexión (MySQL / PostgreSQL / MongoDB / MSSQL). */
  username?: string
  /** Contraseña de conexión. Se maneja solo en el proceso principal (nunca en el renderer). */
  password?: string
  /**
   * Tabla (SQL) o colección (MongoDB) a leer. Opcional: si se omite se puede
   * usar `query` para especificar la consulta completa.
   */
  table?: string
  /** Query SQL / pipeline personalizado (opcional). Sobreescribe la lectura de la tabla. */
  query?: string
  createdAt: string
}

/** Unión discriminada de todos los tipos de fuente soportados. */
export type DataSource = FileSource | DbSource

// ─── Ejecuciones de comparación ───────────────────────────────────────────────

/**
 * Representa una ejecución de comparación entre dos fuentes de datos.
 * El ciclo de vida completo es: idle → building_ir → comparing → proposing → applying → done.
 */
export interface ComparisonRun {
  id: string
  sourceAId: string
  sourceAName: string
  sourceBId: string
  sourceBName: string
  /** IR serializado del dataset A (JSON string). */
  irA?: string
  /** IR serializado del dataset B (JSON string). */
  irB?: string
  /** Diff serializado (JSON string). */
  diff?: string
  /** Plan de resolución serializado (JSON string). */
  plan?: string
  /** Resultado de aplicar la resolución (JSON string). */
  applyResult?: string
  status: 'idle' | 'building_ir' | 'comparing' | 'proposing' | 'applying' | 'done' | 'error'
  /** Mensaje de error en caso de status='error'. */
  error?: string
  /** Estrategia de comparación: structural | semantic | hybrid. */
  strategy?: string
  /** Umbral de similitud (0.0 - 1.0). */
  threshold?: number
  createdAt: string
  completedAt?: string
}

// ─── Historial de pruebas ─────────────────────────────────────────────────────

/**
 * Registro de una operación ejecutada, para el historial local de pruebas.
 * Permite rastrear qué se ejecutó, cuándo y con qué resultado.
 */
export interface HistoryEntry {
  id: string
  date: string
  sourceAName: string
  sourceBName: string
  operation: 'build_ir' | 'compare' | 'propose_resolution' | 'apply_resolution'
  status: 'success' | 'error'
  /** Resumen del resultado en caso de éxito. */
  result?: string
  /** Mensaje de error en caso de fallo. */
  error?: string
  /** Notas o comentarios opcionales del desarrollador. */
  notes?: string
}
