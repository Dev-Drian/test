/**
 * viewsController - Controlador para gestión de vistas
 * 
 * Endpoints para:
 * - CRUD de vistas
 * - Análisis y mapeo de campos
 * - Obtener datos transformados para renderizar
 */

import { v4 as uuidv4 } from 'uuid';
import { ViewRepository } from '../repositories/ViewRepository.js';
import { TableRepository } from '../repositories/TableRepository.js';
import { TableDataRepository } from '../repositories/TableDataRepository.js';
import { ViewMappingService, VIEW_TYPES } from '../services/ViewMappingService.js';
import logger from '../config/logger.js';

const log = logger.child('viewsController');

// Instancias de repositorios y servicios
const viewRepo = new ViewRepository();
const tableRepo = new TableRepository();
const tableDataRepo = new TableDataRepository();
const mappingService = new ViewMappingService({ tableRepository: tableRepo });

/**
 * GET /api/views/types
 * Obtiene los tipos de vista disponibles
 */
export async function getViewTypes(req, res) {
  try {
    const types = mappingService.getViewTypes();
    res.json(types);
  } catch (err) {
    log.error('getViewTypes error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/views/analyze
 * Analiza una tabla y sugiere mapeo para un tipo de vista
 * Body: { workspaceId, tableId, viewType }
 */
export async function analyzeMapping(req, res) {
  try {
    const { workspaceId, tableId, viewType } = req.body;
    
    if (!workspaceId || !tableId || !viewType) {
      return res.status(400).json({ 
        error: 'Se requieren workspaceId, tableId y viewType' 
      });
    }
    
    // Configurar API key si viene en header
    const apiKey = req.headers['x-openai-key'] || process.env.OPENAI_API_KEY;
    if (apiKey) {
      mappingService.setApiKey(apiKey);
    }
    
    const result = await mappingService.analyzeAndSuggestMapping(
      workspaceId, 
      tableId, 
      viewType
    );
    
    res.json(result);
    
  } catch (err) {
    log.error('analyzeMapping error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/views
 * Lista todas las vistas de un workspace
 * Query: workspaceId, tableId? (opcional para filtrar por tabla)
 */
export async function listViews(req, res) {
  try {
    const { workspaceId, tableId } = req.query;
    
    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId is required' });
    }
    
    let views;
    if (tableId) {
      views = await viewRepo.findByTable(workspaceId, tableId);
    } else {
      views = await viewRepo.findAll(workspaceId);
    }
    
    // Enriquecer con info de tabla
    const enrichedViews = await Promise.all(views.map(async (view) => {
      try {
        const table = await tableRepo.findById(view.tableId, workspaceId);
        return {
          ...view,
          tableName: table?.name || 'Tabla eliminada',
          tableExists: !!table,
        };
      } catch {
        return { ...view, tableName: 'Error', tableExists: false };
      }
    }));
    
    res.json(enrichedViews);
    
  } catch (err) {
    log.error('listViews error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/views/:viewId
 * Obtiene una vista específica
 */
export async function getView(req, res) {
  try {
    const { viewId } = req.params;
    const { workspaceId } = req.query;
    
    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId is required' });
    }
    
    const view = await viewRepo.findById(viewId, workspaceId);
    
    if (!view) {
      return res.status(404).json({ error: 'Vista no encontrada' });
    }
    
    // Verificar validez del mapeo
    const table = await tableRepo.findById(view.tableId, workspaceId);
    if (table) {
      const validation = viewRepo.validateMapping(view, table.headers || []);
      view._mappingValid = validation.valid;
      view._mappingIssues = validation.missingFields;
    }
    
    res.json(view);
    
  } catch (err) {
    log.error('getView error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/views
 * Crea una nueva vista
 * Body: { workspaceId, name, type, tableId, fieldMap, viewConfig? }
 */
export async function createView(req, res) {
  try {
    const { 
      workspaceId, 
      name, 
      type, 
      tableId, 
      fieldMap, 
      computedFields,
      viewConfig,
      icon,
      color,
      mappingMetadata,
    } = req.body;
    
    // Validaciones
    if (!workspaceId || !name || !type || !tableId) {
      return res.status(400).json({ 
        error: 'Se requieren workspaceId, name, type y tableId' 
      });
    }
    
    if (!VIEW_TYPES[type]) {
      return res.status(400).json({ 
        error: `Tipo de vista inválido: ${type}. Tipos válidos: ${Object.keys(VIEW_TYPES).join(', ')}` 
      });
    }
    
    // Verificar que la tabla existe
    const table = await tableRepo.findById(tableId, workspaceId);
    if (!table) {
      return res.status(404).json({ error: 'Tabla no encontrada' });
    }
    
    // Validar campos requeridos en el fieldMap
    const viewTypeConfig = VIEW_TYPES[type];
    const missingRequired = viewTypeConfig.requiredFields.filter(
      field => !fieldMap || !fieldMap[field]
    );
    
    if (missingRequired.length > 0) {
      return res.status(400).json({ 
        error: `Faltan campos requeridos en fieldMap: ${missingRequired.join(', ')}`,
        missing: missingRequired,
      });
    }
    
    // Crear vista
    const view = await viewRepo.create({
      _id: uuidv4(),
      name,
      type,
      tableId,
      fieldMap: fieldMap || {},
      computedFields: computedFields || {},
      viewConfig: viewConfig || {},
      icon: icon || VIEW_TYPES[type].icon,
      color: color || '#4F46E5',
      enabled: true,
      mappingMetadata: mappingMetadata || { createdBy: 'manual' },
    }, workspaceId);
    
    log.info('View created:', { viewId: view._id, name, type, tableId });
    
    res.status(201).json(view);
    
  } catch (err) {
    log.error('createView error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * PUT /api/views/:viewId
 * Actualiza una vista
 */
export async function updateView(req, res) {
  try {
    const { viewId } = req.params;
    const { workspaceId, ...updates } = req.body;
    
    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId is required' });
    }
    
    // No permitir cambiar tableId (requeriría re-mapeo)
    if (updates.tableId) {
      return res.status(400).json({ 
        error: 'No se puede cambiar tableId. Crea una nueva vista.' 
      });
    }
    
    const updated = await viewRepo.update(viewId, updates, workspaceId);
    
    res.json(updated);
    
  } catch (err) {
    log.error('updateView error:', err);
    if (err.message?.includes('not found')) {
      return res.status(404).json({ error: 'Vista no encontrada' });
    }
    res.status(500).json({ error: err.message });
  }
}

/**
 * DELETE /api/views/:viewId
 * Elimina una vista
 */
export async function deleteView(req, res) {
  try {
    const { viewId } = req.params;
    const { workspaceId } = req.query;
    
    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId is required' });
    }
    
    const deleted = await viewRepo.delete(viewId, workspaceId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Vista no encontrada' });
    }
    
    res.json({ success: true, message: 'Vista eliminada' });
    
  } catch (err) {
    log.error('deleteView error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/views/:viewId/data
 * Obtiene datos de la tabla transformados según la vista
 * Query: workspaceId, limit?, skip?, filters?, date? (para floorplan)
 */
export async function getViewData(req, res) {
  try {
    const { viewId } = req.params;
    const { workspaceId, limit = 100, skip = 0, filters, date } = req.query;
    
    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId is required' });
    }
    
    // Obtener vista
    const view = await viewRepo.findById(viewId, workspaceId);
    if (!view) {
      return res.status(404).json({ error: 'Vista no encontrada' });
    }
    
    if (!view.enabled) {
      return res.status(400).json({ 
        error: 'Vista deshabilitada. El mapeo puede estar desactualizado.',
        reason: view._invalidReason,
      });
    }
    
    // Obtener datos de la tabla
    let queryFilters = {};
    if (filters) {
      try {
        queryFilters = typeof filters === 'string' ? JSON.parse(filters) : filters;
      } catch {
        // Ignorar filtros mal formados
      }
    }
    
    // Aplicar filtros predefinidos de la vista
    if (view.filters && view.filters.length > 0) {
      for (const filter of view.filters) {
        if (filter.operator === 'eq') {
          queryFilters[filter.field] = filter.value;
        }
      }
    }
    
    let transformedData;
    let table;
    let records;
    
    // Determinar si es multi-tabla
    const isMultiTable = view.tables && view.tables.primary;
    const primaryTableId = isMultiTable ? view.tables.primary : view.tableId;
    
    // Obtener tabla principal
    table = await tableRepo.findById(primaryTableId, workspaceId);
    
    // CASO ESPECIAL: FloorPlan con multi-tabla
    if (view.type === 'floorplan' && isMultiTable && view.tables.secondary) {
      const multiData = await mappingService.fetchMultiTableData(
        workspaceId,
        {
          primary: view.tables.primary,
          secondary: view.tables.secondary,
          joinField: view.tables.joinField || 'mesa_id',
        },
        { limit: Number(limit) }
      );
      
      // Calcular estados basado en reservas
      const targetDate = date ? new Date(date) : new Date();
      const withStatuses = mappingService.calculateFloorplanStatuses(
        multiData.combined,
        view.viewConfig?.statusConfig || {},
        targetDate
      );
      
      // Transformar datos según mapeo
      transformedData = await mappingService.transformData(
        withStatuses,
        view.fieldMap,
        view.computedFields,
        { workspaceId, headers: table?.headers || [] }
      );
      
    } 
    // CASO ESPECIAL: POS (Punto de Venta) - 3 tablas
    else if (view.type === 'pos' && isMultiTable) {
      const posData = await mappingService.fetchPOSData(
        workspaceId,
        {
          primary: view.tables.primary,
          secondary: view.tables.secondary,
          tertiary: view.tables.tertiary,
          joinField: view.tables.joinField || 'mesa_id',
        }
      );
      
      // Para POS, devolvemos estructura especial
      return res.json({
        view: {
          _id: view._id,
          name: view.name,
          type: view.type,
          icon: view.icon,
          color: view.color,
          viewConfig: view.viewConfig,
          isMultiTable: true,
          tables: view.tables,
        },
        data: posData.tables,
        products: posData.products,
        productsByCategory: posData.productsByCategory,
        meta: {
          ...posData.meta,
          fieldMap: view.fieldMap,
          viewTypeInfo: {
            name: VIEW_TYPES.pos?.name,
            icon: VIEW_TYPES.pos?.icon,
          },
        },
      });
      
    } else {
      // CASO NORMAL: Single table o floorplan simple
      records = await tableDataRepo.query(
        workspaceId, 
        primaryTableId, 
        queryFilters,
        { limit: Number(limit), skip: Number(skip) }
      );
      
      // Transformar datos según mapeo
      transformedData = await mappingService.transformData(
        records,
        view.fieldMap,
        view.computedFields,
        { 
          workspaceId, 
          headers: table?.headers || [],
        }
      );
    }
    
    // Metadata adicional para el frontend
    const viewTypeConfig = VIEW_TYPES[view.type];
    
    res.json({
      view: {
        _id: view._id,
        name: view.name,
        type: view.type,
        icon: view.icon,
        color: view.color,
        viewConfig: view.viewConfig,
        isMultiTable,
      },
      data: transformedData,
      meta: {
        total: transformedData.length,
        limit: Number(limit),
        skip: Number(skip),
        fieldMap: view.fieldMap,
        viewTypeInfo: {
          name: viewTypeConfig?.name,
          icon: viewTypeConfig?.icon,
        },
      },
    });
    
  } catch (err) {
    log.error('getViewData error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/views/:viewId/refresh-mapping
 * Re-analiza el mapeo cuando la tabla cambia
 */
export async function refreshMapping(req, res) {
  try {
    const { viewId } = req.params;
    const { workspaceId } = req.body;
    
    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId is required' });
    }
    
    // Configurar API key si viene en header
    const apiKey = req.headers['x-openai-key'] || process.env.OPENAI_API_KEY;
    if (apiKey) {
      mappingService.setApiKey(apiKey);
    }
    
    // Obtener vista actual
    const view = await viewRepo.findById(viewId, workspaceId);
    if (!view) {
      return res.status(404).json({ error: 'Vista no encontrada' });
    }
    
    // Re-analizar mapeo
    const analysis = await mappingService.analyzeAndSuggestMapping(
      workspaceId,
      view.tableId,
      view.type
    );
    
    if (analysis.status === 'complete') {
      // Actualizar vista con nuevo mapeo
      await viewRepo.update(viewId, {
        fieldMap: analysis.fieldMap,
        enabled: true,
        _invalidReason: null,
        mappingMetadata: {
          ...view.mappingMetadata,
          refreshedAt: new Date().toISOString(),
          confidence: analysis.confidence,
        },
      }, workspaceId);
      
      return res.json({
        success: true,
        message: 'Mapeo actualizado correctamente',
        fieldMap: analysis.fieldMap,
      });
    }
    
    // Mapeo incompleto
    res.json({
      success: false,
      status: analysis.status,
      missing: analysis.missing,
      suggestions: analysis.suggestions,
      currentMap: analysis.fieldMap,
    });
    
  } catch (err) {
    log.error('refreshMapping error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/views/:viewId/order
 * Crea o actualiza un pedido para una mesa (usado en POS)
 * Body: { workspaceId, tableId (mesa), action, productId?, quantity? }
 * Actions: 'add', 'remove', 'update-status', 'close'
 */
export async function manageOrder(req, res) {
  try {
    const { viewId } = req.params;
    const { workspaceId, tableId, action, productId, quantity = 1, status, orderId } = req.body;
    
    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId is required' });
    }
    
    // Obtener vista POS
    const view = await viewRepo.findById(viewId, workspaceId);
    if (!view || view.type !== 'pos') {
      return res.status(400).json({ error: 'Esta vista no es de tipo POS' });
    }
    
    if (!view.tables?.secondary) {
      return res.status(400).json({ error: 'La vista POS no tiene tabla de pedidos configurada' });
    }
    
    const ordersTableId = view.tables.secondary;
    const productsTableId = view.tables.tertiary;
    
    // Buscar pedido activo de la mesa
    let orders = await tableDataRepo.query(workspaceId, ordersTableId, {}, { limit: 100 });
    let activeOrder = orders.find(o => {
      const orderTable = o.mesa_id || o.mesa;
      const orderStatus = (o.estado || o.status || '').toLowerCase();
      const isActive = !['pagado', 'paid', 'cancelado', 'cancelled', 'cerrado'].includes(orderStatus);
      return (orderTable === tableId || orderTable === String(tableId)) && isActive;
    });
    
    switch (action) {
      case 'add': {
        if (!productId) {
          return res.status(400).json({ error: 'productId is required' });
        }
        
        // Obtener producto
        let product = null;
        if (productsTableId) {
          try {
            product = await tableDataRepo.findById(productId, workspaceId, productsTableId);
          } catch {
            // Buscar por nombre en productos
            const products = await tableDataRepo.query(workspaceId, productsTableId, {}, { limit: 500 });
            product = products.find(p => p._id === productId || p.nombre === productId);
          }
        }
        
        if (!product) {
          return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        // Si no hay pedido activo, crear uno nuevo
        if (!activeOrder) {
          activeOrder = {
            mesa_id: tableId,
            estado: 'abierto',
            items: [],
            total: 0,
            createdAt: new Date().toISOString(),
          };
        }
        
        // Agregar producto
        const updated = mappingService.addProductToOrder(activeOrder, product, quantity);
        
        // Guardar
        if (activeOrder._id) {
          await tableDataRepo.update(activeOrder._id, updated, workspaceId, ordersTableId);
        } else {
          await tableDataRepo.create(updated, workspaceId, ordersTableId);
        }
        
        return res.json({ success: true, order: updated });
      }
      
      case 'remove': {
        if (!activeOrder) {
          return res.status(404).json({ error: 'No hay pedido activo en esta mesa' });
        }
        
        const updated = mappingService.removeProductFromOrder(activeOrder, productId, quantity);
        await tableDataRepo.update(activeOrder._id, updated, workspaceId, ordersTableId);
        
        return res.json({ success: true, order: updated });
      }
      
      case 'update-status': {
        if (!status) {
          return res.status(400).json({ error: 'status is required' });
        }
        
        const targetOrder = orderId 
          ? orders.find(o => o._id === orderId)
          : activeOrder;
          
        if (!targetOrder) {
          return res.status(404).json({ error: 'Pedido no encontrado' });
        }
        
        const updated = {
          ...targetOrder,
          estado: status,
          updatedAt: new Date().toISOString(),
        };
        
        await tableDataRepo.update(targetOrder._id, updated, workspaceId, ordersTableId);
        
        return res.json({ success: true, order: updated });
      }
      
      case 'close': {
        if (!activeOrder) {
          return res.status(404).json({ error: 'No hay pedido activo en esta mesa' });
        }
        
        const updated = {
          ...activeOrder,
          estado: 'pagado',
          closedAt: new Date().toISOString(),
        };
        
        await tableDataRepo.update(activeOrder._id, updated, workspaceId, ordersTableId);
        
        return res.json({ success: true, order: updated, message: 'Pedido cerrado' });
      }
      
      default:
        return res.status(400).json({ error: `Acción no reconocida: ${action}` });
    }
    
  } catch (err) {
    log.error('manageOrder error:', err);
    res.status(500).json({ error: err.message });
  }
}

export default {
  getViewTypes,
  analyzeMapping,
  listViews,
  getView,
  createView,
  updateView,
  deleteView,
  getViewData,
  refreshMapping,
  manageOrder,
};
