import { Router } from "express";
import * as workspaces from "../controllers/workspacesController.js";
import * as agents from "../controllers/agentsController.js";
import * as tables from "../controllers/tablesController.js";
import * as chat from "../controllers/chatController.js";
import * as flows from "../controllers/flowsController.js";
import * as notifications from "../controllers/notificationsController.js";
import * as auth from "../controllers/authController.js";
import * as plans from "../controllers/plansController.js";
import * as views from "../controllers/viewsController.js";
import { requireAuth, optionalAuth, requireWorkspaceMember } from "../middleware/index.js";
import { validateWorkspace } from "../middleware/index.js";
import { checkCanCreateWorkspace, checkCanCreateTable, checkCanCreateAgent, checkCanCreateFlow } from "../middleware/limits.js";

const router = Router();

// ============ AUTH (público) ============
router.post("/auth/register", auth.register);
router.post("/auth/login", auth.login);
router.get("/auth/me", requireAuth, auth.getProfile);
router.put("/auth/me", requireAuth, auth.updateProfile);
router.post("/auth/change-password", requireAuth, auth.changePassword);
router.get("/auth/workspaces", requireAuth, auth.getUserWorkspaces);

// ============ PLANES Y LÍMITES ============
// Público - Lista planes para mostrar en pricing
router.get("/plans", plans.listPlans);
router.get("/plans/:planId", plans.getPlan);

// Usuario - Su plan y uso
router.get("/user/plan", requireAuth, plans.getMyPlan);
router.get("/user/usage", requireAuth, plans.getMyUsage);

// SuperAdmin - Gestión de planes
router.post("/admin/plans", requireAuth, plans.createPlan);
router.put("/admin/plans/:planId", requireAuth, plans.updatePlan);
router.delete("/admin/plans/:planId", requireAuth, plans.deletePlan);
router.get("/admin/plans/stats", requireAuth, plans.getPlanStats);

// ============ WORKSPACES ============
router.post("/workspace/create", requireAuth, checkCanCreateWorkspace, workspaces.createWorkspace);
router.get("/workspace/list", requireAuth, workspaces.listWorkspaces);
router.get("/workspace/:workspaceId", requireAuth, validateWorkspace, workspaces.getWorkspaceById);
router.put("/workspace/:workspaceId", requireAuth, validateWorkspace, workspaces.updateWorkspace);

// ============ AGENTS ============
router.post("/agent/create", requireAuth, checkCanCreateAgent, agents.createAgent);
router.get("/agent/list", requireAuth, agents.listAgents);
router.get("/agent/:workspaceId/:agentId", requireAuth, validateWorkspace, agents.getAgentById);
router.put("/agent/:workspaceId/:agentId", requireAuth, validateWorkspace, agents.updateAgent);
router.delete("/agent/:workspaceId/:agentId", requireAuth, validateWorkspace, agents.deleteAgent);

// ============ TABLES ============
router.post("/table/create", requireAuth, checkCanCreateTable, tables.createTable);
router.get("/table/list", requireAuth, tables.listTables);
router.put("/table/:workspaceId/:tableId", requireAuth, validateWorkspace, tables.updateTable);
router.get("/table/:workspaceId/:tableId/data", requireAuth, validateWorkspace, tables.getTableData);
router.post("/table/:workspaceId/:tableId/row", requireAuth, validateWorkspace, tables.addTableRow);
router.put("/table/:workspaceId/:tableId/row/:rowId", requireAuth, validateWorkspace, tables.updateTableRow);
router.delete("/table/:workspaceId/:tableId/row/:rowId", requireAuth, validateWorkspace, tables.deleteTableRow);

// ============ FLOWS ============
router.get("/flow/list", requireAuth, flows.getFlows);
router.get("/flow/get", requireAuth, flows.getFlow);
router.post("/flow/create", requireAuth, checkCanCreateFlow, flows.createFlow);
router.put("/flow/update", requireAuth, flows.updateFlow);
router.delete("/flow/delete", requireAuth, flows.deleteFlow);
router.get("/flow/agent", requireAuth, flows.getAgentFlows);
router.post("/flow/assign", requireAuth, flows.assignFlowToAgent);
router.get("/flow/node-types", requireAuth, flows.getNodeTypes);
router.get("/flow/templates", requireAuth, flows.getFlowTemplates);

// ============ CHAT ============
router.post("/chat/send", requireAuth, chat.sendMessage);
router.get("/chat/get-or-create", requireAuth, chat.getOrCreateChat);
router.get("/chat/list", requireAuth, chat.listChats);
router.delete("/chat/:workspaceId/:chatId", requireAuth, validateWorkspace, chat.deleteChat);
router.put("/chat/:workspaceId/:chatId/rename", requireAuth, validateWorkspace, chat.renameChat);

// ============ NOTIFICATIONS ============
router.get("/notifications/list", requireAuth, notifications.listNotifications);
router.get("/notifications/unread-count", requireAuth, notifications.getUnreadCount);
router.put("/notifications/:notificationId/read", requireAuth, notifications.markAsRead);
router.put("/notifications/read-all", requireAuth, notifications.markAllAsRead);
router.post("/notifications/send", requireAuth, notifications.sendNotification);
router.get("/notifications/config", requireAuth, notifications.getConfig);
router.put("/notifications/config", requireAuth, notifications.updateConfig);

// ============ VIEWS ============
router.get("/views/types", requireAuth, views.getViewTypes);
router.post("/views/analyze", requireAuth, views.analyzeMapping);
router.post("/views/validate", requireAuth, views.validateViewConfig);
router.get("/views", requireAuth, views.listViews);
router.get("/views/:viewId", requireAuth, views.getView);
router.get("/views/:viewId/data", requireAuth, views.getViewData);
router.post("/views", requireAuth, views.createView);
router.put("/views/:viewId", requireAuth, views.updateView);
router.delete("/views/:viewId", requireAuth, views.deleteView);
router.post("/views/:viewId/refresh-mapping", requireAuth, views.refreshMapping);
router.post("/views/:viewId/order", requireAuth, views.manageOrder);

export default router;
