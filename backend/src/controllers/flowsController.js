/**
 * Controller para gestión de Flujos de Agentes
 * Los flujos definen comportamientos específicos (agendar, cancelar, etc.)
 */
import { v4 as uuidv4 } from "uuid";
import { connectDB, getWorkspaceDbName } from "../config/db.js";

// Base de datos de flujos por workspace
const getFlowsDbName = (workspaceId) => `migracion_${workspaceId}_flows`;

/**
 * Obtener todos los flujos de un workspace
 */
export async function getFlows(req, res) {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId) {
      return res.status(400).json({ error: "workspaceId is required" });
    }

    const db = await connectDB(getFlowsDbName(workspaceId));
    const result = await db.find({
      selector: {},
      limit: 100,
    });

    res.json(result.docs || []);
  } catch (err) {
    console.error("flowsController.getFlows:", err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Obtener un flujo por ID
 */
export async function getFlow(req, res) {
  try {
    const { workspaceId, flowId } = req.query;
    if (!workspaceId || !flowId) {
      return res.status(400).json({ error: "workspaceId and flowId are required" });
    }

    const db = await connectDB(getFlowsDbName(workspaceId));
    const flow = await db.get(flowId);
    res.json(flow);
  } catch (err) {
    console.error("flowsController.getFlow:", err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Crear un nuevo flujo
 */
export async function createFlow(req, res) {
  try {
    const { workspaceId, name, description, mainTable, agentId } = req.body;
    if (!workspaceId || !name) {
      return res.status(400).json({ error: "workspaceId and name are required" });
    }

    const db = await connectDB(getFlowsDbName(workspaceId));
    
    const flow = {
      _id: uuidv4(),
      name,
      description: description || "",
      agentId: agentId || null,
      mainTable: mainTable || null,
      trigger: "create", // create, update, query, availability
      isActive: true,
      
      // Estructura de React Flow
      nodes: [
        {
          id: "trigger-1",
          type: "trigger",
          position: { x: 250, y: 50 },
          data: { 
            label: "Inicio",
            trigger: "create",
            description: "Cuando el usuario quiere crear un registro"
          },
        },
      ],
      edges: [],
      
      // Conexiones a tablas (para ejecutar el flujo)
      connections: [],
      
      // Reglas/acciones del flujo
      rules: [],
      
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.insert(flow);
    res.json(flow);
  } catch (err) {
    console.error("flowsController.createFlow:", err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Actualizar un flujo (nodos, conexiones, etc.)
 */
export async function updateFlow(req, res) {
  try {
    const { workspaceId, flowId, nodes, edges, connections, rules, name, description, mainTable, trigger, isActive } = req.body;
    
    if (!workspaceId || !flowId) {
      return res.status(400).json({ error: "workspaceId and flowId are required" });
    }

    const db = await connectDB(getFlowsDbName(workspaceId));
    const flow = await db.get(flowId);

    // Actualizar campos
    if (nodes !== undefined) flow.nodes = nodes;
    if (edges !== undefined) flow.edges = edges;
    if (connections !== undefined) flow.connections = connections;
    if (rules !== undefined) flow.rules = rules;
    if (name !== undefined) flow.name = name;
    if (description !== undefined) flow.description = description;
    if (mainTable !== undefined) flow.mainTable = mainTable;
    if (trigger !== undefined) flow.trigger = trigger;
    if (isActive !== undefined) flow.isActive = isActive;
    
    flow.updatedAt = new Date().toISOString();

    await db.insert(flow);
    res.json(flow);
  } catch (err) {
    console.error("flowsController.updateFlow:", err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Eliminar un flujo
 */
export async function deleteFlow(req, res) {
  try {
    const { workspaceId, flowId } = req.body;
    if (!workspaceId || !flowId) {
      return res.status(400).json({ error: "workspaceId and flowId are required" });
    }

    const db = await connectDB(getFlowsDbName(workspaceId));
    const flow = await db.get(flowId);
    await db.destroy(flow._id, flow._rev);
    
    res.json({ success: true, message: "Flow deleted" });
  } catch (err) {
    console.error("flowsController.deleteFlow:", err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Obtener flujos de un agente específico
 */
export async function getAgentFlows(req, res) {
  try {
    const { workspaceId, agentId } = req.query;
    if (!workspaceId || !agentId) {
      return res.status(400).json({ error: "workspaceId and agentId are required" });
    }

    const db = await connectDB(getFlowsDbName(workspaceId));
    const result = await db.find({
      selector: { agentId },
      limit: 50,
    });

    res.json(result.docs || []);
  } catch (err) {
    console.error("flowsController.getAgentFlows:", err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Asignar/desasignar flujo a un agente
 */
export async function assignFlowToAgent(req, res) {
  try {
    const { workspaceId, flowId, agentId } = req.body;
    if (!workspaceId || !flowId) {
      return res.status(400).json({ error: "workspaceId and flowId are required" });
    }

    const db = await connectDB(getFlowsDbName(workspaceId));
    const flow = await db.get(flowId);
    
    flow.agentId = agentId || null; // null para desasignar
    flow.updatedAt = new Date().toISOString();
    
    await db.insert(flow);
    res.json(flow);
  } catch (err) {
    console.error("flowsController.assignFlowToAgent:", err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Tipos de nodos disponibles para el editor
 */
export async function getNodeTypes(req, res) {
  const nodeTypes = [
    {
      type: "trigger",
      label: "🚀 Trigger",
      description: "Inicio del flujo",
      category: "triggers",
      config: {
        triggers: ["create", "update", "query", "availability", "message"]
      }
    },
    {
      type: "table",
      label: "📋 Tabla",
      description: "Conectar tabla de datos",
      category: "data",
      config: {
        actions: ["read", "create", "update", "validate"]
      }
    },
    {
      type: "condition",
      label: "❓ Condición",
      description: "Si/Entonces",
      category: "logic",
      config: {
        operators: ["equals", "contains", "greater", "less", "exists"]
      }
    },
    {
      type: "action",
      label: "⚡ Acción",
      description: "Ejecutar acción",
      category: "actions",
      config: {
        actions: ["auto_assign", "send_notification", "set_value", "validate_unique"]
      }
    },
    {
      type: "availability",
      label: "📅 Disponibilidad",
      description: "Verificar horarios libres",
      category: "validation",
      config: {
        checkFields: ["fecha", "hora"],
        staffTable: "Veterinarios"
      }
    },
    {
      type: "response",
      label: "💬 Respuesta",
      description: "Mensaje al usuario",
      category: "output",
      config: {
        templates: ["success", "error", "options", "custom"]
      }
    },
  ];
  
  res.json(nodeTypes);
}
