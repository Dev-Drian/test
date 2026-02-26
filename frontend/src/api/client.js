import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "/api";

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

// Interceptor para agregar token a todas las requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("migracion_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores de auth y normalizar respuestas
api.interceptors.response.use(
  (response) => {
    // Si la respuesta tiene formato nuevo { success, data, ... }, extraer data
    if (response.data && typeof response.data === 'object' && 'success' in response.data) {
      // Mantener la estructura pero facilitar acceso
      response.data._raw = { ...response.data };
      // Si success=true, poner data en el nivel superior para compatibilidad
      if (response.data.success && response.data.data !== undefined) {
        response.data = response.data.data;
      }
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("migracion_token");
      localStorage.removeItem("migracion_user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Auth
export const login = (email, password) => api.post("/auth/login", { email, password });
export const register = (data) => api.post("/auth/register", data);
export const getProfile = () => api.get("/auth/me");
export const updateProfile = (data) => api.put("/auth/me", data);
export const changePassword = (currentPassword, newPassword) => 
  api.post("/auth/change-password", { currentPassword, newPassword });
export const getUserWorkspaces = () => api.get("/auth/workspaces");

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
export const updateTable = (workspaceId, tableId, data) =>
  api.put(`/table/${workspaceId}/${tableId}`, data);
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

// Plans & Usage
export const listPlans = () => api.get("/plans");
export const getPlan = (planId) => api.get(`/plans/${planId}`);
export const getMyPlan = () => api.get("/user/plan");
export const getMyUsage = (workspaceId) => 
  api.get("/user/usage", { params: workspaceId ? { workspaceId } : {} });

// Admin - Plans (superAdmin only)
export const createPlan = (data) => api.post("/admin/plans", data);
export const updatePlan = (planId, data) => api.put(`/admin/plans/${planId}`, data);
export const deletePlan = (planId) => api.delete(`/admin/plans/${planId}`);
export const getPlanStats = () => api.get("/admin/plans/stats");
