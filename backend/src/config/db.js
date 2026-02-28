import nano from "nano";
import { SystemConfig } from "./system.js";

const COUCHDB_URL = process.env.COUCHDB_URL || SystemConfig.database.url;
const client = nano(COUCHDB_URL);

// Obtener prefijo desde configuración (puede cambiarse con variable de entorno)
const DB_PREFIX = SystemConfig.database.prefix;

export function sanitizeDatabaseName(name) {
  if (!name || typeof name !== "string") return "default";
  let sanitized = name
    .toLowerCase()
    .replace(/@/g, "_at_")
    .replace(/[^a-z0-9_$()+/-]/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^[^a-z]/, "p_")
    .replace(/_$/, "");
  if (!/^[a-z]/.test(sanitized)) sanitized = "p_" + sanitized;
  return sanitized;
}

export async function connectDB(tableName) {
  try {
    await client.db.get(tableName);
    return client.db.use(tableName);
  } catch (error) {
    if (error.statusCode === 404) {
      await client.db.create(tableName);
      return client.db.use(tableName);
    }
    throw error;
  }
}

/**
 * Genera nombre de BD con prefijo dinámico
 * Ejemplo: chatbot_workspaces, custom_workspaces, etc.
 */
export function getWorkspacesDbName() {
  return `${DB_PREFIX}workspaces`;
}

export function getWorkspaceDbName(workspaceId) {
  return `${DB_PREFIX}tables_${workspaceId}`;
}

export function getTableDataDbName(workspaceId, tableId) {
  return `${DB_PREFIX}tabledata_${workspaceId}`;
}

export function getAgentsDbName(workspaceId) {
  return `${DB_PREFIX}agents_${workspaceId}`;
}

export function getChatDbName(workspaceId) {
  return `${DB_PREFIX}chat_${workspaceId}`;
}

export function getProjectDbName(workspaceId) {
  return `${DB_PREFIX}project_${workspaceId}`;
}

export function getAutomationsDbName(workspaceId) {
  return `${DB_PREFIX}automations_${workspaceId}`;
}

export function getFlowsDbName(workspaceId) {
  return `${DB_PREFIX}flows_${workspaceId}`;
}

export function getFlowTemplatesDbName() {
  return `${DB_PREFIX}flow_templates`;
}

export function getTableDbName(workspaceId) {
  return `${DB_PREFIX}tables_${workspaceId}`;
}

export function getViewsDbName(workspaceId) {
  return `${DB_PREFIX}views_${workspaceId}`;
}

/**
 * Obtiene el prefijo actual de BD (útil para debugging)
 */
export function getDbPrefix() {
  return DB_PREFIX;
}
