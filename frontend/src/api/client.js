import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "/api";

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

// Workspaces
export const createWorkspace = (data) => api.post("/workspace/create", data);
export const listWorkspaces = () => api.get("/workspace/list");
export const getWorkspace = (id) => api.get(`/workspace/${id}`);
export const updateWorkspace = (id, data) => api.put(`/workspace/${id}`, data);
export const deleteWorkspace = (id) => api.delete(`/workspace/${id}`);

// Agents
export const createAgent = (data) => api.post("/agent/create", data);
export const listAgents = (workspaceId) => api.get("/agent/list", { params: { workspaceId } });
export const getAgent = (workspaceId, agentId) => api.get(`/agent/${workspaceId}/${agentId}`);
export const updateAgent = (workspaceId, agentId, data) =>
  api.put(`/agent/${workspaceId}/${agentId}`, data);
export const deleteAgent = (workspaceId, agentId) =>
  api.delete(`/agent/${workspaceId}/${agentId}`);

// Tables
export const createTable = (data) => api.post("/table/create", data);
export const listTables = (workspaceId) => api.get("/table/list", { params: { workspaceId } });
export const getTableData = (workspaceId, tableId, params) =>
  api.get(`/table/${workspaceId}/${tableId}/data`, { params });
export const addTableRow = (workspaceId, tableId, row) =>
  api.post(`/table/${workspaceId}/${tableId}/row`, row);
export const updateTableRow = (workspaceId, tableId, rowId, data) =>
  api.put(`/table/${workspaceId}/${tableId}/row/${rowId}`, data);
export const deleteTableRow = (workspaceId, tableId, rowId) =>
  api.delete(`/table/${workspaceId}/${tableId}/row/${rowId}`);

// Chat
export const getOrCreateChat = (workspaceId, agentId, chatId) =>
  api.get("/chat/get-or-create", { params: { workspaceId, agentId, chatId } });
export const sendChatMessage = (data) => api.post("/chat/send", data);
export const listChats = (workspaceId, agentId) =>
  api.get("/chat/list", { params: { workspaceId, agentId } });
export const deleteChat = (workspaceId, chatId) =>
  api.delete(`/chat/${workspaceId}/${chatId}`);
export const renameChat = (workspaceId, chatId, title) =>
  api.put(`/chat/${workspaceId}/${chatId}/rename`, { title });
