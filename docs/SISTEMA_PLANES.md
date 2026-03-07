# Sistema de Planes y Suscripciones

## Índice
1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Planes Disponibles](#planes-disponibles)
3. [Flujo de Usuario](#flujo-de-usuario)
4. [Credenciales de Prueba](#credenciales-de-prueba)
5. [Arquitectura Técnica](#arquitectura-técnica)
6. [API Reference](#api-reference)
7. [Guía de Administración](#guía-de-administración)

---

## Resumen Ejecutivo

Sistema de suscripciones con **4 niveles de plan** que controla:
- Cantidad de workspaces, tablas, registros
- Acceso a funcionalidades (flows, IA avanzada, API)
- Modelos de IA disponibles

Los planes se almacenan en la base de datos y son **editables por el Super Admin** sin necesidad de modificar código.

---

## Planes Disponibles

### Comparativa de Planes

| Característica | 🆓 FREE | ⭐ STARTER | 💎 PREMIUM | 👑 ENTERPRISE |
|----------------|---------|-----------|-----------|---------------|
| **Precio** | $0/mes | $9/mes | $29/mes | $99/mes |
| **Workspaces** | 1 | 3 | 10 | Ilimitado |
| **Tablas/Workspace** | 3 | 10 | 50 | Ilimitado |
| **Registros/Tabla** | 100 | 1,000 | 10,000 | Ilimitado |
| **Agentes IA** | 1 | 2 | 5 | Ilimitado |
| **Automatizaciones** | ❌ | 5 | 20 | Ilimitado |
| **Almacenamiento** | 100 MB | 500 MB | 5 GB | Ilimitado |
| **Llamadas API** | ❌ | 1,000/mes | 10,000/mes | Ilimitado |

### Funcionalidades por Plan

| Funcionalidad | FREE | STARTER | PREMIUM | ENTERPRISE |
|---------------|------|---------|---------|------------|
| Chat con IA | ✅ | ✅ | ✅ | ✅ |
| Gestión de datos | ✅ | ✅ | ✅ | ✅ |
| Exportar datos | ❌ | ✅ | ✅ | ✅ |
| Automatizaciones (Flows) | ❌ | ✅ | ✅ | ✅ |
| IA Avanzada (GPT-4) | ❌ | ❌ | ✅ | ✅ |
| Acceso API | ❌ | ❌ | ✅ | ✅ |
| Soporte prioritario | ❌ | ❌ | ✅ | ✅ |
| Usuarios ilimitados | ❌ | ❌ | ❌ | ✅ |
| Personalización | ❌ | ❌ | ❌ | ✅ |

### Modelos de IA por Plan

| Plan | Modelos Disponibles |
|------|---------------------|
| FREE | GPT-3.5 Turbo |
| STARTER | GPT-3.5 Turbo, Claude Haiku |
| PREMIUM | GPT-3.5, GPT-4o, Claude Haiku, Claude Sonnet |
| ENTERPRISE | Todos los modelos (incluye GPT-4 Turbo, Claude Opus) |

---

## Flujo de Usuario

### 1. Registro de Nuevo Usuario

```
┌─────────────────────────────────────────────────────────────────┐
│                     FLUJO DE REGISTRO                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Página Login] ────► [Clic "Crear cuenta"]                     │
│        │                                                        │
│        ▼                                                        │
│  [Formulario Registro]                                          │
│   • Email                                                       │
│   • Contraseña                                                  │
│   • Nombre                                                      │
│        │                                                        │
│        ▼                                                        │
│  [Usuario creado con plan FREE]                                 │
│        │                                                        │
│        ▼                                                        │
│  [Detecta: sin workspaces + onboarding incompleto]              │
│        │                                                        │
│        ▼                                                        │
│  [Muestra ONBOARDING WIZARD]                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Onboarding Wizard (5 Pasos)

```
┌─────────────────────────────────────────────────────────────────┐
│                    ONBOARDING WIZARD                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PASO 0: SELECCIÓN DE PLAN                                      │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐               │
│  │  FREE   │ │ STARTER │ │ PREMIUM │ │ENTERPRISE│              │
│  │  $0/mes │ │  $9/mes │ │ $29/mes │ │ $99/mes │               │
│  │    ○    │ │    ○    │ │    ●    │ │    ○    │               │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘               │
│                    [Continuar →]                                │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  PASO 1: TIPO DE NEGOCIO                                        │
│  ┌─────────────────┐  ┌─────────────────┐                       │
│  │ 🏪 Tienda       │  │ 🍽️ Restaurante  │                       │
│  │ Productos,      │  │ Menú, Pedidos,  │                       │
│  │ Inventario      │  │ Reservas        │                       │
│  └─────────────────┘  └─────────────────┘                       │
│  ┌─────────────────┐  ┌─────────────────┐                       │
│  │ 💼 Servicios    │  │ 🔧 Personalizado│                       │
│  │ Clientes, Citas │  │ Empezar vacío   │                       │
│  └─────────────────┘  └─────────────────┘                       │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  PASO 2: NOMBRE DEL PROYECTO                                    │
│  ┌─────────────────────────────────────┐                        │
│  │ Mi Restaurante                      │                        │
│  └─────────────────────────────────────┘                        │
│             [← Atrás]  [Continuar →]                            │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  PASO 3: RESUMEN                                                │
│  ┌─────────────────────────────────────┐                        │
│  │ 📦 Proyecto: Mi Restaurante         │                        │
│  │ 📋 Tablas: Menú, Pedidos, Clientes  │                        │
│  │ 🤖 Agente: Asistente del Restaurant │                        │
│  └─────────────────────────────────────┘                        │
│             [← Atrás]  [Crear →]                                │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  PASO 4: CREANDO...                                             │
│  ┌─────────────────────────────────────┐                        │
│  │     ████████████░░░░  75%           │                        │
│  │     Creando tablas de datos...      │                        │
│  └─────────────────────────────────────┘                        │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ✅ COMPLETADO → Redirige a /chat                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Validación de Límites

```
┌─────────────────────────────────────────────────────────────────┐
│              VALIDACIÓN DE LÍMITES (Middleware)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Usuario intenta crear recurso                                  │
│        │                                                        │
│        ▼                                                        │
│  ┌─────────────────────────────────┐                            │
│  │ checkCanCreate[Resource]()     │                             │
│  │ • Obtiene plan del usuario     │                             │
│  │ • Cuenta recursos actuales     │                             │
│  │ • Compara con límite del plan  │                             │
│  └─────────────────────────────────┘                            │
│        │                                                        │
│        ├──── ✅ Dentro del límite ────► Continúa                │
│        │                                                        │
│        └──── ❌ Excede límite                                   │
│                    │                                            │
│                    ▼                                            │
│  ┌─────────────────────────────────┐                            │
│  │ HTTP 403 - LIMIT_EXCEEDED      │                             │
│  │ {                              │                             │
│  │   error: "Límite alcanzado",   │                             │
│  │   code: "LIMIT_EXCEEDED",      │                             │
│  │   resource: "workspaces",      │                             │
│  │   current: 3,                  │                             │
│  │   limit: 3,                    │                             │
│  │   upgradeUrl: "/upgrade"       │                             │
│  │ }                              │                             │
│  └─────────────────────────────────┘                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4. Flujo de Upgrade

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUJO DE UPGRADE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Usuario ve mensaje de límite]                                 │
│        │                                                        │
│        ▼                                                        │
│  [Modal de Upgrade]                                             │
│  ┌─────────────────────────────────────┐                        │
│  │  ⚠️ Has alcanzado tu límite         │                        │
│  │                                     │                        │
│  │  Tu plan FREE permite 1 workspace   │                        │
│  │                                     │                        │
│  │  ┌─────────────────────────────┐    │                        │
│  │  │ STARTER - $9/mes           │    │                        │
│  │  │ • 3 workspaces             │    │                        │
│  │  │ • 10 tablas/workspace      │    │                        │
│  │  │ • Automatizaciones         │    │                        │
│  │  │        [Mejorar →]         │    │                        │
│  │  └─────────────────────────────┘    │                        │
│  │                                     │                        │
│  │  [Cancelar]                         │                        │
│  └─────────────────────────────────────┘                        │
│        │                                                        │
│        ▼                                                        │
│  [Proceso de pago] → [Actualiza plan] → [Recursos desbloqueados]│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Credenciales de Prueba

Después de ejecutar los seeds (`node src/seeds/all.js --clean`):

| Usuario | Contraseña | Plan | Estado | Uso |
|---------|------------|------|--------|-----|
| `nuevo@migracion.ai` | `nuevo123` | FREE | Sin config | Probar onboarding completo |
| `starter@migracion.ai` | `starter123` | STARTER | Workspace básico | Probar límites starter |
| `demo@migracion.ai` | `demo123` | PREMIUM | CRM completo | Probar funcionalidades premium |
| `admin@migracion.ai` | `admin123` | ENTERPRISE | Super Admin | Administrar planes/usuarios |

### Escenarios de Prueba

#### Probar Onboarding (usuario nuevo)
1. Login con `nuevo@migracion.ai` / `nuevo123`
2. Verás el wizard de onboarding
3. Selecciona plan → tipo negocio → nombre → crear
4. Se crea workspace + tablas + agente automáticamente

#### Probar Límites
1. Login con `starter@migracion.ai` / `starter123`
2. Intenta crear más de 3 workspaces
3. Verás mensaje de límite con opción de upgrade

#### Probar Admin de Planes
1. Login con `admin@migracion.ai` / `admin123`
2. Accede a `/admin/plans` (API)
3. Puedes crear, editar, eliminar planes

---

## Arquitectura Técnica

### Estructura de Archivos

```
backend/
├── src/
│   ├── config/
│   │   └── plans.js              # Definición de planes por defecto
│   │
│   ├── middleware/
│   │   ├── auth.js               # Autenticación JWT
│   │   └── limits.js             # Validación de límites por plan
│   │
│   ├── controllers/
│   │   ├── authController.js     # Login/Register con plan
│   │   └── plansController.js    # CRUD de planes (admin)
│   │
│   ├── seeds/
│   │   ├── plans.js              # Seed de planes a BD
│   │   ├── users.js              # Usuarios de prueba
│   │   └── all.js                # Ejecutor principal
│   │
│   └── routers/
│       └── index.js              # Rutas con middleware de límites

frontend/
├── src/
│   ├── api/
│   │   └── client.js             # Funciones API de planes
│   │
│   └── components/
│       └── OnboardingWizard.jsx  # Wizard con selección de plan
```

### Base de Datos

#### Colección: `_plans`
```javascript
{
  "_id": "premium",
  "name": "Premium",
  "price": 29,
  "currency": "USD",
  "billingPeriod": "monthly",
  "limits": {
    "workspaces": 10,
    "tablesPerWorkspace": 50,
    "recordsPerTable": 10000,
    "agents": 5,
    "flows": 20,
    "storage": 5000,      // MB
    "apiCalls": 10000     // por mes
  },
  "features": {
    "chat": true,
    "flows": true,
    "export": true,
    "advancedAI": true,
    "api": true,
    "prioritySupport": true,
    "multiUser": false,
    "customization": false
  },
  "aiModels": ["gpt-3.5-turbo", "gpt-4o", "claude-haiku", "claude-sonnet"],
  "ui": {
    "color": "#a855f7",
    "badge": "💎"
  },
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### Colección: `accounts` (usuarios)
```javascript
{
  "_id": "user-xxx",
  "email": "user@example.com",
  "password": { "hash": "...", "salt": "..." },
  "name": "Usuario",
  "plan": "premium",                    // ID del plan
  "planExpiresAt": null,                // null = no expira
  "role": "user",                       // user | superAdmin
  "permissions": {},                    // Permisos especiales
  "workspaces": [{ "id": "...", "role": "owner" }],
  "onboardingCompleted": true,
  "businessType": "services",
  "status": "active"
}
```

### Middleware de Límites

```javascript
// Ejemplo de uso en rutas
router.post('/workspaces', 
  authenticate,
  checkCanCreateWorkspace,  // ← Valida límite
  workspacesController.create
);

router.post('/workspaces/:id/tables',
  authenticate,
  checkCanCreateTable,      // ← Valida límite
  tablesController.create
);
```

---

## API Reference

### Endpoints Públicos

#### `GET /api/plans`
Lista todos los planes activos (para mostrar en pricing/onboarding).

**Response:**
```json
{
  "data": [
    { "_id": "free", "name": "Free", "price": 0, "limits": {...} },
    { "_id": "starter", "name": "Starter", "price": 9, "limits": {...} },
    ...
  ]
}
```

### Endpoints Autenticados

#### `GET /api/user/plan`
Obtiene el plan del usuario actual.

**Response:**
```json
{
  "plan": {
    "_id": "premium",
    "name": "Premium",
    "limits": {...},
    "features": {...}
  }
}
```

#### `GET /api/user/usage`
Obtiene el uso actual vs límites.

**Response:**
```json
{
  "usage": {
    "workspaces": { "current": 2, "limit": 10, "percentage": 20 },
    "tables": { "current": 8, "limit": 50, "percentage": 16 },
    "agents": { "current": 1, "limit": 5, "percentage": 20 }
  }
}
```

### Endpoints Admin (SuperAdmin)

#### `POST /api/admin/plans`
Crea un nuevo plan.

**Body:**
```json
{
  "_id": "business",
  "name": "Business",
  "price": 49,
  "limits": { "workspaces": 20, ... },
  "features": { "flows": true, ... }
}
```

#### `PUT /api/admin/plans/:id`
Actualiza un plan existente.

#### `DELETE /api/admin/plans/:id`
Elimina un plan (soft delete, marca como inactivo).

---

## Guía de Administración

### Ejecutar Seeds

```bash
# Limpiar BD y recrear todo
cd backend
node src/seeds/all.js --clean

# Solo agregar sin borrar (puede fallar si existen)
node src/seeds/all.js
```

### Modificar Límites de un Plan

1. **Opción A: Via API (recomendado)**
   ```bash
   curl -X PUT http://localhost:3010/api/admin/plans/starter \
     -H "Authorization: Bearer TOKEN_ADMIN" \
     -H "Content-Type: application/json" \
     -d '{"limits": {"workspaces": 5}}'
   ```

2. **Opción B: Directo en CouchDB**
   - Accede a Fauxton: `http://localhost:5984/_utils`
   - Base de datos: `chatbot__plans`
   - Edita el documento del plan

### Crear Nuevo Plan

```bash
curl -X POST http://localhost:3010/api/admin/plans \
  -H "Authorization: Bearer TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "_id": "business",
    "name": "Business",
    "price": 49,
    "limits": {
      "workspaces": 20,
      "tablesPerWorkspace": 100,
      "recordsPerTable": 50000,
      "agents": 10,
      "flows": 50
    },
    "features": {
      "chat": true,
      "flows": true,
      "advancedAI": true,
      "api": true
    },
    "aiModels": ["gpt-3.5-turbo", "gpt-4o", "claude-sonnet"],
    "isActive": true
  }'
```

### Cambiar Plan de Usuario

```javascript
// En CouchDB (chatbot_accounts)
{
  "_id": "user-xxx",
  "plan": "premium",        // Cambiar aquí
  "planExpiresAt": null     // o fecha de expiración
}
```

---

## Diagrama de Flujo Completo

```
                            ┌─────────────────┐
                            │   VISITANTE     │
                            └────────┬────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    ▼                                 ▼
           ┌───────────────┐                ┌───────────────┐
           │    LOGIN      │                │   REGISTRO    │
           └───────┬───────┘                └───────┬───────┘
                   │                                │
                   │                                ▼
                   │                    ┌───────────────────────┐
                   │                    │ Usuario creado (FREE) │
                   │                    └───────────┬───────────┘
                   │                                │
                   └────────────────┬───────────────┘
                                    ▼
                    ┌───────────────────────────────┐
                    │ ¿Tiene workspaces?            │
                    └───────────────┬───────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
            ┌───────────────┐              ┌───────────────┐
            │      NO       │              │      SÍ       │
            │ (user nuevo)  │              │ (user activo) │
            └───────┬───────┘              └───────┬───────┘
                    │                              │
                    ▼                              │
         ┌───────────────────┐                     │
         │ ONBOARDING WIZARD │                     │
         │                   │                     │
         │ 1. Elegir Plan    │                     │
         │ 2. Tipo Negocio   │                     │
         │ 3. Nombre         │                     │
         │ 4. Crear          │                     │
         └─────────┬─────────┘                     │
                   │                               │
                   ▼                               │
         ┌───────────────────┐                     │
         │ Crea automático:  │                     │
         │ • Workspace       │                     │
         │ • Tablas          │                     │
         │ • Agente IA       │                     │
         └─────────┬─────────┘                     │
                   │                               │
                   └───────────────┬───────────────┘
                                   ▼
                        ┌───────────────────┐
                        │   DASHBOARD/CHAT  │
                        └─────────┬─────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
         ┌───────────────────┐       ┌───────────────────┐
         │ Usar funciones    │       │ Crear recursos    │
         │ del plan actual   │       │ (workspace/tabla) │
         └───────────────────┘       └─────────┬─────────┘
                                               │
                                               ▼
                                   ┌───────────────────────┐
                                   │ Middleware de Límites │
                                   └───────────┬───────────┘
                                               │
                              ┌────────────────┴────────────────┐
                              ▼                                 ▼
                    ┌───────────────┐                 ┌───────────────┐
                    │   PERMITIDO   │                 │    BLOQUEADO  │
                    │  (< límite)   │                 │  (>= límite)  │
                    └───────┬───────┘                 └───────┬───────┘
                            │                                 │
                            ▼                                 ▼
                   ┌───────────────┐                ┌───────────────────┐
                   │    Recurso    │                │  Modal Upgrade    │
                   │    creado     │                │  "Mejora tu plan" │
                   └───────────────┘                └───────────────────┘
```

---

## Notas de Implementación

### Cache de Planes
Los planes se cachean 5 minutos para evitar consultas repetidas a BD.

### Límite -1 = Ilimitado
En los límites, el valor `-1` significa ilimitado (Enterprise).

### Fail-Open en Errores
Si hay error al verificar límites, se permite la acción (fail-open) para no bloquear al usuario por errores técnicos.

### Migración de Usuarios Existentes
Usuarios creados antes del sistema de planes se asumen como `free` si no tienen campo `plan`.
