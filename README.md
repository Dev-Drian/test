# 🚀 Sistema de Chatbot Dinámico Multi-Empresa

Sistema completo de chatbot con IA que funciona dinámicamente con **cualquier tipo de empresa** sin necesidad de código específico. 100% configurable desde la base de datos.

---

## ✨ Características Principales

- ✅ **100% Dinámico:** Funciona con cualquier tabla, campo y flujo sin hardcodear
- ✅ **Multi-Workspace:** Soporte para múltiples empresas independientes
- ✅ **Multi-Agente:** Múltiples bots por workspace con configuración flexible
- ✅ **Validación Inteligente:** 3 niveles de validación automática
- ✅ **Bot con Flujos:** Recolección estructurada de datos con validación
- ✅ **Bot Normal:** Conversaciones libres con GPT
- ✅ **Frontend Adaptativo:** Se adapta a cualquier configuración
- ✅ **EntityRepository Universal:** CRUD genérico para cualquier entidad

---

## 🏗️ Arquitectura

```
migracion/
├── backend/                         # Node.js + Express + CouchDB
│   ├── src/
│   │   ├── config/                 # Configuración dinámica
│   │   ├── controllers/            # API REST
│   │   ├── core/                   # Engine (Chain of Responsibility)
│   │   ├── domain/
│   │   │   ├── actions/            # Handlers (Create, Update, Query)
│   │   │   ├── fields/             # FieldCollector con validación
│   │   │   └── responses/          # ResponseBuilder
│   │   ├── repositories/
│   │   │   └── EntityRepository.js # ⭐ Repositorio universal
│   │   ├── services/               # ChatService
│   │   └── seeds/                  # Seeds genéricos
│   └── .env                        # Configuración
├── frontend/                        # React + Vite
│   ├── src/
│   │   ├── api/                    # Cliente API
│   │   ├── components/             # Componentes React
│   │   ├── context/                # WorkspaceContext global
│   │   └── pages/                  # Páginas
│   └── .env                        # Configuración
├── schemas/                         # Esquemas JSON
├── 📚 INICIO_RAPIDO.md             # ⭐ Guía de instalación
├── 📚 COMO_FUNCIONA_TODO.md        # Guía completa del sistema
├── 📚 CONFIGURACION_DINAMICA.md    # Configuración avanzada
├── 📚 ESTADO_ACTUAL.md             # Estado y mejoras
└── 📚 INSTALACION_COUCHDB.md       # Instalación de CouchDB
```

---

## 🚀 Inicio Rápido

### 1. Requisitos
- Node.js v20.19.6+
- CouchDB 3.x
- API Key de OpenAI

### 2. Instalación Backend
```bash
cd backend
npm install

# Configurar .env
# COUCHDB_URL=http://admin:password@127.0.0.1:5984
# OPENAI_API_KEY=sk-...

# Crear datos de prueba
node src/seeds/all.js --clean

# Iniciar servidor
npm run dev
```

### 3. Instalación Frontend
```bash
cd frontend
npm install

# Ya está configurado en .env
# VITE_API_URL=http://localhost:3010/api

# Iniciar servidor
npm run dev
```

### 4. Abrir navegador
```
http://localhost:3020
```

**Ver guía completa:** [INICIO_RAPIDO.md](INICIO_RAPIDO.md)

---

## 📚 Documentación

### Guías Principales

#### 🚀 [INICIO_RAPIDO.md](INICIO_RAPIDO.md)
**Para empezar a usar el sistema**
- Requisitos previos
- Instalación paso a paso
- Verificación
- Uso del sistema
- Solución de problemas

#### 📖 [COMO_FUNCIONA_TODO.md](COMO_FUNCIONA_TODO.md)
**Para entender el sistema**
- Conceptos básicos (Workspace, Agente, Tabla, Campo)
- Diferencia bot normal vs bot con flujos
- Componentes clave (Engine, Context, FieldCollector, EntityRepository)
- Flujo completo de un mensaje
- Estructura de base de datos
- Validaciones aplicadas

#### ⚙️ [CONFIGURACION_DINAMICA.md](CONFIGURACION_DINAMICA.md)
**Para configurar y extender**
- Arquitectura dinámica
- Prefijo de BD configurable
- Funciones de BD dinámicas
- Frontend dinámico
- Para agregar nueva empresa

#### 📋 [ESTADO_ACTUAL.md](ESTADO_ACTUAL.md)
**Para ver qué está implementado**
- Mejoras implementadas
- EntityRepository
- FieldCollector mejorado
- Context.mergeFields()
- Seeds genéricos
- Validaciones aplicadas

#### 🗄️ [INSTALACION_COUCHDB.md](INSTALACION_COUCHDB.md)
**Para instalar CouchDB**
- Instalación en Windows/Mac/Linux
- Configuración
- Verificación
- Problemas comunes

### READMEs Específicos

- [backend/README.md](backend/README.md) - Documentación del backend
- [frontend/README.md](frontend/README.md) - Documentación del frontend

---

## 🎯 Casos de Uso

### 1. Restaurante - Sistema de Reservas
```
Campos: cliente, teléfono, fecha, hora, personas, mesa, estado
Bot recolecta datos paso a paso
Valida teléfono (10 dígitos), fecha (YYYY-MM-DD), hora (HH:MM)
Guarda en BD automáticamente
```

### 2. Salón de Belleza - Sistema de Citas
```
Campos: cliente, teléfono, fecha, hora, servicio, especialista, estado
Bot relaciona servicio con catálogo de servicios
Valida disponibilidad de horarios
Confirma y guarda cita
```

### 3. Clínica/Veterinaria - Sistema de Citas Médicas
```
Campos: paciente, dueño, teléfono, fecha, hora, motivo, doctor, notas
Bot maneja urgencias con prioridad
Valida campos opcionales (email, notas)
Guarda historial médico
```

### 4. ¡Cualquier Negocio!
**NO necesitas programar nada:**
1. Crear workspace
2. Crear tabla con fieldsConfig
3. Crear agente con useFlows: true
4. ¡El bot funciona automáticamente!

---

## 🔧 Tecnologías

### Backend
- **Node.js** v20.19.6 con ES Modules
- **Express.js** v4.18.2 para API REST
- **CouchDB** v3.x para base de datos NoSQL
- **nano** v10.1.2 como cliente de CouchDB
- **OpenAI** GPT-4o-mini para IA
- **uuid** v9.0.0 para IDs únicos

### Frontend
- **React** 18 con Hooks
- **React Router DOM** para enrutamiento
- **React Flow** para editor visual de flujos
- **Axios** para HTTP requests
- **Vite** como build tool
- **CSS Modules** para estilos

### Arquitectura
- **Chain of Responsibility** (Engine + Handlers)
- **Repository Pattern** (EntityRepository universal)
- **Factory Pattern** (ActionFactory)
- **Context Pattern** (WorkspaceContext)

---

## 🎨 Flujo de Trabajo

### Conversación de Ejemplo (Restaurante)

```
Usuario: "Quiero hacer una reserva"
Bot: "¡Perfecto! ¿A nombre de quién será la reserva?"

Usuario: "Juan Pérez"
Bot: "¿A qué número te contactamos?"

Usuario: "123"
Bot: "❌ El teléfono debe tener 10 dígitos."

Usuario: "3001234567"
Bot: "¿Para qué fecha necesitas la reserva?"

Usuario: "mañana"
Bot: "¿A qué hora te gustaría?"

Usuario: "8pm"
Bot: "¿Para cuántas personas?"

Usuario: "4"
Bot muestra resumen:
   👤 Cliente: Juan Pérez
   📱 Teléfono: 3001234567
   📅 Fecha: 2026-02-11
   🕐 Hora: 20:00
   👥 Personas: 4
   
Bot: "¿Todo correcto? (Sí/No)"

Usuario: "Sí"
Bot: "¡Reserva confirmada! Código: abc-123-xyz"
```

**Todo validado y guardado automáticamente** ✅

---

## 🔥 Características Destacadas

### EntityRepository Universal
```javascript
// Funciona con CUALQUIER tabla sin código específico
const result = await entityRepo.create(workspaceId, tableId, data);

// Valida automáticamente según fieldsConfig:
// ✓ phone: 10 dígitos
// ✓ email: formato válido
// ✓ date: YYYY-MM-DD
// ✓ time: HH:MM
// ✓ number: min/max
// ✓ select: opciones válidas
```

### FieldCollector Inteligente
```javascript
// NO extrae de mensajes de intención
"quiero agendar" → NO extrae nada ✅

// SÍ extrae de datos concretos
"para 4 personas el viernes" → { personas: 4, fecha: "2026-02-14" } ✅

// Valida ANTES de aceptar
"teléfono 123" → Rechaza (no son 10 dígitos) ✅
```

### Context con Validación
```javascript
// Valida y normaliza antes de aceptar
context.mergeFields({ telefono: "123" });
// Retorna: {
//   accepted: {},
//   rejected: [{ field: "telefono", reason: "debe tener 10 dígitos" }]
// }
```

---

## 📊 Base de Datos

### Estructura de CouchDB
```
chatbot_workspaces               # Workspaces (empresas)
chatbot_agents_{workspaceId}     # Agentes por workspace
chatbot_tables_{workspaceId}     # Tablas por workspace
chatbot_tabledata_{workspaceId}  # Datos de tablas
chatbot_chat_{workspaceId}       # Chats por workspace
chatbot_flows_{workspaceId}      # Flujos visuales
```

### Prefijo Configurable
```env
# En .env puedes cambiar el prefijo
DB_PREFIX=miempresa_

# Resultado:
# miempresa_workspaces
# miempresa_agents_{workspaceId}
# etc.
```

---

## 🧪 Testing

### Seeds de Prueba
```bash
# Crear 3 workspaces de prueba
node src/seeds/all.js --clean

# Crea:
# - Restaurante (reservas)
# - Salón de Belleza (citas de belleza)
# - Clínica (citas médicas)
```

### Verificar Seeds
```bash
node check-seeds.js
```

---

## 🛠️ Comandos Útiles

### Backend
```bash
cd backend

# Desarrollo
npm run dev

# Producción
npm start

# Seeds
node src/seeds/all.js --clean

# Verificar
node check-seeds.js
```

### Frontend
```bash
cd frontend

# Desarrollo
npm run dev

# Build
npm run build

# Preview
npm run preview
```

---

## 🚀 Despliegue

### Backend (Producción)
```env
NODE_ENV=production
COUCHDB_URL=https://usuario:password@tu-servidor.com:6984
DB_PREFIX=prod_
OPENAI_API_KEY=sk-...
PORT=3010
```

### Frontend (Producción)
```env
VITE_API_URL=https://tu-backend.com/api
```

```bash
npm run build
# Servir carpeta dist/ con Nginx/Apache/Vercel/Netlify
```

---

## 🐛 Problemas Comunes

### Error 401: Unauthorized
```
Error: You are not authorized to access this db.
```
**Solución:** Configurar `COUCHDB_URL` en `backend/.env`

Ver: [INSTALACION_COUCHDB.md](INSTALACION_COUCHDB.md)

---

### Error ECONNREFUSED
```
Error: connect ECONNREFUSED 127.0.0.1:5984
```
**Solución:** CouchDB no está corriendo. Iniciarlo.

---

### Frontend no conecta
**Solución:** Verificar que backend esté en `http://localhost:3010`

---

## 📈 Roadmap

- [x] Sistema dinámico 100%
- [x] EntityRepository universal
- [x] Validaciones en 3 niveles
- [x] Seeds genéricos
- [x] Frontend adaptativo
- [ ] Autenticación de usuarios
- [ ] Roles y permisos
- [ ] Notificaciones en tiempo real
- [ ] Webhooks
- [ ] API de integración
- [ ] Dark mode
- [ ] Tests automatizados

---

## 🤝 Contribuir

El sistema es completamente extensible:

### Agregar nuevo tipo de campo:
1. Agregar validación en `EntityRepository._validateFields()`
2. Agregar normalización en `EntityRepository._normalizeFields()`
3. Agregar en `FieldCollector.validateField()`

### Agregar nuevo Handler:
1. Crear en `backend/src/domain/actions/`
2. Extender `ActionHandler`
3. Implementar `canHandle()` y `execute()`
4. Agregar en `ActionFactory`

### Agregar nueva página en frontend:
1. Crear en `frontend/src/pages/`
2. Agregar ruta en `App.jsx`
3. Agregar link en `Layout.jsx`

---

## 📄 Licencia

Este proyecto es privado y propiedad de [Tu Empresa].

---

## 🎉 ¡Listo para Usar!

El sistema está **100% configurado** y **listo para producción**.

**Ver guía de inicio:** [INICIO_RAPIDO.md](INICIO_RAPIDO.md)

**¡Disfruta del sistema dinámico multi-empresa!** 🚀
