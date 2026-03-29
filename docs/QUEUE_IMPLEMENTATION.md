# 🚀 Sistema de Cola de Mensajes (BullMQ + Redis)

## ✅ IMPLEMENTADO

El sistema de colas está implementado con **fallback graceful**: si Redis no está disponible, procesa mensajes directamente como antes.

---

## Optimizaciones Implementadas

### Backend
- **HTTP Compression** (gzip/deflate) - Reduce ~70% tamaño de respuestas
- **Rate Limiting Global** (100 req/min por IP en /api)
- **N+1 Query Fix** en `getTablesInfo()` - Una sola query en lugar de N
- **Parallel Processing** en `BusinessSnapshot._build()` - 5 tablas en paralelo
- **ChatServiceFactory** - Instancias centralizadas, eventos no duplicados
- **Cache Namespace Index** - Invalidación O(1) en lugar de O(n)
- **Socket Typing Throttle** - 500ms para evitar spam de eventos

### Frontend
- **Vite Chunk Splitting** - vendor-react, vendor-socket separados
- **Socket.io Backoff** - Reconexión exponencial inteligente (1s → 30s)

---

## Cómo Funciona

```
CON REDIS:
Meta → Webhook (200ms) → Redis Queue → Workers (paralelos) → OpenAI → Reply

SIN REDIS (fallback):
Meta → Webhook → OpenAI (directo) → Reply
```

---

## Archivos Creados

| Archivo | Descripción |
|---------|-------------|
| `backend/src/queues/connection.js` | Conexión Redis con fallback |
| `backend/src/queues/metaMessageQueue.js` | Cola BullMQ + Worker |
| `backend/src/queues/metaMessageProcessor.js` | Procesador de mensajes |
| `backend/src/queues/index.js` | Exportaciones del módulo |

---

## Configuración

### 1. Variables de Entorno (`.env`)

```env
# Redis (opcional - si no está, funciona sin cola)
REDIS_URL=redis://localhost:6379

# Configuración de workers (opcional)
QUEUE_CONCURRENCY=5       # Mensajes en paralelo
QUEUE_MAX_RETRIES=3       # Reintentos por mensaje
QUEUE_RETRY_DELAY=5000    # Delay entre reintentos (ms)
```

### 2. Iniciar Redis con Docker

```bash
# Opción 1: Solo Redis
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Opción 2: Con docker-compose (incluye CouchDB)
docker-compose up -d redis
```

---

## Uso

### Sin configurar nada
El sistema funciona igual que antes (procesamiento directo).

### Con Redis

1. Agregar `REDIS_URL=redis://localhost:6379` a `.env`
2. Iniciar Redis: `docker-compose up -d redis`
3. Reiniciar backend

El backend detecta automáticamente si Redis está disponible:
```
✅ Redis conectado — Sistema de colas activo
📬 Sistema de colas activo
```

Si Redis no está:
```
⚠️ Redis no disponible — Procesamiento directo activo
📭 Sin Redis — Procesamiento directo de mensajes
```

---

## Endpoints de Monitoreo

| Endpoint | Descripción |
|----------|-------------|
| `GET /api/queues/stats` | Estadísticas de la cola |

Ejemplo de respuesta:
```json
{
  "available": true,
  "waiting": 2,
  "active": 3,
  "completed": 150,
  "failed": 1,
  "total": 5
}
```

---

## Beneficios

| Sin Cola | Con Cola |
|----------|----------|
| Respuesta webhook: 3-10s | Respuesta webhook: <200ms |
| 1 mensaje a la vez | 5 mensajes en paralelo |
| Sin reintentos | 3 reintentos automáticos |
| Pérdida en reinicio | Cola persistente |
| Sin visibilidad | Estadísticas en tiempo real |

---

## Para Producción

### Upstash (Redis Gratuito)
1. Crear cuenta en https://upstash.com
2. Crear base de datos Redis
3. Copiar URL a `.env`:
```env
REDIS_URL=rediss://default:xxx@global-xxx.upstash.io:6379
```

### Railway / Render
- Railway: ~$5/mes
- Render: ~$7/mes

---

## Docker Compose Actualizado

```yaml
services:
  redis:
    image: redis:7-alpine
    container_name: redis_queues
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    restart: unless-stopped
```

Comando: `docker-compose up -d redis`
