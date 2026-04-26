/**
 * @file dialog.ipc.ts
 * @description Canal IPC para abrir diálogos nativos del sistema operativo.
 *
 * Canales disponibles:
 *   - dialog:selectFile → abre el selector de archivos del SO.
 */

import { ipcMain, dialog, BrowserWindow } from 'electron'

/**
 * Registra el canal IPC para selección de archivos.
 * Debe llamarse una sola vez durante el arranque de la aplicación.
 */
export function registerDialogIpc(): void {
  /**
   * Abre el diálogo nativo de selección de archivos.
   *
   * @param payload.filters    - Filtros por extensión (ej: `[{ name: 'JSON', extensions: ['json'] }]`).
   * @param payload.properties - Propiedades del diálogo: openFile | openDirectory | multiSelections.
   * @returns Lista de rutas seleccionadas, o error si el usuario cancela.
   */
  ipcMain.handle(
    'dialog:selectFile',
    async (
      _event,
      payload?: {
        filters?: Electron.FileFilter[]
        properties?: Electron.OpenDialogOptions['properties']
      }
    ) => {
      const win = BrowserWindow.getFocusedWindow()
      if (!win) {
        return { success: false, error: 'No hay ventana activa' }
      }
      try {
        const result = await dialog.showOpenDialog(win, {
          filters: payload?.filters ?? [
            { name: 'Archivos de datos', extensions: ['json', 'csv'] },
            { name: 'Todos los archivos', extensions: ['*'] }
          ],
          properties: payload?.properties ?? ['openFile']
        })
        if (result.canceled) {
          return { success: false, error: 'Cancelado por el usuario' }
        }
        return { success: true, data: result.filePaths }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Error al abrir diálogo'
        }
      }
    }
  )
}
