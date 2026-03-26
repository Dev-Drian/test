/**
 * Guía - Página de ayuda y documentación
 */
import { Link } from "react-router-dom";
import { ClipboardIcon, LightBulbIcon, SparklesIcon, FolderIcon, ChartIcon, RobotIcon, BoltIcon, ChatIcon as ChatIconComponent } from "../components/Icons";

// Iconos SVG
const Icons = {
  book: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  ),
  workspace: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  ),
  table: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h7.5" />
    </svg>
  ),
  agent: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611l-1.397.233a3.61 3.61 0 01-1.785-.163L15 19.5M5 14.5l-1.402 1.402c-1.232 1.232-.65 3.318 1.067 3.611l1.397.233a3.61 3.61 0 001.785-.163L9 19.5" />
    </svg>
  ),
  chat: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
    </svg>
  ),
  flow: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  ),
  check: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  ),
};

const steps = [
  {
    number: 1,
    title: "Crear un Workspace",
    icon: Icons.workspace,
    color: "#10b981",
    description: "El workspace es tu espacio de trabajo aislado. Cada workspace tiene sus propias tablas, agentes y conversaciones.",
    actions: [
      "Ve a Workspaces en el menú lateral",
      "Haz clic en 'Nuevo Workspace'",
      "Asigna un nombre y color",
      "El workspace activo se muestra en la barra lateral"
    ],
    link: "/workspaces"
  },
  {
    number: 2,
    title: "Crear Tablas",
    icon: Icons.table,
    color: "#3b82f6",
    description: "Las tablas almacenan tus datos estructurados. El agente de IA podrá consultar y modificar estos datos.",
    actions: [
      "Ve a Tablas con un workspace activo",
      "Usa el asistente para crear una tabla",
      "Define los campos (nombre, tipo, requerido)",
      "Añade datos a través del formulario"
    ],
    link: "/tables"
  },
  {
    number: 3,
    title: "Crear un Agente",
    icon: Icons.agent,
    color: "#8b5cf6",
    description: "Los agentes son asistentes de IA personalizados que pueden acceder a tus tablas y responder consultas.",
    actions: [
      "Ve a Agentes",
      "Crea un nuevo agente con nombre y descripción",
      "Elige el modelo de IA (GPT-4o, GPT-4o Mini)",
      "Vincula las tablas que el agente puede usar"
    ],
    link: "/agents"
  },
  {
    number: 4,
    title: "Crear Flujos (Opcional)",
    icon: Icons.flow,
    color: "#f59e0b",
    description: "Los flujos son automatizaciones visuales. Conecta bloques para crear procesos automáticos sin código.",
    actions: [
      "Ve a Flujos",
      "Arrastra bloques al canvas",
      "Conecta los bloques entre sí",
      "Configura cada bloque según tu necesidad"
    ],
    link: "/flows"
  },
  {
    number: 5,
    title: "Chatear con el Agente",
    icon: Icons.chat,
    color: "#ec4899",
    description: "Usa el chat para interactuar con tu agente en lenguaje natural. El agente usará tus tablas para responder.",
    actions: [
      "Ve a Chat",
      "Selecciona el agente",
      "Escribe tu mensaje en lenguaje natural",
      "El agente consultará/modificará tus datos automáticamente"
    ],
    link: "/chat"
  }
];

const concepts = [
  {
    title: "Workspace",
    icon: <FolderIcon size="lg" />,
    description: "Entorno aislado con tablas, agentes y chats propios. Ideal para separar proyectos."
  },
  {
    title: "Tablas",
    icon: <ChartIcon size="lg" />,
    description: "Almacenan datos estructurados. Define campos con tipos (texto, numero, fecha, etc.)."
  },
  {
    title: "Agentes",
    icon: <RobotIcon size="lg" />,
    description: "Asistentes de IA que acceden a tus tablas. Configurables con diferentes modelos."
  },
  {
    title: "Flujos",
    icon: <BoltIcon size="lg" />,
    description: "Automatizaciones visuales. Conecta bloques para crear procesos sin codigo."
  },
  {
    title: "Chat",
    icon: <ChatIconComponent size="lg" />,
    description: "Interfaz para hablar con agentes. Usa lenguaje natural para consultar datos."
  }
];

// Funcionalidades avanzadas
const advancedFeatures = [
  {
    title: "Estadisticas",
    color: "#8b5cf6",
    description: "Ve metricas de tus conversaciones: mensajes por dia, usuarios activos, tiempos de respuesta. Incluye analisis con IA."
  },
  {
    title: "Crear con IA",
    color: "#06b6d4",
    description: "Describe en palabras lo que quieres que haga tu bot y la IA genera el flujo completo automaticamente."
  },
  {
    title: "Plantillas",
    color: "#10b981",
    description: "Bots prediseñados listos para usar: soporte, ventas, citas medicas, inmobiliaria y mas. Solo instala y personaliza."
  },
  {
    title: "Conexiones",
    color: "#f59e0b",
    description: "Conecta tu bot con otras aplicaciones. Recibe datos de formularios, pagos, CRMs y mas mediante webhooks."
  },
  {
    title: "Variables",
    color: "#ec4899",
    description: "Configura datos de tu negocio en un solo lugar: horarios, precios, telefonos. Usables en todos tus flujos con {{variable}}."
  },
  {
    title: "App Movil",
    color: "#3b82f6",
    description: "Monitorea tus chats desde tu celular. Escanea un codigo QR y recibe notificaciones en tiempo real."
  },
  {
    title: "Revisar Flujos",
    color: "#ef4444",
    description: "Detecta problemas en tus flujos automaticamente. Obtiene sugerencias de la IA para mejorar el rendimiento."
  }
];

export default function Guia() {
  return (
    <div className="min-h-full py-4 px-5" style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #0f0f18 100%)' }}>
      <div className="max-w-5xl mx-auto">
        {/* Header - más compacto */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-indigo-400 shrink-0" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(99, 102, 241, 0.05))' }}>
            {Icons.book}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Guía de Uso</h1>
            <p className="text-slate-400 text-sm">
              Aprende a usar la plataforma paso a paso
            </p>
          </div>
        </div>

        {/* Pasos */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
              <ClipboardIcon size="sm" />
            </span>
            Pasos para comenzar
          </h2>
          
          <div className="space-y-3">
            {steps.map((step, idx) => (
              <div 
                key={step.number}
                className="p-4 rounded-xl transition-all duration-200 hover:scale-[1.01]"
                style={{ 
                  background: 'rgba(51, 65, 85, 0.4)', 
                  border: '1px solid rgba(100, 116, 139, 0.3)',
                  borderLeft: `4px solid ${step.color}`
                }}
              >
                <div className="flex items-start gap-3">
                  {/* Número */}
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold shrink-0"
                    style={{ background: step.color }}
                  >
                    {step.number}
                  </div>
                  
                  {/* Contenido */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-slate-100">{step.title}</h3>
                      <Link 
                        to={step.link}
                        className="text-xs px-2.5 py-1 rounded-lg transition-all hover:scale-105"
                        style={{ background: `${step.color}20`, color: step.color }}
                      >
                        Ir →
                      </Link>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">{step.description}</p>
                    
                    <div className="grid grid-cols-2 gap-1.5">
                      {step.actions.map((action, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs text-slate-500">
                          <span className="w-4 h-4 rounded flex items-center justify-center shrink-0" style={{ background: `${step.color}15`, color: step.color }}>
                            {Icons.check}
                          </span>
                          {action}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Conceptos */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
              <LightBulbIcon size="sm" />
            </span>
            Conceptos clave
          </h2>
          
          <div className="grid grid-cols-3 lg:grid-cols-5 gap-3">
            {concepts.map((concept) => (
              <div 
                key={concept.title}
                className="p-3 rounded-xl transition-all duration-200 hover:scale-[1.02]"
                style={{ 
                  background: 'rgba(51, 65, 85, 0.4)', 
                  border: '1px solid rgba(100, 116, 139, 0.3)'
                }}
              >
                <span className="text-2xl mb-2 block text-indigo-400">{concept.icon}</span>
                <h3 className="text-xs font-semibold text-slate-100 mb-0.5">{concept.title}</h3>
                <p className="text-[10px] text-slate-500 leading-tight">{concept.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Funcionalidades Avanzadas */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-100 mb-2 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
              <SparklesIcon size="sm" />
            </span>
            Funcionalidades Avanzadas
          </h2>
          <p className="text-slate-500 text-xs mb-3">
            Accede desde el menu lateral en "Avanzado" para desbloquear estas herramientas.
          </p>
          
          <div className="grid grid-cols-2 gap-3">
            {advancedFeatures.map((feature) => (
              <div 
                key={feature.title}
                className="p-3 rounded-xl transition-all duration-200 hover:scale-[1.01]"
                style={{ 
                  background: 'rgba(51, 65, 85, 0.4)', 
                  border: '1px solid rgba(100, 116, 139, 0.3)',
                  borderLeft: `3px solid ${feature.color}`
                }}
              >
                <h3 className="text-xs font-semibold mb-1" style={{ color: feature.color }}>{feature.title}</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
          
          <Link 
            to="/advanced"
            className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
            style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#a78bfa' }}
          >
            Explorar funciones avanzadas →
          </Link>
        </div>

        {/* Tips */}
        <div 
          className="p-4 rounded-xl" 
          style={{ 
            background: 'rgba(99, 102, 241, 0.05)', 
            border: '1px solid rgba(99, 102, 241, 0.2)'
          }}
        >
          <h3 className="text-sm font-semibold text-indigo-400 mb-3 flex items-center gap-2"><SparklesIcon size="sm" /> Tips para aprovechar al máximo</h3>
          <ul className="grid grid-cols-2 gap-2 text-xs text-indigo-400/80">
            <li className="flex items-start gap-2">
              <span className="text-indigo-400">•</span>
              <span>Empieza con una plantilla prediseñada - te ahorrará tiempo</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-400">•</span>
              <span>Usa "Crear con IA" para generar bots automáticamente</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-400">•</span>
              <span>Configura variables una vez y úsalas en todos los flujos</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-400">•</span>
              <span>Revisa estadísticas para ver qué preguntan tus usuarios</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-400">•</span>
              <span>Usa "Revisar Flujos" para detectar problemas</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-400">•</span>
              <span>Conecta la app móvil para notificaciones</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
