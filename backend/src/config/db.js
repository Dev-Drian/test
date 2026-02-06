import nano from "nano";

const COUCHDB_URL = process.env.COUCHDB_URL || "http://admin:password@127.0.0.1:5984";
const client = nano(COUCHDB_URL);

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

export function getWorkspaceDbName(workspaceId) {
  return `migracion_${workspaceId}_table`;
}

export function getTableDataDbName(workspaceId, tableId) {
  return `migracion_${workspaceId}_table_${tableId}`;
}

export function getAgentsDbName(workspaceId) {
  return `migracion_${workspaceId}_agents`;
}

export function getChatDbName(workspaceId) {
  return `migracion_${workspaceId}_chat`;
}

export function getProjectDbName(workspaceId) {
  return `migracion_${workspaceId}_project`;
}

export function getAutomationsDbName(workspaceId) {
  return `migracion_${workspaceId}_automations`;
}
