# 🏗️ Arquitectura del Motor de Chat - v2.0

## 📋 Índice
1. [Visión General](#visión-general)
2. [Principios de Diseño](#principios-de-diseño)
3. [Arquitectura de Capas](#arquitectura-de-capas)
4. [Módulos del Sistema](#módulos-del-sistema)
5. [Flujo de Procesamiento](#flujo-de-procesamiento)
6. [Implementación por Prioridad](#implementación-por-prioridad)

---

## 🎯 Visión General

El motor de chat sigue una arquitectura **Pipeline + Middleware** donde cada mensaje pasa por una serie de transformaciones y validaciones antes de generar una respuesta.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FLUJO DEL MENSAJE                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Usuario → [Preprocesador] → [Detector] → [Analizador] → [Handler] │
│                                                                     │
│            ↓                  ↓             ↓              ↓        │
│         Limpieza          Intención      Datos         Acción      │
│         Ortografía        Confianza      Filtros       Respuesta   │
│         Normalizar        Tabla          Campos                     │
│                                                                     │
│  [ResponseBuilder] ← [Validator] ← [ErrorHandler]                  │
│                                                                     │
│            ↓                                                        │
│        Respuesta → Usuario                                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🧱 Principios de Diseño

### SOLID
- **S**ingle Responsibility: Cada clase hace UNA cosa
- **O**pen/Closed: Extensible sin modificar código existente
- **L**iskov Substitution: Handlers intercambiables
- **I**nterface Segregation: Interfaces pequeñas y específicas
- **D**ependency Inversion: Depender de abstracciones

### Patrones Aplicados
| Patrón | Uso |
|--------|-----|
| **Pipeline** | Procesamiento secuencial del mensaje |
| **Chain of Responsibility** | Handlers que delegan si no pueden manejar |
| **Strategy** | Diferentes estrategias de normalización/filtrado |
| **Factory** | Creación de handlers y processors |
| **Repository** | Acceso a datos |
| **Builder** | Construcción de respuestas complejas |

---

## 📂 Arquitectura de Capas

```
backend/src/
├── core/                    # 🔧 Núcleo del sistema
│   ├── Engine.js           # Motor principal (ya existe)
│   ├── Context.js          # Contexto de conversación (ya existe)
│   ├── EventEmitter.js     # Sistema de eventos (ya existe)
│   └── Pipeline.js         # [NUEVO] Orquestador del pipeline
│
├── preprocessing/           # 🔤 [NUEVO] P0: Preprocesamiento
│   ├── TextPreprocessor.js # Orquestador de preprocesamiento
│   ├── processors/
│   │   ├── SpellingCorrector.js    # Corrección ortográfica
│   │   ├── TextNormalizer.js       # Normalización de texto
│   │   ├── AbbreviationExpander.js # Expansión de abreviaciones
│   │   └── EmojiCleaner.js         # Limpieza de emojis
│   └── dictionaries/
│       ├── corrections.json        # Diccionario de correcciones
│       └── abbreviations.json      # Diccionario de abreviaciones
│
├── detection/               # 🎯 P2: Detección de intenciones
│   ├── IntentDetector.js   # Detector principal (refactorizado)
│   ├── strategies/
│   │   ├── RuleBasedStrategy.js    # Reglas sin LLM (rápido)
│   │   ├── LLMStrategy.js          # Con LLM (preciso)
│   │   └── HybridStrategy.js       # Combinación
│   └── disambiguator/
│       └── IntentDisambiguator.js  # Desambiguación
│
├── parsing/                 # 📊 P1: Parsing y Filtros
│   ├── QueryParser.js      # Parser de consultas
│   ├── filters/
│   │   ├── DateFilter.js           # Filtros de fecha
│   │   ├── RangeFilter.js          # Filtros de rango
│   │   ├── TextFilter.js           # Filtros de texto (fuzzy)
│   │   └── CompositeFilter.js      # Filtros combinados
│   └── normalizers/
│       ├── DateNormalizer.js       # "mañana" → "2026-02-12"
│       ├── TimeNormalizer.js       # "las 2" → "14:00"
│       ├── PhoneNormalizer.js      # Formatos de teléfono
│       └── NumberNormalizer.js     # "dos" → 2
│
├── domain/                  # 💼 Lógica de negocio (ya existe)
│   ├── actions/            # Handlers de acciones
│   ├── fields/             # Recolección de campos
│   └── responses/          # Construcción de respuestas
│
├── errors/                  # ⚠️ [NUEVO] P0: Manejo de errores
│   ├── ErrorHandler.js     # Handler centralizado
│   ├── types/
│   │   ├── ValidationError.js
│   │   ├── AIProviderError.js
│   │   ├── DatabaseError.js
│   │   └── BusinessRuleError.js
│   ├── recovery/
│   │   ├── RetryStrategy.js        # Reintentos con backoff
│   │   └── CircuitBreaker.js       # Circuit breaker para APIs
│   └── messages/
│       └── UserFriendlyMessages.js # Mensajes amigables
│
├── responses/               # 💬 P2: Variación de respuestas
│   ├── ResponseVariator.js # Generador de variaciones
│   ├── templates/
│   │   ├── success.json
│   │   ├── errors.json
│   │   └── questions.json
│   └── tone/
│       └── ToneAdapter.js  # Adaptador de tono
│
├── memory/                  # 🧠 [NUEVO] P3: Memoria
│   ├── UserMemory.js       # Preferencias de usuario
│   ├── ConversationMemory.js # Contexto de conversación
│   └── stores/
│       ├── InMemoryStore.js
│       └── PersistentStore.js
│
├── integrations/           # 🔌 Integraciones externas
│   ├── ai/                 # Proveedores de IA (ya existe)
│   └── notifications/      # Notificaciones (ya existe)
│
├── repositories/           # 📦 Acceso a datos (ya existe)
├── services/               # 🛠️ Servicios (ya existe)
└── config/                 # ⚙️ Configuración (ya existe)
```

---

## 🔧 Módulos del Sistema

### P0: Preprocesamiento de Texto

```javascript
// preprocessing/TextPreprocessor.js
class TextPreprocessor {
  constructor() {
    this.processors = [
      new EmojiCleaner(),
      new AbbreviationExpander(),
      new SpellingCorrector(),
      new TextNormalizer(),
    ];
  }

  async process(text, options = {}) {
    let result = { 
      original: text, 
      processed: text,
      corrections: [],
      confidence: 1.0 
    };

    for (const processor of this.processors) {
      const output = await processor.process(result.processed, options);
      result.processed = output.text;
      result.corrections.push(...(output.changes || []));
      result.confidence *= output.confidence || 1.0;
    }

    return result;
  }
}
```

#### Correcciones soportadas:
| Tipo | Ejemplo | Resultado |
|------|---------|-----------|
| Ortografía | "quero agnedar" | "quiero agendar" |
| Abreviaciones | "xq no hay" | "porque no hay" |
| Tildes | "manana" | "mañana" |
| Espacios | "quierover" | "quiero ver" |
| Mayúsculas | "HOLA QUIERO" | "Hola quiero" |

---

### P0: Manejo de Errores

```javascript
// errors/ErrorHandler.js
class ErrorHandler {
  constructor(config = {}) {
    this.retryStrategy = new RetryStrategy(config.retry);
    this.circuitBreaker = new CircuitBreaker(config.circuit);
    this.messageBuilder = new UserFriendlyMessages();
  }

  async handle(error, context) {
    // 1. Clasificar el error
    const errorType = this.classify(error);
    
    // 2. Intentar recuperación
    const recovery = await this.attemptRecovery(error, errorType, context);
    if (recovery.success) return recovery.result;
    
    // 3. Generar mensaje amigable
    const userMessage = this.messageBuilder.build(errorType, context);
    
    // 4. Log estructurado
    this.log(error, errorType, context);
    
    return {
      success: false,
      message: userMessage,
      suggestions: this.getSuggestions(errorType, context),
    };
  }
}
```

#### Tipos de Error y Respuestas:
| Error | Respuesta al Usuario |
|-------|---------------------|
| API Timeout | "Estoy tardando más de lo normal. ¿Puedes repetir tu mensaje?" |
| Validación | "El teléfono debe tener 10 dígitos. Ejemplo: 3001234567" |
| No encontrado | "No encontré clientes con ese nombre. ¿Quieres ver la lista?" |
| Duplicado | "Ya existe una cita para esa hora. ¿Te muestro horarios disponibles?" |

---

### P1: Normalización de Fechas/Horas

```javascript
// parsing/normalizers/DateNormalizer.js
class DateNormalizer {
  constructor(config = {}) {
    this.timezone = config.timezone || 'America/Bogota';
    this.locale = config.locale || 'es-CO';
  }

  normalize(text, referenceDate = new Date()) {
    const patterns = [
      // Relativos
      { regex: /\bhoy\b/i, resolver: () => this.today() },
      { regex: /\bmañana\b/i, resolver: () => this.tomorrow() },
      { regex: /\bpasado mañana\b/i, resolver: () => this.addDays(2) },
      { regex: /\bayer\b/i, resolver: () => this.addDays(-1) },
      
      // Días de la semana
      { regex: /\b(próximo|este)\s+(lunes|martes|...)\b/i, resolver: (m) => this.nextWeekday(m[2]) },
      
      // Períodos
      { regex: /\ben (\d+) días?\b/i, resolver: (m) => this.addDays(parseInt(m[1])) },
      { regex: /\bla próxima semana\b/i, resolver: () => this.nextWeek() },
      { regex: /\beste mes\b/i, resolver: () => this.thisMonth() },
      
      // Absolutos
      { regex: /\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/, resolver: (m) => this.parseDate(m) },
    ];

    for (const { regex, resolver } of patterns) {
      const match = text.match(regex);
      if (match) {
        return {
          date: resolver(match),
          original: match[0],
          confidence: 0.95,
        };
      }
    }

    return { date: null, confidence: 0 };
  }
}
```

---

### P1: Filtros Avanzados

```javascript
// parsing/QueryParser.js
class QueryParser {
  parse(text, tableSchema) {
    return {
      filters: this.extractFilters(text, tableSchema),
      sort: this.extractSort(text),
      limit: this.extractLimit(text),
      fields: this.extractFields(text, tableSchema),
    };
  }

  extractFilters(text, schema) {
    const filters = {};
    
    // Filtros de igualdad: "cliente Juan"
    // Filtros de rango: "entre 100 y 500"
    // Filtros de fecha: "de la semana pasada"
    // Filtros de estado: "pendientes", "activos"
    
    return filters;
  }
}
```

#### Queries Soportadas:
| Query Natural | Filtros Generados |
|---------------|-------------------|
| "ventas de Juan" | `{ cliente: "Juan" }` |
| "ventas mayores a 100000" | `{ total: { $gt: 100000 } }` |
| "citas de esta semana" | `{ fecha: { $gte: "2026-02-09", $lte: "2026-02-15" } }` |
| "clientes VIP activos" | `{ tipo: "VIP", estado: "Activo" }` |
| "los últimos 5 pedidos" | `{ sort: { fecha: -1 }, limit: 5 }` |

---

### P2: Variación de Respuestas

```javascript
// responses/ResponseVariator.js
class ResponseVariator {
  constructor() {
    this.templates = {
      createSuccess: [
        "✅ ¡Listo! {item} creado correctamente.",
        "✅ ¡Perfecto! Ya registré {item}.",
        "✅ ¡Hecho! {item} quedó guardado.",
        "✅ ¡Excelente! {item} ha sido creado con éxito.",
      ],
      askField: {
        fecha: [
          "📅 ¿Para qué fecha?",
          "📅 ¿Cuándo sería?",
          "📅 ¿Qué día prefieres?",
        ],
        hora: [
          "🕐 ¿A qué hora?",
          "🕐 ¿Qué horario te conviene?",
          "🕐 ¿Para qué hora lo agendamos?",
        ],
      },
    };
    this.lastUsed = new Map(); // Evitar repeticiones
  }

  vary(templateKey, context = {}) {
    const options = this.templates[templateKey];
    if (!options) return null;

    // Seleccionar variación no usada recientemente
    const available = options.filter(t => !this.lastUsed.get(templateKey)?.includes(t));
    const selected = available.length > 0 
      ? available[Math.floor(Math.random() * available.length)]
      : options[Math.floor(Math.random() * options.length)];

    // Registrar uso
    this.trackUsage(templateKey, selected);

    // Interpolar variables
    return this.interpolate(selected, context);
  }
}
```

---

### P3: Memoria de Usuario

```javascript
// memory/UserMemory.js
class UserMemory {
  constructor(store) {
    this.store = store;
  }

  async remember(userId, key, value, ttl = null) {
    const memory = await this.store.get(userId) || {};
    memory[key] = { value, updatedAt: Date.now(), ttl };
    await this.store.set(userId, memory);
  }

  async recall(userId, key) {
    const memory = await this.store.get(userId);
    if (!memory?.[key]) return null;
    
    const { value, updatedAt, ttl } = memory[key];
    if (ttl && Date.now() - updatedAt > ttl) {
      await this.forget(userId, key);
      return null;
    }
    return value;
  }

  // Preferencias que se recuerdan:
  // - Nombre del usuario
  // - Teléfono preferido
  // - Horarios frecuentes
  // - Productos favoritos
}
```

---

## 🔄 Flujo de Procesamiento

```
                    ┌──────────────────┐
                    │  Mensaje Usuario │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │ TextPreprocessor │ ← P0
                    │  - Ortografía    │
                    │  - Normalizar    │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  IntentDetector  │ ← P2
                    │  - Clasificar    │
                    │  - Desambiguar   │
                    └────────┬─────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
    ┌─────────▼─────────┐         ┌─────────▼─────────┐
    │   QueryParser     │         │   FieldCollector  │
    │   - Filtros  P1   │         │   - Campos        │
    │   - Fechas        │         │   - Validar       │
    └─────────┬─────────┘         └─────────┬─────────┘
              │                             │
              └──────────────┬──────────────┘
                             │
                    ┌────────▼─────────┐
                    │  ActionHandler   │
                    │  - Query/Create  │
                    │  - Update/Delete │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  ErrorHandler    │ ← P0
                    │  - Recovery      │
                    │  - Fallback      │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │ ResponseBuilder  │ ← P2
                    │  - Variación     │
                    │  - Formatear     │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │   UserMemory     │ ← P3
                    │  - Guardar ctx   │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │    Respuesta     │
                    └──────────────────┘
```

---

## 📅 Plan de Implementación

### Fase 1: P0 - Fundamentos (Semana 1-2)
- [ ] `TextPreprocessor` con correcciones básicas
- [ ] `ErrorHandler` centralizado
- [ ] `UserFriendlyMessages`
- [ ] Tests unitarios

### Fase 2: P1 - Parsing (Semana 3-4)
- [ ] `DateNormalizer` completo
- [ ] `TimeNormalizer` con contexto
- [ ] `QueryParser` con filtros
- [ ] Tests de integración

### Fase 3: P2 - UX (Semana 5-6)
- [ ] `IntentDisambiguator`
- [ ] `ResponseVariator`
- [ ] `ToneAdapter`
- [ ] Tests E2E

### Fase 4: P3 - Personalización (Semana 7-8)
- [ ] `UserMemory`
- [ ] `ConversationMemory`
- [ ] Integración completa
- [ ] Optimización

---

## 📝 Contratos de Interface

```javascript
// Todos los Processors deben implementar:
interface IProcessor {
  process(text: string, options?: object): Promise<ProcessorResult>;
}

interface ProcessorResult {
  text: string;
  changes?: Change[];
  confidence?: number;
}

// Todos los Normalizers deben implementar:
interface INormalizer {
  normalize(value: string, context?: object): NormalizedResult;
}

interface NormalizedResult {
  value: any;
  original: string;
  confidence: number;
  type: string;
}

// Todos los Handlers deben implementar:
interface IHandler {
  canHandle(context: Context): Promise<boolean>;
  execute(context: Context): Promise<HandlerResult>;
  getPriority(): number;
}
```

---

## 🧪 Testing

```javascript
// Cada módulo debe tener:
// 1. Unit tests (>80% coverage)
// 2. Integration tests
// 3. Edge cases documentados

describe('TextPreprocessor', () => {
  it('corrige ortografía común', () => {
    expect(processor.process('quero')).toBe('quiero');
  });
  
  it('expande abreviaciones', () => {
    expect(processor.process('xq no')).toBe('porque no');
  });
  
  it('mantiene nombres propios', () => {
    expect(processor.process('Juan')).toBe('Juan');
  });
});
```

---

## 🔐 Configuración por Workspace

```javascript
// Cada workspace puede personalizar:
const workspaceConfig = {
  preprocessing: {
    enabled: true,
    spellCheck: true,
    expandAbbreviations: true,
  },
  detection: {
    strategy: 'hybrid', // 'rules', 'llm', 'hybrid'
    confidenceThreshold: 0.6,
  },
  responses: {
    tone: 'friendly', // 'formal', 'friendly', 'casual'
    useEmojis: true,
    variationEnabled: true,
  },
  memory: {
    enabled: true,
    ttl: 86400000, // 24 horas
  },
};
```
