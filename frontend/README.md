# 🎨 Frontend - Sistema Dinámico Multi-Empresa

Frontend React + Vite para el sistema de chatbot dinámico con soporte multi-workspace y multi-agente.

---

## 🚀 Inicio Rápido

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
Copia `.env.example` a `.env` y configura:
```env
VITE_API_URL=http://localhost:3010/api
```

### 3. Iniciar servidor de desarrollo
```bash
npm run dev
```

Abre: `http://localhost:3020`

---

## ⚙️ Configuración

### Variables de Entorno

**`.env`:**
```env
# URL del backend API
VITE_API_URL=http://localhost:3010/api

# (Opcional) OpenAI Key para desarrollo
# VITE_OPENAI_KEY=sk-...
```

### Proxy de Desarrollo

El frontend tiene un proxy configurado en `vite.config.js`:
```javascript
server: {
  port: 3020,
  proxy: {
    "/api": {
      target: "http://localhost:3010",
      changeOrigin: true,
    },
  },
}
```

Esto permite hacer llamadas a `/api/...` que se redirigen automáticamente al backend.

---

## 📂 Estructura

```
frontend/
├── src/
│   ├── components/
│   │   ├── Layout.jsx              # Layout principal con navegación
│   │   └── nodes/                  # Nodos para FlowEditor
│   ├── context/
│   │   └── WorkspaceContext.jsx    # Context global de workspace
│   ├── pages/
│   │   ├── Dashboard.jsx           # Página principal
│   │   ├── Workspaces.jsx          # Gestión de workspaces
│   │   ├── Agents.jsx              # Gestión de agentes
│   │   ├── Tables.jsx              # Gestión de tablas
│   │   ├── Chat.jsx                # Chat con agente
│   │   ├── FlowEditor.jsx          # Editor de flujos
│   │   └── Guia.jsx                # Documentación
│   ├── api/
│   │   └── client.js               # API calls al backend
│   ├── App.jsx                     # App principal con rutas
│   ├── main.jsx                    # Entry point
│   └── index.css                   # Estilos globales
├── .env                            # Variables de entorno (no commitear)
├── .env.example                    # Ejemplo de variables
├── vite.config.js                  # Configuración de Vite
└── package.json
```

---

## 🎯 Características

### ✅ 100% Dinámico
- **Workspaces:** Carga todos los workspaces disponibles sin configuración
- **Agentes:** Carga agentes según workspace seleccionado
- **Tablas:** Carga tablas dinámicamente con fieldsConfig
- **Chat:** Se adapta al agente seleccionado (con o sin flujos)

### ✅ WorkspaceContext
```jsx
// Uso en cualquier componente
import { useWorkspace } from '../context/WorkspaceContext';

function MiComponente() {
  const { workspaceId, workspaceName, setWorkspace } = useWorkspace();
  
  // workspaceId: ID del workspace activo
  // workspaceName: Nombre del workspace activo
  // setWorkspace(id, name): Cambiar workspace activo
}
```

### ✅ API Client
```javascript
// src/api/client.js

// Workspaces
listWorkspaces()
createWorkspace({ name, color })
getWorkspace(id)

// Agents
listAgents(workspaceId)
createAgent({ workspaceId, agent })
deleteAgent(workspaceId, agentId)

// Tables
listTables(workspaceId)
createTable({ workspaceId, table })
getTableData(workspaceId, tableId)

// Chat
listChats(workspaceId, agentId)
sendChatMessage({ workspaceId, chatId, agentId, message })
getOrCreateChat(workspaceId, agentId, chatId)
```

---

## 📊 Páginas

### 1. **Dashboard** (`/`)
- Vista general del sistema
- Selector de workspace activo
- Acceso rápido a funciones

### 2. **Workspaces** (`/workspaces`)
- Listar todos los workspaces
- Crear nuevo workspace
- Seleccionar workspace activo
- **100% dinámico:** carga cualquier workspace sin código específico

### 3. **Agents** (`/agents`)
- Listar agentes del workspace activo
- Crear nuevo agente
- Vincular tablas al agente
- Seleccionar modelo de IA (GPT-4o-mini, GPT-4o, etc.)
- **Dinámico:** carga tablas disponibles automáticamente

### 4. **Tables** (`/tables`)
- Listar tablas del workspace activo
- Crear tabla con fieldsConfig
- Ver datos de tabla
- Agregar registros
- **Dinámico:** fieldsConfig define todo

### 5. **Chat** (`/chat`)
- Selector de agente
- Historial de conversaciones
- Chat en tiempo real
- Renderiza Markdown (negrita, cursiva, emojis)
- **Dinámico:** se adapta a agente con/sin flujos

### 6. **Flows** (`/flows`)
- Editor visual de flujos (React Flow)
- Crear nodos de acción
- Conectar nodos
- Guardar flujo en BD
- **Dinámico:** carga tablas disponibles

---

## 🔄 Flujo de Carga de Datos

### Al iniciar la app:
```
1. App.jsx carga
   ├─ Lee workspaceId de localStorage
   ├─ Crea WorkspaceContext
   └─ Renderiza Layout con rutas

2. Usuario selecciona workspace
   ├─ setWorkspace(id, name)
   ├─ Guarda en localStorage
   └─ Actualiza context

3. Componentes suscritos reaccionan
   ├─ Agents.jsx → listAgents(workspaceId)
   ├─ Tables.jsx → listTables(workspaceId)
   └─ Chat.jsx → listChats(workspaceId, agentId)

4. TODO se carga dinámicamente
   ✅ Sin hardcodear nada
   ✅ Funciona con cualquier workspace
   ✅ Se adapta a cualquier configuración
```

---

## 🎨 Estilos

### CSS Modules
Cada página tiene su propio CSS module:
```
Dashboard.jsx → Dashboard.module.css
Agents.jsx → Agents.module.css
Tables.jsx → Tables.module.css
Chat.jsx → Chat.module.css
```

### Variables CSS Globales
En `index.css`:
```css
:root {
  --primary-color: #22c55e;
  --secondary-color: #3b82f6;
  --text-color: #1f2937;
  --bg-color: #f9fafb;
}
```

---

## 🚀 Scripts

```bash
# Desarrollo
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview

# Lint
npm run lint
```

---

## 📦 Dependencias Principales

- **React 18:** Framework UI
- **React Router DOM:** Enrutamiento
- **React Flow:** Editor visual de flujos
- **Axios:** Cliente HTTP
- **Vite:** Build tool

---

## 🔧 Desarrollo

### Agregar nueva página:
1. Crear en `src/pages/NuevaPagina.jsx`
2. Crear estilos en `src/pages/NuevaPagina.module.css`
3. Agregar ruta en `App.jsx`:
   ```jsx
   <Route path="nueva" element={<NuevaPagina />} />
   ```
4. Agregar link en `Layout.jsx`

### Usar WorkspaceContext:
```jsx
import { useWorkspace } from '../context/WorkspaceContext';

function MiComponente() {
  const { workspaceId } = useWorkspace();
  
  if (!workspaceId) {
    return <p>Selecciona un workspace</p>;
  }
  
  // Usar workspaceId para cargar datos
}
```

### Hacer API calls:
```javascript
import { listAgents } from '../api/client';

const agents = await listAgents(workspaceId);
```

---

## 🎉 Características Destacadas

### ✅ 100% Dinámico
- Sin configuración por workspace
- Sin código específico por empresa
- Carga TODO desde la API

### ✅ WorkspaceContext Global
- Estado compartido entre componentes
- localStorage para persistencia
- Fácil acceso desde cualquier lugar

### ✅ Responsive
- Funciona en desktop, tablet, móvil
- CSS Grid y Flexbox
- Mobile-first design

### ✅ Markdown Support en Chat
- Negrita: `**texto**`
- Cursiva: `*texto*`
- Emojis nativos
- Saltos de línea

---

## 📚 Documentación Relacionada

- [COMO_FUNCIONA_TODO.md](../COMO_FUNCIONA_TODO.md) - Guía completa del sistema
- [CONFIGURACION_DINAMICA.md](../CONFIGURACION_DINAMICA.md) - Configuración dinámica
- [ESTADO_ACTUAL.md](../ESTADO_ACTUAL.md) - Estado actual del sistema

---

## 🐛 Troubleshooting

### Error: Cannot connect to API
**Solución:**
1. Verifica que el backend esté corriendo: `http://localhost:3010`
2. Verifica `.env`: `VITE_API_URL=http://localhost:3010/api`
3. Reinicia el servidor: `npm run dev`

### Error: Workspace not loading
**Solución:**
1. Abre DevTools (F12) → Network
2. Verifica llamada a `/api/workspace/list`
3. Si falla, verifica backend y CouchDB

### Página en blanco
**Solución:**
1. Abre DevTools (F12) → Console
2. Busca errores de JavaScript
3. Verifica que todas las dependencias estén instaladas: `npm install`

---

## 🚀 Despliegue

### Build para producción:
```bash
npm run build
```

Genera carpeta `dist/` con archivos estáticos.

### Configurar variables de entorno de producción:
```env
VITE_API_URL=https://tu-backend.com/api
```

### Servir con Nginx/Apache/Vercel/Netlify
Los archivos en `dist/` son estáticos y pueden servirse desde cualquier servidor web.

---

## ✨ Próximas Mejoras

- [ ] Autenticación de usuarios
- [ ] Roles y permisos
- [ ] Notificaciones en tiempo real
- [ ] Dark mode
- [ ] Internacionalización (i18n)
- [ ] Tests unitarios y E2E

---

**¡El frontend ya está 100% configurado y listo para cualquier workspace!** 🎉
