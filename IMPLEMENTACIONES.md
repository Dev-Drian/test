# 🚀 Plan de Implementaciones — FlowAI

> Análisis técnico completo y hoja de ruta de desarrollo.
> Estado al: 4 de Marzo 2026 — Sprint completo ✅

---

## 📊 Estado actual del sistema

| Módulo | Estado | Notas |
|--------|--------|-------|
| Auth + JWT | ✅ Completo | Register, login, perfil, cambio de contraseña |
| Multi-workspace | ✅ Completo | Aislamiento total, roles owner/member |
| Tablas dinámicas | ✅ Sólido | Tipos: text, email, phone, select, date, number, relation |
| Chat con IA (V3) | ✅ Fuerte | LLM-First, Function Calling, 6 herramientas |
| Editor de Flujos | ✅ Completo | 9 tipos de nodo, 28 templates, drag & drop |
| Sistema de Planes | ✅ Completo | 4 planes con límites reales en middleware |
| Onboarding Wizard | ✅ Completo | 5 pasos, detección automática |
| Agentes configurables | ✅ Bien | Personalidad, tablas vinculadas, modelo por agente |
| **Import/Export CSV** | ✅ Completo | ExportService + ImportService + ImportModal + bot upload |
| **BusinessSnapshot IA** | ✅ Completo | Cache 5 min, inyectado en system prompt |
| **Alertas proactivas** | ✅ Parcial | Snapshot activo, alertas en prompt |
| **Cron Jobs / Schedule** | ✅ Completo | CronScheduler + getStatus() + rutas admin |
| **Webhook Inbound** | ✅ Completo | POST /inbound/:ws/:table — JSON array o CSV |
| **Excel (XLSX) Import** | ✅ Completo | Fix `.default` + rows normalizadas como arrays |
| **Import conversacional** | ✅ Nuevo | Preview en chat → tarjeta mapeo → confirmar/cancelar |
| **Super Admin Panel** | ✅ Nuevo | /admin — jobs, snapshots, caché, estado sistema |
| **Pagos Stripe** | ❌ Falta | Planes son decorativos |
| **WhatsApp Business** | ❌ Falta | La integración más pedida en LATAM |
| **Roles por usuario** | ❌ Falta | Todos los miembros tienen el mismo acceso |
| **Tests** | ❌ Falta | Ningún archivo de test |

---

## 🏆 Prioridad 1 — Implementaciones en curso

### 1. Export CSV/Excel
**Tiempo:** ~1 día  
**Archivos:** `backend/src/services/ExportService.js`, endpoint en `tablesController`, botón en `Tables.jsx`

**Cómo funciona sin romper el dinamismo:**
- Lee los `headers` de la tabla (ya en CouchDB) → orden y labels de columnas
- `TableDataRepository.findAll()` con filtros opcionales → registros
- Mapea cada registro a fila CSV usando headers como guía
- Respeta todos los tipos de campo (relations, selects, fechas)
- Resultado: descarga directa desde el frontend

**Endpoints nuevos:**
```
GET /api/table/:workspaceId/:tableId/export?format=csv
GET /api/table/:workspaceId/:tableId/export?format=json
```

---

### 2. Import CSV / Excel (XLSX)
**Estado: ✅ Completo**  
**Archivos:** `ImportService.js`, `ImportModal.jsx`, `tablesController.js`

**3 formas de importar:**
1. **UI de Tablas** (`ImportModal.jsx`) — drag & drop, preview 5 filas, mapeo editable, barra de progreso  
2. **Webhook externo** (`/inbound/:workspaceId/:tableId`) — JSON array o CSV, ideal para automatizaciones
3. **Bot chat** (📎 en el chat) — el cliente sube el Excel/CSV, selecciona tabla, el bot importa y confirma

**Formatos soportados:**
- `.csv` — separador `,` o `;`, BOM UTF-8, formato colombiano de números (`1.234,56`)
- `.xlsx` / `.xls` — usa biblioteca `xlsx`, primera hoja del libro, auto-detección de columnas

**Cómo funciona sin romper el dinamismo:**
- Parsea CSV/XLSX → `{ columnHeaders, rows }` (normalizado)
- Lee `headers` de la tabla → auto-mapeo columna→campo por nombre/label
- Por cada fila → `EntityRepository.create()` ← MISMO que usa el bot
- Respeta validaciones, defaults, relaciones de la tabla
- Devuelve `{ imported, skipped, errors: [{ row, reason }] }`

**Endpoints:**
```
POST /api/table/:workspaceId/:tableId/import/preview   ← mapeo + 5 filas
POST /api/table/:workspaceId/:tableId/import           ← importación completa
POST /api/chat/import-file                             ← importar desde el chat
POST /inbound/:workspaceId/:tableId                    ← webhook externo (nueva URL)
```

---

### 3. BusinessSnapshot — Contexto del bot
**Tiempo:** ~2 días  
**Archivos:** `backend/src/services/BusinessSnapshot.js`, integración en `ChatService.js`

**Qué inyecta al prompt del bot:**
```
📊 ESTADO ACTUAL DEL NEGOCIO (hace 5 min):
- Clientes: 234 total | 12 nuevos esta semana
- Ventas: 8 pendientes de pago | $124.500 en deuda
- Seguimientos: ⚠️ 7 vencidos sin atender
- Productos: ⚠️ 3 bajo stock mínimo

📅 HOY — Miércoles 4 de marzo:
- 3 citas programadas
- 2 facturas vencen esta semana
- 7 seguimientos vencidos sin contacto
```

**Cómo funciona sin romper el dinamismo:**
- NO hardcodea nombres de tablas ni campos
- Lee `type` de cada campo en `headers`:
  - `type: "date"` + valor < hoy → **vencido**
  - `type: "number"` + `validation.min` + valor <= min → **stock bajo**
  - `type: "select"` → distribución de estados (conteo por opción)
- Cache de 5 minutos por workspaceId (no hace queries por cada mensaje)
- Funciona para CUALQUIER vertical: clínica, tienda, CRM, restaurante

---

### 4. Alertas proactivas en el chat
**Tiempo:** ~1 día (encima del Snapshot)  
**Archivos:** integración en `Engine.js`, `ProactiveEngine.js`

**Triggers para mostrar alertas:**
- Primera apertura del día
- Cuando el usuario pregunta "¿cómo estamos?" / "resumen" / "qué hay"
- Si hay alertas críticas (stock 0, factura vencida hoy), mencionarlas en la primera respuesta

---

### 5. CronScheduler — Triggers por tiempo
**Tiempo:** ~4 días  
**Archivos:** `backend/src/jobs/CronScheduler.js`, `backend/src/jobs/JobQueue.js`, nuevo nodo `Schedule` en el editor de flujos

**Qué habilita:**
```
Flujo "Recordatorio de cita":
  Schedule: 24 horas antes de campo "fecha" en tabla "Citas"
  → Enviar mensaje WhatsApp/chat al cliente
  → "Recuerda tu cita mañana a las {hora}"

Flujo "Alerta stock":
  Schedule: Cada día a las 8am
  → Verificar stock < mínimo en tabla "Productos"
  → Notificar a responsable de compras

Flujo "Reporte semanal":
  Schedule: Cada lunes a las 9am
  → Calcular ventas de la semana
  → Enviar resumen por email al dueño
```

**Nuevo tipo de nodo en el editor:** `⏰ Schedule`
- `relative`: "X horas/días antes/después del campo [fecha_campo]"
- `fixed`: "Cada [lunes] a las [9:00]"
- `interval`: "Cada [N] horas/días"

---

### 6. Webhook Inbound — Importar desde sistemas externos
**Estado: ✅ Completo**  
**Archivos:** `backend/src/controllers/inboundController.js`, montado en `/inbound`

**Uso típico:**
```
# Enviar array JSON desde cualquier script o ERP
POST /inbound/:workspaceId/:tableId
Authorization: Bearer <jwt_token>
Content-Type: application/json

[
  { "nombre": "Ana García", "email": "ana@empresa.com", "estado": "activo" },
  { "nombre": "Juan López", "email": "juan@empresa.com", "estado": "prospecto" }
]

# O enviar CSV directamente
POST /inbound/:workspaceId/:tableId
Content-Type: text/csv

nombre,email,estado
Ana García,ana@empresa.com,activo
```

**Respuesta:**
```json
{ "success": true, "imported": 2, "skipped": 0, "errors": [], "total": 2 }
```

**Casos de uso reales:**
- Google Sheets → Apps Script → POST diario al webhook → datos siempre actualizados en el CRM
- ERP/SAP → exporta pedidos cada hora → el bot ya conoce el estado real
- Formulario externo (Typeform, Google Forms) → Zapier/Make → webhook → tabla de leads
- Script Python interno → sync de inventario → alerta de stock automática

**Seguridad:** JWT estándar por ahora. Roadmap: API Keys dedicadas por workspace (sin expiración, revocables).

---

### 7. Import conversacional — Preview en el chat
**Estado: ✅ Completo (refactor total)**  
**Archivos:** `Chat.jsx`, `chatController.js` (`previewImportInChat`), `routers/index.js`, `api/client.js`

**Flujo completo (nuevo — conversacional):**
1. Usuario adjunta `.csv` o `.xlsx` con 📎 y selecciona tabla con búsqueda integrada
2. Presiona Enviar → llama `POST /api/chat/import-file/preview` (sin importar aún)
3. El bot responde con una **tarjeta interactiva `ImportPreviewCard`** en el chat:
   - Nombre del archivo + tabla destino + cantidad de filas detectadas
   - Tabla de mapeo: columna CSV → campo del sistema (o "ignorado")
   - Preview de las primeras 5 filas reales del archivo
   - Warning si hay columnas sin mapear
   - Botones: **"Confirmar (N registros)"** y **"Cancelar"**
4. Si confirma → `POST /api/chat/import-file` → importa + refresca snapshot → resultado en el mismo hilo
5. Si cancela → el mensaje cambia a "❌ Importación cancelada."

**Nuevo endpoint:**
```
POST /api/chat/import-file/preview   ← mapeo + 5 filas preview (sin importar)
```

**Bugs corregidos en este sprint:**
- `ImportService._parseXLSX`: `(await import('xlsx')).default` (antes faltaba `.default`, fallaba silenciosamente)
- `ImportService._parseXLSX`: filas devueltas como `Array<Array<string>>` para coincidir con `_mapRow()`
- `index.js`: body limit subido de `10mb` a `25mb`
- `chatController.importFileInChat`: valida existencia de tabla (404 si no existe), snapshot forzado post-import, `snapshotSummary` en respuesta
- `CronScheduler.js`: rutas de import corregidas (`./FlowExecutor` → `../services/FlowExecutor.js`)

**Ejemplo de respuesta del bot:**
```
✅ Importación de clientes_marzo.xlsx completada en "Clientes"

- Importados: 47 registros
- Omitidos: 3 filas vacías
- Errores: 1 • Fila 23: campo "email" inválido

📊 Estado actual: 234 clientes total | 12 nuevos esta semana
```

---

### 8. Super Admin Panel
**Estado: ✅ Nuevo**  
**Archivos:** `adminController.js`, `Admin.jsx`, `App.jsx` (ruta `/admin`), `Layout.jsx` (ícono engranaje + nav)

**Qué muestra `/admin`:**

| Sección | Datos |
|---------|-------|
| **System Status** | Uptime, memoria RSS MB, versión Node, ping CouchDB, scheduler activo, OpenAI key configurado |
| **Cron Jobs** | Tabla: jobId, workspaceId, flowId, badge de estado — botón "Reload Jobs" |
| **Snapshot Cache** | Lista de snapshots activos, TTL restante en segundos, botón "Invalidar" por workspace |
| **Quick Reference** | Todos los endpoints admin con método HTTP + descripción |

**Endpoints backend (`adminController.js`):**
```
GET  /api/admin/status                  ← estado completo del sistema
GET  /api/admin/jobs                    ← jobs activos del CronScheduler
POST /api/admin/jobs/reload             ← reiniciar scheduler sin reiniciar servidor
GET  /api/admin/snapshots               ← snapshots en caché con TTL restante
DEL  /api/admin/snapshots/:workspaceId  ← invalidar snapshot de un workspace
POST /api/admin/cache/clear             ← limpiar toda la caché
GET  /api/admin/snapshot/:workspaceId   ← snapshot completo de un workspace (debug)
```

**Características UI:**
- Auto-refresh cada 30 segundos con contador visible en el header
- Botón de refresh manual disponible en cualquier momento
- Componentes reutilizables internos: `StatusBadge`, `MetricCard`, `SectionTitle`
- `Promise.allSettled` para carga paralela sin bloqueo por error parcial

---

### 6. Stripe Billing
**Tiempo:** ~5 días  
**Lo que incluye:**
- Stripe Checkout para nuevos suscriptores
- Trial de 14 días automático para nuevos usuarios
- Webhook de Stripe → activar/suspender plan automáticamente
- Portal de cliente (cambiar plan, cancelar)
- Emails automáticos (confirmación de pago, factura, vencimiento)

### 7. WhatsApp Business API
**Tiempo:** ~5 días (vía Twilio o Meta directa)  
**Lo que habilita:**
- Bot responde mensajes de WhatsApp igual que el chat web
- Flujos se disparan desde mensajes de WhatsApp
- Recordatorios y notificaciones van a WhatsApp del cliente
- **Este es el diferencial principal en LATAM**

### 8. Roles por usuario dentro del workspace
**Tiempo:** ~3 días  
**Lo que incluye:**
- Roles: `owner`, `admin`, `editor`, `viewer`
- Permisos por tabla: puede/no puede ver, crear, editar, eliminar
- UI de gestión de miembros mejorada

---

## 🌎 Prioridad 3 — Mercado específico

### 9. Factura Electrónica Colombia (DIAN)
**Tiempo:** ~3 semanas  
**Flujo completo:**
```
Venta registrada (trigger: RECORD_CREATED en tabla Ventas)
  → [Job background] Calcular totales e IVA según tipo de producto
  → Generar XML en formato UBL 2.1 (estándar DIAN)
  → Firmar digitalmente con certificado del emisor
  → Enviar a DIAN via API
  → Recibir CUFE (Código Único de Factura Electrónica)
  → Generar PDF con código QR del CUFE
  → Guardar en tabla "Facturas"
  → Enviar PDF por email al cliente
```

**Equivalentes para expandir:**
| País | Norma | Adaptación |
|------|-------|------------|
| 🇨🇴 Colombia | DIAN UBL 2.1 | Base |
| 🇲🇽 México | SAT CFDI 4.0 | ~1 semana más |
| 🇦🇷 Argentina | AFIP | ~1 semana más |
| 🇨🇱 Chile | SII DTE | ~1 semana más |

---

## 🧠 Contexto del bot — Mejoras futuras

### Perfil cruzado de clientes
Cuando alguien menciona un cliente, el bot cruza TODAS las tablas:
```
"¿Cómo está la cuenta de María García?"
Bot: "María García - Cliente VIP desde enero 2025
  💰 3 ventas: $234.000 total | Última: hace 12 días
  📞 Último seguimiento: 5 días atrás (Sin respuesta)
  📋 2 tareas pendientes
  🧾 1 factura abierta: $45.000 (vence viernes)"
```

### KPIs calculados
```
📈 Resumen semanal automático:
- Ventas: $340.000 (+23% vs semana pasada)
- Conversión leads→clientes: 34%
- Tiempo promedio de respuesta: 4.2 horas
- Productos más vendidos: Laptop Pro x12
```

### Vista cross-workspace (Super Admin)
```
"¿Cómo van mis 3 negocios hoy?"
Bot: "Tienda: $89.000 | Sucursal Norte: $34.000 | E-commerce: $156.000
     Total del día: $279.000 ↑23% vs ayer"
```

---

## 📐 Arquitectura de los nuevos archivos

```
backend/src/
  services/
    ExportService.js          ← ✅ nuevo (usa TableDataRepository existente)
    ImportService.js          ← ✅ corregido — .default XLSX fix, rows como arrays
    BusinessSnapshot.js       ← ✅ nuevo (usa TableDataRepository existente)
  jobs/
    CronScheduler.js          ← ✅ corregido — import paths + getStatus()
    JobQueue.js               ← pendiente (cola en memoria, luego BullMQ)
    processors/
      ReminderProcessor.js    ← pendiente
      ReportProcessor.js      ← pendiente
      StockAlertProcessor.js  ← pendiente
  controllers/
    inboundController.js      ← ✅ nuevo — webhook externo JSON/CSV
    adminController.js        ← ✅ NUEVO — 7 endpoints de observabilidad
    chatController.js         ← ✅ actualizado — previewImportInChat + 404 + snapshot refresh
  index.js                    ← ✅ actualizado — body limit 25mb
  routers/index.js            ← ✅ actualizado — /admin/* + /chat/import-file/preview

frontend/src/
  components/
    ImportModal.jsx           ← ✅ nuevo: mapeo columnas, preview, progreso
    Layout.jsx                ← ✅ actualizado — ícono engranaje + nav "Admin"
  pages/
    Tables.jsx                ← ✅ actualizado — botones Import/Export
    Chat.jsx                  ← ✅ refactorizado — ImportPreviewCard + flujo conversacional
    Admin.jsx                 ← ✅ NUEVO — panel super admin con auto-refresh 30s
  App.jsx                     ← ✅ actualizado — ruta /admin
  api/client.js               ← ✅ actualizado — previewImportViaChat + 7 funciones admin
```

**Principio clave:** todos los archivos nuevos son **consumidores** de la infraestructura existente — no la modifican. El dinamismo del sistema (EntityRepository, headers, validaciones) se mantiene intacto.

---

## 📅 Timeline estimado

| Semana | Qué | Resultado |
|--------|-----|-----------|
| 1 | Export CSV + Import CSV + BusinessSnapshot | Demo impresionante, clientes pueden traer sus datos |
| 2 | Alertas proactivas + CronScheduler básico | Bot proactivo, flujos con triggers de tiempo |
| 3-4 | Stripe Billing + Trial 14 días | Producto vendible, cobro real |
| 5-6 | WhatsApp Business API | Diferencial LATAM |
| 7-9 | Factura electrónica Colombia | Mercado empresarial colombiano |

---

## 💡 Pitch de venta actualizado

> **"Armá tu propio CRM con tablas a medida. Un asistente de IA que conoce tu negocio en tiempo real — te avisa de los problemas antes de que te preguntes, recuerda cada cliente, ejecuta tareas automáticamente y genera tu factura electrónica con un solo registro. Todo sin código."**

Posicionamiento: entre Excel (demasiado manual) y Salesforce (demasiado caro y complejo).
Precio objetivo: $29-$99/mes según plan.
Mercado primario: empresas medianas LATAM (10-100 empleados).
