/**
 * Configuración de Tours de Onboarding - FlowAI
 * 
 * Define los pasos guiados para cada sección de la aplicación.
 * Diseño profesional con contenido claro para usuarios no técnicos.
 */

// ============================================================================
// TOUR: Dashboard Principal
// ============================================================================
export const dashboardTourSteps = [
  {
    element: '[data-tour="welcome"]',
    title: 'Bienvenido a FlowAI',
    intro: `
      <div style="line-height: 1.7;">
        <p>Esta es tu <strong>página principal</strong> donde puedes ver un resumen completo de tu negocio.</p>
        <p style="margin-top: 12px; color: #a78bfa;">Te guiaremos paso a paso para que domines la plataforma.</p>
      </div>
    `,
    position: 'bottom'
  },
  {
    element: '[data-tour="sidebar"]',
    title: 'Menú de Navegación',
    intro: `
      <div style="line-height: 1.7;">
        <p>Desde el <strong>menú lateral</strong> accedes a todas las secciones:</p>
        <div style="margin-top: 16px; display: grid; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="width: 8px; height: 8px; background: #8b5cf6; border-radius: 50%;"></span>
            <span><strong>Proyectos</strong> — Espacios de trabajo</span>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="width: 8px; height: 8px; background: #6366f1; border-radius: 50%;"></span>
            <span><strong>Asistente IA</strong> — Tu chatbot inteligente</span>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="width: 8px; height: 8px; background: #06b6d4; border-radius: 50%;"></span>
            <span><strong>Mis datos</strong> — Tablas de información</span>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="width: 8px; height: 8px; background: #10b981; border-radius: 50%;"></span>
            <span><strong>Automatizar</strong> — Flujos de trabajo</span>
          </div>
        </div>
      </div>
    `,
    position: 'right'
  },
  {
    element: '[data-tour="workspace-selector"]',
    title: 'Selector de Proyecto',
    intro: `
      <div style="line-height: 1.7;">
        <p>Selecciona el <strong>proyecto activo</strong> en el que deseas trabajar.</p>
        <p style="margin-top: 12px; color: #a1a1b5;">Cada proyecto tiene sus propios datos, asistentes y configuraciones independientes.</p>
      </div>
    `,
    position: 'bottom'
  },
  {
    element: '[data-tour="stats-cards"]',
    title: 'Panel de Estadísticas',
    intro: `
      <div style="line-height: 1.7;">
        <p>Las <strong>tarjetas de resumen</strong> muestran métricas clave:</p>
        <div style="margin-top: 16px; display: grid; gap: 8px;">
          <div style="padding: 8px 12px; background: rgba(99, 102, 241, 0.1); border-radius: 8px; border-left: 3px solid #6366f1;">
            Total de proyectos activos
          </div>
          <div style="padding: 8px 12px; background: rgba(6, 182, 212, 0.1); border-radius: 8px; border-left: 3px solid #06b6d4;">
            Tablas de datos creadas
          </div>
          <div style="padding: 8px 12px; background: rgba(16, 185, 129, 0.1); border-radius: 8px; border-left: 3px solid #10b981;">
            Registros almacenados
          </div>
        </div>
      </div>
    `,
    position: 'bottom'
  },
  {
    element: '[data-tour="quick-actions"]',
    title: 'Acciones Rápidas',
    intro: `
      <div style="line-height: 1.7;">
        <p>Ejecuta <strong>acciones frecuentes</strong> con un solo clic, sin necesidad de navegar por los menús.</p>
      </div>
    `,
    position: 'left'
  }
];

// ============================================================================
// TOUR: Chat con IA
// ============================================================================
export const chatTourSteps = [
  {
    element: '[data-tour="chat-welcome"]',
    title: 'Centro de Conversaciones',
    intro: `
      <div style="line-height: 1.7;">
        <p>Bienvenido al <strong>Chat con tu Asistente IA</strong>.</p>
        <p style="margin-top: 12px;">Aquí conversas con tu chatbot inteligente que puede ayudarte con consultas, reservas, búsquedas y mucho más.</p>
      </div>
    `,
    position: 'bottom'
  },
  {
    element: '[data-tour="chat-sidebar"]',
    title: 'Historial de Chats',
    intro: `
      <div style="line-height: 1.7;">
        <p>El panel lateral muestra todas tus <strong>conversaciones previas</strong>.</p>
        <div style="margin-top: 16px; display: grid; gap: 6px; font-size: 13px; color: #a1a1b5;">
          <div>• Haz clic en una conversación para continuarla</div>
          <div>• Usa <strong style="color: #fff;">+</strong> para iniciar un nuevo chat</div>
          <div>• Renombra o elimina conversaciones según necesites</div>
        </div>
      </div>
    `,
    position: 'right'
  },
  {
    element: '[data-tour="chat-agent-selector"]',
    title: 'Selector de Asistente',
    intro: `
      <div style="line-height: 1.7;">
        <p>Si tienes varios asistentes, <strong>selecciona con cuál deseas chatear</strong>.</p>
        <p style="margin-top: 12px; color: #a1a1b5;">Cada asistente puede tener diferentes capacidades y acceso a distintas tablas de datos.</p>
      </div>
    `,
    position: 'bottom'
  },
  {
    element: '[data-tour="chat-messages"]',
    title: 'Área de Mensajes',
    intro: `
      <div style="line-height: 1.7;">
        <p>Aquí se muestra la <strong>conversación en tiempo real</strong>.</p>
        <div style="margin-top: 16px; padding: 12px; background: rgba(139, 92, 246, 0.08); border-radius: 10px; font-size: 13px;">
          <div style="margin-bottom: 8px;"><strong>Tus mensajes</strong> aparecen a la derecha</div>
          <div><strong>Respuestas del asistente</strong> aparecen a la izquierda</div>
        </div>
      </div>
    `,
    position: 'bottom'
  },
  {
    element: '[data-tour="chat-input"]',
    title: 'Envía tu Mensaje',
    intro: `
      <div style="line-height: 1.7;">
        <p>Escribe tu mensaje y presiona <strong>Enter</strong> para enviarlo.</p>
        <div style="margin-top: 16px; padding: 14px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(99, 102, 241, 0.1)); border-radius: 10px; border: 1px solid rgba(139, 92, 246, 0.2);">
          <div style="font-size: 12px; color: #a78bfa; margin-bottom: 6px;">EJEMPLO</div>
          <div style="font-style: italic;">"Quiero hacer una reserva para mañana a las 3pm"</div>
        </div>
      </div>
    `,
    position: 'top'
  }
];

// ============================================================================
// TOUR: Editor de Flujos
// ============================================================================
export const flowEditorTourSteps = [
  {
    element: '[data-tour="flow-welcome"]',
    title: 'Editor de Automatizaciones',
    intro: `
      <div style="line-height: 1.7;">
        <p>Bienvenido al <strong>Editor Visual de Flujos</strong>.</p>
        <p style="margin-top: 12px;">Crea automatizaciones potentes arrastrando y conectando bloques — <em style="color: #a78bfa;">sin escribir código</em>.</p>
      </div>
    `,
    position: 'bottom'
  },
  {
    element: '[data-tour="flow-canvas"]',
    title: 'Lienzo de Trabajo',
    intro: `
      <div style="line-height: 1.7;">
        <p>Este es tu <strong>espacio de diseño</strong> donde construyes los flujos.</p>
        <div style="margin-top: 16px; display: grid; gap: 8px; font-size: 13px;">
          <div style="padding: 8px 12px; background: rgba(255, 255, 255, 0.05); border-radius: 8px;">
            <strong>Arrastrar</strong> — Mueve nodos por el lienzo
          </div>
          <div style="padding: 8px 12px; background: rgba(255, 255, 255, 0.05); border-radius: 8px;">
            <strong>Conectar</strong> — Une nodos desde los puntos de conexión
          </div>
          <div style="padding: 8px 12px; background: rgba(255, 255, 255, 0.05); border-radius: 8px;">
            <strong>Zoom</strong> — Usa la rueda del mouse
          </div>
        </div>
      </div>
    `,
    position: 'bottom'
  },
  {
    element: '[data-tour="flow-nodes-panel"]',
    title: 'Panel de Bloques',
    intro: `
      <div style="line-height: 1.7;">
        <p>Estos son los <strong>tipos de bloques</strong> disponibles:</p>
        <div style="margin-top: 16px; display: grid; gap: 6px; font-size: 13px;">
          <div style="display: flex; gap: 10px; align-items: center;">
            <span style="width: 10px; height: 10px; background: #f59e0b; border-radius: 3px;"></span>
            <span><strong>Trigger</strong> — Inicia el flujo</span>
          </div>
          <div style="display: flex; gap: 10px; align-items: center;">
            <span style="width: 10px; height: 10px; background: #3b82f6; border-radius: 3px;"></span>
            <span><strong>Respuesta</strong> — Envía mensaje</span>
          </div>
          <div style="display: flex; gap: 10px; align-items: center;">
            <span style="width: 10px; height: 10px; background: #10b981; border-radius: 3px;"></span>
            <span><strong>Recolectar</strong> — Pide datos</span>
          </div>
          <div style="display: flex; gap: 10px; align-items: center;">
            <span style="width: 10px; height: 10px; background: #8b5cf6; border-radius: 3px;"></span>
            <span><strong>Acción</strong> — Ejecuta tarea</span>
          </div>
        </div>
      </div>
    `,
    position: 'left'
  },
  {
    element: '[data-tour="flow-templates"]',
    title: 'Plantillas Prediseñadas',
    intro: `
      <div style="line-height: 1.7;">
        <p>¿Primera vez? Comienza con una <strong>plantilla lista</strong>.</p>
        <p style="margin-top: 12px; color: #a1a1b5;">Disponibles para: reservas, soporte al cliente, registro de datos, notificaciones y más.</p>
      </div>
    `,
    position: 'bottom'
  },
  {
    element: '[data-tour="flow-save"]',
    title: 'Guardar Cambios',
    intro: `
      <div style="line-height: 1.7;">
        <p>Recuerda <strong>guardar tu flujo</strong> al terminar de editarlo.</p>
        <div style="margin-top: 16px; padding: 12px; background: rgba(16, 185, 129, 0.1); border-radius: 10px; border: 1px solid rgba(16, 185, 129, 0.2); font-size: 13px;">
          Una vez guardado, el flujo se activará automáticamente cuando un usuario escriba las palabras clave configuradas.
        </div>
      </div>
    `,
    position: 'bottom'
  }
];

// ============================================================================
// TOUR: Tablas de Datos
// ============================================================================
export const tablesTourSteps = [
  {
    element: '[data-tour="tables-welcome"]',
    title: 'Centro de Datos',
    intro: `
      <div style="line-height: 1.7;">
        <p>Bienvenido a <strong>Mis Datos</strong>.</p>
        <p style="margin-top: 12px;">Crea y gestiona tablas para almacenar toda la información de tu negocio: clientes, reservas, productos, inventario y más.</p>
      </div>
    `,
    position: 'bottom'
  },
  {
    element: '[data-tour="tables-list"]',
    title: 'Lista de Tablas',
    intro: `
      <div style="line-height: 1.7;">
        <p>Aquí ves todas las <strong>tablas de tu proyecto</strong>.</p>
        <div style="margin-top: 16px; display: grid; gap: 6px; font-size: 13px; color: #a1a1b5;">
          <div>• Selecciona una tabla para ver sus datos</div>
          <div>• Usa los iconos para editar o eliminar</div>
          <div>• El número indica cuántos registros tiene</div>
        </div>
      </div>
    `,
    position: 'right'
  },
  {
    element: '[data-tour="tables-create"]',
    title: 'Nueva Tabla',
    intro: `
      <div style="line-height: 1.7;">
        <p>Haz clic aquí para <strong>crear una nueva tabla</strong>.</p>
        <p style="margin-top: 12px; color: #a1a1b5;">Define los campos que necesitas: texto, números, fechas, emails, teléfonos, opciones y más.</p>
      </div>
    `,
    position: 'left'
  },
  {
    element: '[data-tour="tables-data"]',
    title: 'Visor de Datos',
    intro: `
      <div style="line-height: 1.7;">
        <p>El panel principal muestra los <strong>datos de la tabla seleccionada</strong>.</p>
        <div style="margin-top: 16px; display: grid; gap: 8px; font-size: 13px;">
          <div style="padding: 8px 12px; background: rgba(99, 102, 241, 0.1); border-radius: 8px;">
            Agregar, editar y eliminar registros
          </div>
          <div style="padding: 8px 12px; background: rgba(6, 182, 212, 0.1); border-radius: 8px;">
            Buscar y filtrar información
          </div>
          <div style="padding: 8px 12px; background: rgba(16, 185, 129, 0.1); border-radius: 8px;">
            Exportar datos a CSV o JSON
          </div>
        </div>
      </div>
    `,
    position: 'bottom'
  }
];

// ============================================================================
// TOUR: Agentes de IA
// ============================================================================
export const agentsTourSteps = [
  {
    element: '[data-tour="agents-welcome"]',
    title: 'Asistentes Inteligentes',
    intro: `
      <div style="line-height: 1.7;">
        <p>Bienvenido a <strong>Asistentes de IA</strong>.</p>
        <p style="margin-top: 12px;">Configura chatbots inteligentes que pueden atender clientes, responder preguntas y ejecutar tareas automáticamente.</p>
      </div>
    `,
    position: 'bottom'
  },
  {
    element: '[data-tour="agents-list"]',
    title: 'Tus Asistentes',
    intro: `
      <div style="line-height: 1.7;">
        <p>Aquí ves todos los <strong>asistentes configurados</strong>.</p>
        <p style="margin-top: 12px; color: #a1a1b5;">Puedes tener múltiples asistentes con diferentes personalidades, capacidades y acceso a datos.</p>
      </div>
    `,
    position: 'right'
  },
  {
    element: '[data-tour="agents-create"]',
    title: 'Crear Asistente',
    intro: `
      <div style="line-height: 1.7;">
        <p>Haz clic aquí para <strong>crear un nuevo asistente</strong>.</p>
        <p style="margin-top: 12px; color: #a1a1b5;">Podrás definir su nombre, instrucciones de comportamiento, modelo de IA y tablas que puede consultar.</p>
      </div>
    `,
    position: 'left'
  }
];

// ============================================================================
// TOUR: Workspaces (Proyectos)
// ============================================================================
export const workspacesTourSteps = [
  {
    element: '[data-tour="workspaces-welcome"]',
    title: 'Gestión de Proyectos',
    intro: `
      <div style="line-height: 1.7;">
        <p>Bienvenido a <strong>Proyectos</strong>.</p>
        <p style="margin-top: 12px;">Un proyecto (workspace) es un espacio independiente donde organizas todos los datos de un negocio o área específica.</p>
      </div>
    `,
    position: 'bottom'
  },
  {
    element: '[data-tour="workspaces-list"]',
    title: 'Tus Proyectos',
    intro: `
      <div style="line-height: 1.7;">
        <p>Aquí ves todos tus <strong>proyectos activos</strong>.</p>
        <div style="margin-top: 16px; padding: 12px; background: rgba(139, 92, 246, 0.08); border-radius: 10px; font-size: 13px;">
          Cada proyecto tiene sus propios datos, asistentes y flujos. La información no se mezcla entre proyectos.
        </div>
      </div>
    `,
    position: 'right'
  },
  {
    element: '[data-tour="workspaces-create"]',
    title: 'Nuevo Proyecto',
    intro: `
      <div style="line-height: 1.7;">
        <p>Haz clic aquí para <strong>crear un nuevo proyecto</strong>.</p>
        <div style="margin-top: 16px; font-size: 13px; color: #a78bfa;">
          Ejemplos: "Mi Restaurante", "Clínica Dental", "Tienda Online", "Consultorio Legal"
        </div>
      </div>
    `,
    position: 'left'
  }
];

// ============================================================================
// TOUR: Global - Introducción general
// ============================================================================
export const globalTourSteps = [
  {
    title: 'Bienvenido a FlowAI',
    intro: `
      <div style="line-height: 1.7; text-align: center;">
        <div style="width: 64px; height: 64px; margin: 0 auto 20px; background: linear-gradient(135deg, #8b5cf6, #6366f1); border-radius: 16px; display: flex; align-items: center; justify-content: center;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
          </svg>
        </div>
        <p>Te damos la bienvenida a <strong>FlowAI</strong>, tu plataforma de automatización con inteligencia artificial.</p>
        <p style="margin-top: 16px; color: #a1a1b5;">Duración del tour: ~2 minutos</p>
      </div>
    `,
  },
  {
    element: '[data-tour="sidebar"]',
    title: 'Navegación Principal',
    intro: `
      <div style="line-height: 1.7;">
        <p>El <strong>menú lateral</strong> es tu centro de navegación.</p>
        <p style="margin-top: 12px; color: #a1a1b5;">Desde aquí accedes a todas las funcionalidades de la plataforma.</p>
      </div>
    `,
    position: 'right'
  },
  {
    element: '[data-tour="nav-workspaces"]',
    title: 'Proyectos',
    intro: `
      <div style="line-height: 1.7;">
        <p><strong>Proyectos</strong> son espacios de trabajo independientes.</p>
        <p style="margin-top: 12px; color: #a1a1b5;">Ideal para separar diferentes negocios o áreas de tu empresa.</p>
      </div>
    `,
    position: 'right'
  },
  {
    element: '[data-tour="nav-agents"]',
    title: 'Asistentes de IA',
    intro: `
      <div style="line-height: 1.7;">
        <p>Configura <strong>chatbots inteligentes</strong> que trabajan para ti.</p>
        <p style="margin-top: 12px; color: #a1a1b5;">Pueden atender clientes, responder preguntas y ejecutar acciones automáticas.</p>
      </div>
    `,
    position: 'right'
  },
  {
    element: '[data-tour="nav-tables"]',
    title: 'Mis Datos',
    intro: `
      <div style="line-height: 1.7;">
        <p>Crea <strong>tablas</strong> para almacenar información estructurada.</p>
        <p style="margin-top: 12px; color: #a1a1b5;">Clientes, productos, citas, inventario — todo organizado.</p>
      </div>
    `,
    position: 'right'
  },
  {
    element: '[data-tour="nav-flows"]',
    title: 'Automatizaciones',
    intro: `
      <div style="line-height: 1.7;">
        <p>Diseña <strong>flujos automáticos</strong> con el editor visual.</p>
        <div style="margin-top: 12px; padding: 10px; background: rgba(139, 92, 246, 0.1); border-radius: 8px; font-size: 13px;">
          Ejemplo: cuando alguien dice "reservar", el bot solicita los datos necesarios y crea la reserva automáticamente.
        </div>
      </div>
    `,
    position: 'right'
  },
  {
    element: '[data-tour="nav-chat"]',
    title: 'Chat',
    intro: `
      <div style="line-height: 1.7;">
        <p><strong>Prueba tu asistente</strong> en tiempo real.</p>
        <p style="margin-top: 12px; color: #a1a1b5;">Este es el mismo chat que usarán tus clientes para interactuar con el bot.</p>
      </div>
    `,
    position: 'right'
  },
  {
    title: '¡Listo para comenzar!',
    intro: `
      <div style="line-height: 1.7; text-align: center;">
        <div style="width: 48px; height: 48px; margin: 0 auto 16px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
            <path d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <p>Ya conoces lo esencial de FlowAI.</p>
        <div style="margin-top: 20px; text-align: left; padding: 16px; background: rgba(139, 92, 246, 0.08); border-radius: 12px;">
          <div style="font-size: 12px; color: #a78bfa; margin-bottom: 10px; font-weight: 600;">PRÓXIMOS PASOS</div>
          <div style="display: grid; gap: 8px; font-size: 14px;">
            <div>1. Crea tu primer proyecto</div>
            <div>2. Agrega una tabla de datos</div>
            <div>3. Configura un asistente</div>
            <div>4. ¡Pruébalo en el Chat!</div>
          </div>
        </div>
        <p style="margin-top: 16px; font-size: 13px; color: #71717a;">Cada página tiene su propio tour de ayuda.</p>
      </div>
    `,
  }
];

// ============================================================================
// Función helper para obtener el tour adecuado según la ruta
// ============================================================================
export function getTourByRoute(pathname) {
  if (pathname === '/' || pathname === '/dashboard') {
    return { id: 'dashboard', steps: dashboardTourSteps };
  }
  if (pathname === '/chat') {
    return { id: 'chat', steps: chatTourSteps };
  }
  if (pathname === '/flows' || pathname.startsWith('/flows')) {
    return { id: 'flow-editor', steps: flowEditorTourSteps };
  }
  if (pathname === '/tables') {
    return { id: 'tables', steps: tablesTourSteps };
  }
  if (pathname === '/agents') {
    return { id: 'agents', steps: agentsTourSteps };
  }
  if (pathname === '/workspaces') {
    return { id: 'workspaces', steps: workspacesTourSteps };
  }
  return { id: 'global', steps: globalTourSteps };
}

export default {
  dashboardTourSteps,
  chatTourSteps,
  flowEditorTourSteps,
  tablesTourSteps,
  agentsTourSteps,
  workspacesTourSteps,
  globalTourSteps,
  getTourByRoute,
};
