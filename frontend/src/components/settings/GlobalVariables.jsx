import { useState, useEffect, useCallback } from 'react';
import { 
  VariableIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  MagnifyingGlassIcon,
  ClipboardIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import api from '../../api/client';
import HelpCollapse from '../common/HelpCollapse';

const VARIABLE_TYPES = {
  text: { label: 'Texto', icon: 'Aa', color: 'blue' },
  number: { label: 'Numero', icon: '#', color: 'green' },
  boolean: { label: 'Si/No', icon: 'Y', color: 'yellow' },
  date: { label: 'Fecha', icon: 'D', color: 'purple' },
  time: { label: 'Hora', icon: 'T', color: 'pink' },
  json: { label: 'JSON', icon: '{}', color: 'orange' },
  secret: { label: 'Secreto', icon: '*', color: 'red' },
  list: { label: 'Lista', icon: '[]', color: 'cyan' }
};

const CATEGORIES = {
  business: 'Negocio',
  contact: 'Contacto',
  schedule: 'Horarios',
  pricing: 'Precios',
  templates: 'Plantillas',
  system: 'Sistema',
  custom: 'Personalizado'
};

/**
 * GlobalVariables - Dashboard de variables globales
 */
export default function GlobalVariables({ workspaceId }) {
  const [variables, setVariables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showEditor, setShowEditor] = useState(false);
  const [editingVariable, setEditingVariable] = useState(null);
  const [copied, setCopied] = useState(null);
  
  // Form state
  const [form, setForm] = useState({
    key: '',
    label: '',
    value: '',
    type: 'text',
    category: 'custom',
    description: ''
  });
  
  // Cargar variables
  const loadVariables = useCallback(async () => {
    try {
      const response = await api.get(`/variables/${workspaceId}`);
      if (response.data.success) {
        setVariables(response.data.variables);
      }
    } catch (err) {
      console.error('Error loading variables:', err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);
  
  useEffect(() => {
    loadVariables();
  }, [loadVariables]);
  
  // Filtrar variables
  const filteredVariables = variables.filter(v => {
    const matchesSearch = !search || 
      v.key.toLowerCase().includes(search.toLowerCase()) ||
      v.label?.toLowerCase().includes(search.toLowerCase()) ||
      v.value?.toString().toLowerCase().includes(search.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || v.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });
  
  // Guardar variable
  const saveVariable = async () => {
    try {
      const response = await api.post(`/variables/${workspaceId}`, form);
      if (response.data.success) {
        await loadVariables();
        setShowEditor(false);
        setEditingVariable(null);
        resetForm();
      }
    } catch (err) {
      console.error('Error saving variable:', err);
    }
  };
  
  // Eliminar variable
  const deleteVariable = async (variableId) => {
    if (!confirm('¿Eliminar esta variable?')) return;
    
    try {
      await api.delete(`/variables/${workspaceId}/${variableId}`);
      await loadVariables();
    } catch (err) {
      console.error('Error deleting variable:', err);
    }
  };
  
  // Editar variable
  const editVariable = (variable) => {
    setEditingVariable(variable);
    setForm({
      key: variable.key,
      label: variable.label || '',
      value: variable.value,
      type: variable.type,
      category: variable.category,
      description: variable.description || ''
    });
    setShowEditor(true);
  };
  
  // Reset form
  const resetForm = () => {
    setForm({
      key: '',
      label: '',
      value: '',
      type: 'text',
      category: 'custom',
      description: ''
    });
  };
  
  // Copiar al portapapeles
  const copyToClipboard = (key) => {
    navigator.clipboard.writeText(`{{${key}}}`);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl">
            <VariableIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Variables Globales</h2>
            <p className="text-sm text-zinc-400">
              Datos de tu negocio que tu bot puede usar en cualquier flujo
            </p>
          </div>
        </div>
        
        <button
          onClick={() => {
            resetForm();
            setEditingVariable(null);
            setShowEditor(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg transition-colors shadow-lg shadow-violet-500/25"
        >
          <PlusIcon className="w-5 h-5" />
          Nueva Variable
        </button>
      </div>

      {/* Explicación educativa unificada */}
      <HelpCollapse title="¿Qué son las Variables Globales?" icon={VariableIcon}>
        <p className="mb-3">Son <span className="text-violet-400 font-medium">datos de tu negocio</span> reutilizables en cualquier flujo. Si cambias aquí, se actualiza en todo el bot.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <span className="font-medium text-white block mb-1">Ejemplo de uso:</span>
            <span className="text-zinc-400">En un mensaje escribe </span>
            <code className="text-violet-400 bg-violet-500/10 px-1 rounded">{'{{horario}}'}</code>
            <span className="text-zinc-400"> y el bot lo reemplaza por el valor configurado.</span>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <span className="font-medium text-white block mb-1">Variables comunes:</span>
            <span className="text-zinc-400">Horarios, teléfono, dirección, precios, promociones, redes sociales.</span>
          </div>
        </div>
      </HelpCollapse>
      
      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="w-5 h-5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar variables..."
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
        
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2.5 bg-zinc-800 border border-zinc-700 text-white rounded-lg focus:ring-2 focus:ring-violet-500"
        >
          <option value="all">Todas las categorías</option>
          {Object.entries(CATEGORIES).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>
      
      {/* Variables Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
        </div>
      ) : filteredVariables.length === 0 ? (
        <div className="text-center py-12 bg-zinc-900/50 rounded-xl border border-zinc-700">
          <VariableIcon className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400">No hay variables</p>
          <button
            onClick={() => setShowEditor(true)}
            className="mt-3 text-violet-400 hover:text-violet-300 font-medium"
          >
            Crear una variable
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVariables.map((variable) => {
            const typeInfo = VARIABLE_TYPES[variable.type] || VARIABLE_TYPES.text;
            
            return (
              <div
                key={variable._id}
                className="bg-zinc-900/50 border border-zinc-700 rounded-xl p-4 hover:border-violet-500/50 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-8 h-8 rounded-lg bg-${typeInfo.color}-900/30 text-${typeInfo.color}-400 flex items-center justify-center text-sm font-bold`}>
                      {typeInfo.icon}
                    </span>
                    <div>
                      <h3 className="font-medium text-white">{variable.label || variable.key}</h3>
                      <p className="text-xs text-zinc-500">{CATEGORIES[variable.category]}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-1">
                    <button
                      onClick={() => copyToClipboard(variable.key)}
                      className="p-1.5 text-zinc-500 hover:text-violet-400 hover:bg-violet-900/30 rounded transition-colors"
                      title="Copiar"
                    >
                      {copied === variable.key ? (
                        <CheckIcon className="w-4 h-4 text-green-400" />
                      ) : (
                        <ClipboardIcon className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => editVariable(variable)}
                      className="p-1.5 text-zinc-500 hover:text-violet-400 hover:bg-violet-900/30 rounded transition-colors"
                      title="Editar"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteVariable(variable._id)}
                      className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-900/30 rounded transition-colors"
                      title="Eliminar"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Value Preview */}
                <div className="bg-zinc-800 rounded-lg p-2 mb-2">
                  <code className="text-xs text-zinc-400 font-mono">
                    {`{{${variable.key}}}`}
                  </code>
                </div>
                
                <div className="text-sm text-zinc-300 truncate">
                  {variable.type === 'secret' ? '••••••••' : (
                    typeof variable.value === 'object' 
                      ? JSON.stringify(variable.value).substring(0, 50) + '...'
                      : variable.value?.toString().substring(0, 100)
                  )}
                </div>
                
                {variable.description && (
                  <p className="mt-2 text-xs text-zinc-500 line-clamp-2">
                    {variable.description}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {/* Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-700 w-full max-w-md">
            <div className="p-6 border-b border-zinc-700">
              <h3 className="text-lg font-semibold text-white">
                {editingVariable ? 'Editar Variable' : 'Nueva Variable'}
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Key */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Clave (para usar en flujos)
                </label>
                <input
                  type="text"
                  value={form.key}
                  onChange={(e) => setForm({ ...form, key: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                  placeholder="nombre_negocio"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg focus:ring-2 focus:ring-violet-500"
                  disabled={!!editingVariable}
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Usa esto en tus flujos: {`{{${form.key || 'clave'}}}`}
                </p>
              </div>
              
              {/* Label */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Nombre descriptivo
                </label>
                <input
                  type="text"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="Nombre del Negocio"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg focus:ring-2 focus:ring-violet-500"
                />
              </div>
              
              {/* Type & Category */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Tipo
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-lg"
                  >
                    {Object.entries(VARIABLE_TYPES).map(([key, info]) => (
                      <option key={key} value={key}>{info.label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Categoría
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-lg"
                  >
                    {Object.entries(CATEGORIES).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Value */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Valor
                </label>
                {form.type === 'boolean' ? (
                  <select
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value === 'true' })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-lg"
                  >
                    <option value="true">Sí</option>
                    <option value="false">No</option>
                  </select>
                ) : form.type === 'json' || form.type === 'list' ? (
                  <textarea
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    placeholder={form.type === 'list' ? '["item1", "item2"]' : '{"key": "value"}'}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg h-24 font-mono text-sm"
                  />
                ) : (
                  <input
                    type={form.type === 'number' ? 'number' : form.type === 'secret' ? 'password' : 'text'}
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    placeholder="Valor de la variable"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg"
                  />
                )}
              </div>
              
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Descripción (opcional)
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="¿Para qué se usa esta variable?"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg h-20 resize-none"
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-zinc-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditor(false);
                  setEditingVariable(null);
                  resetForm();
                }}
                className="px-4 py-2 text-zinc-400 hover:text-white font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={saveVariable}
                disabled={!form.key}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg disabled:opacity-50"
              >
                {editingVariable ? 'Guardar cambios' : 'Crear variable'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
