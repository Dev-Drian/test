# Widget Embebible — Checklist de Implementación

> Documento técnico con cada tarea de código para el widget embebible.
> Cada item = un archivo a crear/modificar, con la función/endpoint exacto.

---

## Estado actual

- ❌ No existe NINGÚN código de widget en el proyecto
- ✅ `SocketService.js` está listo (agregar namespace `/widget`)
- ✅ `ChatService.processMessage()` acepta `{ workspaceId, chatId, agentId, message }`
- ✅ `WorkspaceConfigRepository` tiene schema de integraciones (agregar sección widget)

---

## FASE A — Backend: API + Token + Socket

### A1. Agregar schema de widget en WorkspaceConfigRepository

**Archivo:** `backend/src/config/WorkspaceConfigRepository.js`

- [ ] Agregar al objeto `integrations` del schema default:
  ```js
  widget: {
    enabled: false,
    token: null,       // UUID público, se genera al activar
    agentId: null,     // Agente asignado al widget
    theme: {
      primaryColor: '#4F46E5',
      position: 'bottom-right',  // bottom-right | bottom-left
      title: 'Chat con nosotros',
      subtitle: '',
      avatarUrl: null,
    },
  }
  ```

### A2. Crear widgetController.js

**Archivo nuevo:** `backend/src/controllers/widgetController.js`

Endpoints públicos (NO requieren JWT, autenticación por widget token):

- [ ] `getConfig(req, res)` — `GET /api/widget/:token/config`
  - Busca workspace por token en CouchDB
  - Retorna: `{ workspaceId, agentName, theme, agentId }`
  - Si token inválido → 404

- [ ] `createSession(req, res)` — `POST /api/widget/:token/session`
  - Body: `{ visitorId }` (UUID generado por el widget en localStorage)
  - Busca/crea chat con `externalRef: "widget:{visitorId}"`
  - Retorna: `{ chatId, visitorId, isNew }`

- [ ] `sendMessage(req, res)` — `POST /api/widget/:token/message`
  - Body: `{ visitorId, chatId, message }`
  - Valida: token existe, message no vacío, rate limit (30/min por visitorId)
  - Llama `ChatService.processMessage({ workspaceId, chatId, agentId, message })`
  - Retorna: `{ response, chatId }`

- [ ] `getHistory(req, res)` — `GET /api/widget/:token/history/:visitorId`
  - Query: `?limit=50`
  - Busca chat por `externalRef: "widget:{visitorId}"` y retorna mensajes
  - Retorna: `{ messages: [{ role, content, timestamp }] }`

Funciones internas:

- [ ] `resolveToken(token)` — Busca en todos los workspace configs el que tenga `integrations.widget.token === token`
  - Cache en Map con TTL de 5 min para evitar queries repetidos
  - Retorna `{ workspaceId, agentId, theme }` o `null`

- [ ] Rate limiter en memoria — Map de `visitorId → { count, resetAt }`
  - 30 mensajes por minuto máximo
  - Si excede → 429

### A3. Crear rutas del widget

**Archivo:** `backend/src/routers/index.js`

- [ ] Importar widgetController:
  ```js
  import * as widget from '../controllers/widgetController.js';
  ```

- [ ] Agregar rutas (SIN `requireAuth`, son públicas):
  ```js
  // ============ WIDGET (público, auth por token) ============
  router.get('/widget/:token/config', widget.getConfig);
  router.post('/widget/:token/session', widget.createSession);
  router.post('/widget/:token/message', widget.sendMessage);
  router.get('/widget/:token/history/:visitorId', widget.getHistory);
  ```

### A4. Agregar namespace /widget en SocketService

**Archivo:** `backend/src/realtime/SocketService.js`

- [ ] En el método `init()`, después de `this.io.on('connection', ...)`, agregar:
  ```js
  // Namespace exclusivo para widget (visitantes anónimos)
  this.widgetNs = this.io.of('/widget');
  this.widgetNs.on('connection', (socket) => {
    socket.on('join:visitor', ({ visitorId, token }) => {
      if (!visitorId || !token) return;
      socket.join(`visitor:${visitorId}`);
    });
    socket.on('disconnect', () => {});
  });
  ```

- [ ] Agregar método `toVisitor(visitorId, event, data)`:
  ```js
  toVisitor(visitorId, event, data = {}) {
    if (!this.widgetNs) return;
    this.widgetNs.to(`visitor:${visitorId}`).emit(event, data);
  }
  ```

- [ ] En `widgetController.sendMessage`, después de procesar respuesta, emitir:
  ```js
  getSocketService().toVisitor(visitorId, 'chat:message', {
    role: 'assistant', content: result.response, timestamp: new Date().toISOString()
  });
  ```

### A5. Endpoints de gestión de widget (requieren auth — para el dashboard)

**Agregar** en `widgetController.js` o en un controlador existente:

- [ ] `enableWidget(req, res)` — `POST /api/integrations/widget/enable`
  - Requiere `requireAuth`
  - Body: `{ workspaceId, agentId }`
  - Genera UUID como token, guarda en workspace config
  - Retorna: `{ token, embedSnippet }`

- [ ] `disableWidget(req, res)` — `POST /api/integrations/widget/disable`
  - Requiere `requireAuth`
  - Body: `{ workspaceId }`
  - Pone `widget.enabled = false`, borra token
  - Retorna: `{ ok: true }`

- [ ] `getWidgetSettings(req, res)` — `GET /api/integrations/widget/settings`
  - Requiere `requireAuth`
  - Query: `?workspaceId=xxx`
  - Retorna la config actual del widget

- [ ] `updateWidgetTheme(req, res)` — `PUT /api/integrations/widget/theme`
  - Requiere `requireAuth`
  - Body: `{ workspaceId, theme: { primaryColor, position, title, subtitle, avatarUrl } }`
  - Actualiza solo el theme del widget

- [ ] Agregar rutas:
  ```js
  router.post('/integrations/widget/enable', requireAuth, widget.enableWidget);
  router.post('/integrations/widget/disable', requireAuth, widget.disableWidget);
  router.get('/integrations/widget/settings', requireAuth, widget.getWidgetSettings);
  router.put('/integrations/widget/theme', requireAuth, widget.updateWidgetTheme);
  ```

---

## FASE B — Frontend: Página embebida del widget

### B1. Crear ruta /widget/embed en el frontend

**Archivo:** `frontend/src/App.jsx`

- [ ] Agregar ruta pública (fuera de AuthProvider):
  ```jsx
  <Route path="/widget/embed" element={<WidgetEmbed />} />
  ```

### B2. Crear componente WidgetEmbed

**Archivo nuevo:** `frontend/src/pages/WidgetEmbed.jsx`

Página standalone que se renderiza dentro del iframe:

- [ ] Leer `token` de `?token=xxx` en la URL
- [ ] Al montar: llamar `GET /api/widget/{token}/config` → obtener theme + agentName
- [ ] Generar/recuperar `visitorId` de `localStorage.getItem('flowai_visitor_id')` o crear UUID
- [ ] Llamar `POST /api/widget/{token}/session` → obtener `chatId`
- [ ] Cargar historial: `GET /api/widget/{token}/history/{visitorId}`
- [ ] Conectar Socket.io al namespace `/widget`, emitir `join:visitor`
- [ ] Renderizar: `<WidgetPanel>` con mensajes y input
- [ ] NO usa AuthProvider, NO usa sidebar, NO usa nada del dashboard

### B3. Componentes del widget

**Archivos nuevos en** `frontend/src/components/widget/`:

- [ ] `WidgetPanel.jsx` — Contenedor principal (chat completo)
  - Header con título + avatar configurable
  - Área de mensajes scrollable
  - Input de texto + botón enviar
  - Estado: `messages[]`, `isTyping`, `inputValue`

- [ ] `WidgetMessage.jsx` — Burbuja individual
  - Props: `{ role, content, timestamp }`
  - Estilo diferente para user vs assistant
  - Soporte para Markdown básico en respuestas

- [ ] `WidgetInput.jsx` — Campo de texto + enviar
  - Enter para enviar, Shift+Enter para nueva línea
  - Deshabilitado mientras `isTyping = true`
  - Placeholder configurable

### B4. API helper del widget

**Archivo nuevo:** `frontend/src/api/widget.js`

- [ ] `getWidgetConfig(token)` — GET /api/widget/{token}/config
- [ ] `createWidgetSession(token, visitorId)` — POST /api/widget/{token}/session
- [ ] `sendWidgetMessage(token, { visitorId, chatId, message })` — POST /api/widget/{token}/message
- [ ] `getWidgetHistory(token, visitorId)` — GET /api/widget/{token}/history/{visitorId}

Usar axios con baseURL pero SIN interceptor de JWT (el widget es público).

---

## FASE C — loader script (widget.js)

### C1. Crear el script embebible

**Archivo nuevo:** `frontend/public/widget.js`

Script auto-ejecutable (~3KB) que el usuario pega en su web:

- [ ] Snippet de embed que genera el dashboard:
  ```html
  <script src="https://tudominio.com/widget.js" data-token="abc123"></script>
  ```

- [ ] El script debe:
  1. Leer `data-token` del tag `<script>` actual
  2. Crear un `<div id="flowai-widget-container">` en el body
  3. Insertar un `<iframe>` apuntando a `https://tudominio.com/widget/embed?token=xxx`
  4. Crear botón flotante (burbuja) fuera del iframe
  5. Toggle mostrar/ocultar iframe al hacer click en la burbuja
  6. Comunicación `postMessage` entre página host e iframe para:
     - Resize del iframe
     - Notificación de nuevo mensaje (badge en burbuja)
     - Cerrar widget

- [ ] Estilos inline (no depender de CSS externo):
  ```js
  const styles = {
    container: 'position:fixed;bottom:20px;right:20px;z-index:99999;',
    bubble: 'width:60px;height:60px;border-radius:50%;cursor:pointer;...',
    iframe: 'width:380px;height:520px;border:none;border-radius:12px;...',
  };
  ```

---

## FASE D — Dashboard: tarjeta de Widget en Integraciones

### D1. Crear WidgetIntegrationCard

**Archivo nuevo:** `frontend/src/components/integrations/WidgetIntegrationCard.jsx`

Seguir el patrón de `GoogleIntegrationCard.jsx`:

- [ ] Estados: desconectado → conectado
- [ ] Desconectado: botón "Activar Widget", selector de agente
- [ ] Conectado: mostrar snippet de embed, botón copiar, link a configuración
- [ ] Configuración inline:
  - Color picker para `primaryColor`
  - Select para `position` (bottom-right, bottom-left)
  - Input para `title` y `subtitle`
  - Preview en miniatura

### D2. Hook useWidgetIntegration

**Archivo nuevo:** `frontend/src/hooks/useWidgetIntegration.js`

- [ ] `enableWidget(workspaceId, agentId)` → POST /api/integrations/widget/enable
- [ ] `disableWidget(workspaceId)` → POST /api/integrations/widget/disable
- [ ] `getSettings(workspaceId)` → GET /api/integrations/widget/settings
- [ ] `updateTheme(workspaceId, theme)` → PUT /api/integrations/widget/theme
- [ ] Estado: `{ isEnabled, token, theme, loading, error }`

### D3. Integrar en Integrations.jsx

**Archivo:** `frontend/src/pages/Integrations.jsx`

- [ ] Importar `WidgetIntegrationCard`
- [ ] Reemplazar el card placeholder de "Widget" (si existe) o añadir nuevo card en el grid
- [ ] Card funcional, no "Próximamente"

---

## FASE E — Tests y Verificación

### E1. Tests manuales del backend

- [ ] **Token inválido**: `GET /api/widget/token-falso/config` → debe retornar 404
- [ ] **Crear sesión**: `POST /api/widget/{token}/session` con `{ visitorId: "test-123" }` → retorna chatId
- [ ] **Enviar mensaje**: `POST /api/widget/{token}/message` con `{ visitorId, chatId, message: "hola" }` → retorna respuesta IA
- [ ] **Rate limit**: Enviar 31 mensajes en 1 minuto → el 31° retorna 429
- [ ] **Historial**: `GET /api/widget/{token}/history/test-123` → retorna mensajes del chat
- [ ] **Socket**: Conectar a `/widget` namespace, emitir `join:visitor` → recibir `chat:message` cuando se envía mensaje

### E2. Tests manuales del frontend

- [ ] **Ruta embed**: Abrir `/widget/embed?token=xxx` → se carga el chat sin sidebar ni auth
- [ ] **Enviar mensaje**: Escribir "hola" y enviar → respuesta del bot aparece
- [ ] **Persistencia**: Recargar página → historial se mantiene (mismo visitorId)
- [ ] **Theme**: Cambiar color en dashboard → widget refleja el cambio

### E3. Tests del loader (widget.js)

- [ ] **Inline test**: Crear HTML plano con el script, abrir en browser → burbuja aparece
- [ ] **Toggle**: Click en burbuja → iframe se muestra/oculta
- [ ] **Conversación**: Enviar mensaje desde el iframe embebido → respuesta llega
- [ ] **Cross-origin**: El iframe funciona desde un dominio diferente al backend

### E4. Tests del dashboard

- [ ] **Activar**: Click "Activar Widget" → se genera token y snippet
- [ ] **Copiar snippet**: Click "Copiar" → clipboard tiene el `<script>` correcto
- [ ] **Configurar theme**: Cambiar color → preview actualiza
- [ ] **Desactivar**: Click "Desactivar" → token se invalida, widget deja de responder

---

## Resumen de archivos

| Acción | Archivo |
|--------|---------|
| CREAR | `backend/src/controllers/widgetController.js` |
| CREAR | `frontend/src/pages/WidgetEmbed.jsx` |
| CREAR | `frontend/src/components/widget/WidgetPanel.jsx` |
| CREAR | `frontend/src/components/widget/WidgetMessage.jsx` |
| CREAR | `frontend/src/components/widget/WidgetInput.jsx` |
| CREAR | `frontend/src/api/widget.js` |
| CREAR | `frontend/src/hooks/useWidgetIntegration.js` |
| CREAR | `frontend/src/components/integrations/WidgetIntegrationCard.jsx` |
| CREAR | `frontend/public/widget.js` |
| EDITAR | `backend/src/routers/index.js` — agregar 8 rutas |
| EDITAR | `backend/src/realtime/SocketService.js` — agregar namespace /widget |
| EDITAR | `backend/src/config/WorkspaceConfigRepository.js` — agregar schema widget |
| EDITAR | `frontend/src/App.jsx` — agregar ruta /widget/embed |
| EDITAR | `frontend/src/pages/Integrations.jsx` — agregar WidgetIntegrationCard |
