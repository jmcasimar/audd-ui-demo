import { useCallback } from 'react'
import { message } from 'antd'
import type { DataSource, DbSource } from '../types'

export function useAudd() {
  const api = window.auddAPI

  const ping = useCallback(async () => {
    const result = await api.ping()
    if (!result.success) message.error(result.error ?? 'Error en ping')
    return result
  }, [api])

  const getVersion = useCallback(async () => {
    const result = await api.getVersion()
    if (!result.success) message.error(result.error ?? 'Error obteniendo versión')
    return result
  }, [api])

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

  const compare = useCallback(
    async (irA: string, irB: string, options?: { threshold?: number; strategy?: string }) => {
      const result = await api.compare(irA, irB, options)
      if (!result.success) message.error(`Error en comparación: ${result.error}`)
      return result
    },
    [api]
  )

  const proposeResolution = useCallback(
    async (diff: string, options?: { strategy?: string; preferSource?: string }) => {
      const result = await api.proposeResolution(diff, options)
      if (!result.success) message.error(`Error proponiendo resolución: ${result.error}`)
      return result
    },
    [api]
  )

  const applyResolution = useCallback(
    async (plan: string, options?: { dryRun?: boolean; backup?: boolean }) => {
      const result = await api.applyResolution(plan, options)
      if (!result.success) message.error(`Error aplicando resolución: ${result.error}`)
      return result
    },
    [api]
  )

  const validateIR = useCallback(
    async (ir: string) => {
      const result = await api.validateIR(ir)
      if (!result.success) message.error(`Error validando IR: ${result.error}`)
      return result
    },
    [api]
  )

  const selectFile = useCallback(
    async (options?: { filters?: { name: string; extensions: string[] }[] }) => {
      const result = await api.selectFile(options)
      return result
    },
    [api]
  )

  return { ping, getVersion, buildIR, compare, proposeResolution, applyResolution, validateIR, selectFile }
}
