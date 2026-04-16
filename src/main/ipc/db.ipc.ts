/**
 * @file db.ipc.ts
 * @description Canales IPC para la capa de persistencia local (better-sqlite3).
 *
 * Canales disponibles:
 *   - db:getSources       → devuelve todas las fuentes de datos persistidas
 *   - db:addSource        → inserta una nueva fuente
 *   - db:updateSource     → actualiza una fuente existente
 *   - db:removeSource     → elimina una fuente por id
 *   - db:getHistory       → devuelve todas las entradas del historial
 *   - db:addHistoryEntry  → inserta una nueva entrada en el historial
 */

import { ipcMain } from 'electron'
import * as dbService from '../services/db.service'
import type { DataSource, HistoryEntry } from '../../renderer/src/types'

/**
 * Registra todos los canales IPC de persistencia.
 * Debe llamarse una sola vez durante el arranque, después de {@link initDb}.
 */
export function registerDbIpc(): void {
  /** Devuelve todas las fuentes de datos almacenadas. */
  ipcMain.handle('db:getSources', () => {
    try {
      return { success: true, data: dbService.getAllSources() }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Error de BD' }
    }
  })

  /**
   * Inserta una nueva fuente de datos.
   * @param source - DataSource completo con id y createdAt ya generados.
   */
  ipcMain.handle('db:addSource', (_event, source: DataSource) => {
    try {
      dbService.insertSource(source)
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Error de BD' }
    }
  })

  /**
   * Actualiza una fuente de datos existente.
   * @param source - DataSource con los datos actualizados.
   */
  ipcMain.handle('db:updateSource', (_event, source: DataSource) => {
    try {
      dbService.updateSource(source)
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Error de BD' }
    }
  })

  /**
   * Elimina una fuente de datos por su id.
   * @param id - Identificador de la fuente a eliminar.
   */
  ipcMain.handle('db:removeSource', (_event, id: string) => {
    try {
      dbService.deleteSource(id)
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Error de BD' }
    }
  })

  /** Devuelve todas las entradas del historial, de más reciente a más antigua. */
  ipcMain.handle('db:getHistory', () => {
    try {
      return { success: true, data: dbService.getAllHistory() }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Error de BD' }
    }
  })

  /**
   * Inserta una nueva entrada en el historial de operaciones.
   * @param entry - HistoryEntry con id y date ya generados.
   */
  ipcMain.handle('db:addHistoryEntry', (_event, entry: HistoryEntry) => {
    try {
      dbService.insertHistoryEntry(entry)
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Error de BD' }
    }
  })
}
