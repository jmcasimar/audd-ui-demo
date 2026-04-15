import { contextBridge, ipcRenderer } from 'electron'
import type { BuildIROptions, CompareOptions, ResolveOptions, ApplyOptions } from 'audd-node'

const auddAPI = {
  ping: (): Promise<{ success: boolean; data?: string; error?: string }> =>
    ipcRenderer.invoke('audd:ping'),

  getVersion: (): Promise<{ success: boolean; data?: string; error?: string }> =>
    ipcRenderer.invoke('audd:getVersion'),

  buildIR: (
    options: BuildIROptions
  ): Promise<{ success: boolean; data?: string; error?: string }> =>
    ipcRenderer.invoke('audd:buildIR', options),

  compare: (
    irA: string,
    irB: string,
    options?: CompareOptions
  ): Promise<{ success: boolean; data?: string; error?: string }> =>
    ipcRenderer.invoke('audd:compare', { irA, irB, options }),

  proposeResolution: (
    diff: string,
    options?: ResolveOptions
  ): Promise<{ success: boolean; data?: string; error?: string }> =>
    ipcRenderer.invoke('audd:proposeResolution', { diff, options }),

  applyResolution: (
    plan: string,
    options?: ApplyOptions
  ): Promise<{ success: boolean; data?: string; error?: string }> =>
    ipcRenderer.invoke('audd:applyResolution', { plan, options }),

  validateIR: (
    ir: string
  ): Promise<{ success: boolean; data?: { ok: boolean; errors: string[] }; error?: string }> =>
    ipcRenderer.invoke('audd:validateIR', { ir }),

  selectFile: (options?: {
    filters?: { name: string; extensions: string[] }[]
    properties?: ('openFile' | 'openDirectory' | 'multiSelections')[]
  }): Promise<{ success: boolean; data?: string[]; error?: string }> =>
    ipcRenderer.invoke('dialog:selectFile', options)
}

contextBridge.exposeInMainWorld('auddAPI', auddAPI)
