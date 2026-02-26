import { useState } from "react";
import { SearchIcon, PlusIcon, EditIcon, TrashIcon } from "./Icons";

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
  { value: "text", label: "Texto", icon: Icons.text, color: "blue", desc: "Texto libre", help: "Para nombres, descripciones, notas. Ej: 'Juan Pérez', 'Mesa junto a la ventana'" },
  { value: "number", label: "Número", icon: Icons.number, color: "emerald", desc: "Valores numéricos", help: "Para cantidades, precios, edades. Ej: 4 personas, $150.00" },
  { value: "date", label: "Fecha", icon: Icons.date, color: "amber", desc: "Fecha y hora", help: "Para citas, reservas, vencimientos. Ej: 15 de marzo de 2024" },
  { value: "email", label: "Email", icon: Icons.email, color: "cyan", desc: "Correo electrónico", help: "Se valida formato de email. Ej: cliente@ejemplo.com" },
  { value: "phone", label: "Teléfono", icon: Icons.phone, color: "purple", desc: "Número telefónico", help: "Se valida formato telefónico. Ej: 55 1234 5678" },
  { value: "select", label: "Selección", icon: Icons.select, color: "pink", desc: "Opciones predefinidas", help: "El usuario elige de una lista. Ej: Estado → Pendiente, Confirmado, Cancelado" },
  { value: "relation", label: "Relación", icon: Icons.relation, color: "orange", desc: "Enlace a otra tabla", help: "Conecta con registros de otra tabla. Ej: Cliente → Tabla de Clientes" },
  { value: "formula", label: "Calculado", icon: Icons.formula || (() => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>), color: "violet", desc: "Fórmula automática", help: "Calcula valores automáticamente. Ej: Total = Precio × Cantidad, Edad = Hoy - Fecha_nacimiento" },
];

// Fórmulas predefinidas
const FORMULA_TEMPLATES = [
  { id: 'sum', label: 'Suma', formula: '{campo1} + {campo2}', desc: 'Suma dos campos numéricos', example: 'Subtotal + IVA' },
  { id: 'multiply', label: 'Multiplicación', formula: '{campo1} * {campo2}', desc: 'Multiplica dos campos', example: 'Precio × Cantidad' },
  { id: 'percentage', label: 'Porcentaje', formula: '{campo} * 0.16', desc: 'Calcula un porcentaje', example: 'Subtotal × 0.16 (IVA)' },
  { id: 'concat', label: 'Concatenar', formula: '{campo1} + " " + {campo2}', desc: 'Une textos', example: 'Nombre + Apellido' },
  { id: 'age', label: 'Edad/Días', formula: 'DAYS({campo})', desc: 'Días desde una fecha', example: 'Días desde Fecha_registro' },
  { id: 'custom', label: 'Personalizada', formula: '', desc: 'Escribe tu propia fórmula', example: '' },
];

const DEFAULT_FIELD = {
  name: "",
  type: "text",
  required: false,
  hiddenFromChat: false,
  defaultValue: "",
  options: [],
  validation: {},
  formula: "", // Para campos calculados
};

// Validaciones avanzadas predefinidas
const VALIDATION_TEMPLATES = {
  text: [
    { id: 'minLength', label: 'Longitud mínima', type: 'number', placeholder: '3', icon: '📏' },
    { id: 'maxLength', label: 'Longitud máxima', type: 'number', placeholder: '100', icon: '📐' },
    { id: 'pattern', label: 'Patrón (regex)', type: 'text', placeholder: '^[A-Z]{3}\\d{4}$', icon: '🔣' },
  ],
  number: [
    { id: 'min', label: 'Valor mínimo', type: 'number', placeholder: '0', icon: '⬇️' },
    { id: 'max', label: 'Valor máximo', type: 'number', placeholder: '1000', icon: '⬆️' },
    { id: 'step', label: 'Incremento', type: 'number', placeholder: '1', icon: '➕' },
  ],
  email: [
    { id: 'domain', label: 'Dominio permitido', type: 'text', placeholder: '@empresa.com', icon: '🌐' },
  ],
  phone: [
    { id: 'format', label: 'Formato', type: 'select', options: ['Nacional', 'Internacional', 'Cualquiera'], icon: '📱' },
  ],
  date: [
    { id: 'minDate', label: 'Fecha mínima', type: 'text', placeholder: 'today', icon: '📅' },
    { id: 'maxDate', label: 'Fecha máxima', type: 'text', placeholder: '+30days', icon: '📆' },
    { id: 'allowPast', label: 'Permitir pasado', type: 'boolean', icon: '⏪' },
    { id: 'allowFuture', label: 'Permitir futuro', type: 'boolean', icon: '⏩' },
  ],
};

// Permisos por defecto - delete desactivado por seguridad
const DEFAULT_PERMISSIONS = {
  allowQuery: true,
  allowCreate: true,
  allowUpdate: true,
  allowDelete: false,
};

// ========== PLANTILLAS DE TABLAS ==========
const TABLE_TEMPLATES = [
  {
    id: 'crm',
    name: 'CRM - Clientes',
    description: 'Gestiona tus clientes y contactos',
    icon: '👥',
    color: 'blue',
    tableName: 'Clientes',
    tableDescription: 'Base de datos de clientes y prospectos',
    fields: [
      { name: 'Nombre', type: 'text', required: true },
      { name: 'Email', type: 'email', required: true },
      { name: 'Teléfono', type: 'phone', required: false },
      { name: 'Empresa', type: 'text', required: false },
      { name: 'Estado', type: 'select', required: true, options: ['Prospecto', 'Contactado', 'Negociando', 'Cliente', 'Inactivo'] },
      { name: 'Notas', type: 'text', required: false },
    ],
  },
  {
    id: 'restaurant',
    name: 'Restaurante',
    description: 'Reservaciones y gestión de mesas',
    icon: '🍽️',
    color: 'amber',
    tableName: 'Reservaciones',
    tableDescription: 'Sistema de reservas del restaurante',
    fields: [
      { name: 'Cliente', type: 'text', required: true },
      { name: 'Teléfono', type: 'phone', required: true },
      { name: 'Fecha', type: 'date', required: true },
      { name: 'Hora', type: 'text', required: true },
      { name: 'Personas', type: 'number', required: true },
      { name: 'Mesa', type: 'select', required: false, options: ['Mesa 1', 'Mesa 2', 'Mesa 3', 'Mesa 4', 'Mesa 5', 'Terraza', 'VIP'] },
      { name: 'Estado', type: 'select', required: true, options: ['Pendiente', 'Confirmada', 'Completada', 'Cancelada'] },
    ],
  },
  {
    id: 'clinic',
    name: 'Clínica / Consultorio',
    description: 'Citas médicas y pacientes',
    icon: '🏥',
    color: 'emerald',
    tableName: 'Citas',
    tableDescription: 'Agenda de citas médicas',
    fields: [
      { name: 'Paciente', type: 'text', required: true },
      { name: 'Teléfono', type: 'phone', required: true },
      { name: 'Email', type: 'email', required: false },
      { name: 'Fecha', type: 'date', required: true },
      { name: 'Hora', type: 'text', required: true },
      { name: 'Motivo', type: 'text', required: true },
      { name: 'Doctor', type: 'select', required: true, options: ['Dr. García', 'Dra. López', 'Dr. Martínez'] },
      { name: 'Estado', type: 'select', required: true, options: ['Programada', 'Confirmada', 'En curso', 'Completada', 'Cancelada'] },
    ],
  },
  {
    id: 'ecommerce',
    name: 'E-commerce',
    description: 'Productos y catálogo',
    icon: '🛒',
    color: 'purple',
    tableName: 'Productos',
    tableDescription: 'Catálogo de productos de la tienda',
    fields: [
      { name: 'Nombre', type: 'text', required: true },
      { name: 'Descripción', type: 'text', required: false },
      { name: 'Precio', type: 'number', required: true },
      { name: 'Stock', type: 'number', required: true },
      { name: 'Categoría', type: 'select', required: true, options: ['Electrónica', 'Ropa', 'Hogar', 'Deportes', 'Otros'] },
      { name: 'SKU', type: 'text', required: false },
      { name: 'Activo', type: 'select', required: true, options: ['Sí', 'No'] },
    ],
  },
  {
    id: 'custom',
    name: 'Personalizada',
    description: 'Empieza desde cero',
    icon: '✨',
    color: 'zinc',
    tableName: '',
    tableDescription: '',
    fields: [],
  },
];

export default function TableBuilder({ onSave, onCancel, availableTables = [], loading }) {
  const [step, setStep] = useState(0); // 0 = selección de plantilla
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [tableName, setTableName] = useState("");
  const [tableDescription, setTableDescription] = useState("");
  const [fields, setFields] = useState([{ ...DEFAULT_FIELD, id: Date.now() }]);
  const [permissions, setPermissions] = useState({ ...DEFAULT_PERMISSIONS });
  const [errors, setErrors] = useState({});
  const [expandedField, setExpandedField] = useState(null);
  
  // CSV Import state
  const [csvData, setCsvData] = useState(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvPreview, setCsvPreview] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  // Parsear CSV
  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return { headers: [], rows: [] };
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1, 6).map(line => { // Solo primeros 5 para preview
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      return headers.reduce((obj, h, i) => ({ ...obj, [h]: values[i] || '' }), {});
    });
    
    return { headers, rows, totalRows: lines.length - 1 };
  };

  // Detectar tipo de campo automáticamente
  const detectFieldType = (values) => {
    const sample = values.filter(v => v && v.trim()).slice(0, 10);
    if (sample.length === 0) return 'text';
    
    // Email
    if (sample.every(v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))) return 'email';
    // Teléfono
    if (sample.every(v => /^[\d\s\-\+\(\)]{7,}$/.test(v))) return 'phone';
    // Número
    if (sample.every(v => !isNaN(parseFloat(v)))) return 'number';
    // Fecha
    if (sample.every(v => !isNaN(Date.parse(v)))) return 'date';
    
    return 'text';
  };

  // Manejar archivo CSV
  const handleFileUpload = (file) => {
    if (!file || !file.name.endsWith('.csv')) {
      setErrors({ csv: 'Por favor sube un archivo CSV válido' });
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const { headers, rows, totalRows } = parseCSV(text);
      
      if (headers.length === 0) {
        setErrors({ csv: 'El archivo CSV está vacío o mal formateado' });
        return;
      }
      
      setCsvHeaders(headers);
      setCsvPreview(rows);
      setCsvData({ text, totalRows });
      
      // Auto-generar campos basados en headers
      const detectedFields = headers.map((header, i) => {
        const values = rows.map(r => r[header]);
        return {
          ...DEFAULT_FIELD,
          id: Date.now() + i,
          name: header,
          type: detectFieldType(values),
          required: i === 0, // Primer campo requerido por defecto
        };
      });
      
      setFields(detectedFields);
      setTableName(file.name.replace('.csv', '').replace(/_/g, ' '));
      setStep(1);
    };
    reader.readAsText(file);
  };

  // Drag & Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => setIsDragging(false);
  
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileUpload(file);
  };

  // Aplicar plantilla seleccionada
  const applyTemplate = (template) => {
    setSelectedTemplate(template.id);
    setCsvData(null);
    setCsvHeaders([]);
    setCsvPreview([]);
    if (template.id === 'custom') {
      setTableName('');
      setTableDescription('');
      setFields([{ ...DEFAULT_FIELD, id: Date.now() }]);
    } else {
      setTableName(template.tableName);
      setTableDescription(template.tableDescription);
      setFields(template.fields.map((f, i) => ({
        ...DEFAULT_FIELD,
        id: Date.now() + i,
        name: f.name,
        type: f.type,
        required: f.required,
        options: f.options || [],
      })));
    }
    setStep(1);
  };

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
      if (field.type === "formula" && !field.formula) {
        newErrors[`field_${field.id}_formula`] = "Define una fórmula para este campo";
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
      ...(f.type === "formula" && f.formula && { formula: f.formula }),
      // Validaciones avanzadas para campos que no son relation
      ...(f.type !== "relation" && f.validation && Object.keys(f.validation).length > 0 && {
        validation: f.validation,
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
      {/* Step 0: Selector de Plantillas */}
      {step === 0 && (
        <div className="space-y-6 animate-fade-in">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Elige cómo empezar</h2>
            <p className="text-zinc-400">Selecciona una plantilla o crea tu tabla desde cero</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TABLE_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => applyTemplate(template)}
                className={`group relative p-6 rounded-2xl border text-left transition-all hover:scale-[1.02] hover:shadow-xl ${
                  template.color === 'blue' ? 'border-blue-500/20 hover:border-blue-500/40 hover:bg-blue-500/5' :
                  template.color === 'amber' ? 'border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/5' :
                  template.color === 'emerald' ? 'border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/5' :
                  template.color === 'purple' ? 'border-purple-500/20 hover:border-purple-500/40 hover:bg-purple-500/5' :
                  'border-white/10 hover:border-white/20 hover:bg-white/5'
                }`}
              >
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl mb-4 ${
                  template.color === 'blue' ? 'bg-blue-500/10' :
                  template.color === 'amber' ? 'bg-amber-500/10' :
                  template.color === 'emerald' ? 'bg-emerald-500/10' :
                  template.color === 'purple' ? 'bg-purple-500/10' :
                  'bg-white/5'
                }`}>
                  {template.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">{template.name}</h3>
                <p className="text-sm text-zinc-400">{template.description}</p>
                {template.fields.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {template.fields.slice(0, 4).map((f, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-zinc-500">
                        {f.name}
                      </span>
                    ))}
                    {template.fields.length > 4 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-zinc-500">
                        +{template.fields.length - 4} más
                      </span>
                    )}
                  </div>
                )}
                <div className={`absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity ${
                  template.color === 'blue' ? 'text-blue-400' :
                  template.color === 'amber' ? 'text-amber-400' :
                  template.color === 'emerald' ? 'text-emerald-400' :
                  template.color === 'purple' ? 'text-purple-400' :
                  'text-zinc-400'
                }`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </div>
              </button>
            ))}
          </div>

          {/* CSV Import Section */}
          <div className="mt-8 pt-8 border-t border-white/[0.06]">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-white mb-1">O importa desde un archivo</h3>
              <p className="text-sm text-zinc-400">Arrastra un CSV o haz clic para seleccionar</p>
            </div>
            
            <label
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
                isDragging 
                  ? 'border-green-500 bg-green-500/10 scale-[1.02]' 
                  : csvData 
                    ? 'border-green-500/50 bg-green-500/5' 
                    : 'border-white/10 hover:border-white/20 hover:bg-white/5'
              }`}
            >
              <input
                type="file"
                accept=".csv"
                onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              
              {csvData ? (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-green-400 font-medium mb-1">CSV cargado correctamente</p>
                  <p className="text-zinc-400 text-sm">{csvHeaders.length} columnas detectadas • {csvData.length} filas</p>
                </div>
              ) : (
                <div className="text-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors ${
                    isDragging ? 'bg-green-500/20' : 'bg-white/5'
                  }`}>
                    <svg className={`w-8 h-8 transition-colors ${isDragging ? 'text-green-400' : 'text-zinc-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                  </div>
                  <p className={`font-medium mb-1 transition-colors ${isDragging ? 'text-green-400' : 'text-zinc-300'}`}>
                    {isDragging ? 'Suelta el archivo aquí' : 'Arrastra tu archivo CSV'}
                  </p>
                  <p className="text-zinc-500 text-sm">o haz clic para seleccionar</p>
                </div>
              )}
            </label>

            {/* CSV Preview */}
            {csvData && csvPreview.length > 0 && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-white">Vista previa de los datos</h4>
                  <button
                    type="button"
                    onClick={() => {
                      setCsvData(null);
                      setCsvHeaders([]);
                      setCsvPreview([]);
                      setFields([]);
                    }}
                    className="text-xs text-zinc-400 hover:text-red-400 transition-colors"
                  >
                    Eliminar archivo
                  </button>
                </div>
                
                <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-white/[0.02]">
                        {csvHeaders.map((header, i) => (
                          <th key={i} className="px-4 py-3 text-left font-medium text-white border-b border-white/[0.06]">
                            <div className="flex flex-col gap-1">
                              <span>{header}</span>
                              <span className="text-xs font-normal text-zinc-500">
                                {fields[i]?.type || 'text'}
                              </span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreview.map((row, i) => (
                        <tr key={i} className="border-b border-white/[0.03] last:border-0">
                          {row.map((cell, j) => (
                            <td key={j} className="px-4 py-2 text-zinc-400 truncate max-w-[200px]">
                              {cell || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="flex items-center gap-3 text-sm text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Los tipos de campo se detectaron automáticamente
                  </span>
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    setTableName('Tabla importada');
                    setStep(1);
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-green-500 hover:bg-green-600 text-white font-medium transition-all hover:scale-[1.01]"
                >
                  Continuar con estos campos
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Progress steps - Solo visible después de elegir plantilla */}
      {step > 0 && (
        <div className="relative pb-8 border-b border-white/[0.06]">
          {/* Línea de fondo */}
          <div className="absolute top-4 left-8 right-8 h-0.5 bg-white/[0.06]" />
          {/* Línea de progreso */}
          <div 
            className="absolute top-4 left-8 h-0.5 bg-blue-500 transition-all duration-500" 
            style={{ width: `calc(${(step - 1) / 2 * 100}% - ${step === 1 ? 0 : step === 2 ? 0 : 32}px)` }}
          />
          
          <div className="relative flex justify-between">
            {[
              { num: 1, label: "Información", desc: "Nombre y descripción" },
              { num: 2, label: "Campos", desc: "Define la estructura" },
              { num: 3, label: "Revisar", desc: "Confirma y crea" },
            ].map((s) => (
              <button
                key={s.num}
                type="button"
                onClick={() => s.num <= step && setStep(s.num)}
                className={`flex flex-col items-center gap-2 ${s.num > step ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer group'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all shadow-lg ${
                  step === s.num 
                    ? 'bg-blue-500 text-white ring-4 ring-blue-500/20' 
                    : step > s.num 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-zinc-800 text-zinc-500 border border-white/[0.1] group-hover:border-white/[0.2]'
                }`}>
                  {step > s.num ? Icons.check : s.num}
                </div>
                <div className="text-center">
                  <span className={`block text-sm font-medium transition-colors ${
                    step === s.num ? 'text-white' : step > s.num ? 'text-emerald-400' : 'text-zinc-500'
                  }`}>
                    {s.label}
                  </span>
                  <span className="text-[10px] text-zinc-600 hidden sm:block">{s.desc}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Botón para cambiar plantilla */}
          <button
            type="button"
            onClick={() => setStep(0)}
            className="absolute -top-2 right-0 text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Cambiar plantilla
          </button>
        </div>
      )}

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
                const hasError = errors[`field_${field.id}`] || errors[`field_${field.id}_relation`] || errors[`field_${field.id}_options`] || errors[`field_${field.id}_formula`];
                
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

                      {/* Type selector - Mejorado */}
                      <div className="relative group">
                        <select
                          value={field.type}
                          onChange={(e) => updateField(field.id, { type: e.target.value, options: [], validation: {} })}
                          className={`px-3 py-2 pr-8 rounded-lg border text-sm font-medium focus:outline-none transition-all cursor-pointer appearance-none ${
                            typeInfo.color === 'blue' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                            typeInfo.color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                            typeInfo.color === 'amber' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                            typeInfo.color === 'cyan' ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' :
                            typeInfo.color === 'purple' ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' :
                            typeInfo.color === 'pink' ? 'bg-pink-500/10 border-pink-500/30 text-pink-400' :
                            'bg-orange-500/10 border-orange-500/30 text-orange-400'
                          }`}
                        >
                          {FIELD_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                        <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                        {/* Tooltip con descripción detallada */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-900 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-white/10 z-50 w-64">
                          <p className="text-xs font-medium text-white mb-1">{typeInfo.label}</p>
                          <p className="text-[11px] text-zinc-400">{typeInfo.help}</p>
                        </div>
                      </div>

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

                        {/* Formula config */}
                        {field.type === "formula" && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <label className="text-sm text-zinc-400">Fórmula:</label>
                              <span className="text-xs text-zinc-600">Usa nombres de campos entre {'{}'}</span>
                            </div>
                            
                            {/* Formula templates */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {FORMULA_TEMPLATES.map((template) => (
                                <button
                                  key={template.id}
                                  type="button"
                                  onClick={() => template.id !== 'custom' && updateField(field.id, { formula: template.formula })}
                                  className={`p-3 rounded-xl border text-left transition-all hover:scale-[1.02] ${
                                    field.formula === template.formula
                                      ? 'border-violet-500/50 bg-violet-500/10'
                                      : 'border-white/[0.08] hover:border-white/20 hover:bg-white/[0.03]'
                                  }`}
                                >
                                  <div className="text-sm font-medium text-white mb-1">{template.label}</div>
                                  <div className="text-xs text-zinc-500">{template.desc}</div>
                                </button>
                              ))}
                            </div>
                            
                            {/* Custom formula input */}
                            <div className="relative">
                              <input
                                type="text"
                                value={field.formula}
                                onChange={(e) => updateField(field.id, { formula: e.target.value })}
                                placeholder="{Precio} * {Cantidad}"
                                className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder-zinc-600 font-mono text-sm focus:outline-none focus:border-violet-500/50 transition-all"
                              />
                              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" />
                                </svg>
                              </div>
                            </div>
                            
                            {/* Available fields reference */}
                            {fields.filter(f => f.name && f.id !== field.id && f.type !== 'formula').length > 0 && (
                              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                <div className="text-xs text-zinc-500 mb-2">Campos disponibles (clic para insertar):</div>
                                <div className="flex flex-wrap gap-2">
                                  {fields.filter(f => f.name && f.id !== field.id && f.type !== 'formula').map((f) => (
                                    <button
                                      key={f.id}
                                      type="button"
                                      onClick={() => updateField(field.id, { formula: field.formula + `{${f.name}}` })}
                                      className="px-2 py-1 rounded-lg bg-violet-500/10 text-violet-400 text-xs font-medium hover:bg-violet-500/20 transition-colors"
                                    >
                                      {'{' + f.name + '}'}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Helper text */}
                            <div className="flex items-start gap-2 text-xs text-zinc-500">
                              <svg className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Los campos calculados se actualizan automáticamente. Operadores: + - * / y funciones: DAYS(), SUM(), AVG()</span>
                            </div>
                          </div>
                        )}

                        {/* Validaciones avanzadas */}
                        {field.type !== 'formula' && field.type !== 'relation' && field.type !== 'select' && (
                          <div className="space-y-3 pt-3 border-t border-white/[0.04]">
                            <div className="flex items-center justify-between">
                              <label className="text-sm text-zinc-400 flex items-center gap-2">
                                <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                                </svg>
                                Validación avanzada
                              </label>
                              <span className="text-xs text-zinc-600">(Opcional)</span>
                            </div>
                            
                            {VALIDATION_TEMPLATES[field.type] && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {VALIDATION_TEMPLATES[field.type].map((rule) => (
                                  <div key={rule.id} className="flex items-center gap-2">
                                    <span className="text-sm">{rule.icon}</span>
                                    {rule.type === 'number' && (
                                      <input
                                        type="number"
                                        value={field.validation?.[rule.id] || ''}
                                        onChange={(e) => updateField(field.id, { 
                                          validation: { ...field.validation, [rule.id]: e.target.value ? Number(e.target.value) : undefined }
                                        })}
                                        placeholder={rule.placeholder}
                                        className="flex-1 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 transition-all"
                                      />
                                    )}
                                    {rule.type === 'text' && (
                                      <input
                                        type="text"
                                        value={field.validation?.[rule.id] || ''}
                                        onChange={(e) => updateField(field.id, { 
                                          validation: { ...field.validation, [rule.id]: e.target.value || undefined }
                                        })}
                                        placeholder={rule.placeholder}
                                        className="flex-1 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white text-sm placeholder-zinc-600 font-mono focus:outline-none focus:border-cyan-500/50 transition-all"
                                      />
                                    )}
                                    {rule.type === 'boolean' && (
                                      <button
                                        type="button"
                                        onClick={() => updateField(field.id, { 
                                          validation: { ...field.validation, [rule.id]: !field.validation?.[rule.id] }
                                        })}
                                        className={`flex-1 px-3 py-2 rounded-lg text-sm transition-all ${
                                          field.validation?.[rule.id]
                                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                                            : 'bg-white/[0.03] text-zinc-500 border border-white/[0.08]'
                                        }`}
                                      >
                                        {field.validation?.[rule.id] ? 'Sí' : 'No'}
                                      </button>
                                    )}
                                    {rule.type === 'select' && (
                                      <select
                                        value={field.validation?.[rule.id] || ''}
                                        onChange={(e) => updateField(field.id, { 
                                          validation: { ...field.validation, [rule.id]: e.target.value || undefined }
                                        })}
                                        className="flex-1 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-500/50 transition-all"
                                      >
                                        <option value="">Seleccionar...</option>
                                        {rule.options.map((opt) => (
                                          <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                      </select>
                                    )}
                                    <span className="text-xs text-zinc-600 hidden sm:inline">{rule.label}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Quick info about validations */}
                            <div className="flex items-start gap-2 text-xs text-zinc-600">
                              <svg className="w-3.5 h-3.5 text-cyan-400/60 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Las validaciones ayudan a garantizar datos correctos. Se aplicarán automáticamente en el chat.</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Error display */}
                    {hasError && (
                      <div className="px-4 pb-3">
                        <p className="text-xs text-red-400">
                          {errors[`field_${field.id}`] || errors[`field_${field.id}_relation`] || errors[`field_${field.id}_options`] || errors[`field_${field.id}_formula`]}
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
                <h4 className="text-sm font-medium text-zinc-400">Operaciones Permitidas</h4>
                <p className="text-xs text-zinc-500 mt-1">Define qué acciones se pueden realizar sobre esta tabla (aplica a todos los agentes)</p>
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
                    <span className="text-sm font-medium text-zinc-300 flex items-center gap-1.5"><SearchIcon size="xs" /> Consultar</span>
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
                    <span className="text-sm font-medium text-zinc-300 flex items-center gap-1.5"><PlusIcon size="xs" /> Crear</span>
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
                    <span className="text-sm font-medium text-zinc-300 flex items-center gap-1.5"><EditIcon size="xs" /> Editar</span>
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
                    <span className="text-sm font-medium text-red-400 flex items-center gap-1.5"><TrashIcon size="xs" /> Eliminar</span>
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
