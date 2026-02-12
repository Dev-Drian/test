import { useState } from "react";

// Iconos SVG
const Icons = {
  text: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  ),
  number: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5l-3.9 19.5m-2.1-19.5l-3.9 19.5" />
    </svg>
  ),
  date: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  ),
  email: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  ),
  phone: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
    </svg>
  ),
  select: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  ),
  relation: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  ),
  plus: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  ),
  trash: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  ),
  check: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  ),
  up: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
    </svg>
  ),
  down: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  ),
  settings: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

// Tipos de campo disponibles
const FIELD_TYPES = [
  { value: "text", label: "Texto", icon: Icons.text, color: "blue", desc: "Texto libre" },
  { value: "number", label: "Número", icon: Icons.number, color: "emerald", desc: "Valores numéricos" },
  { value: "date", label: "Fecha", icon: Icons.date, color: "amber", desc: "Fecha y hora" },
  { value: "email", label: "Email", icon: Icons.email, color: "cyan", desc: "Correo electrónico" },
  { value: "phone", label: "Teléfono", icon: Icons.phone, color: "purple", desc: "Número telefónico" },
  { value: "select", label: "Selección", icon: Icons.select, color: "pink", desc: "Opciones predefinidas" },
  { value: "relation", label: "Relación", icon: Icons.relation, color: "orange", desc: "Enlace a otra tabla" },
];

const DEFAULT_FIELD = {
  name: "",
  type: "text",
  required: false,
  hiddenFromChat: false,
  defaultValue: "",
  options: [],
  validation: {},
};

// Permisos por defecto - delete desactivado por seguridad
const DEFAULT_PERMISSIONS = {
  allowQuery: true,
  allowCreate: true,
  allowUpdate: true,
  allowDelete: false,
};

export default function TableBuilder({ onSave, onCancel, availableTables = [], loading }) {
  const [step, setStep] = useState(1);
  const [tableName, setTableName] = useState("");
  const [tableDescription, setTableDescription] = useState("");
  const [fields, setFields] = useState([{ ...DEFAULT_FIELD, id: Date.now() }]);
  const [permissions, setPermissions] = useState({ ...DEFAULT_PERMISSIONS });
  const [errors, setErrors] = useState({});
  const [expandedField, setExpandedField] = useState(null);

  const addField = () => {
    const newField = { ...DEFAULT_FIELD, id: Date.now() };
    setFields([...fields, newField]);
    setExpandedField(newField.id);
  };

  const removeField = (id) => {
    if (fields.length > 1) {
      setFields(fields.filter((f) => f.id !== id));
      if (expandedField === id) setExpandedField(null);
    }
  };

  const updateField = (id, updates) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const moveField = (index, direction) => {
    const newFields = [...fields];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= fields.length) return;
    [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
    setFields(newFields);
  };

  const validate = () => {
    const newErrors = {};
    if (!tableName.trim()) {
      newErrors.tableName = "El nombre es requerido";
    }
    fields.forEach((field) => {
      if (!field.name.trim()) {
        newErrors[`field_${field.id}`] = "El nombre del campo es requerido";
      }
      if (field.type === "relation" && !field.validation?.table) {
        newErrors[`field_${field.id}_relation`] = "Selecciona una tabla";
      }
      if (field.type === "select" && field.options.length === 0) {
        newErrors[`field_${field.id}_options`] = "Agrega al menos una opción";
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const headers = fields.map((f) => ({
      key: f.name.toLowerCase().replace(/\s+/g, "_"),
      label: f.name,
      type: f.type,
      required: f.required,
      hiddenFromChat: f.hiddenFromChat,
      ...(f.defaultValue && { defaultValue: f.defaultValue }),
      ...(f.type === "select" && f.options.length > 0 && { options: f.options }),
      ...(f.type === "relation" && {
        validation: {
          type: "relation",
          table: f.validation.table,
          field: f.validation.field || "nombre",
        },
      }),
    }));

    onSave({
      name: tableName,
      description: tableDescription,
      headers,
      permissions,
    });
  };

  const getFieldTypeInfo = (type) => FIELD_TYPES.find(t => t.value === type) || FIELD_TYPES[0];

  return (
    <div className="space-y-6">
      {/* Progress steps */}
      <div className="flex items-center gap-4 pb-6 border-b border-white/[0.06]">
        {[
          { num: 1, label: "Información" },
          { num: 2, label: "Campos" },
          { num: 3, label: "Revisar" },
        ].map((s, i) => (
          <button
            key={s.num}
            type="button"
            onClick={() => s.num <= step && setStep(s.num)}
            className={`flex items-center gap-3 ${s.num > step ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
              step === s.num 
                ? 'bg-blue-500 text-white' 
                : step > s.num 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' 
                : 'bg-white/[0.03] text-zinc-500 border border-white/[0.08]'
            }`}>
              {step > s.num ? Icons.check : s.num}
            </div>
            <span className={`text-sm font-medium ${step === s.num ? 'text-white' : 'text-zinc-500'}`}>
              {s.label}
            </span>
            {i < 2 && <div className="w-8 h-px bg-white/[0.08]" />}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {/* Step 1: Información básica */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Nombre de la tabla *
              </label>
              <input
                type="text"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                placeholder="Ej: Clientes, Productos, Ventas..."
                className={`w-full px-4 py-3 rounded-xl bg-white/[0.03] border text-white placeholder-zinc-600 focus:outline-none focus:ring-2 transition-all ${
                  errors.tableName 
                    ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20' 
                    : 'border-white/[0.08] focus:border-blue-500/50 focus:ring-blue-500/20'
                }`}
                autoFocus
              />
              {errors.tableName && (
                <p className="text-xs text-red-400 mt-2">{errors.tableName}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Descripción (opcional)
              </label>
              <textarea
                value={tableDescription}
                onChange={(e) => setTableDescription(e.target.value)}
                placeholder="¿Qué datos almacenará esta tabla?"
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
              />
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => tableName.trim() && setStep(2)}
                disabled={!tableName.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Campos */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-white">Campos de la tabla</h3>
                <p className="text-sm text-zinc-500">Define la estructura de tus datos</p>
              </div>
              <button
                type="button"
                onClick={addField}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 text-blue-400 text-sm font-medium hover:bg-blue-500/20 transition-colors border border-blue-500/20"
              >
                {Icons.plus}
                Agregar campo
              </button>
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => {
                const typeInfo = getFieldTypeInfo(field.type);
                const isExpanded = expandedField === field.id;
                const hasError = errors[`field_${field.id}`] || errors[`field_${field.id}_relation`] || errors[`field_${field.id}_options`];
                
                return (
                  <div
                    key={field.id}
                    className={`rounded-xl border transition-all ${
                      hasError 
                        ? 'bg-red-500/5 border-red-500/30' 
                        : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1]'
                    }`}
                  >
                    {/* Field header */}
                    <div className="p-4 flex items-center gap-3">
                      {/* Reorder */}
                      <div className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => moveField(index, -1)}
                          disabled={index === 0}
                          className="p-1 text-zinc-600 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed"
                        >
                          {Icons.up}
                        </button>
                        <button
                          type="button"
                          onClick={() => moveField(index, 1)}
                          disabled={index === fields.length - 1}
                          className="p-1 text-zinc-600 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed"
                        >
                          {Icons.down}
                        </button>
                      </div>

                      {/* Field icon */}
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        typeInfo.color === 'blue' ? 'bg-blue-500/10 text-blue-400' :
                        typeInfo.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400' :
                        typeInfo.color === 'amber' ? 'bg-amber-500/10 text-amber-400' :
                        typeInfo.color === 'cyan' ? 'bg-cyan-500/10 text-cyan-400' :
                        typeInfo.color === 'purple' ? 'bg-purple-500/10 text-purple-400' :
                        typeInfo.color === 'pink' ? 'bg-pink-500/10 text-pink-400' :
                        'bg-orange-500/10 text-orange-400'
                      }`}>
                        {typeInfo.icon}
                      </div>

                      {/* Field name input */}
                      <input
                        type="text"
                        value={field.name}
                        onChange={(e) => updateField(field.id, { name: e.target.value })}
                        placeholder="Nombre del campo"
                        className="flex-1 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 transition-all"
                      />

                      {/* Type selector */}
                      <select
                        value={field.type}
                        onChange={(e) => updateField(field.id, { type: e.target.value, options: [], validation: {} })}
                        className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-zinc-300 focus:outline-none focus:border-blue-500/50 transition-all cursor-pointer"
                      >
                        {FIELD_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>

                      {/* Required toggle */}
                      <button
                        type="button"
                        onClick={() => updateField(field.id, { required: !field.required })}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          field.required 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-white/[0.03] text-zinc-500 border border-white/[0.08] hover:text-zinc-300'
                        }`}
                      >
                        {field.required ? 'Requerido' : 'Opcional'}
                      </button>

                      {/* Settings toggle */}
                      <button
                        type="button"
                        onClick={() => setExpandedField(isExpanded ? null : field.id)}
                        className={`p-2 rounded-lg transition-all ${
                          isExpanded 
                            ? 'bg-blue-500/10 text-blue-400' 
                            : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.03]'
                        }`}
                      >
                        {Icons.settings}
                      </button>

                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => removeField(field.id)}
                        disabled={fields.length === 1}
                        className="p-2 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                      >
                        {Icons.trash}
                      </button>
                    </div>

                    {/* Expanded options */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-white/[0.04] space-y-4">
                        {/* Default value */}
                        <div className="flex items-center gap-4">
                          <label className="text-sm text-zinc-400 w-32">Valor por defecto:</label>
                          <input
                            type="text"
                            value={field.defaultValue}
                            onChange={(e) => updateField(field.id, { defaultValue: e.target.value })}
                            placeholder={field.type === "date" ? "today, now, o una fecha" : "Dejar vacío si no aplica"}
                            className="flex-1 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 transition-all"
                          />
                        </div>

                        {/* Hidden from chat */}
                        <div className="flex items-center gap-4">
                          <label className="text-sm text-zinc-400 w-32">Oculto en chat:</label>
                          <button
                            type="button"
                            onClick={() => updateField(field.id, { hiddenFromChat: !field.hiddenFromChat })}
                            className={`px-3 py-2 rounded-lg text-sm transition-all ${
                              field.hiddenFromChat 
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' 
                                : 'bg-white/[0.03] text-zinc-500 border border-white/[0.08]'
                            }`}
                          >
                            {field.hiddenFromChat ? 'Sí, oculto' : 'No, visible'}
                          </button>
                          <span className="text-xs text-zinc-600">El agente no mostrará este campo en conversaciones</span>
                        </div>

                        {/* Select options */}
                        {field.type === "select" && (
                          <OptionsEditor
                            options={field.options}
                            onChange={(options) => updateField(field.id, { options })}
                            error={errors[`field_${field.id}_options`]}
                          />
                        )}

                        {/* Relation config */}
                        {field.type === "relation" && (
                          <RelationEditor
                            validation={field.validation}
                            availableTables={availableTables}
                            onChange={(validation) => updateField(field.id, { validation })}
                            error={errors[`field_${field.id}_relation`]}
                          />
                        )}
                      </div>
                    )}

                    {/* Error display */}
                    {hasError && (
                      <div className="px-4 pb-3">
                        <p className="text-xs text-red-400">
                          {errors[`field_${field.id}`] || errors[`field_${field.id}_relation`] || errors[`field_${field.id}_options`]}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-zinc-400 text-sm font-medium hover:bg-white/[0.06] hover:text-white transition-all"
              >
                Atrás
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-400 transition-colors"
              >
                Siguiente
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h3 className="text-lg font-medium text-white mb-1">Revisar y crear</h3>
              <p className="text-sm text-zinc-500">Confirma la estructura de tu tabla antes de crearla</p>
            </div>

            {/* Table info */}
            <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white">{tableName}</h4>
                  <p className="text-sm text-zinc-500">{tableDescription || "Sin descripción"}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-sm">
                <span className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {fields.filter(f => f.name).length} campos
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {fields.filter(f => f.required).length} requeridos
                </span>
              </div>
            </div>

            {/* Fields preview */}
            <div className="rounded-xl border border-white/[0.06] overflow-hidden">
              <div className="bg-white/[0.02] px-4 py-3 border-b border-white/[0.06]">
                <h4 className="text-sm font-medium text-zinc-400">Vista previa de la estructura</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {fields.filter(f => f.name).map((f) => {
                        const typeInfo = getFieldTypeInfo(f.type);
                        return (
                          <th key={f.id} className="text-left p-4">
                            <div className="flex items-center gap-2">
                              <span className={`${
                                typeInfo.color === 'blue' ? 'text-blue-400' :
                                typeInfo.color === 'emerald' ? 'text-emerald-400' :
                                typeInfo.color === 'amber' ? 'text-amber-400' :
                                typeInfo.color === 'cyan' ? 'text-cyan-400' :
                                typeInfo.color === 'purple' ? 'text-purple-400' :
                                typeInfo.color === 'pink' ? 'text-pink-400' :
                                'text-orange-400'
                              }`}>
                                {typeInfo.icon}
                              </span>
                              <span className="text-sm font-medium text-zinc-300">{f.name}</span>
                              {f.required && <span className="text-red-400 text-xs">*</span>}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {fields.filter(f => f.name).map((f) => (
                        <td key={f.id} className="p-4 text-sm text-zinc-500">
                          {f.type === "date" && "2024-01-15"}
                          {f.type === "number" && "123"}
                          {f.type === "email" && "user@ejemplo.com"}
                          {f.type === "phone" && "+52 55 1234 5678"}
                          {f.type === "text" && "Ejemplo de texto"}
                          {f.type === "select" && (f.options[0] || "Opción")}
                          {f.type === "relation" && "→ Registro"}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Permissions section */}
            <div className="rounded-xl border border-white/[0.06] overflow-hidden">
              <div className="bg-white/[0.02] px-4 py-3 border-b border-white/[0.06]">
                <h4 className="text-sm font-medium text-zinc-400">Permisos del Bot</h4>
                <p className="text-xs text-zinc-500 mt-1">Controla qué acciones puede realizar el asistente sobre esta tabla</p>
              </div>
              <div className="p-4 grid grid-cols-2 gap-4">
                {/* Query permission */}
                <label className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] cursor-pointer hover:bg-white/[0.04] transition-colors">
                  <input
                    type="checkbox"
                    checked={permissions.allowQuery}
                    onChange={(e) => setPermissions({ ...permissions, allowQuery: e.target.checked })}
                    className="w-4 h-4 rounded border-zinc-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 bg-zinc-800"
                  />
                  <div>
                    <span className="text-sm font-medium text-zinc-300">🔍 Consultar</span>
                    <p className="text-xs text-zinc-500">Buscar y ver registros</p>
                  </div>
                </label>

                {/* Create permission */}
                <label className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] cursor-pointer hover:bg-white/[0.04] transition-colors">
                  <input
                    type="checkbox"
                    checked={permissions.allowCreate}
                    onChange={(e) => setPermissions({ ...permissions, allowCreate: e.target.checked })}
                    className="w-4 h-4 rounded border-zinc-600 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 bg-zinc-800"
                  />
                  <div>
                    <span className="text-sm font-medium text-zinc-300">➕ Crear</span>
                    <p className="text-xs text-zinc-500">Agregar nuevos registros</p>
                  </div>
                </label>

                {/* Update permission */}
                <label className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] cursor-pointer hover:bg-white/[0.04] transition-colors">
                  <input
                    type="checkbox"
                    checked={permissions.allowUpdate}
                    onChange={(e) => setPermissions({ ...permissions, allowUpdate: e.target.checked })}
                    className="w-4 h-4 rounded border-zinc-600 text-amber-500 focus:ring-amber-500 focus:ring-offset-0 bg-zinc-800"
                  />
                  <div>
                    <span className="text-sm font-medium text-zinc-300">✏️ Editar</span>
                    <p className="text-xs text-zinc-500">Modificar registros existentes</p>
                  </div>
                </label>

                {/* Delete permission */}
                <label className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-red-500/20 cursor-pointer hover:bg-white/[0.04] transition-colors">
                  <input
                    type="checkbox"
                    checked={permissions.allowDelete}
                    onChange={(e) => setPermissions({ ...permissions, allowDelete: e.target.checked })}
                    className="w-4 h-4 rounded border-zinc-600 text-red-500 focus:ring-red-500 focus:ring-offset-0 bg-zinc-800"
                  />
                  <div>
                    <span className="text-sm font-medium text-red-400">🗑️ Eliminar</span>
                    <p className="text-xs text-zinc-500">Borrar registros (desactivado por defecto)</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-zinc-400 text-sm font-medium hover:bg-white/[0.06] hover:text-white transition-all"
              >
                Atrás
              </button>
              <div className="flex items-center gap-3">
                <button 
                  type="button" 
                  onClick={onCancel}
                  className="px-5 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-zinc-400 text-sm font-medium hover:bg-white/[0.06] hover:text-white transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creando...</span>
                    </>
                  ) : (
                    <>
                      {Icons.check}
                      <span>Crear tabla</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

// Componente para editar opciones de select
function OptionsEditor({ options, onChange, error }) {
  const [input, setInput] = useState("");

  const addOption = () => {
    if (input.trim() && !options.includes(input.trim())) {
      onChange([...options, input.trim()]);
      setInput("");
    }
  };

  const removeOption = (opt) => {
    onChange(options.filter((o) => o !== opt));
  };

  return (
    <div>
      <label className="text-sm text-zinc-400 block mb-2">Opciones disponibles:</label>
      <div className="flex flex-wrap gap-2 mb-3">
        {options.map((opt) => (
          <span
            key={opt}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-pink-500/10 text-pink-400 rounded-lg text-sm border border-pink-500/20"
          >
            {opt}
            <button
              type="button"
              onClick={() => removeOption(opt)}
              className="hover:text-red-400 transition-colors"
            >
              ×
            </button>
          </span>
        ))}
        {options.length === 0 && (
          <span className="text-sm text-zinc-600">No hay opciones agregadas</span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addOption())}
          placeholder="Nueva opción"
          className="flex-1 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white placeholder-zinc-600 focus:outline-none focus:border-pink-500/50 transition-all"
        />
        <button
          type="button"
          onClick={addOption}
          className="px-4 py-2 rounded-lg bg-pink-500/10 text-pink-400 text-sm font-medium hover:bg-pink-500/20 transition-colors border border-pink-500/20"
        >
          Agregar
        </button>
      </div>
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </div>
  );
}

// Componente para editar relación
function RelationEditor({ validation, availableTables, onChange, error }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="text-sm text-zinc-400 block mb-2">Tabla relacionada:</label>
        <select
          value={validation?.table || ""}
          onChange={(e) => onChange({ ...validation, table: e.target.value })}
          className={`w-full px-3 py-2 rounded-lg bg-white/[0.03] border text-zinc-300 focus:outline-none transition-all cursor-pointer ${
            error ? 'border-red-500/50' : 'border-white/[0.08] focus:border-orange-500/50'
          }`}
        >
          <option value="">Seleccionar tabla...</option>
          {availableTables.map((t) => (
            <option key={t._id} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm text-zinc-400 block mb-2">Campo a mostrar:</label>
        <input
          type="text"
          value={validation?.field || "nombre"}
          onChange={(e) => onChange({ ...validation, field: e.target.value })}
          placeholder="nombre"
          className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500/50 transition-all"
        />
      </div>
      {error && <p className="text-xs text-red-400 col-span-2">{error}</p>}
    </div>
  );
}
