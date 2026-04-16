/**
 * @file audd.service.ts
 * @description Servicio principal de integración con audd-node.
 *
 * Toda la lógica de negocio del motor AUDD vive aquí, en el proceso principal
 * de Electron. El renderer accede únicamente a través de IPC + contextBridge,
 * sin tener acceso directo a este módulo.
 *
 * Adaptadores soportados actualmente (via audd-node):
 *   - Archivos: JSON, CSV
 *   - Bases de datos: SQLite, MySQL, PostgreSQL
 *
 * Adaptadores planificados para versiones futuras de audd-node:
 *   - MongoDB  (pendiente en el core de AUDD)
 *   - Microsoft SQL Server  (pendiente en el core de AUDD)
 */

import {
  AuddEngine,
  AuddError,
  ErrorCode,
  SQLiteAdapter,
  BuildIROptions,
  CompareOptions,
  ResolveOptions,
  ApplyOptions,
  ValidationResult
} from 'audd-node'
import type { DbSourceConfig } from 'audd-node'

// ─── Instancia única del motor ────────────────────────────────────────────────

let engineInstance: AuddEngine | null = null

/**
 * Devuelve la instancia singleton de AuddEngine.
 * La crea en el primer acceso (lazy initialization).
 */
function getEngine(): AuddEngine {
  if (!engineInstance) {
    engineInstance = new AuddEngine()
  }
  return engineInstance
}

// ─── Tipos de resultado ───────────────────────────────────────────────────────

/**
 * Resultado estándar de todas las operaciones del servicio.
 * Permite al renderer distinguir éxito/fallo sin lanzar excepciones.
 */
export interface ServiceResult<T = unknown> {
  success: boolean
  /** Datos de respuesta en caso de éxito. */
  data?: T
  /** Mensaje de error legible en caso de fallo. */
  error?: string
  /** Código de error estable de audd-node (ErrorCode). */
  errorCode?: string
}

/**
 * Configuración de conexión a una base de datos.
 * Subconjunto de DbSourceConfig sin los campos `type` (siempre 'db').
 *
 * Formatos soportados: sqlite | mysql | postgres
 * Formatos pendientes: mongodb | mssql (aún no disponibles en audd-node)
 */
export interface DbConnectionConfig {
  format: 'sqlite' | 'mysql' | 'postgres'
  /** Ruta al archivo .db (solo SQLite). */
  path?: string
  /** Host del servidor (MySQL / PostgreSQL). */
  host?: string
  /** Puerto del servidor (MySQL default: 3306, PostgreSQL default: 5432). */
  port?: number
  /** Nombre de la base de datos (MySQL / PostgreSQL). */
  database?: string
  /** Usuario de conexión (MySQL / PostgreSQL). */
  username?: string
  /** Contraseña de conexión (MySQL / PostgreSQL). */
  password?: string
}

// ─── Helper de errores ────────────────────────────────────────────────────────

/**
 * Normaliza cualquier error lanzado por audd-node o por código interno
 * en un ServiceResult de fallo, propagando el código estable cuando está disponible.
 */
function handleError(error: unknown): ServiceResult {
  if (error instanceof AuddError) {
    return {
      success: false,
      error: error.message,
      errorCode: error.code
    }
  }
  if (error instanceof Error) {
    return {
      success: false,
      error: error.message
    }
  }
  return {
    success: false,
    error: 'Error desconocido'
  }
}

// ─── Operaciones del motor ────────────────────────────────────────────────────

/**
 * Prueba de conectividad básica con el addon nativo de AUDD.
 * @returns "pong" si el addon responde correctamente.
 */
export async function ping(): Promise<ServiceResult<string>> {
  try {
    const result = AuddEngine.ping()
    return { success: true, data: result }
  } catch (error) {
    return handleError(error)
  }
}

/**
 * Devuelve la versión del addon nativo de AUDD.
 */
export async function getVersion(): Promise<ServiceResult<string>> {
  try {
    const version = AuddEngine.getVersion()
    return { success: true, data: version }
  } catch (error) {
    return handleError(error)
  }
}

/**
 * Construye una Representación Intermedia (IR) desde una fuente de datos.
 *
 * Fuentes soportadas:
 *   - `file` → JSON o CSV
 *   - `db`   → SQLite, MySQL, PostgreSQL
 *   - `memory` → datos en memoria (para pruebas)
 *
 * @param options - BuildIROptions con la configuración de la fuente.
 * @returns IR serializado como JSON string.
 */
export async function buildIR(options: BuildIROptions): Promise<ServiceResult<string>> {
  try {
    const engine = getEngine()
    const ir = await engine.buildIR(options)
    return { success: true, data: ir }
  } catch (error) {
    return handleError(error)
  }
}

/**
 * Compara dos IRs y devuelve las diferencias (diff).
 *
 * @param irA - IR del dataset A (JSON string).
 * @param irB - IR del dataset B (JSON string).
 * @param options - Opciones de comparación: threshold, strategy, ignoreFields.
 * @returns Diff serializado como JSON string.
 */
export async function compare(
  irA: string,
  irB: string,
  options?: CompareOptions
): Promise<ServiceResult<string>> {
  try {
    const engine = getEngine()
    const diff = await engine.compare(irA, irB, options)
    return { success: true, data: diff }
  } catch (error) {
    return handleError(error)
  }
}

/**
 * Genera un plan de resolución a partir de un diff.
 *
 * @param diff - Diff producido por `compare` (JSON string).
 * @param options - Opciones de resolución: strategy, preferSource.
 * @returns Plan de resolución serializado como JSON string.
 */
export async function proposeResolution(
  diff: string,
  options?: ResolveOptions
): Promise<ServiceResult<string>> {
  try {
    const engine = getEngine()
    const plan = await engine.proposeResolution(diff, options)
    return { success: true, data: plan }
  } catch (error) {
    return handleError(error)
  }
}

/**
 * Aplica un plan de resolución.
 *
 * @param plan - Plan producido por `proposeResolution` (JSON string).
 * @param options - `dryRun: true` ejecuta sin cambios reales; `backup: true` genera respaldo.
 * @returns Resultado de la aplicación serializado como JSON string.
 */
export async function applyResolution(
  plan: string,
  options?: ApplyOptions
): Promise<ServiceResult<string>> {
  try {
    const engine = getEngine()
    const result = await engine.applyResolution(plan, options)
    return { success: true, data: result }
  } catch (error) {
    return handleError(error)
  }
}

/**
 * Valida la estructura de un IR.
 *
 * @param ir - IR a validar (JSON string).
 * @returns `{ ok: boolean, errors: string[] }`.
 */
export async function validateIR(ir: string): Promise<ServiceResult<ValidationResult>> {
  try {
    const engine = getEngine()
    const result = await engine.validateIR(ir)
    return { success: true, data: result }
  } catch (error) {
    return handleError(error)
  }
}

// ─── Prueba de conexión a base de datos ──────────────────────────────────────

/**
 * Prueba la conectividad de una fuente de base de datos sin consumir todos sus datos.
 *
 * Estrategia por motor:
 *   - **SQLite**: usa `SQLiteAdapter.checkConnection(path)` — solo verifica accesibilidad del archivo.
 *   - **MySQL / PostgreSQL**: ejecuta `engine.buildIR` con la configuración proporcionada,
 *     lo que valida la conexión al servidor y la accesibilidad de la tabla.
 *
 * Códigos de error relevantes:
 *   - `DB_CONNECTION_FAILED` → no se pudo conectar al servidor de BD.
 *   - `INVALID_INPUT`        → configuración incompleta o inválida.
 *   - `IO_ERROR`             → archivo no encontrado (SQLite).
 *
 * Adaptadores pendientes (aún no soportados por audd-node):
 *   - MongoDB
 *   - Microsoft SQL Server
 *
 * @param config - Configuración de conexión. Ver {@link DbConnectionConfig}.
 * @returns Mensaje de éxito o error con código estable.
 */
export async function testDbConnection(config: DbConnectionConfig): Promise<ServiceResult<string>> {
  const engine = getEngine()

  // ── SQLite: verificación ligera vía checkConnection ──────────────────────
  if (config.format === 'sqlite') {
    if (!config.path) {
      return {
        success: false,
        error: 'La ruta del archivo SQLite es requerida.',
        errorCode: ErrorCode.INVALID_INPUT
      }
    }
    try {
      const adapter = new SQLiteAdapter(engine)
      const accessible = await adapter.checkConnection(config.path)
      return accessible
        ? { success: true, data: 'Archivo SQLite accesible correctamente.' }
        : {
            success: false,
            error:
              'No se puede acceder al archivo SQLite. Verifica que la ruta sea correcta y que el archivo exista.',
            errorCode: ErrorCode.IO_ERROR
          }
    } catch (error) {
      return handleError(error)
    }
  }

  // ── MySQL / PostgreSQL: buildIR como prueba de conexión completa ──────────
  // Valida: conectividad al servidor, credenciales y accesibilidad de la tabla.
  try {
    const dbSource: DbSourceConfig = {
      type: 'db',
      format: config.format,
      host: config.host,
      port: config.port,
      database: config.database,
      username: config.username,
      password: config.password
    }
    await engine.buildIR({ source: dbSource })
    const label = config.format === 'mysql' ? 'MySQL' : 'PostgreSQL'
    return {
      success: true,
      data: `Conexión a ${label} exitosa.`
    }
  } catch (error) {
    return handleError(error)
  }
}
