# Carpeta de migración

Aquí se migra el sistema en **dos productos separados** (backend y frontend) para poder avanzar en paralelo. Los esquemas compartidos en `schemas/` permiten que ambos usen el mismo contrato de datos.

## Estructura

```
migracion/
├── PLAN_MIGRACION.md    Plan detallado por fases (leer primero)
├── README.md            Este archivo
├── schemas/             Definiciones de tablas principales (compartidas)
├── backend/             Producto backend (API, lógica, CouchDB)
└── frontend/            Producto frontend (UI, estado, llamadas API)
```

## Cómo ejecutar

### Requisitos
- Node 18+
- CouchDB corriendo (por defecto `http://127.0.0.1:5984` con usuario `admin` y contraseña `password`)

### Backend
```bash
cd migracion/backend
cp .env.example .env
# Editar .env: PORT, COUCHDB_URL, OPENAI_API_KEY
npm install
npm run dev
```
Servidor en `http://localhost:3010` (o el PORT que configures).

### Frontend
```bash
cd migracion/frontend
cp .env.example .env
# Opcional: VITE_API_URL si el backend está en otra URL
npm install
npm run dev
```
App en `http://localhost:3020`. El proxy de Vite redirige `/api` al backend en el puerto 3010.

### Uso rápido
1. Crear un workspace en **Workspaces** o en **Inicio**.
2. Seleccionar el workspace (clic en la tarjeta).
3. Crear tablas en **Tablas** y (opcional) añadir filas.
4. Crear un agente en **Agentes** y vincularle las tablas.
5. Ir a **Chat**, elegir el agente y escribir (ej. "¿Cuáles son los últimos registros?").

## Cómo usar el plan

1. **Leer** `PLAN_MIGRACION.md` y seguir las fases en orden.
2. **Backend:** migrar en `backend/` (Node/Express, CouchDB, servicios de workspace, agentes, chat, tablas, automatizaciones). Usar `schemas/` como referencia de documentos.
3. **Frontend:** migrar en `frontend/` (React/Vite, pantallas de workspace, agentes, chat, tablas, automatizaciones). Usar los mismos `schemas/` para tipos/contratos si generas TypeScript.
4. **UI incremental:** en cada fase, hacer la UI correspondiente (workspace en Fase 1, agente en Fase 2, bot en Fase 3, etc.), no dejar toda la UI para el final.
5. Los dos productos pueden desarrollarse a la vez; el contrato común son los esquemas y las APIs que exponga el backend.

## Origen

El código actual está en la raíz del repo (`app/` backend, `src/` frontend). Esta carpeta es el destino de la migración para tener backend y frontend claramente separados y poder migrar poco a poco.
