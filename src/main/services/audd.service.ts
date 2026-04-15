import { AuddEngine, AuddError, BuildIROptions, CompareOptions, ResolveOptions, ApplyOptions, ValidationResult } from 'audd-node'

let engineInstance: AuddEngine | null = null

function getEngine(): AuddEngine {
  if (!engineInstance) {
    engineInstance = new AuddEngine()
  }
  return engineInstance
}

export interface ServiceResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  errorCode?: string
}

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

export async function ping(): Promise<ServiceResult<string>> {
  try {
    const result = AuddEngine.ping()
    return { success: true, data: result }
  } catch (error) {
    return handleError(error)
  }
}

export async function getVersion(): Promise<ServiceResult<string>> {
  try {
    const version = AuddEngine.getVersion()
    return { success: true, data: version }
  } catch (error) {
    return handleError(error)
  }
}

export async function buildIR(options: BuildIROptions): Promise<ServiceResult<string>> {
  try {
    const engine = getEngine()
    const ir = await engine.buildIR(options)
    return { success: true, data: ir }
  } catch (error) {
    return handleError(error)
  }
}

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

export async function validateIR(ir: string): Promise<ServiceResult<ValidationResult>> {
  try {
    const engine = getEngine()
    const result = await engine.validateIR(ir)
    return { success: true, data: result }
  } catch (error) {
    return handleError(error)
  }
}
