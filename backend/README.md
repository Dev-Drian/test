# Backend (producto migrado)

Producto backend de la migración. Se migra aquí la lógica de API, servicios y acceso a CouchDB.

## Dependencias del plan

- **Fase 1:** Workspace (aislamiento, CRUD workspace, miembros).
- **Fase 2:** Agentes (CRUD, leer `aiModel` y `tables`), detección de intenciones en 2 pasos.
- **Fase 3:** Acciones del bot sobre tablas (query, create, update, delete, analyze).
- **Fase 4:** Automatizaciones (Gmail, Outlook, WhatsApp, Google Sheets) por workspace.

## Contrato de datos

Usar los JSON Schema de `../schemas/` como referencia para:

- Forma de documentos en CouchDB (workspace, agent, table, project, chat, automation, docs).
- Nombres de bases: `db_workspaces`, `db_accounts`, `db_${workspaceId}_table`, `db_${workspaceId}_agents`, etc.

## Estructura sugerida al migrar

```
backend/
├── README.md
├── package.json
├── src/
│   ├── config/          # env, CouchDB connection
│   ├── controllers/      # workspace, agent, table, chat, automate
│   ├── services/        # lógica de negocio, detección intenciones
│   ├── routers/
│   └── utils/
└── ...
```

Puedes iniciar con un `package.json` mínimo y ir trayendo controladores y servicios desde `app/` según el plan.
