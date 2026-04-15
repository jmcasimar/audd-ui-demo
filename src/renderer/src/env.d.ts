/// <reference types="vite/client" />

interface Window {
  auddAPI: {
    ping: () => Promise<{ success: boolean; data?: string; error?: string }>
    getVersion: () => Promise<{ success: boolean; data?: string; error?: string }>
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
        table?: string
        query?: string
        encoding?: string
        delimiter?: string
        hasHeader?: boolean
        data?: unknown
      }
    }) => Promise<{ success: boolean; data?: string; error?: string }>
    compare: (
      irA: string,
      irB: string,
      options?: { threshold?: number; strategy?: string }
    ) => Promise<{ success: boolean; data?: string; error?: string }>
    proposeResolution: (
      diff: string,
      options?: { strategy?: string; preferSource?: string }
    ) => Promise<{ success: boolean; data?: string; error?: string }>
    applyResolution: (
      plan: string,
      options?: { dryRun?: boolean; backup?: boolean }
    ) => Promise<{ success: boolean; data?: string; error?: string }>
    validateIR: (ir: string) => Promise<{
      success: boolean
      data?: { ok: boolean; errors: string[] }
      error?: string
    }>
    selectFile: (options?: {
      filters?: { name: string; extensions: string[] }[]
      properties?: string[]
    }) => Promise<{ success: boolean; data?: string[]; error?: string }>
  }
}
