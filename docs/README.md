# 🚀 FlowAI - Plataforma de Automatización con IA

Sistema completo de chatbot y automatización con IA que funciona dinámicamente con **cualquier tipo de empresa**. Incluye editor visual de flujos, chat multi-agente y gestión de datos dinámica.

![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js)
![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react)
![CouchDB](https://img.shields.io/badge/CouchDB-3.x-E42528?logo=apache-couchdb)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.x-06B6D4?logo=tailwindcss)

---

## ✨ Características Principales

### 🤖 Chat con IA Multi-Agente
- Múltiples agentes por workspace con personalidades configurables
- Bot con flujos para recolección estructurada de datos
- Bot conversacional con GPT para charlas libres
- Validación inteligente de campos en 3 niveles
- Indicador de agente activo en tiempo real

### 🎨 Editor Visual de Flujos
- **9 tipos de nodos** configurables:
  - `Trigger` - Inicio del flujo con keywords
  - `Action` - Acciones sobre tablas (crear, actualizar, consultar)
  - `Condition` - Bifurcaciones condicionales
  - `Response` - Mensajes al usuario
  - `Collect` - Recolección de datos
  - `Query` - Consultas a tablas
  - `Availability` - Verificación de disponibilidad
  - `Update` - Actualización de registros
  - `Notify` - Notificaciones
- Plantillas predefinidas (Reservación, Soporte, Notificación, Ventas)
- Drag & drop con conexiones visuales
- Ejecución automática por triggers

### 📊 Gestión Dinámica de Datos
- Tablas configurables con `fieldsConfig`
- Validación automática (teléfono, email, fecha, hora, etc.)
- EntityRepository universal para cualquier entidad
- CRUD completo sin código específico

### 🏢 Multi-Workspace
- Soporte para múltiples empresas independientes
- Cada workspace con sus propios agentes, tablas y flujos
- Aislamiento completo de datos

---

## 🛠️ Stack Tecnológico

### Backend
| Tecnología | Versión | Uso |
|------------|---------|-----|
| Node.js | 20.x | Runtime con ES Modules |
| Express | 4.18.x | API REST |
| CouchDB | 3.x | Base de datos NoSQL |
| OpenAI API | GPT-4o-mini | Inteligencia artificial |
| Winston | 3.x | Logging |
| nspell | 2.x | Corrección ortográfica |

### Frontend
| Tecnología | Versión | Uso |
|------------|---------|-----|
| React | 18.x | UI Framework |
| Vite | 7.x | Build tool |
| TailwindCSS | 4.x | Estilos |
| @xyflow/react | 12.x | Editor de flujos |
| React Router | 6.x | Routing |
| Axios | 1.6.x | HTTP Client |

---

## 📁 Estructura del Proyecto

```
flowai/
├── backend/                          # API Node.js + Express
│   ├── src/
│   │   ├── config/                  # Configuración DB
│   │   ├── controllers/             # REST Controllers
│   │   │   ├── chatController.js    # Chat con IA
│   │   │   ├── flowsController.js   # Gestión de flujos
│   │   │   ├── tablesController.js  # Tablas dinámicas
│   │   │   ├── agentsController.js  # Agentes
│   │   │   └── workspacesController.js
│   │   ├── core/                    # Motor del sistema
│   │   │   ├── Engine.js            # Pipeline principal
│   │   │   ├── Context.js           # Contexto de conversación
│   │   │   └── EventEmitter.js      # Sistema de eventos
│   │   ├── domain/
│   │   │   ├── actions/             # Handlers (Create, Query, Update...)
│   │   │   ├── fields/              # FieldCollector con validación
│   │   │   └── responses/           # ResponseBuilder
│   │   ├── errors/                  # Manejo de errores
│   │   │   ├── ErrorHandler.js
│   │   │   ├── types/               # Tipos de error
│   │   │   └── recovery/            # Estrategias de recuperación
│   │   ├── integrations/
│   │   │   ├── ai/                  # OpenAI integration
│   │   │   └── notifications/       # Sistema de notificaciones
│   │   ├── preprocessing/           # Preprocesamiento de texto
│   │   │   ├── TextPreprocessor.js
│   │   │   ├── processors/          # Correctores y normalizadores
│   │   │   └── dictionaries/        # Diccionarios español
│   │   ├── repositories/            # Acceso a datos
│   │   │   ├── EntityRepository.js  # ⭐ Repositorio universal
│   │   │   ├── TableRepository.js
│   │   │   └── ChatRepository.js
│   │   ├── services/
│   │   │   ├── ChatService.js       # Servicio de chat
│   │   │   ├── FlowExecutor.js      # ⭐ Ejecución de flujos
│   │   │   └── flowEngine.js        # Motor de flujos
│   │   └── seeds/                   # Datos de prueba
│   └── package.json
│
├── frontend/                         # React + Vite + TailwindCSS
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js            # Cliente API
│   │   ├── components/
│   │   │   ├── Layout.jsx           # Layout principal
│   │   │   ├── WorkspaceSelector.jsx
│   │   │   ├── TableBuilder.jsx     # Constructor de tablas
│   │   │   ├── Toast.jsx            # Notificaciones
│   │   │   └── nodes/               # ⭐ Nodos del FlowEditor
│   │   │       ├── TriggerNode.jsx
│   │   │       ├── ActionNode.jsx
│   │   │       ├── ConditionNode.jsx
│   │   │       ├── ResponseNode.jsx
│   │   │       ├── CollectNode.jsx
│   │   │       ├── QueryNode.jsx
│   │   │       └── AvailabilityNode.jsx
│   │   ├── context/
│   │   │   └── WorkspaceContext.jsx # Estado global
│   │   └── pages/
│   │       ├── Dashboard.jsx        # Vista general
│   │       ├── Chat.jsx             # Chat con agentes
│   │       ├── Tables.jsx           # Gestión de tablas
│   │       ├── Agents.jsx           # Configuración de agentes
│   │       ├── Workspaces.jsx       # Gestión de workspaces
│   │       ├── FlowEditor.jsx       # ⭐ Editor visual
│   │       └── Guia.jsx             # Documentación
│   └── package.json
│
├── schemas/                          # Esquemas JSON de referencia
├── docker-compose.yml               # Docker para CouchDB
├── DESIGN_SYSTEM.md                 # Sistema de diseño UI
└── README.md
```

---

## 🚀 Instalación

### Requisitos Previos
- Node.js v20.x o superior
- CouchDB 3.x (o Docker)
- API Key de OpenAI

### 1. Clonar Repositorio
```bash
git clone https://github.com/tu-usuario/flowai.git
cd flowai
```

### 2. Iniciar CouchDB (Docker)
```bash
docker-compose up -d
```
O instalar CouchDB localmente y acceder a `http://localhost:5984/_utils`

### 3. Backend
```bash
cd backend
npm install

# Crear archivo .env
cat > .env << EOF
COUCHDB_URL=http://admin:password@127.0.0.1:5984
OPENAI_API_KEY=sk-tu-api-key
DB_PREFIX=chatbot_
PORT=3010
EOF

# Crear datos de prueba
node src/seeds/all.js --clean

# Iniciar servidor
npm run dev
```

### 4. Frontend
```bash
cd frontend
npm install

# Configurar API (ya viene configurado)
# VITE_API_URL=http://localhost:3010/api

# Iniciar servidor
npm run dev
```

### 5. Abrir Aplicación
```
http://localhost:3020
```

---

## 📱 Páginas de la Aplicación

| Página | Ruta | Descripción |
|--------|------|-------------|
| **Dashboard** | `/` | Vista general con estadísticas y acciones rápidas |
| **Chat** | `/chat` | Conversaciones con agentes IA |
| **Tables** | `/tables` | Gestión de tablas y datos |
| **Agents** | `/agents` | Configuración de agentes |
| **Workspaces** | `/workspaces` | Gestión de workspaces |
| **Flow Editor** | `/flows` | Editor visual de automatizaciones |
| **Guía** | `/guia` | Documentación interactiva |

---

## 🎯 Tipos de Nodos del Editor de Flujos

| Nodo | Icono | Descripción |
|------|-------|-------------|
| **Trigger** | ⚡ | Inicia el flujo (mensaje, evento, schedule) |
| **Action** | 🎯 | Ejecuta acciones: crear, actualizar, eliminar |
| **Condition** | 🔀 | Bifurcación condicional |
| **Response** | 💬 | Envía mensaje al usuario |
| **Collect** | 📝 | Recolecta datos del usuario |
| **Query** | 🔍 | Consulta datos de tablas |
| **Availability** | 📅 | Verifica disponibilidad |
| **Update** | ✏️ | Actualiza registros existentes |
| **Notify** | 🔔 | Envía notificaciones |

---

## 🔧 Comandos Útiles

### Backend
```bash
cd backend

npm run dev          # Desarrollo con hot-reload
npm start            # Producción
node src/seeds/all.js --clean  # Regenerar datos de prueba
node check-seeds.js  # Verificar seeds
```

### Frontend
```bash
cd frontend

npm run dev          # Desarrollo
npm run build        # Build para producción
npm run preview      # Preview del build
```

---

## 🏗️ Arquitectura del Sistema

### Patrones de Diseño
- **Chain of Responsibility** - Engine + Handlers
- **Repository Pattern** - EntityRepository universal
- **Factory Pattern** - ActionFactory
- **Pipeline Pattern** - Procesamiento de mensajes
- **Strategy Pattern** - Estrategias de detección de intención

### Flujo de un Mensaje
```
Usuario → [TextPreprocessor] → [IntentDetector] → [ActionHandler] → [ResponseBuilder] → Usuario
              ↓                      ↓                  ↓                  ↓
          Corrección            Intención           Acción            Respuesta
          Normalización         Confianza           Datos BD          Formateada
```

---

## 🗄️ Base de Datos

### Estructura CouchDB
```
chatbot_workspaces                    # Workspaces globales
chatbot_agents_{workspaceId}          # Agentes por workspace
chatbot_tables_{workspaceId}          # Definición de tablas
chatbot_tabledata_{workspaceId}_{tableId}  # Datos de cada tabla
chatbot_chat_{workspaceId}            # Conversaciones
chatbot_flows_{workspaceId}           # Flujos de automatización
chatbot_flow_templates                # Plantillas globales de flujos
```

---

## 🎨 Sistema de Diseño

El frontend sigue un sistema de diseño moderno inspirado en **Linear**, **Vercel** y **Stripe**:

- **Paleta oscura** - Fondo `#0a0a12` con superficies sutiles
- **Acentos** - Violeta (`#8b5cf6`) y Esmeralda (`#10b981`)
- **Tipografía** - Inter/System con jerarquía clara
- **Espaciado** - Sistema de 8px
- **Componentes** - Cards con bordes sutiles y estados hover

Ver [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) para detalles completos.

---

## 🔐 Variables de Entorno

### Backend (`.env`)
```env
COUCHDB_URL=http://admin:password@127.0.0.1:5984
OPENAI_API_KEY=sk-...
DB_PREFIX=chatbot_
PORT=3010
NODE_ENV=development
```

### Frontend (`.env`)
```env
VITE_API_URL=http://localhost:3010/api
```

---

## 📚 Documentación

- [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) - Sistema de diseño UI
- [backend/README.md](backend/README.md) - Documentación del backend
- [frontend/README.md](frontend/README.md) - Documentación del frontend
- [backend/src/ARCHITECTURE.md](backend/src/ARCHITECTURE.md) - Arquitectura técnica

---

## 🚢 Despliegue

### Backend (Producción)
```env
NODE_ENV=production
COUCHDB_URL=https://user:pass@tu-servidor:6984
OPENAI_API_KEY=sk-...
PORT=3010
```

### Frontend (Producción)
```bash
npm run build
# Servir carpeta dist/ con Nginx, Vercel o Netlify
```

---

## 📈 Roadmap

- [x] Sistema dinámico 100%
- [x] EntityRepository universal
- [x] Validaciones en 3 niveles
- [x] Editor visual de flujos
- [x] Plantillas de flujos
- [x] Multi-agente con indicador
- [x] UI moderna con TailwindCSS v4
- [ ] Autenticación de usuarios
- [ ] Roles y permisos
- [ ] Webhooks externos
- [ ] API pública
- [ ] Tests automatizados

---

## 🐛 Troubleshooting

### Error 401: Unauthorized
```
Solución: Verificar COUCHDB_URL en backend/.env
```

### Error ECONNREFUSED
```
Solución: Iniciar CouchDB con docker-compose up -d
```

### Frontend no conecta
```
Solución: Verificar que backend esté corriendo en puerto 3010
```

---

## 📄 Licencia

Proyecto privado - Todos los derechos reservados.

---

<div align="center">

**FlowAI** - Plataforma de Automatización con IA

Hecho con ❤️ usando React, Node.js y CouchDB

</div>
