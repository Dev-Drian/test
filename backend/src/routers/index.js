import { Router } from "express";
import * as workspaces from "../controllers/workspacesController.js";
import * as agents from "../controllers/agentsController.js";
import * as tables from "../controllers/tablesController.js";
import * as chat from "../controllers/chatController.js";
import * as flows from "../controllers/flowsController.js";

const router = Router();

// Workspaces (sin auth por ahora; en producción usar middleware)
router.post("/workspace/create", workspaces.createWorkspace);
router.get("/workspace/list", workspaces.listWorkspaces);
router.get("/workspace/:workspaceId", workspaces.getWorkspaceById);
router.put("/workspace/:workspaceId", workspaces.updateWorkspace);

// Agents
router.post("/agent/create", agents.createAgent);
router.get("/agent/list", agents.listAgents);
router.get("/agent/:workspaceId/:agentId", agents.getAgentById);
router.put("/agent/:workspaceId/:agentId", agents.updateAgent);

// Tables
router.post("/table/create", tables.createTable);
router.get("/table/list", tables.listTables);
router.get("/table/:workspaceId/:tableId/data", tables.getTableData);
router.post("/table/:workspaceId/:tableId/row", tables.addTableRow);

// Flows (flujos de agentes - editor visual)
router.get("/flow/list", flows.getFlows);
router.get("/flow/get", flows.getFlow);
router.post("/flow/create", flows.createFlow);
router.put("/flow/update", flows.updateFlow);
router.delete("/flow/delete", flows.deleteFlow);
router.get("/flow/agent", flows.getAgentFlows);
router.post("/flow/assign", flows.assignFlowToAgent);
router.get("/flow/node-types", flows.getNodeTypes);

// Chat (mensaje + detección intenciones + acciones tablas)
router.post("/chat/send", chat.sendMessage);
router.get("/chat/get-or-create", chat.getOrCreateChat);

export default router;
