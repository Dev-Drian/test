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
  return `chatbot_tables_${workspaceId}`;
}

export function getTableDataDbName(workspaceId, tableId) {
  return `chatbot_tabledata_${workspaceId}`;
}

export function getAgentsDbName(workspaceId) {
  return `chatbot_agents_${workspaceId}`;
}

export function getChatDbName(workspaceId) {
  return `chatbot_chat_${workspaceId}`;
}

export function getProjectDbName(workspaceId) {
  return `chatbot_project_${workspaceId}`;
}

export function getAutomationsDbName(workspaceId) {
  return `chatbot_automations_${workspaceId}`;
}

export function getFlowsDbName(workspaceId) {
  return `chatbot_flows_${workspaceId}`;
}

export function getTableDbName(workspaceId) {
  return `chatbot_tables_${workspaceId}`;
}
