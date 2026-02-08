/**
 * AgentRepository - Repositorio para operaciones de agentes
 */

import { BaseRepository } from './BaseRepository.js';
import { getAgentsDbName } from '../config/db.js';

export class AgentRepository extends BaseRepository {
  constructor() {
    super((workspaceId) => getAgentsDbName(workspaceId));
  }
  
  /**
   * Busca un agente por ID
   * @param {string} workspaceId 
   * @param {string} agentId 
   * @returns {Promise<object|null>}
   */
  async findById(agentId, workspaceId) {
    return super.findById(agentId, workspaceId);
  }
  
  /**
   * Obtiene todos los agentes de un workspace
   * @param {string} workspaceId 
   * @param {object} options 
   * @returns {Promise<object[]>}
   */
  async findAll(workspaceId, options = {}) {
    return super.findAll(options, workspaceId);
  }
  
  /**
   * Obtiene las tablas vinculadas a un agente
   * @param {string} workspaceId 
   * @param {string} agentId 
   * @returns {Promise<string[]>}
   */
  async getAgentTables(workspaceId, agentId) {
    const agent = await this.findById(agentId, workspaceId);
    if (!agent) return [];
    
    const tableIds = agent.tables || [];
    return tableIds.map(t => typeof t === 'string' ? t : t?.id || t?.tableId).filter(Boolean);
  }
  
  /**
   * Obtiene el modelo de IA del agente
   * @param {string} workspaceId 
   * @param {string} agentId 
   * @returns {Promise<string>}
   */
  async getAgentModel(workspaceId, agentId) {
    const agent = await this.findById(agentId, workspaceId);
    if (!agent) return 'gpt-4o-mini';
    
    const aiModel = agent.aiModel;
    if (Array.isArray(aiModel) && aiModel.length > 0) {
      const first = aiModel[0];
      return typeof first === 'string' ? first : first?.id || 'gpt-4o-mini';
    }
    return typeof aiModel === 'string' ? aiModel : 'gpt-4o-mini';
  }
  
  /**
   * Obtiene los templates de respuesta del agente
   * @param {string} workspaceId 
   * @param {string} agentId 
   * @returns {Promise<object>}
   */
  async getResponseTemplates(workspaceId, agentId) {
    const agent = await this.findById(agentId, workspaceId);
    return agent?.responseTemplates || {};
  }
  
  /**
   * Obtiene la configuración de negocio del agente
   * @param {string} workspaceId 
   * @param {string} agentId 
   * @returns {Promise<object>}
   */
  async getBusinessConfig(workspaceId, agentId) {
    const agent = await this.findById(agentId, workspaceId);
    return {
      businessName: agent?.businessConfig?.businessName || agent?.name || 'Negocio',
      businessType: agent?.businessConfig?.businessType || 'general',
      timezone: agent?.businessConfig?.timezone || 'America/Bogota',
      language: agent?.businessConfig?.language || 'es',
      businessHours: agent?.businessHours || null,
    };
  }
}

// Singleton
let instance = null;

export function getAgentRepository() {
  if (!instance) {
    instance = new AgentRepository();
  }
  return instance;
}

export default AgentRepository;
