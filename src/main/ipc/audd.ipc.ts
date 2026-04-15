import { ipcMain } from 'electron'
import * as auddService from '../services/audd.service'
import type { BuildIROptions, CompareOptions, ResolveOptions, ApplyOptions } from 'audd-node'

export function registerAuddIpc(): void {
  ipcMain.handle('audd:ping', async () => {
    return auddService.ping()
  })

  ipcMain.handle('audd:getVersion', async () => {
    return auddService.getVersion()
  })

  ipcMain.handle('audd:buildIR', async (_event, options: BuildIROptions) => {
    return auddService.buildIR(options)
  })

  ipcMain.handle('audd:compare', async (_event, payload: { irA: string; irB: string; options?: CompareOptions }) => {
    return auddService.compare(payload.irA, payload.irB, payload.options)
  })

  ipcMain.handle('audd:proposeResolution', async (_event, payload: { diff: string; options?: ResolveOptions }) => {
    return auddService.proposeResolution(payload.diff, payload.options)
  })

  ipcMain.handle('audd:applyResolution', async (_event, payload: { plan: string; options?: ApplyOptions }) => {
    return auddService.applyResolution(payload.plan, payload.options)
  })

  ipcMain.handle('audd:validateIR', async (_event, payload: { ir: string }) => {
    return auddService.validateIR(payload.ir)
  })
}
