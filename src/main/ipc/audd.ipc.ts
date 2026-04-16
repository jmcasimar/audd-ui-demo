/**
 * @file audd.ipc.ts
 * @description Registro de todos los canales IPC relacionados con el motor AUDD.
 *
 * Cada handler recibe la petición del renderer (a través de ipcRenderer.invoke),
 * delega al servicio correspondiente y devuelve un ServiceResult serializable.
 *
 * Canales disponibles:
 *   - audd:ping              → prueba de conectividad con el addon nativo
 *   - audd:getVersion        → versión del addon nativo
 *   - audd:buildIR           → construir IR desde una fuente de datos
 *   - audd:compare           → comparar dos IRs
 *   - audd:proposeResolution → generar plan de resolución desde un diff
 *   - audd:applyResolution   → aplicar un plan de resolución
 *   - audd:validateIR        → validar la estructura de un IR
 *   - audd:testConnection    → probar conectividad a una fuente de base de datos
 */

import { ipcMain } from 'electron'
import * as auddService from '../services/audd.service'
import type { DbConnectionConfig } from '../services/audd.service'
import type { BuildIROptions, CompareOptions, ResolveOptions, ApplyOptions } from 'audd-node'

/**
 * Registra todos los canales IPC de AUDD en el proceso principal.
 * Debe llamarse una sola vez durante el arranque de la aplicación.
 */
export function registerAuddIpc(): void {
  /** Prueba de conectividad básica con el addon nativo. */
  ipcMain.handle('audd:ping', async () => {
    return auddService.ping()
  })

  /** Devuelve la versión del addon nativo de AUDD. */
  ipcMain.handle('audd:getVersion', async () => {
    return auddService.getVersion()
  })

  /**
   * Construye un IR desde una fuente de datos.
   * @param options - BuildIROptions con source (file | db | memory).
   */
  ipcMain.handle('audd:buildIR', async (_event, options: BuildIROptions) => {
    return auddService.buildIR(options)
  })

  /**
   * Compara dos IRs y devuelve el diff.
   * @param payload.irA     - IR del dataset A.
   * @param payload.irB     - IR del dataset B.
   * @param payload.options - Opciones opcionales de comparación.
   */
  ipcMain.handle(
    'audd:compare',
    async (_event, payload: { irA: string; irB: string; options?: CompareOptions }) => {
      return auddService.compare(payload.irA, payload.irB, payload.options)
    }
  )

  /**
   * Genera un plan de resolución a partir de un diff.
   * @param payload.diff    - Diff producido por compare.
   * @param payload.options - Opciones opcionales de resolución.
   */
  ipcMain.handle(
    'audd:proposeResolution',
    async (_event, payload: { diff: string; options?: ResolveOptions }) => {
      return auddService.proposeResolution(payload.diff, payload.options)
    }
  )

  /**
   * Aplica un plan de resolución.
   * @param payload.plan    - Plan producido por proposeResolution.
   * @param payload.options - `dryRun` y `backup` opcionales.
   */
  ipcMain.handle(
    'audd:applyResolution',
    async (_event, payload: { plan: string; options?: ApplyOptions }) => {
      return auddService.applyResolution(payload.plan, payload.options)
    }
  )

  /**
   * Valida la estructura interna de un IR.
   * @param payload.ir - IR a validar (JSON string).
   */
  ipcMain.handle('audd:validateIR', async (_event, payload: { ir: string }) => {
    return auddService.validateIR(payload.ir)
  })

  /**
   * Prueba la conectividad a una fuente de base de datos.
   *
   * - SQLite  → verifica accesibilidad del archivo vía SQLiteAdapter.checkConnection.
   * - MySQL   → intenta buildIR para validar conexión + tabla.
   * - PostgreSQL → igual que MySQL.
   *
   * @param config - DbConnectionConfig con el formato y credenciales de la BD.
   */
  ipcMain.handle('audd:testConnection', async (_event, config: DbConnectionConfig) => {
    return auddService.testDbConnection(config)
  })
}
