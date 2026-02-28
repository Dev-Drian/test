import React, { useState, useMemo } from 'react';
import api from '../../api/axios';

const STATUS_COLORS = {
  libre: 'bg-green-100 border-green-400 text-green-800',
  disponible: 'bg-green-100 border-green-400 text-green-800',
  ocupada: 'bg-red-100 border-red-400 text-red-800',
  activa: 'bg-red-100 border-red-400 text-red-800',
  reservada: 'bg-yellow-100 border-yellow-400 text-yellow-800',
  bloqueada: 'bg-gray-200 border-gray-400 text-gray-600',
};

const ORDER_STATUS_COLORS = {
  abierto: 'bg-blue-100 text-blue-800',
  open: 'bg-blue-100 text-blue-800',
  pendiente: 'bg-yellow-100 text-yellow-800',
  pending: 'bg-yellow-100 text-yellow-800',
  listo: 'bg-green-100 text-green-800',
  ready: 'bg-green-100 text-green-800',
  pagado: 'bg-gray-100 text-gray-600',
  paid: 'bg-gray-100 text-gray-600',
};

export default function POSView({ view, data, products, productsByCategory, workspaceId, onRefresh }) {
  const [selectedTable, setSelectedTable] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Categorías disponibles
  const categories = useMemo(() => {
    return Object.keys(productsByCategory || {});
  }, [productsByCategory]);

  // Productos filtrados
  const filteredProducts = useMemo(() => {
    let prods = activeCategory 
      ? productsByCategory[activeCategory] || []
      : products || [];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      prods = prods.filter(p => 
        (p.nombre || p.name || '').toLowerCase().includes(term) ||
        (p.descripcion || p.description || '').toLowerCase().includes(term)
      );
    }
    
    return prods;
  }, [activeCategory, productsByCategory, products, searchTerm]);

  // Obtener mesa seleccionada con su pedido
  const selectedTableData = useMemo(() => {
    if (!selectedTable || !data) return null;
    return data.find(t => t._id === selectedTable);
  }, [selectedTable, data]);

  // Acciones del pedido
  const handleAddProduct = async (product) => {
    if (!selectedTable) return;
    
    setLoading(true);
    try {
      await api.post(`/api/views/${view._id}/order`, {
        workspaceId,
        tableId: selectedTable,
        action: 'add',
        productId: product._id,
        quantity: 1,
      });
      onRefresh?.();
    } catch (err) {
      console.error('Error adding product:', err);
      alert('Error al agregar producto');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveProduct = async (productId) => {
    if (!selectedTable) return;
    
    setLoading(true);
    try {
      await api.post(`/api/views/${view._id}/order`, {
        workspaceId,
        tableId: selectedTable,
        action: 'remove',
        productId,
        quantity: 1,
      });
      onRefresh?.();
    } catch (err) {
      console.error('Error removing product:', err);
      alert('Error al quitar producto');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status) => {
    if (!selectedTable) return;
    
    setLoading(true);
    try {
      await api.post(`/api/views/${view._id}/order`, {
        workspaceId,
        tableId: selectedTable,
        action: 'update-status',
        status,
      });
      onRefresh?.();
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Error al actualizar estado');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseOrder = async () => {
    if (!selectedTable) return;
    
    if (!confirm('¿Cerrar y cobrar este pedido?')) return;
    
    setLoading(true);
    try {
      await api.post(`/api/views/${view._id}/order`, {
        workspaceId,
        tableId: selectedTable,
        action: 'close',
      });
      setSelectedTable(null);
      onRefresh?.();
    } catch (err) {
      console.error('Error closing order:', err);
      alert('Error al cerrar pedido');
    } finally {
      setLoading(false);
    }
  };

  // Obtener info de la mesa
  const getTableName = (table) => {
    return table.numero || table.nombre || table.name || `Mesa ${table._id?.slice(-4)}`;
  };

  const getTableStatus = (table) => {
    return table._tableStatus || 'libre';
  };

  const getActiveOrder = (table) => {
    return table._activeOrder;
  };

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[500px]">
      {/* Panel izquierdo: Mesas */}
      <div className="w-1/4 border-r border-gray-200 p-4 overflow-y-auto bg-gray-50">
        <h3 className="font-semibold text-lg mb-4 text-gray-800">Mesas</h3>
        
        <div className="grid grid-cols-2 gap-3">
          {data?.map(table => {
            const status = getTableStatus(table);
            const colorClass = STATUS_COLORS[status] || STATUS_COLORS.libre;
            const isSelected = selectedTable === table._id;
            const order = getActiveOrder(table);
            
            return (
              <button
                key={table._id}
                onClick={() => setSelectedTable(table._id)}
                className={`
                  p-3 rounded-lg border-2 transition-all text-center
                  ${colorClass}
                  ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
                  hover:shadow-md
                `}
              >
                <div className="font-bold text-lg">{getTableName(table)}</div>
                <div className="text-xs capitalize">{status}</div>
                {order && (
                  <div className="mt-1 text-sm font-semibold">
                    ${table._total?.toFixed(2) || '0.00'}
                  </div>
                )}
              </button>
            );
          })}
        </div>
        
        {(!data || data.length === 0) && (
          <p className="text-gray-500 text-center py-8">No hay mesas configuradas</p>
        )}
      </div>

      {/* Panel central: Productos */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        <div className="mb-4">
          <h3 className="font-semibold text-lg text-gray-800 mb-3">Productos</h3>
          
          {/* Búsqueda */}
          <input
            type="text"
            placeholder="Buscar producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          
          {/* Categorías */}
          {categories.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-3">
              <button
                onClick={() => setActiveCategory(null)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  !activeCategory 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Todos
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    activeCategory === cat 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Grid de productos */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map(product => {
              const name = product.nombre || product.name || 'Sin nombre';
              const price = parseFloat(product.precio || product.price || 0);
              const available = product.disponible !== false && product.available !== false;
              
              return (
                <button
                  key={product._id}
                  onClick={() => handleAddProduct(product)}
                  disabled={!selectedTable || loading || !available}
                  className={`
                    p-4 rounded-lg border text-left transition-all
                    ${available 
                      ? 'bg-white hover:bg-blue-50 hover:border-blue-400 border-gray-200' 
                      : 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
                    }
                    ${!selectedTable ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <div className="font-medium text-gray-900 truncate">{name}</div>
                  <div className="text-lg font-bold text-green-600 mt-1">
                    ${price.toFixed(2)}
                  </div>
                  {!available && (
                    <div className="text-xs text-red-500 mt-1">No disponible</div>
                  )}
                </button>
              );
            })}
          </div>
          
          {filteredProducts.length === 0 && (
            <p className="text-gray-500 text-center py-8">
              {searchTerm ? 'No se encontraron productos' : 'No hay productos disponibles'}
            </p>
          )}
        </div>
        
        {!selectedTable && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center text-yellow-800">
            Selecciona una mesa para agregar productos
          </div>
        )}
      </div>

      {/* Panel derecho: Pedido actual */}
      <div className="w-1/3 border-l border-gray-200 flex flex-col bg-white">
        {selectedTableData ? (
          <>
            {/* Header del pedido */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg">{getTableName(selectedTableData)}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    STATUS_COLORS[getTableStatus(selectedTableData)] || ''
                  }`}>
                    {getTableStatus(selectedTableData)}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedTable(null)}
                  className="text-gray-500 hover:text-gray-700 p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Items del pedido */}
            <div className="flex-1 overflow-y-auto p-4">
              {selectedTableData._activeOrder?.items?.length > 0 ? (
                <div className="space-y-2">
                  {selectedTableData._activeOrder.items.map((item, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{item.nombre || item.name}</div>
                        <div className="text-sm text-gray-500">
                          ${(item.precio || item.price || 0).toFixed(2)} x {item.cantidad || item.quantity || 1}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-green-600">
                          ${item.subtotal?.toFixed(2) || '0.00'}
                        </span>
                        <button
                          onClick={() => handleRemoveProduct(item.productId || item._id)}
                          disabled={loading}
                          className="p-1 text-red-500 hover:bg-red-100 rounded"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <p>No hay productos en el pedido</p>
                  <p className="text-sm mt-2">Selecciona productos del menú</p>
                </div>
              )}
            </div>

            {/* Footer con total y acciones */}
            <div className="border-t border-gray-200 p-4 bg-gray-50">
              {/* Total */}
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-semibold text-gray-700">Total:</span>
                <span className="text-2xl font-bold text-green-600">
                  ${selectedTableData._total?.toFixed(2) || '0.00'}
                </span>
              </div>

              {/* Estado del pedido */}
              {selectedTableData._activeOrder && (
                <div className="mb-4">
                  <span className="text-sm text-gray-500 mr-2">Estado:</span>
                  <span className={`px-2 py-1 rounded-full text-sm ${
                    ORDER_STATUS_COLORS[selectedTableData._activeOrder.estado] || 'bg-gray-100'
                  }`}>
                    {selectedTableData._activeOrder.estado || 'abierto'}
                  </span>
                </div>
              )}

              {/* Botones de acción */}
              <div className="space-y-2">
                {selectedTableData._activeOrder && (
                  <>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateStatus('pendiente')}
                        disabled={loading}
                        className="flex-1 px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 text-sm"
                      >
                        Enviar a cocina
                      </button>
                      <button
                        onClick={() => handleUpdateStatus('listo')}
                        disabled={loading}
                        className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 text-sm"
                      >
                        Listo
                      </button>
                    </div>
                    <button
                      onClick={handleCloseOrder}
                      disabled={loading || !selectedTableData._activeOrder}
                      className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
                    >
                      💰 Cobrar ${selectedTableData._total?.toFixed(2) || '0.00'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p>Selecciona una mesa</p>
              <p className="text-sm">para ver o crear un pedido</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
