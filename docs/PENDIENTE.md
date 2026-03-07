# 🔐 PENDIENTE — Credenciales, Config y Funcionalidades

> Documento de referencia para llevar el sistema a producción real.  
> Actualizado: 5 de Marzo 2026 — Sprint Landing + Onboarding + Email completado

---

## 1. CREDENCIALES Y VARIABLES DE ENTORNO

### Estado actual del `.env` del backend

Crea el archivo `backend/.env` copiando `.env.example` y completando:

```env
# ── SERVIDOR ────────────────────────────────────────────────────────────────
PORT=3010
NODE_ENV=production           # cambiar a producción al desplegar
HOST=0.0.0.0

# ── CORS ────────────────────────────────────────────────────────────────────
CORS_ORIGINS=https://tu-dominio.com,http://localhost:5173

# ── BASE DE DATOS ────────────────────────────────────────────────────────────
# En desarrollo ya funciona con el valor por defecto
COUCHDB_URL=http://admin:password@127.0.0.1:5984
DB_PREFIX=chatbot_

# ── AUTH ─────────────────────────────────────────────────────────────────────
# CRÍTICO: cambiar en producción. Mínimo 32 caracteres aleatorios.
# Generar con: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
JWT_SECRET=CAMBIAR_ESTO_EN_PRODUCCION_MINIMO_32_CHARS

# ── OPENAI ───────────────────────────────────────────────────────────────────
# ✅ Tienes una key — verificar que tenga créditos suficientes
# https://platform.openai.com/usage
OPENAI_API_KEY=sk-proj-...
DEFAULT_AI_MODEL=gpt-4o-mini

# ── WOMPI (pagos Colombia — Bancolombia) ──────────────────────────────────
# Dashboard: https://comercios.wompi.co
# Tarjetas de prueba: https://docs.wompi.co/docs/colombia/tarjetas-de-prueba
PAYMENT_PROVIDER=wompi
# Sandbox: llaves pub_test_xxx / prv_test_xxx (obtener en comercios.wompi.co)
# Producción: llaves pub_prod_xxx / prv_prod_xxx (apóstamos tras verificación)
WOMPI_PUBLIC_KEY=pub_test_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
WOMPI_PRIVATE_KEY=prv_test_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
# Secret de eventos — generarlo en: Dashboard > Configuración > Webhooks
WOMPI_EVENTS_SECRET=test_events_XXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# URL pública del servidor (requerida para el redirect-url tras el pago)
# En desarrollo: usar ngrok → https://xxxx.ngrok.io
# En producción: tu dominio real
APP_PUBLIC_URL=https://tu-dominio.com

# ── EMAIL (para futuras notificaciones) ─────────────────────────────────────
# ⬜ PENDIENTE — Opciones: Resend (más fácil), SendGrid, SMTP propio
# Resend: https://resend.com — free tier: 3000 emails/mes
EMAIL_PROVIDER=resend           # o 'smtp'
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=noreply@tu-dominio.com
EMAIL_FROM_NAME=FlowAI

# ── WHATSAPP (futuro diferencial LATAM) ──────────────────────────────────────
# ⬜ PENDIENTE — Opciones: Twilio, Meta directa, UltraMsg (más barato)
# TWILIO_ACCOUNT_SID=ACxxxxxxx
# TWILIO_AUTH_TOKEN=xxxxxxx
# TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

### Estado actual de cada credencial

| Credencial | Estado | Urgencia | Dónde obtener |
|-----------|--------|----------|---------------|
| `OPENAI_API_KEY` | ✅ Configurada | — | platform.openai.com |
| `COUCHDB_URL` | ✅ Local funciona | — | Local ya ok |
| `JWT_SECRET` | ⚠️ Default inseguro | **Alta en prod** | `node -e "require('crypto').randomBytes(48).toString('hex')"` |
| `WOMPI_PUBLIC_KEY`    | ⬜ Pendiente | Alta (para cobros) | comercios.wompi.co |
| `WOMPI_PRIVATE_KEY`   | ⬜ Pendiente | Alta (para cobros) | comercios.wompi.co |
| `WOMPI_EVENTS_SECRET` | ⬜ Pendiente | Alta (webhooks)    | Dashboard > Webhooks |
| `APP_PUBLIC_URL`      | ⬜ Pendiente | Para webhooks Wompi | ngrok en dev, dominio en prod |
| `RESEND_API_KEY` | ✅ Integrado en código | Media — configurar key | resend.com (free tier) |
| WhatsApp | ⬜ Pendiente | Baja por ahora | twilio.com o meta dev |

---

## 2. FUNCIONALIDADES PENDIENTES (priorizadas)

### 🔴 CRÍTICO — Sin esto no podemos captar clientes

#### A. Landing Page ✅ COMPLETADO
**Implementado:** `frontend/src/pages/Landing.jsx`  
**Incluye:**
- Navbar sticky con logo + CTAs
- Hero con demo de chat animado (`DemoChat` component, mensajes que aparecen solos)
- Sección Features (6 tarjetas con íconos)
- HowItWorks (3 pasos)
- Testimonios (3 ficticios)
- Pricing (4 planes, datos de `plans.js`)
- CTA + Footer
- Ruta: `/` muestra Landing cuando el usuario NO está autenticado

**Pendiente refinamiento:**
- ⬜ FAQ section (¿Se conecta con WhatsApp? ¿Hay soporte? etc.)
- ⬜ Toggle mensual/anual en pricing
- ⬜ Video demo real (actualmente es chat animado)
- ⬜ Links a Términos y Política de Privacidad (páginas a crear)

---

#### B. WebSockets (Socket.io)
**Estimado:** 2 días backend + 1 día frontend  
**Por qué es crítico:** El chat actualmente probablemente hace polling (refresca cada N segundos). Con WS el chat se siente **instantáneo** — diferencia enorme en percepción del producto.

**Qué cambia cuando se implemente:**

| Ahora (sin WS) | Con WebSockets |
|---------------|---------------|
| Chat refresca con polling | Mensajes llegan en tiempo real, sin lag |
| Notificaciones se ven al refrescar | Badge se actualiza al instante |
| Estado de jobs: manual | "Flujo ejecutado ✅" aparece inmediatamente |
| Import resultado: polling | Barra de progreso en tiempo real |
| Pago confirmado: próximo refresh | Notificación push instantánea en UI |
| Múltiples usuarios: no se ven los cambios | Colaboración en tiempo real |

**Eventos que emitirá el servidor:**
```
socket.to(workspaceId).emit('chat:message', { chatId, message })
socket.to(workspaceId).emit('flow:executed', { flowId, status, log })
socket.to(workspaceId).emit('payment:confirmed', { recordId, amount })
socket.to(workspaceId).emit('import:progress', { imported, total })
socket.to(workspaceId).emit('notification:new', { notification })
socket.to(workspaceId).emit('record:created', { tableId, record })
socket.to(workspaceId).emit('record:updated', { tableId, record })
```

**Cambios en el backend:**
- Agregar `socket.io` a `index.js` (compartir el `httpServer`)
- Crear `src/realtime/SocketService.js` — singleton para emitir desde cualquier parte
- Emitir desde `FlowExecutor`, `paymentController.webhook`, `chatController`, etc.

**Cambios en el frontend:**
- `src/hooks/useSocket.js` — hook con auto-reconexión
- `Chat.jsx`: escucha `chat:message` → agrega al array sin re-render total
- `Layout.jsx`: escucha `notification:new` → incrementa badge
- `Flows.jsx`: escucha `flow:executed` → actualiza último log
- `Admin.jsx`: escucha todos los eventos → "live feed"

**Dependencias:** `socket.io` en backend, `socket.io-client` en frontend

---

### 🟡 IMPORTANTE — Para experiencia completa del cliente

#### C. Onboarding Wizard ✅ COMPLETADO (reescrito)
**Implementado:** `frontend/src/components/OnboardingWizard.jsx` (reescrito desde cero)

**Flujo de 4 pasos implementado:**
1. **Tipo de negocio** — 8 cards (salón, restaurante, clínica, gym, tienda, academia, servicios, otro)
2. **Tablas** — hasta 3 tablas de 7 templates disponibles (con sugerencias por tipo de negocio)
3. **Bot** — nombre + 3 personalidades (amigable/profesional/experto) + preview del saludo
4. **Creando...** — barra de progreso animada + estado final con resumen

**API calls implementadas:**
- `POST /workspace/create` → crea workspace con color del negocio
- `POST /table/create` × N → crea cada tabla seleccionada
- `POST /agent/create` → crea el agente (con `{ workspaceId, agent: {...} }`  ✅ corregido)
- `PATCH /auth/profile` → marca `onboardingCompleted: true` + guarda `businessType`

**Pendiente refinamiento:**
- ⬜ Paso 4 opcional: activar template de flujo según tipo de negocio
- ⬜ Tour guiado post-onboarding (highlight de features del dashboard)

---

#### D. Email Transaccional ✅ COMPLETADO
**Implementado:** `backend/src/services/EmailService.js`

**Templates HTML implementados:**
- ✅ `sendWelcome(email, name)` — se envía automáticamente al registrarse
- ✅ `sendPasswordReset(email, name, code)` — código de 6 dígitos, expira en 30 min
- ✅ `sendPaymentConfirmed(email, name, amount, plan, invoiceId)` — tras pago MP
- ✅ `sendPlanUpgrade(email, name, oldPlan, newPlan)` — tras upgrade de plan

**Endpoints nuevos en authController:**
- ✅ `POST /auth/forgot-password` — genera código, lo guarda en user doc, envía email
- ✅ `POST /auth/reset-password` — valida código + expiración, actualiza password

**Degradación elegante:** si `RESEND_API_KEY` no está configurada, simula el envío y loggea el email en consola (no crashea)

**Pendiente:**
- ⬜ `RESEND_API_KEY` real en `.env` (sin key solo loggea, no envía)
- ⬜ Página frontend `/forgot-password` (backend listo, falta el form en UI)
- ⬜ Alerta de plan al límite (lógica en `limits.js` middleware, falta trigger de email)

---

#### E. Tareas administrativas (nuestro lado como dueños del SaaS)
**Estimado:** 1 día  
**Lo que necesitamos internamente:**
- Ver todos los workspaces registrados (cuántos, cuándo, plan)
- Ver uso real (mensajes enviados, registros creados, flujos ejecutados)
- Cambiar plan de un workspace manualmente (promo, soporte)
- Enviar mensaje broadcast a todos los usuarios
- Ver errores de flujos, pagos fallidos, imports con errores

**Dónde va:** Panel `/admin` ya existe — agregar estas secciones ahí

---

#### F. Dashboard de analítica básica
**Estimado:** 1-2 días  
**Para el cliente, no para nosotros:**
- Mensajes enviados esta semana vs semana pasada
- Records creados por tabla (growth chart)
- Flujos ejecutados y tasa de éxito/error
- Tiempo promedio de respuesta del bot

---

### 🟢 ROADMAP — Después de lanzar

#### G. WhatsApp Business API
**Estimado:** 4-5 días  
**El diferenciador más importante en LATAM.**  
El bot mismo responde en WhatsApp igual que en el chat web.

Opciones de integración (de más simple a más completo):
1. **Twilio (recomendado al inicio):** más caro por mensaje pero abstrae toda la complejidad. API muy bien documentada.
2. **UltraMsg:** más barato, ideal para PYMES. $X/mes flat.
3. **Meta Business API directa:** gratuity pero más complejo. Requiere verificación de empresa.

#### H. Stripe / Factura Electrónica Colombia
Ver `IMPLEMENTACIONES.md` → sección Stripe Billing y DIAN.

---

## 3. ORDEN RECOMENDADO PARA LANZAR

```
✅ Completado:  Landing Page + Onboarding Wizard + Email Transaccional
✅ Completado:  Sistema de pagos (Wompi)
✅ Completado:  WebSockets (Socket.io — backend + contexto frontend)
✅ Completado:  SEO (index.html meta tags + OG + JSON-LD + sitemap.xml + robots.txt)

Ahora mismo:
  [ ] RESEND_API_KEY real (resend.com, 5 min de setup)
  [ ] WOMPI_PUBLIC_KEY + WOMPI_PRIVATE_KEY (sandbox en comercios.wompi.co)
  [ ] WOMPI_EVENTS_SECRET (Dashboard Wompi > Configuración > Webhooks)
  [ ] JWT_SECRET fuerte en .env de producción
  [ ] Conectar useSocketEvent en Chat.jsx, Tables.jsx, Flows.jsx (ver sección B)

Siguiente sprint:
  [ ] ForgotPassword.jsx — página frontend para reset de contraseña
  [ ] WhatsApp Business (Twilio) → DIFERENCIAL LATAM
  [ ] Analytics dashboard básico para el cliente
  [ ] Términos y Política de Privacidad (páginas legales)
  [ ] og-image.png (imagen de preview para compartir en redes) — 1200x630px
```

---

## 4. CHECKLIST ANTES DE PONER EN PRODUCCIÓN

```
□ JWT_SECRET cambiado a valor aleatorio fuerte
□ NODE_ENV=production en .env
□ CouchDB con password fuerte (no 'password')
□ CORS_ORIGINS limitado solo al dominio de la landing + app
□ WOMPI_PUBLIC_KEY y WOMPI_PRIVATE_KEY de producción (pub_prod_xxx / prv_prod_xxx)
□ WOMPI_EVENTS_SECRET configurado y registrado en dashboard Wompi > Webhooks
□ APP_PUBLIC_URL apuntando al dominio real
□ SSL/HTTPS activado (nginx + certbot, o Vercel/Railway auto)
□ Backup de CouchDB configurado (mínimo diario)
□ OPENAI_API_KEY con límite de gasto configurado en platform.openai.com
□ Landing page desplegada y apuntando al sistema
□ Error monitoring (Sentry free tier — 5000 errores/mes gratis)
```

---

## 5. NGROK — Para probar Wompi en desarrollo

Mientras no tenés dominio real, Wompi redirige al usuario a `APP_PUBLIC_URL/payment/success` tras el pago. En desarrollo necesitás una URL pública.

Para los **webhooks de Wompi**, registrar la URL en el dashboard bajo Configuración > Webhooks:
`https://abc123.ngrok.io/api/payments/webhook/:workspaceId`

```bash
# Instalar ngrok (una vez)
npm install -g ngrok  
# O descargar desde: https://ngrok.com/download

# Exponer el backend
ngrok http 3010

# Ngrok te dará algo como:
# https://abc123.ngrok.io → http://localhost:3010

# Entonces en .env:
APP_PUBLIC_URL=https://abc123.ngrok.io
# El webhook de MP será: https://abc123.ngrok.io/api/payments/webhook/:workspaceId
```

**Importante:** la URL de ngrok cambia cada vez que lo reiniciás (plan free). Para desarrollo está bien. Para pruebas continuas comprar ngrok Pro ($8/mes) o usar Railway/Render con dominio fijo.
