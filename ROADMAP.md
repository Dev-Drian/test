# ROADMAP — FlowAI

> Plan unificado de desarrollo. Cada item es marcable.
> Actualizado: 24 de Marzo 2026

---

## Estado actual del sistema

| Módulo | Estado |
|--------|--------|
| Auth + JWT + Registro | ✅ Completo |
| Multi-workspace aislado | ✅ Completo |
| Tablas dinámicas (7 tipos de campo) | ✅ Completo |
| Chat IA V3 (LLM-First + Function Calling) | ✅ Completo |
| Editor de Flujos (9 nodos, 28 templates) | ✅ Completo |
| Sistema de Planes (4 tiers + middleware limits) | ✅ Completo |
| Onboarding Wizard (4 pasos) | ✅ Completo |
| Agentes configurables (personalidad, modelo, tablas) | ✅ Completo |
| Import/Export CSV + XLSX | ✅ Completo |
| BusinessSnapshot IA (cache 5 min) | ✅ Completo |
| Cron Jobs / CronScheduler | ✅ Completo |
| Webhook Inbound (JSON/CSV) | ✅ Completo |
| Import conversacional (preview en chat) | ✅ Completo |
| Super Admin Panel (/admin) | ✅ Completo |
| WebSockets (Socket.io) | ✅ Completo |
| Landing Page + SEO | ✅ Completo |
| Email transaccional (Resend) | ✅ Backend listo |
| 7 tipos de vista (Calendar, Kanban, Timeline, POS...) | ✅ Completo |
| Google OAuth integration | ✅ Completo |

---

## FASE 1 — Producción Mínima Viable

> Sin esto no se puede cobrar ni usar en producción.

### 1.1 Seguridad y Deploy

- [ ] **JWT_SECRET seguro** — Generar con `node -e "require('crypto').randomBytes(48).toString('hex')"` y poner en `.env`
- [ ] **NODE_ENV=production** en `.env` de producción
- [ ] **CouchDB password fuerte** — Cambiar `admin:password` por credenciales reales
- [ ] **CORS_ORIGINS** — Limitar solo al dominio real + localhost en dev
- [ ] **SSL/HTTPS** — Configurar nginx + certbot (o Railway/Vercel auto)
- [ ] **OPENAI_API_KEY con límite de gasto** — Configurar en platform.openai.com/usage
- [ ] **Backup CouchDB** — Configurar backup automático diario mínimo
- [ ] **Error monitoring** — Integrar Sentry free tier (5000 errores/mes)

### 1.2 Pagos Wompi (Monetización)

- [ ] **Cuenta Wompi** — Crear cuenta en comercios.wompi.co
- [ ] **WOMPI_PUBLIC_KEY** — Obtener key sandbox (`pub_test_xxx`) → luego producción (`pub_prod_xxx`)
- [ ] **WOMPI_PRIVATE_KEY** — Obtener key sandbox (`prv_test_xxx`) → luego producción (`prv_prod_xxx`)
- [ ] **WOMPI_EVENTS_SECRET** — Generar en Dashboard > Configuración > Webhooks
- [ ] **APP_PUBLIC_URL** — Configurar dominio real (o ngrok para dev)
- [ ] **Registrar webhook URL en Wompi** — `https://tu-dominio.com/api/payments/webhook/:workspaceId`
- [ ] **Probar ciclo completo** — Crear pago → usuario paga con tarjeta de prueba → webhook confirma → plan se activa
- [ ] **Migrar a llaves de producción** — Cambiar `pub_test` → `pub_prod` tras verificación Wompi

### 1.3 Email Real

- [ ] **RESEND_API_KEY** — Crear cuenta en resend.com (free: 3000 emails/mes), obtener key
- [ ] **Verificar dominio en Resend** — Agregar DNS records para enviar desde tu dominio
- [ ] **EMAIL_FROM** — Configurar `noreply@tu-dominio.com`
- [ ] **Probar envío real** — Registro → recibe welcome email, forgot-password → recibe código

### 1.4 Frontend de Seguridad

- [ ] **Error Boundary global** — Componente React que atrapa errores sin crashear toda la app
- [ ] **Forgot Password UI** — Página `/forgot-password` (backend ya listo, falta form)
- [ ] **Validación admin en frontend** — Panel `/admin` solo visible si `user.role === 'superAdmin'`
- [ ] **Proteger rutas admin en backend** — Middleware que verifique `role: superAdmin` en endpoints `/api/admin/*`

---

## FASE 2 — Go-to-Market LATAM

> Lo que se necesita para captar los primeros clientes reales.

### 2.1 Meta Business Platform (WhatsApp + Instagram + Messenger)

> **Proveedor elegido: Meta Cloud API directo** (gratis, 3 canales con 1 app). Backend 90% listo en `metaWebhookController.js`.
> Plan detallado: [docs/PLAN_META_INTEGRATION.md](docs/PLAN_META_INTEGRATION.md)

- [ ] **Crear Meta App** — developers.facebook.com → tipo "Business" → activar WhatsApp + Messenger + Instagram
- [ ] **Configurar número de WhatsApp Business** — Número dedicado + verificación de empresa
- [ ] **Generar tokens permanentes** — `META_WHATSAPP_TOKEN`, `META_PAGE_TOKEN`, `META_INSTAGRAM_TOKEN`
- [ ] **Registrar webhook URL en Meta** — `https://tu-dominio.com/api/webhooks/meta?workspaceId=xxx`
- [ ] **Configurar .env con todas las variables META_*** — Ver plan detallado
- [ ] **Probar ciclo completo** — Enviar WhatsApp → bot responde → crear registro → flujo se ejecuta
- [ ] **Config por workspace** — Guardar credenciales Meta por workspace en BD (no solo .env global)
- [ ] **MetaIntegrationCard.jsx** — UI con 3 tabs (WhatsApp, Instagram, Messenger) + estado + configuración
- [ ] **Soporte de imágenes/documentos/ubicación** — WhatsApp envía más que texto
- [ ] **Templates de WhatsApp** — Crear templates aprobados por Meta para mensajes salientes (recordatorios, etc.)
- [ ] **Nodos de flujo** — Acciones "Enviar WhatsApp", "Enviar Instagram DM" en el editor de flujos

### 2.2 Widget Embebible

> Script que empresas pegan en su web para tener el chatbot. Multiplica adopción x10.
> Plan detallado: [docs/PLAN_WIDGET.md](docs/PLAN_WIDGET.md)

- [ ] **Backend: endpoints /api/widget/*** — Config, sesión, mensaje, historial (sin auth JWT, con widget token)
- [ ] **Widget token por workspace** — Token público revocable para identificar workspace
- [ ] **Socket.io namespace /widget** — Canal separado para comunicación en tiempo real
- [ ] **widget.js loader** — Script ligero (~3KB) que crea iframe aislado
- [ ] **Embed page** — Página React mínima: burbuja + panel de chat + mensajes
- [ ] **Persistencia de visitante** — localStorage con `visitorId` para retomar conversaciones
- [ ] **UI de configuración** — Card en Integrations con color, posición, welcome message, snippet copiable
- [ ] **Dashboard de conversaciones** — Filtro Widget/Web en Chat.jsx + datos del visitante
- [ ] **Rate limiting + CORS dinámico** — Protección contra spam
- [ ] **Branding controlado por plan** — "Powered by FlowAI" removible solo en Premium+

### 2.3 Roles y Permisos

- [ ] **Modelo de roles** — `owner`, `admin`, `editor`, `viewer` por workspace
- [ ] **Backend: Middleware de permisos** — Verificar rol antes de cada operación CRUD
- [ ] **Permisos por tabla** — Quién puede ver/crear/editar/eliminar en cada tabla
- [ ] **UI: Gestión de miembros** — Asignar roles al invitar/editar miembros de workspace
- [ ] **UI: Ocultar acciones según rol** — Viewer no ve botones de editar/eliminar

---

## FASE 3 — Producto Completo

> Funcionalidades que hacen el producto competitivo a largo plazo.

### 3.1 Analytics Dashboard

- [ ] **Métricas de chat** — Mensajes enviados, tiempo de respuesta promedio, conversaciones activas
- [ ] **Métricas de tablas** — Registros creados por semana, growth chart por tabla
- [ ] **Métricas de flujos** — Ejecuciones, tasa de éxito/error, flujos más activos
- [ ] **Métricas de negocio** — Ventas totales, conversión leads→clientes, top productos
- [ ] **Comparación temporal** — Esta semana vs anterior, este mes vs anterior
- [ ] **UI: Página Dashboard mejorada** — Gráficas con Chart.js o Recharts

### 3.2 Tests Automatizados

- [ ] **Setup testing** — Vitest (backend) + React Testing Library (frontend)
- [ ] **Tests de Engine.js** — Clasificación de mensajes, selección de herramientas, ejecución de handlers
- [ ] **Tests de ChatService** — Pipeline completo de procesamiento de mensajes
- [ ] **Tests de EntityRepository** — CRUD, validación, normalización, búsqueda fuzzy
- [ ] **Tests de FlowExecutor** — Trigger → condiciones → acciones → template processing
- [ ] **Tests de PaymentService** — Webhook validation, status updates, plan activation
- [ ] **Tests de middleware (limits.js)** — Verificar que plan limits se aplican correctamente
- [ ] **Tests de API (integration)** — Endpoints principales con supertest
- [ ] **Tests frontend (componentes clave)** — Chat, Tables, FlowEditor
- [ ] **CI pipeline** — GitHub Actions que corre tests en cada push

### 3.3 Multi-idioma

- [ ] **i18n framework** — react-i18next en frontend
- [ ] **Extraer strings** — Todas las cadenas de UI a archivos de traducción
- [ ] **Español (base)** — `es.json` completo
- [ ] **Inglés** — `en.json` completo
- [ ] **Selector de idioma** — En settings o navbar
- [ ] **Backend: Mensajes de error localizados** — Respuestas de API en el idioma del usuario

### 3.4 PWA + Mobile

- [ ] **Service Worker** — Caché de assets, funcionalidad offline básica
- [ ] **manifest.json** — Para instalar como app en móvil
- [ ] **Push notifications** — Web Push API para notificaciones nativas
- [ ] **UI responsive** — Verificar y ajustar todas las páginas para mobile
- [ ] **Splash screen** — Pantalla de carga branded

### 3.5 API Pública Documentada

- [ ] **API Keys por workspace** — Generar keys sin expiración, revocables
- [ ] **Rate limiting** — Limitar llamadas según plan (1000/10000/ilimitado)
- [ ] **Documentación Swagger/OpenAPI** — Auto-generada desde rutas
- [ ] **Página de docs** — `/api-docs` con ejemplos interactivos
- [ ] **Webhooks salientes** — Notificar a URLs externas cuando ocurren eventos

### 3.6 Marketplace de Plantillas

- [ ] **Galería de templates** — Plantillas de flujos por vertical (clínica, restaurante, tienda, etc.)
- [ ] **Template de tablas** — Estructuras predefinidas con campos y validaciones
- [ ] **One-click setup** — Instalar template completo (tablas + flujos + agente) en un workspace
- [ ] **Contribución de usuarios** — Permitir que usuarios compartan sus templates

---

## FASE 4 — Expansión (Post-Lanzamiento)

### 4.1 Factura Electrónica Colombia (DIAN)

- [ ] **Investigar proveedor de facturación** — Siigo, Alegra, o API DIAN directa
- [ ] **Generar XML UBL 2.1** — Estándar DIAN para Colombia
- [ ] **Firma digital** — Certificado del emisor
- [ ] **Envío a DIAN** — Via API, recibir CUFE
- [ ] **PDF con QR** — Factura en formato visual con código QR del CUFE
- [ ] **Flow action: generar factura** — Nodo en el editor de flujos que genera factura automáticamente
- [ ] **Expansión LATAM** — México (SAT CFDI 4.0), Argentina (AFIP), Chile (SII DTE)

### 4.2 Integraciones Adicionales

- [ ] **Slack** — Notificaciones y comandos desde Slack
- [ ] **Google Sheets sync** — Bidireccional, lectura y escritura
- [ ] **Zapier/Make** — App oficial de FlowAI en marketplace de Zapier
- [ ] **Calendly/Google Calendar** — Sincronización de citas
- [ ] **Stripe** — Alternativa a Wompi para mercado internacional

### 4.3 IA Avanzada

- [ ] **Perfil cruzado de clientes** — Bot cruza TODAS las tablas al mencionar un cliente
- [ ] **KPIs calculados** — Resumen semanal automático con comparación temporal
- [ ] **Vista cross-workspace** — Super Admin ve resumen de todos sus negocios
- [ ] **Modelos Claude** — Integrar Anthropic Claude como alternativa a GPT
- [ ] **Fine-tuning por vertical** — Modelos especializados para Healthcare, Retail, etc.

---

## Checklist Pre-Producción

> Verificar TODO esto antes de lanzar con usuarios reales.

- [ ] JWT_SECRET cambiado a valor aleatorio fuerte (mínimo 48 bytes)
- [ ] NODE_ENV=production
- [ ] CouchDB con password fuerte (no `password`)
- [ ] CORS_ORIGINS limitado solo al dominio real
- [ ] WOMPI keys de producción configuradas
- [ ] WOMPI webhook registrado en dashboard
- [ ] APP_PUBLIC_URL apuntando al dominio real
- [ ] SSL/HTTPS activado
- [ ] Backup de CouchDB configurado (mínimo diario)
- [ ] OPENAI_API_KEY con límite de gasto
- [ ] RESEND_API_KEY configurada y dominio verificado
- [ ] Landing page visible y funcional
- [ ] Sentry u otro error monitoring
- [ ] Términos de servicio y Política de privacidad publicados
- [ ] og-image.png (1200x630px) para preview en redes sociales
- [ ] Probar ciclo completo: registro → onboarding → tablas → chat → pago → upgrade

---

## Credenciales de Prueba (Seeds)

```bash
cd backend && node src/seeds/all.js --clean
```

| Usuario | Password | Plan | Uso |
|---------|----------|------|-----|
| `nuevo@migracion.ai` | `nuevo123` | FREE | Probar onboarding |
| `starter@migracion.ai` | `starter123` | STARTER | Probar límites |
| `demo@migracion.ai` | `demo123` | PREMIUM | Probar features |
| `admin@migracion.ai` | `admin123` | ENTERPRISE | Super Admin |

---

## Orden de Prioridad (Resumen)

```
AHORA (Fase 1):
  → Seguridad + Wompi keys + Resend key + Error Boundary + Forgot Password UI

SIGUIENTE (Fase 2):
  → WhatsApp Business + Widget embebible + Roles/Permisos

DESPUÉS (Fase 3):
  → Analytics + Tests + Multi-idioma + PWA + API pública

FUTURO (Fase 4):
  → Factura electrónica + Integraciones + IA avanzada + Marketplace
```
