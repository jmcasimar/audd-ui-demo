/**
 * @file hooks/useAudd.ts
 * @description Hook que proporciona acceso tipado a window.auddAPI desde el renderer.
 *
 * Actúa como capa de presentación para la comunicación IPC: los componentes
 * de React no llaman a window.auddAPI directamente, sino que usan este hook
 * para obtener funciones con manejo de errores integrado (message.error de Ant Design).
 *
 * Todos los métodos devuelven el mismo ServiceResult que el proceso principal,
 * permitiendo al componente reaccionar tanto a éxitos como a fallos.
 */

import { useCallback } from 'react'
import { message } from 'antd'
import type { DataSource, DbSource, DbConnectionConfig } from '../types'

/**
 * Hook principal de integración con audd-node a través de IPC.
 *
 * @example
 * const { ping, buildIR, testConnection } = useAudd()
 * const result = await testConnection({ format: 'sqlite', path: './db.sqlite', table: 'users' })
 */
export function useAudd() {
  const api = window.auddAPI

  /**
   * Prueba de conectividad con el addon nativo de AUDD.
   * @returns ServiceResult con "pong" si el motor responde.
   */
  const ping = useCallback(async () => {
    const result = await api.ping()
    if (!result.success) message.error(result.error ?? 'Error en ping')
    return result
  }, [api])

  /**
   * Obtiene la versión del addon nativo de AUDD.
   */
  const getVersion = useCallback(async () => {
    const result = await api.getVersion()
    if (!result.success) message.error(result.error ?? 'Error obteniendo versión')
    return result
  }, [api])

  /**
   * Construye la Representación Intermedia (IR) de una fuente de datos.
   *
   * Traduce un DataSource (tipo del renderer) al BuildIROptions que espera
   * el proceso principal, respetando la estructura documentada en audd-node:
   *   - FileSource → `{ type: 'file', format, path, encoding, delimiter, hasHeader }`
   *   - DbSource   → `{ type: 'db', format, path|host, port, database, username, password, table, query }`
   *
   * @param source - Fuente registrada en el contexto de la aplicación.
   */
  const buildIR = useCallback(
    async (source: DataSource) => {
      const sourceConfig =
        source.type === 'file'
          ? {
              type: 'file' as const,
              format: source.format,
              path: source.path,
              encoding: source.encoding,
              delimiter: source.delimiter,
              hasHeader: source.hasHeader
            }
          : {
              type: 'db' as const,
              format: (source as DbSource).format,
              path: (source as DbSource).path,
              host: (source as DbSource).host,
              port: (source as DbSource).port,
              database: (source as DbSource).database,
              username: (source as DbSource).username,
              password: (source as DbSource).password,
              table: (source as DbSource).table,
              query: (source as DbSource).query
            }

      const result = await api.buildIR({ source: sourceConfig })
      if (!result.success) message.error(`Error construyendo IR: ${result.error}`)
      return result
    },
    [api]
  )

  /**
   * Compara dos IRs y devuelve el diff.
   * @param irA     - IR del dataset A.
   * @param irB     - IR del dataset B.
   * @param options - threshold (0-1), strategy ("structural"|"semantic"|"hybrid"), ignoreFields.
   */
  const compare = useCallback(
    async (irA: string, irB: string, options?: { threshold?: number; strategy?: string }) => {
      const result = await api.compare(irA, irB, options)
      if (!result.success) message.error(`Error en comparación: ${result.error}`)
      return result
    },
    [api]
  )

  /**
   * Genera un plan de resolución a partir de un diff.
   * @param diff    - Diff producido por compare.
   * @param options - strategy ("conservative"|"aggressive"|"balanced"), preferSource ("a"|"b"|"merge").
   */
  const proposeResolution = useCallback(
    async (diff: string, options?: { strategy?: string; preferSource?: string }) => {
      const result = await api.proposeResolution(diff, options)
      if (!result.success) message.error(`Error proponiendo resolución: ${result.error}`)
      return result
    },
    [api]
  )

  /**
   * Aplica un plan de resolución.
   * @param plan    - Plan producido por proposeResolution.
   * @param options - `dryRun: true` ejecuta sin cambios; `backup: true` genera respaldo.
   */
  const applyResolution = useCallback(
    async (plan: string, options?: { dryRun?: boolean; backup?: boolean }) => {
      const result = await api.applyResolution(plan, options)
      if (!result.success) message.error(`Error aplicando resolución: ${result.error}`)
      return result
    },
    [api]
  )

  /**
   * Valida la estructura interna de un IR.
   * @param ir - IR a validar (JSON string).
   * @returns `{ ok: boolean, errors: string[] }`.
   */
  const validateIR = useCallback(
    async (ir: string) => {
      const result = await api.validateIR(ir)
      if (!result.success) message.error(`Error validando IR: ${result.error}`)
      return result
    },
    [api]
  )

  /**
   * Prueba la conectividad a una fuente de base de datos sin guardarla.
   *
   * Estrategia por motor (según audd-node):
   *   - **SQLite**     → SQLiteAdapter.checkConnection (solo verifica accesibilidad del archivo)
   *   - **MySQL**      → engine.buildIR (valida conexión al servidor y tabla)
   *   - **PostgreSQL** → engine.buildIR (valida conexión al servidor y tabla)
   *
   * Nota: MongoDB y MSSQL son adaptadores planificados para versiones futuras
   * de audd-node y no están disponibles aún.
   *
   * @param config - Formato y credenciales de la base de datos.
   * @returns Mensaje descriptivo del resultado de la prueba.
   */
  const testConnection = useCallback(
    async (config: DbConnectionConfig) => {
      const result = await api.testConnection(config)
      return result
    },
    [api]
  )

  /**
   * Abre el diálogo nativo del SO para seleccionar archivos.
   * @param options.filters    - Filtros de extensión visibles en el diálogo.
   * @param options.properties - Propiedades: openFile | openDirectory | multiSelections.
   */
  const selectFile = useCallback(
    async (options?: { filters?: { name: string; extensions: string[] }[] }) => {
      const result = await api.selectFile(options)
      return result
    },
    [api]
  )

  return {
    ping,
    getVersion,
    buildIR,
    compare,
    proposeResolution,
    applyResolution,
    validateIR,
    testConnection,
    selectFile
  }
}
