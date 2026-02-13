/**
 * Seed: Plantillas de Flujos
 * Plantillas globales para crear flujos rápidamente
 */
import { v4 as uuidv4 } from "uuid";
import { connectDB, getFlowTemplatesDbName } from "../config/db.js";

const flowTemplates = [
  {
    _id: uuidv4(),
    name: "Reservación",
    description: "Captura reservas con validación de disponibilidad",
    icon: "📅",
    color: "emerald",
    isTemplate: true,
    nodes: [
      { 
        id: "trigger-1", 
        type: "trigger", 
        position: { x: 250, y: 50 }, 
        data: { 
          label: "Solicitud de reserva", 
          triggerType: "message",
          description: "Cuando el cliente quiere reservar"
        } 
      },
      { 
        id: "query-1", 
        type: "query", 
        position: { x: 250, y: 180 }, 
        data: { 
          label: "Buscar disponibilidad", 
          queryType: "availability",
          description: "Verificar horarios libres"
        } 
      },
      { 
        id: "condition-1", 
        type: "condition", 
        position: { x: 250, y: 320 }, 
        data: { 
          label: "¿Hay disponibilidad?", 
          conditionType: "exists",
          description: "Si hay horarios disponibles"
        } 
      },
      { 
        id: "action-1", 
        type: "action", 
        position: { x: 100, y: 460 }, 
        data: { 
          label: "Crear reserva", 
          actionType: "create",
          description: "Guardar la reserva en el sistema"
        } 
      },
      { 
        id: "response-1", 
        type: "response", 
        position: { x: 100, y: 600 }, 
        data: { 
          label: "Confirmación", 
          message: "¡Tu reserva ha sido confirmada!",
          description: "Enviar confirmación al cliente"
        } 
      },
      { 
        id: "response-2", 
        type: "response", 
        position: { x: 400, y: 460 }, 
        data: { 
          label: "Sin disponibilidad", 
          message: "Lo sentimos, no hay disponibilidad en ese horario.",
          description: "Informar que no hay espacio"
        } 
      },
    ],
    edges: [
      { id: "e1-2", source: "trigger-1", target: "query-1", animated: true },
      { id: "e2-3", source: "query-1", target: "condition-1", animated: true },
      { id: "e3-4", source: "condition-1", target: "action-1", sourceHandle: "yes", animated: true },
      { id: "e4-5", source: "action-1", target: "response-1", animated: true },
      { id: "e3-6", source: "condition-1", target: "response-2", sourceHandle: "no", animated: true },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    _id: uuidv4(),
    name: "Preguntas Frecuentes",
    description: "Responde automáticamente preguntas comunes",
    icon: "❓",
    color: "blue",
    isTemplate: true,
    nodes: [
      { 
        id: "trigger-1", 
        type: "trigger", 
        position: { x: 250, y: 50 }, 
        data: { 
          label: "Mensaje recibido", 
          triggerType: "message",
          description: "Cuando llega un mensaje"
        } 
      },
      { 
        id: "condition-1", 
        type: "condition", 
        position: { x: 250, y: 180 }, 
        data: { 
          label: "¿Es sobre horarios?", 
          conditionType: "contains", 
          keywords: "horario,hora,abren,cierran",
          description: "Detectar preguntas de horarios"
        } 
      },
      { 
        id: "query-1", 
        type: "query", 
        position: { x: 100, y: 320 }, 
        data: { 
          label: "Buscar horarios", 
          queryType: "find",
          description: "Obtener información de horarios"
        } 
      },
      { 
        id: "response-1", 
        type: "response", 
        position: { x: 100, y: 460 }, 
        data: { 
          label: "Enviar horarios",
          description: "Responder con los horarios"
        } 
      },
      { 
        id: "condition-2", 
        type: "condition", 
        position: { x: 400, y: 320 }, 
        data: { 
          label: "¿Es sobre precios?", 
          conditionType: "contains", 
          keywords: "precio,costo,cuanto",
          description: "Detectar preguntas de precios"
        } 
      },
      { 
        id: "response-2", 
        type: "response", 
        position: { x: 400, y: 460 }, 
        data: { 
          label: "Enviar precios",
          description: "Responder con precios"
        } 
      },
      { 
        id: "response-3", 
        type: "response", 
        position: { x: 550, y: 320 }, 
        data: { 
          label: "No entendí", 
          message: "No entendí tu pregunta. ¿Puedes reformularla?",
          description: "Respuesta por defecto"
        } 
      },
    ],
    edges: [
      { id: "e1", source: "trigger-1", target: "condition-1", animated: true },
      { id: "e2", source: "condition-1", target: "query-1", sourceHandle: "yes", animated: true },
      { id: "e3", source: "query-1", target: "response-1", animated: true },
      { id: "e4", source: "condition-1", target: "condition-2", sourceHandle: "no", animated: true },
      { id: "e5", source: "condition-2", target: "response-2", sourceHandle: "yes", animated: true },
      { id: "e6", source: "condition-2", target: "response-3", sourceHandle: "no", animated: true },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    _id: uuidv4(),
    name: "Registro de Cliente",
    description: "Captura datos de nuevos clientes",
    icon: "👤",
    color: "purple",
    isTemplate: true,
    nodes: [
      { 
        id: "trigger-1", 
        type: "trigger", 
        position: { x: 250, y: 50 }, 
        data: { 
          label: "Solicitud de registro", 
          triggerType: "message",
          description: "Cuando alguien quiere registrarse"
        } 
      },
      { 
        id: "query-1", 
        type: "query", 
        position: { x: 250, y: 180 }, 
        data: { 
          label: "Verificar si existe", 
          queryType: "find",
          description: "Buscar si ya está registrado"
        } 
      },
      { 
        id: "condition-1", 
        type: "condition", 
        position: { x: 250, y: 320 }, 
        data: { 
          label: "¿Ya existe?", 
          conditionType: "exists",
          description: "Verificar resultado de búsqueda"
        } 
      },
      { 
        id: "response-1", 
        type: "response", 
        position: { x: 100, y: 460 }, 
        data: { 
          label: "Ya registrado", 
          message: "Ya tienes una cuenta registrada con nosotros.",
          description: "Informar que ya existe"
        } 
      },
      { 
        id: "action-1", 
        type: "action", 
        position: { x: 400, y: 460 }, 
        data: { 
          label: "Crear cliente", 
          actionType: "create",
          description: "Guardar nuevo cliente"
        } 
      },
      { 
        id: "response-2", 
        type: "response", 
        position: { x: 400, y: 600 }, 
        data: { 
          label: "Bienvenida", 
          message: "¡Bienvenido! Tu registro ha sido completado.",
          description: "Mensaje de bienvenida"
        } 
      },
    ],
    edges: [
      { id: "e1", source: "trigger-1", target: "query-1", animated: true },
      { id: "e2", source: "query-1", target: "condition-1", animated: true },
      { id: "e3", source: "condition-1", target: "response-1", sourceHandle: "yes", animated: true },
      { id: "e4", source: "condition-1", target: "action-1", sourceHandle: "no", animated: true },
      { id: "e5", source: "action-1", target: "response-2", animated: true },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    _id: uuidv4(),
    name: "Cancelación",
    description: "Proceso para cancelar reservas o citas",
    icon: "❌",
    color: "red",
    isTemplate: true,
    nodes: [
      { 
        id: "trigger-1", 
        type: "trigger", 
        position: { x: 250, y: 50 }, 
        data: { 
          label: "Solicitud de cancelación", 
          triggerType: "message",
          description: "Cuando el cliente quiere cancelar"
        } 
      },
      { 
        id: "query-1", 
        type: "query", 
        position: { x: 250, y: 180 }, 
        data: { 
          label: "Buscar reserva", 
          queryType: "find",
          description: "Encontrar la reserva del cliente"
        } 
      },
      { 
        id: "condition-1", 
        type: "condition", 
        position: { x: 250, y: 320 }, 
        data: { 
          label: "¿Existe la reserva?", 
          conditionType: "exists",
          description: "Verificar si hay reserva activa"
        } 
      },
      { 
        id: "action-1", 
        type: "action", 
        position: { x: 100, y: 460 }, 
        data: { 
          label: "Cancelar reserva", 
          actionType: "update",
          description: "Marcar como cancelada"
        } 
      },
      { 
        id: "response-1", 
        type: "response", 
        position: { x: 100, y: 600 }, 
        data: { 
          label: "Confirmación", 
          message: "Tu reserva ha sido cancelada correctamente.",
          description: "Confirmar cancelación"
        } 
      },
      { 
        id: "response-2", 
        type: "response", 
        position: { x: 400, y: 460 }, 
        data: { 
          label: "No encontrada", 
          message: "No encontramos una reserva activa a tu nombre.",
          description: "Informar que no hay reserva"
        } 
      },
    ],
    edges: [
      { id: "e1", source: "trigger-1", target: "query-1", animated: true },
      { id: "e2", source: "query-1", target: "condition-1", animated: true },
      { id: "e3", source: "condition-1", target: "action-1", sourceHandle: "yes", animated: true },
      { id: "e4", source: "action-1", target: "response-1", animated: true },
      { id: "e5", source: "condition-1", target: "response-2", sourceHandle: "no", animated: true },
    ],
    createdAt: new Date().toISOString(),
  },
];

export async function seedFlowTemplates() {
  console.log("🔧 Seeding flow templates...");
  
  try {
    const db = await connectDB(getFlowTemplatesDbName());
    
    // Limpiar plantillas existentes
    const existing = await db.find({ selector: { isTemplate: true }, limit: 100 });
    for (const doc of existing.docs) {
      await db.destroy(doc._id, doc._rev);
    }
    
    // Insertar nuevas plantillas
    for (const template of flowTemplates) {
      await db.insert(template);
      console.log(`  ✓ Template: ${template.name}`);
    }
    
    console.log(`✅ ${flowTemplates.length} flow templates seeded`);
  } catch (err) {
    console.error("❌ Error seeding flow templates:", err.message);
    throw err;
  }
}

// Ejecutar directamente si se llama como script
if (process.argv[1].includes("flow-templates")) {
  seedFlowTemplates()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
