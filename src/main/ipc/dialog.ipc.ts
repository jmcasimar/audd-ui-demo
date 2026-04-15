import { ipcMain, dialog, BrowserWindow } from 'electron'

export function registerDialogIpc(): void {
  ipcMain.handle('dialog:selectFile', async (_event, payload?: { filters?: Electron.FileFilter[]; properties?: Electron.OpenDialogOptions['properties'] }) => {
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
      return { success: false, error: error instanceof Error ? error.message : 'Error al abrir diálogo' }
    }
  })
}
