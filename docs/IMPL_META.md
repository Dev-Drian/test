# Meta Integration (WhatsApp + Instagram + Messenger) — Checklist de Implementación

> Documento técnico con cada tarea de código para completar la integración con Meta.
> El backend del webhook YA FUNCIONA (~90%). El foco es: config por workspace, UI, y testing.

---

## Estado actual

- ✅ `metaWebhookController.js` — 320 líneas, recibe WhatsApp/Instagram/Messenger, procesa con IA, responde
- ✅ Rutas `GET/POST /api/webhooks/meta` montadas en `routers/index.js`
- ✅ Validación de firma `X-Hub-Signature-256`
- ✅ `dispatchToAgent()` → busca agente activo → llama `ChatService.processMessage()`
- ✅ `replyWhatsApp()`, `replyInstagram()`, `replyMessenger()` funcionan
- ✅ `WorkspaceConfigRepository` tiene schema: `integrations.meta` con whatsapp/instagram/messenger
- ✅ Tokens per-workspace con fallback a `.env`
- ✅ UI en Integrations.jsx con MetaIntegrationCard funcional
- ✅ 4 endpoints dashboard para guardar/leer/test/disconnect config Meta
- ✅ Soporte para imágenes/docs/audio/ubicación (convierte a texto descriptivo)
- ✅ Webhook usa config per-workspace + appSecret per-workspace
- ❌ No hay WhatsApp Templates (mensajes proactivos) — Fase D
- ❌ Webhook requiere `?workspaceId=xxx` manual en la URL — Fase D

---

## FASE A — Backend: Config por workspace

### A1. Ampliar schema en WorkspaceConfigRepository

**Archivo:** `backend/src/config/WorkspaceConfigRepository.js`

- [x] Reemplazar schema actual de whatsapp por estructura `meta` con whatsapp/instagram/messenger
  ```js
  integrations: {
    meta: {
      enabled: false,
      whatsapp: {
        enabled: false,
        token: null,            // Permanent token de Cloud API
        phoneNumberId: null,    // Phone Number ID del negocio
        businessId: null,       // WhatsApp Business Account ID
        verifyToken: null,      // Token de verificación del webhook
      },
      instagram: {
        enabled: false,
        token: null,
      },
      messenger: {
        enabled: false,
        pageToken: null,
        pageId: null,
      },
      appSecret: null,          // App Secret para validar firmas
      webhookUrl: null,         // URL auto-generada con workspaceId
    },
    // ... email, webhook existentes
  }
  ```

### A2. Crear metaIntegrationController.js

**Archivo:** `backend/src/controllers/metaIntegrationController.js` ✅ CREADO

Endpoints protegidos (requieren JWT + workspace member):

- [x] `getMetaConfig(req, res)` — `GET /api/integrations/meta/config`
- [x] `updateMetaConfig(req, res)` — `PUT /api/integrations/meta/config`
- [x] `testConnection(req, res)` — `POST /api/integrations/meta/test`
- [x] `disconnectMeta(req, res)` — `POST /api/integrations/meta/disconnect`

### A3. Agregar rutas

**Archivo:** `backend/src/routers/index.js` ✅ HECHO

- [x] Importar `metaIntegrationController`
- [x] Agregar 4 rutas (GET config, PUT config, POST test, POST disconnect)

### A4. Modificar metaWebhookController.js para leer tokens per-workspace

**Archivo:** `backend/src/controllers/metaWebhookController.js` ✅ HECHO

- [x] En `receiveEvent()`, lee config per-workspace con fallback a .env
- [x] `replyWhatsApp()` recibe `creds = {}` con `{ token, phoneNumberId }`
- [x] `replyInstagram()` recibe `creds = {}` con `{ token }`
- [x] `replyMessenger()` recibe `creds = {}` con `{ pageToken }`
- [x] `validateSignature()` recibe `appSecret` como param con fallback a .env

### A5. Soporte para mensajes no-texto (imágenes, audio, documentos)

**Archivo:** `backend/src/controllers/metaWebhookController.js` ✅ HECHO

- [x] Soporte para: text, image, document, audio, location, y fallback genérico
  > Nota: por ahora convierte a texto descriptivo. Descarga real de media es una mejora futura.

---

## FASE B — Frontend: UI de configuración Meta

### B1. Crear MetaIntegrationCard

**Archivo:** `frontend/src/components/integrations/MetaIntegrationCard.jsx` ✅ CREADO

- [x] Estados: desconectado → configurando → conectado
- [x] Formulario: Token, Phone Number ID, App Secret
- [x] Botón "Probar conexión" + "Guardar y activar"
- [x] Vista conectado: info, webhook URL con copiar, canales (WA activo, IG/Messenger próximamente)
- [x] Botón desconectar
- [x] Instrucciones paso a paso

### B2. Hook useMetaIntegration

**Archivo:** `frontend/src/hooks/useMetaIntegration.js` ✅ CREADO

- [x] `fetchConfig()` → GET /api/integrations/meta/config
- [x] `saveConfig(data)` → PUT /api/integrations/meta/config
- [x] `testConnection(channel)` → POST /api/integrations/meta/test
- [x] `disconnect(channel)` → POST /api/integrations/meta/disconnect
- [x] Estado: `{ config, error, clearError }`

### B3. API helper

**Archivo:** `frontend/src/api/metaIntegration.js` ✅ CREADO

- [x] 4 funciones axios para los endpoints de metaIntegrationController
- [x] Usa el interceptor de JWT existente

### B4. Integrar en Integrations.jsx

**Archivo:** `frontend/src/pages/Integrations.jsx` ✅ HECHO

- [x] Importar `MetaIntegrationCard`
- [x] Reemplazar card placeholder de WhatsApp por el card funcional

---

## FASE C — Testing del webhook existente

### C1. Testing local con ngrok

- [ ] Instalar ngrok: `npm install -g ngrok` o descargar binario
- [ ] Levantar backend: `npm run dev`
- [ ] Exponer: `ngrok http 3001`
- [ ] Copiar URL pública (ej: `https://abc123.ngrok-free.app`)

### C2. Configurar Meta Dashboard

- [ ] Ir a https://developers.facebook.com/apps/
- [ ] Crear App o usar existente (tipo "Business")
- [ ] Agregar producto "WhatsApp" (en modo test)
- [ ] En Webhooks → Subscription URL: `https://abc123.ngrok-free.app/api/webhooks/meta?workspaceId=TU_WORKSPACE_ID`
- [ ] Verify Token: poner el mismo que `META_VERIFY_TOKEN` en `.env`
- [ ] Hacer click "Verify and Save" → debe responder 200

### C3. Variables de entorno necesarias

**Archivo:** `backend/.env` (agregar si no existen)

```env
# Meta / WhatsApp Cloud API
META_VERIFY_TOKEN=tu-token-de-verificacion-aqui
META_APP_SECRET=tu-app-secret-del-dashboard
META_WHATSAPP_TOKEN=tu-token-permanente
META_WHATSAPP_PHONE_NUMBER_ID=123456789
META_DEFAULT_WORKSPACE_ID=tu-workspace-id

# Opcionales (Instagram/Messenger)
META_PAGE_TOKEN=
META_INSTAGRAM_TOKEN=
```

### C4. Test de verificación del webhook

- [ ] **GET manual**: `curl "https://abc123.ngrok-free.app/api/webhooks/meta?hub.mode=subscribe&hub.verify_token=TU_TOKEN&hub.challenge=test123"`
  - Debe responder: `test123` con status 200
- [ ] **Token incorrecto**: misma URL pero con token malo → 403

### C5. Test de recepción de mensajes WhatsApp

- [ ] En Meta Dashboard → WhatsApp → Test → Enviar mensaje desde número de test
- [ ] Verificar en logs del backend: `[WhatsApp] Mensaje recibido`
- [ ] Verificar que el bot responde (log: respuesta enviada por `replyWhatsApp`)
- [ ] Verificar que se creó un chat en CouchDB con `externalRef: "whatsapp:NUMERO"`

### C6. Test de firma

- [ ] **Con APP_SECRET configurado**: enviar payload con firma válida → se procesa
- [ ] **Sin APP_SECRET**: debe logear warning pero procesar (para desarrollo)
- [ ] **Firma inválida**: enviar con header `X-Hub-Signature-256: sha256=basura` → debe rechazar

### C7. Test de Instagram y Messenger

- [ ] **Instagram**: Necesita Business Account vinculada → en modo test, enviar DM → verificar log `[Instagram] Mensaje recibido`
- [ ] **Messenger**: Necesita Facebook Page vinculada → enviar mensaje a la página → verificar log `[Messenger] Mensaje recibido`

> Nota: Instagram y Messenger requieren configuración adicional en Meta Dashboard. WhatsApp es prioridad.

---

## FASE D — Mejoras (post-MVP)

### D1. Mapeo phoneNumberId → workspaceId

**Archivo:** `backend/src/controllers/metaWebhookController.js`

- [ ] En `receiveEvent()`, si no hay `?workspaceId` en query, intentar resolver:
  ```js
  // El phoneNumberId del webhook lo da Meta en: entry[0].changes[0].value.metadata.phone_number_id
  const phoneNumberId = entry.changes?.[0]?.value?.metadata?.phone_number_id;
  const workspaceId = req.query.workspaceId 
    || await resolveWorkspaceByPhoneId(phoneNumberId)
    || process.env.META_DEFAULT_WORKSPACE_ID;
  ```

- [ ] Crear función `resolveWorkspaceByPhoneId(phoneId)` que busca en configs de todos los workspaces

### D2. WhatsApp Templates (mensajes proactivos)

**Archivo nuevo:** `backend/src/integrations/notifications/WhatsAppProvider.js`

- [ ] `sendTemplate(to, templateName, components, { token, phoneNumberId })` 
  - POST a `graph.facebook.com/v19.0/{phoneNumberId}/messages` con `type: 'template'`
  - Usado para: recordatorios de citas, confirmación de pedidos, notificaciones

- [ ] Registrar como nodo de flujo para que se pueda usar en el visual flow builder

### D3. Flow action node para WhatsApp

**Archivos:**
- `backend/src/domain/actions/` — agregar handler para acción "send_whatsapp"
- `frontend/src/components/flows/` — agregar nodo visual "Enviar WhatsApp"

- [ ] El nodo acepta: número destino, template o texto libre
- [ ] Se conecta con `WhatsAppProvider.sendTemplate()` o `replyWhatsApp()`

---

## Resumen de archivos

| Acción | Archivo |
|--------|---------|
| CREAR  | `backend/src/controllers/metaIntegrationController.js` |
| CREAR  | `frontend/src/components/integrations/MetaIntegrationCard.jsx` |
| CREAR  | `frontend/src/hooks/useMetaIntegration.js` |
| CREAR  | `frontend/src/api/metaIntegration.js` |
| CREAR  | `backend/src/integrations/notifications/WhatsAppProvider.js` (post-MVP) |
| EDITAR | `backend/src/routers/index.js` — agregar 4 rutas |
| EDITAR | `backend/src/config/WorkspaceConfigRepository.js` — ampliar schema meta |
| EDITAR | `backend/src/controllers/metaWebhookController.js` — tokens per-workspace + media types |
| EDITAR | `frontend/src/pages/Integrations.jsx` — reemplazar card placeholder |

---

## Orden recomendado de ejecución

1. **C3** → Configurar `.env` con credenciales de Meta
2. **C1-C2** → ngrok + configurar webhook en Meta Dashboard
3. **C4-C5** → Testear que el webhook actual funciona end-to-end
4. **A1-A4** → Implementar config per-workspace
5. **B1-B4** → UI de configuración en el dashboard
6. **A5** → Soporte para imágenes/documentos
7. **D1-D3** → Mejoras post-MVP
