# AUDD UI Demo

Aplicación de escritorio en **Electron + React + Ant Design** para probar y validar el motor [AUDD](https://github.com/jmcasimar/audd) a través del wrapper [`audd-node`](https://www.npmjs.com/package/audd-node).

---

## Objetivo

Esta herramienta sirve como entorno visual de validación del motor AUDD. Permite:

- Registrar fuentes de datos (archivos y bases de datos).
- Construir la Representación Intermedia (IR) de una fuente.
- Comparar dos fuentes y visualizar las diferencias.
- Generar y aplicar planes de resolución de conflictos.
- Consultar un historial local de operaciones ejecutadas.

---

## Stack tecnológico

| Capa              | Tecnología                                  |
|-------------------|---------------------------------------------|
| Proceso principal | Electron 41, Node.js, TypeScript            |
| Renderer          | React 18, TypeScript, Vite (electron-vite)  |
| UI                | Ant Design 5                                |
| Motor AUDD        | audd-node (wrapper npm del core nativo)     |
| Build pipeline    | electron-vite 5, Vite 6                     |

---

## Estructura del proyecto

```
src/
├── main/                           # Proceso principal de Electron (Node.js)
│   ├── index.ts                    # Arranque de la app, BrowserWindow
│   ├── ipc/
│   │   ├── audd.ipc.ts             # Canales IPC del motor AUDD
│   │   └── dialog.ipc.ts           # Canal IPC para diálogos de archivo
│   └── services/
│       └── audd.service.ts         # Única capa de acceso a audd-node
│
├── preload/
│   └── index.ts                    # contextBridge → window.auddAPI
│
└── renderer/src/                   # Proceso renderer (React)
    ├── App.tsx                     # Router principal
    ├── main.tsx                    # Punto de entrada del renderer
    ├── env.d.ts                    # Tipos de window.auddAPI para TypeScript
    ├── components/
    │   └── layout/
    │       └── AppLayout.tsx       # Layout con navegación lateral
    ├── hooks/
    │   └── useAudd.ts              # Hook de acceso a window.auddAPI
    ├── pages/
    │   ├── Dashboard.tsx           # Estado del motor, estadísticas, accesos rápidos
    │   ├── Sources.tsx             # Gestión de fuentes de datos
    │   ├── IRInspector.tsx         # Construcción e inspección de IR
    │   ├── Comparison.tsx          # Comparación de dos fuentes
    │   ├── Resolution.tsx          # Propuesta y aplicación de resolución
    │   └── History.tsx             # Historial de operaciones
    ├── store/
    │   └── AppContext.tsx          # Estado global (fuentes, comparaciones, historial)
    └── types/
        └── index.ts                # Tipos del dominio (DataSource, ComparisonRun, etc.)
```

---

## Arquitectura y seguridad

La aplicación sigue el modelo de seguridad recomendado por Electron:

```
Renderer (React)
    ↓ window.auddAPI (contextBridge)
Preload (contextBridge)
    ↓ ipcRenderer.invoke
Main Process (IPC handlers)
    ↓ audd.service.ts
audd-node (motor AUDD)
```

- `contextIsolation: true` — renderer aislado del proceso Node.js.
- `nodeIntegration: false` — el renderer no puede importar módulos de Node.
- Toda la lógica de `audd-node` vive en `audd.service.ts` (proceso principal).
- Las credenciales de base de datos nunca pasan al renderer como texto plano durante la ejecución.

---

## Fuentes de datos soportadas

### Archivos

| Formato | Opciones                               |
|---------|----------------------------------------|
| JSON    | `path`, `encoding`                     |
| CSV     | `path`, `encoding`, `delimiter`, `hasHeader` |

### Bases de datos

| Motor      | Parámetros                                                 | Estado         |
|------------|------------------------------------------------------------|----------------|
| SQLite     | `path`,                                                        | ✅ Disponible  |
| MySQL      | `host`, `port` (def. 3306), `database`, `username`, `password` | ✅ Disponible |
| PostgreSQL | `host`, `port` (def. 5432), `database`, `username`, `password` | ✅ Disponible |
| MongoDB    | —                                                          | 🔜 Pendiente en audd-node |
| MSSQL      | —                                                          | 🔜 Pendiente en audd-node |

> MongoDB y Microsoft SQL Server están en el roadmap del core AUDD pero aún no están integrados en `audd-node`. Se añadirán cuando los adaptadores estén disponibles.

---

## Flujo técnico

### Construir una IR

```
Usuario selecciona fuente
  → Sources.tsx llama a useAudd().buildIR(source)
  → useAudd mapea DataSource a BuildIROptions
  → ipcRenderer.invoke('audd:buildIR', options)
  → audd.ipc.ts recibe y delega a auddService.buildIR(options)
  → engine.buildIR({ source: { type, format, ...params } })
  → IR (JSON string) retorna al renderer
```

### Prueba de conexión a base de datos

```
Usuario hace click en "Probar conexión"
  → Sources.tsx lee form values → construye DbConnectionConfig
  → useAudd().testConnection(config)
  → ipcRenderer.invoke('audd:testConnection', config)
  → audd.ipc.ts → auddService.testDbConnection(config)
      SQLite     → SQLiteAdapter.checkConnection(path)
      MySQL/PG   → engine.buildIR({ source: dbConfig })
  → Resultado mostrado con Alert en el drawer
```

### Comparar dos fuentes

```
Usuario selecciona fuente A y B
  → Comparison.tsx construye IRs para ambas (buildIR × 2)
  → engine.compare(irA, irB, { threshold, strategy })
  → Diff visualizado en tabla con badges por tipo de cambio
```

### Proponer y aplicar resolución

```
Diff disponible
  → engine.proposeResolution(diff, { strategy, preferSource })
  → Plan visualizado al usuario
  → Usuario confirma → engine.applyResolution(plan, { dryRun, backup })
  → Resultado mostrado
```

---

## Canales IPC disponibles

| Canal                    | Descripción                                       |
|--------------------------|---------------------------------------------------|
| `audd:ping`              | Prueba de conectividad con el addon nativo        |
| `audd:getVersion`        | Versión del addon nativo                          |
| `audd:buildIR`           | Construir IR desde una fuente                     |
| `audd:compare`           | Comparar dos IRs                                  |
| `audd:proposeResolution` | Generar plan de resolución                        |
| `audd:applyResolution`   | Aplicar plan de resolución                        |
| `audd:validateIR`        | Validar estructura de un IR                       |
| `audd:testConnection`    | Probar conectividad a una BD                      |
| `dialog:selectFile`      | Abrir selector de archivos nativo del SO          |

---

## Instalación y desarrollo

```bash
# Instalar dependencias
npm install

# Modo desarrollo (hot-reload)
npm run dev

# Build de producción
npm run build

# Vista previa del build
npm run preview
```

Requiere Node.js ≥ 18.

---

## Códigos de error de audd-node

| Código                | Descripción                                  |
|-----------------------|----------------------------------------------|
| `INVALID_INPUT`       | Entrada inválida o configuración incompleta  |
| `UNSUPPORTED_SOURCE`  | Tipo de fuente no soportada                  |
| `UNSUPPORTED_FORMAT`  | Formato no soportado                         |
| `DB_CONNECTION_FAILED`| Fallo en conexión a base de datos            |
| `IO_ERROR`            | Error de entrada/salida (archivo no encontrado, etc.) |
| `INTERNAL_ERROR`      | Error interno del motor                      |
| `CANCELLED`           | Operación cancelada                          |
| `TIMEOUT`             | Timeout de operación                         |
| `JSON_ERROR`          | Error de serialización JSON                  |

---

## Licencia

MIT
