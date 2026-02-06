# Schemas compartidos (migraciones)

Estos JSON Schema describen la forma de los documentos principales del sistema. Sirven para:

- **Backend:** validar y documentar la estructura al migrar.
- **Frontend:** tipos/contratos para APIs y estado (se pueden generar tipos TypeScript con herramientas como `json-schema-to-typescript`).

## Bases de datos (CouchDB)

### Globales
- `db_workspaces` → ver `workspace.json`
- `db_accounts` → cuentas de usuario (workspacesOwner, workspacesMember)

### Por workspace (`db_${workspaceId}_*`)
- `db_${workspaceId}_project` → `project.json`
- `db_${workspaceId}_table` → `table.json` (definición)
- `db_${workspaceId}_table_${tableId}` → filas de la tabla (campos dinámicos según headers)
- `db_${workspaceId}_agents` → `agent.json`
- `db_${workspaceId}_chat` → `chat.json`
- `db_${workspaceId}_automations` → `automation.json`
- `db_${workspaceId}_docs` → `docs.json`

Al migrar backend o frontend, usar estos esquemas como referencia para mantener el mismo contrato.
