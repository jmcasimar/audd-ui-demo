/**
 * @file db.service.ts
 * @description Capa de persistencia local de la aplicación AUDD UI Demo.
 *
 * Usa better-sqlite3 para almacenar en SQLite dos colecciones:
 *   - **sources**  → fuentes de datos registradas por el usuario
 *   - **history**  → registro de operaciones ejecutadas (historial)
 *
 * La base de datos se guarda en el directorio `userData` de Electron
 * (ej. `~/.config/audd-ui-demo/audd-ui-demo.db` en Linux,
 *       `%APPDATA%/audd-ui-demo/audd-ui-demo.db` en Windows).
 *
 * **Esquema normalizado de `sources`:**
 * Cada propiedad de una fuente se almacena en su propia columna, facilitando
 * consultas, filtros y actualizaciones de campos individuales.
 *
 * **Migración automática:**
 * Si la base de datos fue creada con el esquema anterior (solo `id, data`),
 * `initDb()` detecta el esquema y migra los datos automáticamente.
 *
 * **Seguridad de credenciales:**
 * Las contraseñas se cifran con `safeStorage` de Electron (llavero del SO:
 * Keychain en macOS, Secret Service en Linux, DPAPI en Windows).
 * Si `safeStorage.isEncryptionAvailable()` devuelve `false` (entornos sin
 * llavero, ej. CI), las contraseñas se almacenan en texto plano en ese
 * contexto degradado.
 */

import Database from 'better-sqlite3'
import { app, safeStorage } from 'electron'
import { join } from 'path'
import type { DataSource, FileSource, DbSource, HistoryEntry } from '../../renderer/src/types'

// ─── Instancia singleton ──────────────────────────────────────────────────────

let db: Database.Database | null = null

function getDb(): Database.Database {
  if (!db) throw new Error('La base de datos no ha sido inicializada. Llama a initDb() primero.')
  return db
}

// ─── Tipo interno para filas de la tabla sources ──────────────────────────────

interface SourceRow {
  id: string
  name: string
  type: string
  format: string
  path: string | null
  encoding: string | null
  delimiter: string | null
  has_header: number | null
  host: string | null
  port: number | null
  database: string | null
  username: string | null
  password: string | null
  table_name: string | null
  query: string | null
  created_at: string
}

// ─── Inicialización y migración ───────────────────────────────────────────────

/**
 * Crea (o migra) la tabla `sources` con el esquema normalizado.
 *
 * Esquema destino:
 * ```
 * sources (
 *   id          TEXT PRIMARY KEY,
 *   name        TEXT NOT NULL,
 *   type        TEXT NOT NULL,          -- 'file' | 'db'
 *   format      TEXT NOT NULL,          -- 'json'|'csv'|'sqlite'|'mysql'|'postgres'|'mongodb'|'mssql'
 *   path        TEXT,                   -- ruta al archivo (file) o SQLite (.db)
 *   encoding    TEXT,                   -- 'utf8' | 'latin1' (archivos)
 *   delimiter   TEXT,                   -- delimitador CSV
 *   has_header  INTEGER,                -- 1/0 (CSV)
 *   host        TEXT,                   -- IP / hostname (BD de red)
 *   port        INTEGER,                -- puerto TCP
 *   database    TEXT,                   -- nombre de la BD
 *   username    TEXT,                   -- usuario de conexión
 *   password    TEXT,                   -- contraseña cifrada con safeStorage
 *   table_name  TEXT,                   -- tabla / colección
 *   query       TEXT,                   -- query o pipeline personalizado
 *   created_at  TEXT NOT NULL           -- ISO 8601
 * )
 * ```
 */
function createSourcesTable(): void {
  db!.exec(`
    CREATE TABLE IF NOT EXISTS sources (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      type        TEXT NOT NULL,
      format      TEXT NOT NULL,
      path        TEXT,
      encoding    TEXT,
      delimiter   TEXT,
      has_header  INTEGER,
      host        TEXT,
      port        INTEGER,
      database    TEXT,
      username    TEXT,
      password    TEXT,
      table_name  TEXT,
      query       TEXT,
      created_at  TEXT NOT NULL
    )
  `)
}

/**
 * Detecta si la tabla `sources` usa el esquema anterior (solo columnas `id` y `data`)
 * y, de ser así, migra todos los registros al nuevo esquema normalizado.
 *
 * Estrategia de migración:
 *   1. Renombra la tabla vieja a `sources_old`.
 *   2. Crea la nueva tabla con el esquema completo.
 *   3. Parsea cada fila JSON de la tabla vieja e inserta con los campos individuales.
 *   4. Elimina la tabla vieja.
 */
function migrateSourcesIfNeeded(): void {
  const cols = (db!.prepare('PRAGMA table_info(sources)').all() as { name: string }[]).map(
    (c) => c.name
  )

  // Si la columna 'name' ya existe, el esquema es actual — sin migración
  if (cols.includes('name')) return

  // Esquema anterior detectado (columnas: id, data)
  const oldRows = db!
    .prepare('SELECT id, data FROM sources')
    .all() as { id: string; data: string }[]

  db!.exec('ALTER TABLE sources RENAME TO sources_old')
  createSourcesTable()

  const insert = db!.prepare(`
    INSERT INTO sources
      (id, name, type, format, path, encoding, delimiter, has_header,
       host, port, database, username, password, table_name, query, created_at)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  for (const row of oldRows) {
    try {
      const src = JSON.parse(row.data) as DataSource
      if (src.type === 'file') {
        insert.run(
          src.id, src.name, 'file', src.format, src.path,
          src.encoding ?? null, src.delimiter ?? null,
          src.hasHeader != null ? +src.hasHeader : null,
          null, null, null, null, null, null, null,
          src.createdAt
        )
      } else {
        const d = src as DbSource
        insert.run(
          d.id, d.name, 'db', d.format, d.path ?? null,
          null, null, null,
          d.host ?? null, d.port ?? null, d.database ?? null,
          d.username ?? null, d.password ?? null,
          d.table ?? null, d.query ?? null,
          d.createdAt
        )
      }
    } catch {
      // Fila corrupta — omitir
    }
  }

  db!.exec('DROP TABLE sources_old')
}

/**
 * Inicializa la base de datos SQLite en el directorio `userData` de Electron.
 * Crea las tablas necesarias y ejecuta la migración si corresponde.
 * Debe llamarse una sola vez, después de que `app.whenReady()` resuelva.
 */
export function initDb(): void {
  const dbPath = join(app.getPath('userData'), 'audd-ui-demo.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')

  createSourcesTable()

  db.exec(`
    CREATE TABLE IF NOT EXISTS history (
      id   TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      data TEXT NOT NULL
    )
  `)

  migrateSourcesIfNeeded()
}

// ─── Cifrado de credenciales ──────────────────────────────────────────────────

/**
 * Cifra una contraseña con safeStorage (llavero del SO).
 * Devuelve la contraseña original si el cifrado no está disponible.
 */
function encryptPassword(password: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    return `enc:${safeStorage.encryptString(password).toString('base64')}`
  }
  return password
}

/**
 * Descifra una contraseña cifrada con `encryptPassword`.
 * Reconoce el prefijo `enc:` para distinguir valores cifrados de texto plano.
 */
function decryptPassword(value: string): string {
  if (value.startsWith('enc:')) {
    try {
      return safeStorage.decryptString(Buffer.from(value.slice(4), 'base64'))
    } catch {
      return ''
    }
  }
  return value
}

// ─── Mapeo entre objetos de dominio y filas de BD ─────────────────────────────

/** Convierte una fila de la tabla en un DataSource del dominio. */
function rowToSource(row: SourceRow): DataSource {
  if (row.type === 'file') {
    return {
      id: row.id,
      name: row.name,
      type: 'file',
      format: row.format as FileSource['format'],
      path: row.path ?? '',
      encoding: row.encoding ?? undefined,
      delimiter: row.delimiter ?? undefined,
      hasHeader: row.has_header != null ? Boolean(row.has_header) : undefined,
      createdAt: row.created_at
    } satisfies FileSource
  }

  const dbSrc: DbSource = {
    id: row.id,
    name: row.name,
    type: 'db',
    format: row.format as DbSource['format'],
    path: row.path ?? undefined,
    host: row.host ?? undefined,
    port: row.port ?? undefined,
    database: row.database ?? undefined,
    username: row.username ?? undefined,
    password: row.password ? decryptPassword(row.password) : undefined,
    table: row.table_name ?? undefined,
    query: row.query ?? undefined,
    createdAt: row.created_at
  }
  return dbSrc
}

// ─── CRUD: Fuentes de datos ───────────────────────────────────────────────────

/**
 * Devuelve todas las fuentes de datos, ordenadas por fecha de creación (ASC).
 * Las contraseñas de fuentes de BD se descifran antes de devolverse.
 */
export function getAllSources(): DataSource[] {
  const rows = getDb()
    .prepare('SELECT * FROM sources ORDER BY created_at ASC')
    .all() as SourceRow[]
  return rows.map(rowToSource)
}

const INSERT_SOURCE_SQL = `
  INSERT INTO sources
    (id, name, type, format, path, encoding, delimiter, has_header,
     host, port, database, username, password, table_name, query, created_at)
  VALUES
    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`

function sourceToParams(source: DataSource): unknown[] {
  if (source.type === 'file') {
    return [
      source.id, source.name, 'file', source.format, source.path,
      source.encoding ?? null, source.delimiter ?? null,
      source.hasHeader != null ? +source.hasHeader : null,
      null, null, null, null, null, null, null,
      source.createdAt
    ]
  }
  const d = source as DbSource
  const encPwd = d.password ? encryptPassword(d.password) : null
  return [
    d.id, d.name, 'db', d.format, d.path ?? null,
    null, null, null,
    d.host ?? null, d.port ?? null, d.database ?? null,
    d.username ?? null, encPwd,
    d.table ?? null, d.query ?? null,
    d.createdAt
  ]
}

/**
 * Inserta una nueva fuente de datos.
 * Las contraseñas de BD se cifran con safeStorage antes de almacenarse.
 * @param source - Fuente a insertar. El `id` debe ser único.
 */
export function insertSource(source: DataSource): void {
  getDb().prepare(INSERT_SOURCE_SQL).run(...sourceToParams(source))
}

/**
 * Actualiza una fuente de datos existente.
 * Las contraseñas de BD se cifran con safeStorage antes de almacenarse.
 * @param source - Fuente con los datos actualizados. Se busca por `id`.
 */
export function updateSource(source: DataSource): void {
  const params = sourceToParams(source)
  getDb()
    .prepare(`
      UPDATE sources SET
        name = ?, type = ?, format = ?, path = ?,
        encoding = ?, delimiter = ?, has_header = ?,
        host = ?, port = ?, database = ?,
        username = ?, password = ?,
        table_name = ?, query = ?
      WHERE id = ?
    `)
    .run(
      params[1], params[2], params[3], params[4],
      params[5], params[6], params[7],
      params[8], params[9], params[10],
      params[11], params[12],
      params[13], params[14],
      params[0] // WHERE id = ?
    )
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
 * Devuelve todas las entradas del historial, de más reciente a más antigua.
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
 */
export function clearHistory(): void {
  getDb().prepare('DELETE FROM history').run()
}
