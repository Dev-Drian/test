/**
 * TablePermissions - Verifica permisos de acciones sobre tablas
 * 
 * Por defecto:
 * - query: ✅ permitido
 * - create: ✅ permitido
 * - update: ✅ permitido  
 * - delete: ❌ NO permitido (hay que habilitarlo explícitamente)
 */

// Permisos por defecto (seguros)
const DEFAULT_PERMISSIONS = {
  allowQuery: true,
  allowCreate: true,
  allowUpdate: true,
  allowDelete: false, // Por seguridad, borrar está deshabilitado por defecto
};

// Mapeo de actionType a permiso
const ACTION_TO_PERMISSION = {
  query: 'allowQuery',
  search: 'allowQuery',
  create: 'allowCreate',
  update: 'allowUpdate',
  delete: 'allowDelete',
  analyze: 'allowQuery', // Análisis es tipo de consulta
  availability: 'allowQuery',
};

export class TablePermissions {
  
  /**
   * Verifica si una acción está permitida en una tabla
   * @param {object} table - La tabla con su configuración
   * @param {string} actionType - Tipo de acción (query, create, update, delete)
   * @returns {object} - { allowed: boolean, reason?: string }
   */
  static check(table, actionType) {
    if (!table) {
      return { allowed: false, reason: 'Tabla no encontrada' };
    }
    
    const permissionKey = ACTION_TO_PERMISSION[actionType];
    if (!permissionKey) {
      // Acción desconocida, permitir por defecto (será manejada por fallback)
      return { allowed: true };
    }
    
    // Obtener permisos de la tabla, usar defaults si no están definidos
    const permissions = {
      ...DEFAULT_PERMISSIONS,
      ...(table.permissions || {}),
    };
    
    const isAllowed = permissions[permissionKey] === true;
    
    if (!isAllowed) {
      return {
        allowed: false,
        reason: this._getBlockedMessage(actionType, table.name),
      };
    }
    
    return { allowed: true };
  }
  
  /**
   * Obtiene los permisos efectivos de una tabla
   */
  static getEffectivePermissions(table) {
    return {
      ...DEFAULT_PERMISSIONS,
      ...(table?.permissions || {}),
    };
  }
  
  /**
   * Genera mensaje cuando una acción está bloqueada
   */
  static _getBlockedMessage(actionType, tableName) {
    const messages = {
      query: `No tengo permiso para consultar datos de "${tableName}".`,
      search: `No tengo permiso para buscar en "${tableName}".`,
      create: `No tengo permiso para crear registros en "${tableName}". Esta acción debe hacerse manualmente.`,
      update: `No tengo permiso para modificar registros en "${tableName}". Esta acción debe hacerse manualmente.`,
      delete: `No tengo permiso para eliminar registros de "${tableName}". Por seguridad, esta acción no está disponible.`,
    };
    
    return messages[actionType] || `Esta acción no está permitida en "${tableName}".`;
  }
  
  /**
   * Genera contexto de permisos para el system prompt del LLM
   */
  static generatePermissionsContext(tables) {
    if (!tables || tables.length === 0) return '';
    
    let context = '\nPERMISOS POR TABLA:\n';
    
    for (const table of tables) {
      const perms = this.getEffectivePermissions(table);
      const allowed = [];
      const blocked = [];
      
      if (perms.allowQuery) allowed.push('consultar');
      else blocked.push('consultar');
      
      if (perms.allowCreate) allowed.push('crear');
      else blocked.push('crear');
      
      if (perms.allowUpdate) allowed.push('actualizar');
      else blocked.push('actualizar');
      
      if (perms.allowDelete) allowed.push('eliminar');
      else blocked.push('eliminar');
      
      context += `- ${table.name}: `;
      if (allowed.length > 0) context += `✅ ${allowed.join(', ')}`;
      if (blocked.length > 0) context += ` | ❌ ${blocked.join(', ')}`;
      context += '\n';
    }
    
    context += '\nSi el usuario pide una acción bloqueada, explica que no tienes permiso.\n';
    
    return context;
  }
  
  /**
   * Filtra tablas según la acción que se quiere hacer
   * @param {array} tables - Lista de tablas
   * @param {string} actionType - Tipo de acción
   * @returns {array} - Tablas donde la acción está permitida
   */
  static filterByPermission(tables, actionType) {
    if (!tables) return [];
    
    return tables.filter(table => {
      const result = this.check(table, actionType);
      return result.allowed;
    });
  }
  
  /**
   * Verifica si hay dependencias bloqueadas para una acción
   * Por ejemplo: crear venta necesita consultar clientes/productos
   * 
   * @param {object} targetTable - La tabla donde se quiere hacer la acción
   * @param {string} actionType - Tipo de acción (create, update)
   * @param {array} allTables - Todas las tablas disponibles
   * @returns {object} - { allowed: boolean, blockedDependencies: array, reason?: string }
   */
  static checkDependencies(targetTable, actionType, allTables) {
    if (!targetTable || !targetTable.headers) {
      return { allowed: true, blockedDependencies: [] };
    }
    
    // Solo verificar dependencias para create/update que necesitan resolver relaciones
    if (actionType !== 'create' && actionType !== 'update') {
      return { allowed: true, blockedDependencies: [] };
    }
    
    const blockedDependencies = [];
    
    // Buscar campos de tipo relación
    for (const header of targetTable.headers) {
      if (header.type === 'relation' && header.relation?.tableName) {
        const relatedTableName = header.relation.tableName;
        
        // Buscar la tabla relacionada
        const relatedTable = allTables.find(t => 
          t.name === relatedTableName || 
          t.name.toLowerCase() === relatedTableName.toLowerCase()
        );
        
        if (relatedTable) {
          // Verificar si podemos consultar la tabla relacionada
          const queryPermission = this.check(relatedTable, 'query');
          
          if (!queryPermission.allowed) {
            blockedDependencies.push({
              field: header.label || header.key,
              tableName: relatedTable.name,
              reason: `Para asignar "${header.label || header.key}" necesito consultar "${relatedTable.name}", pero no tengo permiso.`
            });
          }
        }
      }
    }
    
    if (blockedDependencies.length > 0) {
      const fieldNames = blockedDependencies.map(d => d.field).join(', ');
      return {
        allowed: false,
        blockedDependencies,
        reason: `No puedo ${actionType === 'create' ? 'crear' : 'actualizar'} en "${targetTable.name}" porque necesito consultar tablas a las que no tengo acceso:\n${blockedDependencies.map(d => `• ${d.reason}`).join('\n')}`
      };
    }
    
    return { allowed: true, blockedDependencies: [] };
  }
  
  /**
   * Verifica todos los permisos necesarios para una acción completa
   * (permiso directo + dependencias)
   */
  static checkFullPermissions(targetTable, actionType, allTables) {
    // 1. Verificar permiso directo
    const directPermission = this.check(targetTable, actionType);
    if (!directPermission.allowed) {
      return directPermission;
    }
    
    // 2. Verificar dependencias
    const dependencyCheck = this.checkDependencies(targetTable, actionType, allTables);
    if (!dependencyCheck.allowed) {
      return {
        allowed: false,
        reason: dependencyCheck.reason,
        blockedDependencies: dependencyCheck.blockedDependencies
      };
    }
    
    return { allowed: true };
  }
}

export default TablePermissions;
