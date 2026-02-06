# Plan de migración detallado

Migración del sistema actual (Aythen/facturagpt) manteniendo workspace como entorno aislado, bot con acciones dinámicas, automatizaciones (Gmail, Outlook, WhatsApp, Google Sheets) y UI incremental. Backend y frontend se migran en paralelo como dos productos separados.

---

## Principios

- **Workspace = entorno aislado.** Todo (tablas, agentes, chat, automatizaciones, documentos) pertenece a un workspace; no se mezcla entre workspaces.
- **Modelo del agente lo define el usuario** al crear/editar el agente (`agent.aiModel`); el sistema solo lo lee y usa.
- **UI incremental:** la interfaz se construye poco a poco en cada fase, no toda al final.
- **Sin login/auth en esta migración** (queda para después); el foco es lógica de negocio y aislamiento por workspace.
- **Dos productos:** un backend y un frontend en carpetas separadas dentro de `migracion/`, para poder migrar ambos en paralelo.

---

## FASE 0: Preparación (1 semana)

### Objetivo
Dejar el terreno listo sin tocar aún el flujo del bot.

### Tareas
- [ ] Documentar estado actual: rutas, controladores y servicios de **workspace**, agentes, chat, tablas, automatizaciones.
- [ ] Listar credenciales (OpenAI, Claude, Gemini, Gmail, Outlook, WhatsApp, Google Sheets, S3) y plan para moverlas a variables de entorno.
- [ ] Definir criterios de éxito de la migración (qué debe seguir funcionando igual).
- [ ] Documentar cómo funciona hoy el workspace (creación, miembros, `db_workspaces`, `db_accounts`, `workspacesOwner` / `workspacesMember`).
- [ ] Crear rama o carpeta de migración (esta carpeta `migracion/`).

### Entregable
Documento de contexto, lista de credenciales y criterios de aceptación.

---

## FASE 1: Workspace como entorno aislado (1–2 semanas)

### Objetivo
Dejar explícito que todo pertenece a un workspace y que cada workspace está aislado. Mantener la forma actual de orden y gestión de workspaces.

### Backend
- [ ] **Modelo de datos por workspace:** confirmar y documentar que por cada workspace existen:
  - `db_${workspaceId}_table` (definición de tablas)
  - `db_${workspaceId}_table_${tableId}` (datos de cada tabla)
  - `db_${workspaceId}_project`
  - `db_${workspaceId}_agents`
  - `db_${workspaceId}_chat`
  - `db_${workspaceId}_automations`
  - `db_${workspaceId}_docs`
  - `db_${workspaceId}_notifications`
  - `db_${workspaceId}_auth`
- [ ] **Regla de oro:** ninguna consulta debe mezclar datos de dos workspaces; siempre filtrar por `workspaceId`.
- [ ] Mantener lógica actual: crear workspace, editar, miembros, listar por usuario.

### UI (en esta misma fase)
- [ ] Selector de workspace (cambiar de workspace).
- [ ] Listado de workspaces (los míos / donde soy miembro).
- [ ] Crear / editar workspace y miembros (estructura actual; sin login, UI preparada).
- [ ] Comprobar que tablas, agentes, chat y automatizaciones se muestran "dentro del workspace seleccionado".

### Entregable
Documento "workspace = entorno aislado", checklist de aislamiento, y UI de workspaces funcionando.

---

## FASE 2: Modelo del agente y detección de intenciones (2 semanas)

### Objetivo
Usar siempre el modelo que el usuario configuró en el agente y tener un sistema de detección de intenciones en dos pasos.

### Backend
- [ ] **Leer modelo del agente:** en el flujo del chat, cargar agente desde `db_${workspaceId}_agents`; usar `agent.aiModel` (si es array, usar el primero) para todas las llamadas a LLM.
- [ ] **Mapeo de modelos:** función que convierta el id de modelo en UI (ej. `gpt-4o`, `claude-sonnet-3.5`) al nombre de API de cada proveedor; default si no hay modelo (ej. `gpt-4o-mini`).
- [ ] **Paso 1 – Clasificación:** prompt corto que devuelva si el mensaje es acción sobre tablas y el tipo: `query`, `create`, `update`, `delete`, `search`, `analyze`. Usar modelo del agente.
- [ ] **Paso 2 – Análisis detallado:** solo si el paso 1 indica acción sobre tablas. Prompt con mensaje del usuario, tipo de acción y **lista de tablas del workspace** (vinculadas al agente: `agent.tables`) con nombre y estructura; devolver JSON estructurado (tabla, filtros, orden, límite, campos a crear/actualizar, etc.). Usar modelo del agente.
- [ ] Integrar ambos pasos en el flujo actual (ej. `meetGPT`): clasificación → si aplica, análisis → luego ejecución (Fase 3).
- [ ] **Contexto de tablas:** construir "tablas disponibles" desde `agent.tables` leyendo nombre y headers de cada tabla en el workspace actual.

### UI (en esta misma fase)
- [ ] Configuración del agente: selector de **modelo** (`aiModel`) y de **tablas vinculadas** (`agent.tables`), mostrando solo tablas del workspace actual.
- [ ] Asegurar que al crear/editar agente se persisten modelo y tablas y se usan en el flujo del bot.

### Entregable
Detección de intenciones en dos pasos funcionando, siempre en contexto de un workspace y usando el modelo del agente.

---

## FASE 3: Acciones del bot sobre tablas (2 semanas)

### Objetivo
El bot ejecuta consultas, altas, actualizaciones, bajas y análisis sobre tablas del workspace.

### Backend
- [ ] **Query / search:** con el JSON del paso 2, construir selector CouchDB y ejecutar `find` en `db_${workspaceId}_table_${tableId}`; formatear resultados y enviarlos como respuesta.
- [ ] **Create:** validar campos requeridos; si faltan, responder pidiendo solo esos; si están completos, insertar en la tabla del workspace y confirmar.
- [ ] **Update:** buscar documento por criterios del paso 2, actualizar solo los campos indicados, confirmar.
- [ ] **Delete:** buscar documento, eliminar (o marcar eliminado según modelo de datos), confirmar.
- [ ] **Analyze:** según operación (sum, avg, count, max, min) y campo, calcular sobre documentos de la tabla del workspace y responder.

### UI (en esta misma fase)
- [ ] Respuestas del bot claras y legibles.
- [ ] Resultados de tablas mostrados de forma legible (listas, tablas o cards).
- [ ] Mensajes explícitos: "Registro creado", "Registro actualizado", "No se encontraron resultados", "Faltan datos: X, Y".
- [ ] Indicador de "pensando" o "ejecutando acción" mientras se hace detección + acción.

### Entregable
Bot que puede consultar, crear, actualizar, eliminar y hacer análisis básicos sobre tablas, siempre dentro del workspace.

---

## FASE 4: Automatizaciones (2 semanas)

### Objetivo
Mantener Gmail, Outlook, WhatsApp y Google Sheets; cada integración asociada al workspace (o al usuario del workspace).

### Backend
- [ ] Las automatizaciones viven en `db_${workspaceId}_automations`; no leer de otro workspace.
- [ ] **Gmail:** revisar OAuth y envío/recepción; mover credenciales a env; documentar.
- [ ] **Outlook:** revisar flujo; mover credenciales a env; documentar.
- [ ] **WhatsApp:** verificar conexión y envío; mantener integración.
- [ ] **Google Sheets:** revisar lectura/escritura y auth; mover credenciales a env; documentar.

### UI (en esta misma fase)
- [ ] Listado y configuración de automatizaciones dentro del workspace actual.
- [ ] Dejar claro que cada automatización pertenece al workspace seleccionado.

### Entregable
Las cuatro integraciones funcionando y documentadas; credenciales en env.

---

## FASE 5: Revisión de UI y experiencia (1–2 semanas)

### Objetivo
Revisar y pulir lo construido en fases anteriores; no "hacer toda la UI" aquí.

### Tareas
- [ ] Revisar que la navegación (tablas, agentes, chat, automatizaciones) sea siempre "dentro del workspace seleccionado".
- [ ] Revisar consistencia visual y de mensajes en todo lo ya construido.
- [ ] Pequeños ajustes de UX (loading, errores, empty states) donde haga falta.
- [ ] Comprobar que selector de workspace, listado y crear/editar workspace siguen funcionando correctamente con todo lo nuevo.

### Entregable
UI coherente, con workspaces bien gestionados y bot usable dentro de cada workspace.

---

## FASE 6: Limpieza, pruebas y documentación (1 semana)

### Tareas
- [ ] Limpieza de código muerto; asegurar que no queden credenciales en código.
- [ ] Pruebas por workspace: crear dos workspaces y comprobar que los datos de uno no aparecen en el otro; bot y automatizaciones solo ven su workspace.
- [ ] Documentación final:
  - Workspace = entorno aislado; qué datos hay por workspace.
  - Cómo se gestionan los workspaces (orden actual).
  - Cómo funciona la IA (modelo del agente, detección en 2 pasos, acciones).
  - Que auth/login queda fuera de este plan.

### Entregable
Código estable, pruebas de aislamiento por workspace y documento de arquitectura actualizado.

---

## Estructura de carpetas de migración

```
migracion/
├── PLAN_MIGRACION.md          (este documento)
├── README.md                  (resumen y cómo usar esta carpeta)
├── schemas/                   (definiciones compartidas de tablas principales)
│   ├── workspace.json
│   ├── agent.json
│   ├── table.json
│   ├── project.json
│   ├── chat.json
│   ├── automation.json
│   └── docs.json
├── backend/                   (producto backend nuevo; migrar aquí)
│   ├── README.md
│   └── ...
└── frontend/                  (producto frontend nuevo; migrar aquí)
    ├── README.md
    └── ...
```

Backend y frontend son **dos productos separados**; se migran en paralelo usando los mismos esquemas de `schemas/` para mantener contrato de datos.

---

## Tablas principales (resumen para migraciones)

### Globales (una sola base)
- **db_workspaces:** documentos de workspace (_id, name, color, members, createdBy, createdAt, etc.).
- **db_accounts:** usuarios/cuentas (_id, email, nombre, workspacesOwner, workspacesMember, etc.).

### Por workspace (una base por workspace)
- **db_${workspaceId}_project:** proyectos que agrupan tablas.
- **db_${workspaceId}_table:** definición de tablas (nombre, headers, type, color, icon).
- **db_${workspaceId}_table_${tableId:** datos (filas) de cada tabla.
- **db_${workspaceId}_agents:** agentes (name, aiModel, instructions, tables, workflows, etc.).
- **db_${workspaceId}_chat:** conversaciones y mensajes del chat.
- **db_${workspaceId}_automations:** workflows/automatizaciones.
- **db_${workspaceId}_docs:** documentos; archivos en S3.
- **db_${workspaceId}_notifications:** notificaciones.
- **db_${workspaceId}_auth:** tokens/auth por integración (Gmail, Outlook, etc.).

Los esquemas en `schemas/` describen la forma de estos documentos para que backend y frontend migren al mismo contrato.

---

## Orden de ejecución resumido

| Fase | Contenido |
|------|-----------|
| 0 | Preparación y documentación. |
| 1 | Workspace como entorno aislado + UI de workspaces. |
| 2 | Modelo del agente + detección de intenciones (2 pasos) + UI configuración agente. |
| 3 | Acciones del bot (query, create, update, delete, analyze) + UI respuestas y resultados. |
| 4 | Automatizaciones (Gmail, Outlook, WhatsApp, Sheets) + UI automatizaciones. |
| 5 | Revisión de UI y experiencia. |
| 6 | Limpieza, pruebas y documentación. |

---

## Nota sobre el modelo del agente

El valor `agent.aiModel` **no se define en el código del plan**; lo define el **usuario** en la pantalla de crear/editar agente. El backend solo **lee** el agente desde `db_${workspaceId}_agents` y usa `agent.aiModel` para las llamadas a LLM (detección de intenciones y respuestas). Si el usuario no eligió modelo, se usa un valor por defecto (ej. `gpt-4o-mini`).
