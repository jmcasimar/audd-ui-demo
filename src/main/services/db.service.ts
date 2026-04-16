/**
 * @file db.service.ts
 * @description Capa de persistencia local de la aplicación AUDD UI Demo.
 *
 * Usa better-sqlite3 para almacenar en SQLite dos colecciones:
 *   - **sources**  → fuentes de datos registradas por el usuario
 *   - **history**  → registro de operaciones ejecutadas (historial)
 *
 * La base de datos se guarda en el directorio `userData` de Electron
 * (por ej. `~/.config/audd-ui-demo/audd-ui-demo.db` en Linux,
 *  `%APPDATA%/audd-ui-demo/audd-ui-demo.db` en Windows).
 *
 * Los registros se serializan como JSON para máxima flexibilidad
 * ante cambios en el esquema de tipos del renderer.
 *
 * **Seguridad de credenciales:**
 * Las contraseñas de bases de datos se cifran con `safeStorage` de Electron
 * antes de almacenarse. `safeStorage` usa el llavero del sistema operativo
 * (Keychain en macOS, Secret Service en Linux, DPAPI en Windows) para derivar
 * una clave de cifrado que solo el usuario actual puede usar.
 * Si `safeStorage.isEncryptionAvailable()` devuelve `false` (entornos sin
 * llavero, como servidores CI), las contraseñas se almacenan en texto plano
 * solo en ese contexto degradado.
 */

import Database from 'better-sqlite3'
import { app, safeStorage } from 'electron'
import { join } from 'path'
import type { DataSource, HistoryEntry, DbSource } from '../../renderer/src/types'

// ─── Instancia singleton ──────────────────────────────────────────────────────

let db: Database.Database | null = null

/**
 * Devuelve la instancia singleton de la base de datos.
 * La base de datos se inicializa en el primer acceso.
 *
 * @throws Si la base de datos no ha sido inicializada con {@link initDb}.
 */
function getDb(): Database.Database {
  if (!db) throw new Error('La base de datos no ha sido inicializada. Llama a initDb() primero.')
  return db
}

// ─── Inicialización ───────────────────────────────────────────────────────────

/**
 * Inicializa la base de datos SQLite en el directorio `userData` de Electron.
 *
 * Crea las tablas necesarias si no existen. Debe llamarse una sola vez,
 * después de que `app.whenReady()` resuelva (para que `app.getPath` esté disponible).
 *
 * Esquema:
 * ```sql
 * CREATE TABLE IF NOT EXISTS sources (
 *   id      TEXT PRIMARY KEY,
 *   data    TEXT NOT NULL          -- JSON serializado de DataSource
 * );
 *
 * CREATE TABLE IF NOT EXISTS history (
 *   id      TEXT PRIMARY KEY,
 *   date    TEXT NOT NULL,         -- ISO 8601, para ordenación eficiente
 *   data    TEXT NOT NULL          -- JSON serializado de HistoryEntry
 * );
 * ```
 */
export function initDb(): void {
  const dbPath = join(app.getPath('userData'), 'audd-ui-demo.db')
  db = new Database(dbPath)

  // WAL mode: mejor concurrencia y rendimiento para escrituras frecuentes
  db.pragma('journal_mode = WAL')

  db.exec(`
    CREATE TABLE IF NOT EXISTS sources (
      id   TEXT PRIMARY KEY,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS history (
      id   TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      data TEXT NOT NULL
    );
  `)
}

// ─── Cifrado de credenciales ──────────────────────────────────────────────────

/**
 * Cifra una contraseña usando safeStorage de Electron (llavero del SO).
 * Si el cifrado no está disponible (entornos sin llavero, ej. CI),
 * devuelve `null` y la contraseña se almacenará en texto plano.
 */
function encryptPassword(password: string): string | null {
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(password)
    // Almacenamos como base64 para que sea un string JSON-serializable
    return `enc:${encrypted.toString('base64')}`
  }
  return null
}

/**
 * Descifra una contraseña cifrada con encryptPassword.
 * Detecta el prefijo `enc:` para distinguir valores cifrados de texto plano.
 */
function decryptPassword(value: string): string {
  if (value.startsWith('enc:')) {
    try {
      const buf = Buffer.from(value.slice(4), 'base64')
      return safeStorage.decryptString(buf)
    } catch {
      // Si falla el descifrado (ej. cambio de usuario/SO), devuelve cadena vacía
      return ''
    }
  }
  // Valor en texto plano (entornos sin safeStorage disponible)
  return value
}

/**
 * Prepara una DataSource para almacenamiento: cifra la contraseña si existe.
 */
function prepareSourceForStorage(source: DataSource): DataSource {
  if (source.type === 'db') {
    const db = source as DbSource
    if (db.password) {
      const encrypted = encryptPassword(db.password)
      if (encrypted !== null) {
        return { ...db, password: encrypted } as DbSource
      }
    }
  }
  return source
}

/**
 * Restaura una DataSource desde almacenamiento: descifra la contraseña si existe.
 */
function restoreSourceFromStorage(source: DataSource): DataSource {
  if (source.type === 'db') {
    const dbSrc = source as DbSource
    if (dbSrc.password) {
      return { ...dbSrc, password: decryptPassword(dbSrc.password) } as DbSource
    }
  }
  return source
}

// ─── CRUD: Fuentes de datos ───────────────────────────────────────────────────

/**
 * Devuelve todas las fuentes de datos registradas, ordenadas por fecha de creación.
 * Las contraseñas se descifran antes de devolverse al renderer.
 */
export function getAllSources(): DataSource[] {
  const rows = getDb()
    .prepare('SELECT data FROM sources ORDER BY json_extract(data, "$.createdAt") ASC')
    .all() as { data: string }[]
  return rows.map((r) => restoreSourceFromStorage(JSON.parse(r.data) as DataSource))
}

/**
 * Inserta una nueva fuente de datos.
 * Las contraseñas se cifran con safeStorage antes de almacenarse.
 * @param source - Fuente a insertar. El `id` debe ser único.
 */
export function insertSource(source: DataSource): void {
  const prepared = prepareSourceForStorage(source)
  getDb()
    .prepare('INSERT INTO sources (id, data) VALUES (?, ?)')
    .run(prepared.id, JSON.stringify(prepared))
}

/**
 * Actualiza una fuente de datos existente.
 * Las contraseñas se cifran con safeStorage antes de almacenarse.
 * @param source - Fuente con los datos actualizados. Se busca por `id`.
 */
export function updateSource(source: DataSource): void {
  const prepared = prepareSourceForStorage(source)
  getDb()
    .prepare('UPDATE sources SET data = ? WHERE id = ?')
    .run(JSON.stringify(prepared), prepared.id)
}

/**
 * Elimina una fuente de datos por su `id`.
 * @param id - Identificador de la fuente a eliminar.
 */
export function deleteSource(id: string): void {
  getDb().prepare('DELETE FROM sources WHERE id = ?').run(id)
}

// ─── CRUD: Historial de operaciones ──────────────────────────────────────────

/**
 * Devuelve todas las entradas del historial, ordenadas de más reciente a más antigua.
 */
export function getAllHistory(): HistoryEntry[] {
  const rows = getDb()
    .prepare('SELECT data FROM history ORDER BY date DESC')
    .all() as { data: string }[]
  return rows.map((r) => JSON.parse(r.data) as HistoryEntry)
}

/**
 * Inserta una nueva entrada en el historial.
 * @param entry - Entrada a registrar. El `id` debe ser único.
 */
export function insertHistoryEntry(entry: HistoryEntry): void {
  getDb()
    .prepare('INSERT INTO history (id, date, data) VALUES (?, ?, ?)')
    .run(entry.id, entry.date, JSON.stringify(entry))
}

/**
 * Elimina todas las entradas del historial.
 * Útil para pruebas o reseteo del estado.
 */
export function clearHistory(): void {
  getDb().prepare('DELETE FROM history').run()
}
