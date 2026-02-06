# Frontend (producto migrado)

Producto frontend de la migración. Se migra aquí la UI: workspaces, agentes, chat, tablas, automatizaciones.

## UI incremental (según el plan)

- **Fase 1:** Selector de workspace, listado, crear/editar workspace y miembros; navegación "dentro del workspace".
- **Fase 2:** Configuración del agente: modelo (`aiModel`) y tablas vinculadas (`agent.tables`).
- **Fase 3:** Respuestas del bot, resultados de tablas legibles, mensajes creado/actualizado/no encontrado.
- **Fase 4:** Listado y configuración de automatizaciones por workspace.
- **Fase 5:** Revisión de consistencia y UX.

## Contrato de datos

Usar los JSON Schema de `../schemas/` para:

- Tipos TypeScript (se pueden generar con `json-schema-to-typescript` o mantener a mano).
- Forma de los datos que devuelve la API del backend.

## Estructura sugerida al migrar

```
frontend/
├── README.md
├── package.json
├── src/
│   ├── components/
│   ├── views/           # Workspace, Agents, Chat, Tables, Automate
│   ├── hooks/
│   ├── api/             # llamadas al backend
│   └── types/           # derivados de ../schemas si usas TS
└── ...
```

Puedes iniciar con un proyecto Vite+React y ir trayendo vistas y componentes desde `src/` según el plan.
