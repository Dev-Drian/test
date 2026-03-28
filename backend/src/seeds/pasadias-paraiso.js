/**
 * Seed: Pasadías Paraíso - Negocio Completo de Turismo
 * 
 * Sistema completo de gestión de pasadías con:
 * - 8 Tablas interconectadas (Destinos, Clientes, Reservas, Pagos, Transporte, Guías, Reseñas, Promociones)
 * - 2 Agentes especializados (Reservas y Analista)
 * - Flujos automatizados de reserva y confirmación
 * - Variables globales del negocio
 * - Datos realistas de ejemplo
 * 
 * Este seed funciona para TODOS los usuarios registrados
 */

import { v4 as uuidv4 } from 'uuid';
import { connectDB, getWorkspaceDbName, getWorkspacesDbName, getAgentsDbName, getFlowsDbName, getTableDataDbName, getDbPrefix } from '../config/db.js';

const WORKSPACE_ID = 'pasadias-paraiso';
const WORKSPACE_NAME = 'Pasadías Paraíso';

/**
 * Verifica si ya existe una tabla con el mismo nombre
 */
async function tableExists(workspaceDb, name) {
  try {
    const result = await workspaceDb.list({ include_docs: true });
    return result.rows.some(r => r.doc && r.doc.name === name && r.doc.headers);
  } catch {
    return false;
  }
}

/**
 * Obtiene todos los usuarios registrados
 */
async function getAllUsers() {
  try {
    const accountsDb = await connectDB(`${getDbPrefix()}accounts`);
    const result = await accountsDb.list({ include_docs: true });
    return result.rows
      .filter(row => row.doc && row.doc.email && !row.id.startsWith('_'))
      .map(row => ({
        id: row.doc._id,
        email: row.doc.email,
        name: row.doc.name || row.doc.email.split('@')[0]
      }));
  } catch (err) {
    console.log('  ⚠️ No se pudo obtener usuarios:', err.message);
    return [];
  }
}

/**
 * Asigna el workspace a un usuario
 */
async function assignWorkspaceToUser(userId, workspaceId, workspaceName) {
  try {
    const accountsDb = await connectDB(`${getDbPrefix()}accounts`);
    
    // Obtener usuario existente
    const user = await accountsDb.get(userId);
    
    // Verificar si ya tiene este workspace
    user.workspaces = user.workspaces || [];
    user.workspacesOwner = user.workspacesOwner || [];
    
    if (user.workspaces.some(w => w.id === workspaceId)) {
      return; // Ya asignado
    }
    
    // Agregar workspace
    user.workspaces.push({ id: workspaceId, role: 'owner', name: workspaceName });
    if (!user.workspacesOwner.includes(workspaceId)) {
      user.workspacesOwner.push(workspaceId);
    }
    
    await accountsDb.insert(user);
  } catch (err) {
    // Silently fail
  }
}

export async function seed() {
  console.log(`\n🏝️ Iniciando seed de ${WORKSPACE_NAME}...`);
  
  try {
    const workspaceDb = await connectDB(getWorkspaceDbName(WORKSPACE_ID));
    const workspacesDb = await connectDB(getWorkspacesDbName());
    const agentsDb = await connectDB(getAgentsDbName(WORKSPACE_ID));
    
    // Verificar si ya existen los datos
    if (await tableExists(workspaceDb, 'Destinos')) {
      console.log('  ⏭️ Workspace ya tiene datos, saltando tablas...');
    } else {
      // ════════════════════════════════════════════════════════════════════
      // TABLA 1: DESTINOS (Paquetes de pasadías)
      // ════════════════════════════════════════════════════════════════════
      const destinosTableId = uuidv4();
      const destinosTable = {
        _id: destinosTableId,
        name: 'Destinos',
        type: 'catalog',
        displayField: 'nombre',
        description: 'Catálogo de destinos y paquetes de pasadía',
        permissions: {
          allowQuery: true,
          allowCreate: false,
          allowUpdate: false,
          allowDelete: false
        },
        headers: [
          { key: 'nombre', label: 'Destino', type: 'text', required: true, emoji: '🏝️', priority: 1 },
          { key: 'ubicacion', label: 'Ubicación', type: 'text', required: true, emoji: '📍', priority: 2 },
          { key: 'descripcion', label: 'Descripción', type: 'text', required: true, emoji: '📝', priority: 3 },
          { key: 'precioAdulto', label: 'Precio Adulto', type: 'number', required: true, emoji: '💰', priority: 4, validation: { min: 0 } },
          { key: 'precioNino', label: 'Precio Niño', type: 'number', required: true, emoji: '👶', priority: 5, validation: { min: 0 } },
          { key: 'duracion', label: 'Duración', type: 'text', required: true, emoji: '⏱️', priority: 6 },
          { key: 'incluye', label: 'Incluye', type: 'text', required: true, emoji: '✅', priority: 7 },
          { key: 'horaSalida', label: 'Hora Salida', type: 'time', required: true, emoji: '🚌', priority: 8 },
          { key: 'horaRegreso', label: 'Hora Regreso', type: 'time', required: true, emoji: '🏠', priority: 9 },
          { key: 'capacidadMax', label: 'Capacidad Máxima', type: 'number', required: true, emoji: '👥', validation: { min: 1 } },
          { key: 'disponible', label: 'Disponible', type: 'select', required: true, emoji: '📊', options: ['Sí', 'No', 'Temporada'], defaultValue: 'Sí' },
          { key: 'categoria', label: 'Categoría', type: 'select', required: true, emoji: '🏷️', options: ['Playa', 'Río', 'Montaña', 'Aventura', 'Familiar', 'Romántico'] },
          { key: 'puntuacion', label: 'Puntuación', type: 'number', required: false, emoji: '⭐', validation: { min: 0, max: 5 }, defaultValue: 4.5 },
          { key: 'imagen', label: 'Imagen URL', type: 'text', required: false, emoji: '🖼️', hiddenFromChat: true }
        ],
        createdAt: new Date().toISOString()
      };
      await workspaceDb.insert(destinosTable);
      console.log('  ✅ Tabla Destinos creada');

      // ════════════════════════════════════════════════════════════════════
      // TABLA 2: CLIENTES
      // ════════════════════════════════════════════════════════════════════
      const clientesTableId = uuidv4();
      const clientesTable = {
        _id: clientesTableId,
        name: 'Clientes',
        type: 'customers',
        displayField: 'nombre',
        description: 'Base de datos de clientes',
        permissions: {
          allowQuery: true,
          allowCreate: true,
          allowUpdate: true,
          allowDelete: false
        },
        headers: [
          { key: 'nombre', label: 'Nombre Completo', type: 'text', required: true, emoji: '👤', priority: 1 },
          { key: 'cedula', label: 'Cédula/ID', type: 'text', required: true, emoji: '🪪', priority: 2 },
          { key: 'telefono', label: 'WhatsApp', type: 'phone', required: true, emoji: '📱', priority: 3, validation: { digits: 10 } },
          { key: 'email', label: 'Email', type: 'email', required: false, emoji: '📧', priority: 4 },
          { key: 'ciudad', label: 'Ciudad', type: 'text', required: false, emoji: '🏙️' },
          { key: 'fechaNacimiento', label: 'Fecha Nacimiento', type: 'date', required: false, emoji: '🎂' },
          { key: 'tipoCliente', label: 'Tipo', type: 'select', required: true, emoji: '🏷️', options: ['Nuevo', 'Frecuente', 'VIP'], defaultValue: 'Nuevo' },
          { key: 'totalReservas', label: 'Total Reservas', type: 'number', required: false, emoji: '📊', defaultValue: 0, hiddenFromChat: true },
          { key: 'notas', label: 'Notas', type: 'text', required: false, emoji: '📝', hiddenFromChat: true },
          { key: 'fechaRegistro', label: 'Fecha Registro', type: 'date', required: false, emoji: '📅', defaultValue: 'today', hiddenFromChat: true }
        ],
        createdAt: new Date().toISOString()
      };
      await workspaceDb.insert(clientesTable);
      console.log('  ✅ Tabla Clientes creada');

      // ════════════════════════════════════════════════════════════════════
      // TABLA 3: RESERVAS
      // ════════════════════════════════════════════════════════════════════
      const reservasTableId = uuidv4();
      const reservasTable = {
        _id: reservasTableId,
        name: 'Reservas',
        type: 'bookings',
        displayField: 'codigoReserva',
        description: 'Reservas de pasadías',
        permissions: {
          allowQuery: true,
          allowCreate: true,
          allowUpdate: true,
          allowDelete: false
        },
        headers: [
          { key: 'codigoReserva', label: 'Código', type: 'text', required: false, emoji: '🎫', priority: 1, autoGenerate: 'RES-XXXXX' },
          { 
            key: 'cliente', 
            label: 'Cliente', 
            type: 'relation', 
            required: true, 
            emoji: '👤', 
            priority: 2,
            relation: {
              tableName: 'Clientes',
              displayField: 'nombre',
              searchField: 'nombre',
              confirmOnMatch: true,
              autoCreate: true,
              autoCreateFields: ['nombre', 'cedula', 'telefono'],
              validateOnInput: false
            }
          },
          { 
            key: 'destino', 
            label: 'Destino', 
            type: 'relation', 
            required: true, 
            emoji: '🏝️', 
            priority: 3,
            relation: {
              tableName: 'Destinos',
              displayField: 'nombre',
              searchField: 'nombre',
              autoCreate: false,
              validateOnInput: true,
              showOptionsOnNotFound: true
            }
          },
          { key: 'fechaViaje', label: 'Fecha del Viaje', type: 'date', required: true, emoji: '📅', priority: 4 },
          { key: 'adultos', label: 'Adultos', type: 'number', required: true, emoji: '👨', priority: 5, validation: { min: 1, max: 50 }, defaultValue: 1 },
          { key: 'ninos', label: 'Niños', type: 'number', required: false, emoji: '👶', priority: 6, validation: { min: 0, max: 20 }, defaultValue: 0 },
          { key: 'puntoRecogida', label: 'Punto de Recogida', type: 'select', required: true, emoji: '📍', priority: 7, options: ['Terminal Norte', 'Terminal Sur', 'Centro Comercial Plaza', 'Parque Principal', 'Hotel zona centro', 'Aeropuerto'] },
          { key: 'totalPagar', label: 'Total a Pagar', type: 'number', required: false, emoji: '💰', priority: 8, hiddenFromChat: true, autoCalculate: true },
          { key: 'abono', label: 'Abono', type: 'number', required: false, emoji: '💵', validation: { min: 0 }, defaultValue: 0 },
          { key: 'saldo', label: 'Saldo Pendiente', type: 'number', required: false, emoji: '💳', hiddenFromChat: true },
          { key: 'estadoReserva', label: 'Estado', type: 'select', required: true, emoji: '📊', options: ['Pendiente', 'Confirmada', 'Pagada', 'En curso', 'Completada', 'Cancelada'], defaultValue: 'Pendiente' },
          { key: 'metodoPago', label: 'Método Pago', type: 'select', required: false, emoji: '💳', options: ['Efectivo', 'Transferencia', 'Nequi', 'Daviplata', 'Tarjeta', 'PayU'] },
          { key: 'notasEspeciales', label: 'Notas Especiales', type: 'text', required: false, emoji: '📝' },
          { key: 'fechaReserva', label: 'Fecha Reserva', type: 'date', required: false, emoji: '📅', defaultValue: 'today', hiddenFromChat: true }
        ],
        createdAt: new Date().toISOString()
      };
      await workspaceDb.insert(reservasTable);
      console.log('  ✅ Tabla Reservas creada');

      // ════════════════════════════════════════════════════════════════════
      // TABLA 4: PAGOS
      // ════════════════════════════════════════════════════════════════════
      const pagosTableId = uuidv4();
      const pagosTable = {
        _id: pagosTableId,
        name: 'Pagos',
        type: 'transactions',
        displayField: 'codigoPago',
        description: 'Registro de pagos recibidos',
        permissions: {
          allowQuery: true,
          allowCreate: true,
          allowUpdate: false,
          allowDelete: false
        },
        headers: [
          { key: 'codigoPago', label: 'Código', type: 'text', required: false, emoji: '🧾', autoGenerate: 'PAG-XXXXX' },
          { 
            key: 'reserva', 
            label: 'Reserva', 
            type: 'relation', 
            required: true, 
            emoji: '🎫',
            relation: {
              tableName: 'Reservas',
              displayField: 'codigoReserva',
              searchField: 'codigoReserva',
              autoCreate: false,
              validateOnInput: true
            }
          },
          { key: 'monto', label: 'Monto', type: 'number', required: true, emoji: '💰', validation: { min: 1 } },
          { key: 'metodoPago', label: 'Método', type: 'select', required: true, emoji: '💳', options: ['Efectivo', 'Transferencia', 'Nequi', 'Daviplata', 'Tarjeta', 'PayU'] },
          { key: 'referencia', label: 'Referencia/Comprobante', type: 'text', required: false, emoji: '🔗' },
          { key: 'fechaPago', label: 'Fecha Pago', type: 'date', required: false, emoji: '📅', defaultValue: 'today' },
          { key: 'estado', label: 'Estado', type: 'select', required: true, emoji: '✅', options: ['Verificado', 'Pendiente verificación', 'Rechazado'], defaultValue: 'Pendiente verificación' },
          { key: 'recibidoPor', label: 'Recibido Por', type: 'text', required: false, emoji: '👤' }
        ],
        createdAt: new Date().toISOString()
      };
      await workspaceDb.insert(pagosTable);
      console.log('  ✅ Tabla Pagos creada');

      // ════════════════════════════════════════════════════════════════════
      // TABLA 5: TRANSPORTE
      // ════════════════════════════════════════════════════════════════════
      const transporteTableId = uuidv4();
      const transporteTable = {
        _id: transporteTableId,
        name: 'Transporte',
        type: 'assets',
        displayField: 'placa',
        description: 'Flota de vehículos',
        permissions: {
          allowQuery: true,
          allowCreate: false,
          allowUpdate: false,
          allowDelete: false
        },
        headers: [
          { key: 'placa', label: 'Placa', type: 'text', required: true, emoji: '🚌', priority: 1 },
          { key: 'tipo', label: 'Tipo', type: 'select', required: true, emoji: '🚗', options: ['Bus', 'Buseta', 'Van', 'Camioneta'], priority: 2 },
          { key: 'capacidad', label: 'Capacidad', type: 'number', required: true, emoji: '👥', validation: { min: 1 }, priority: 3 },
          { key: 'conductor', label: 'Conductor', type: 'text', required: true, emoji: '👨‍✈️', priority: 4 },
          { key: 'telefonoConductor', label: 'Tel. Conductor', type: 'phone', required: true, emoji: '📱' },
          { key: 'estado', label: 'Estado', type: 'select', required: true, emoji: '🔧', options: ['Disponible', 'En ruta', 'Mantenimiento', 'Fuera de servicio'], defaultValue: 'Disponible' },
          { key: 'aireAcondicionado', label: 'A/C', type: 'select', required: false, emoji: '❄️', options: ['Sí', 'No'], defaultValue: 'Sí' },
          { key: 'wifi', label: 'WiFi', type: 'select', required: false, emoji: '📶', options: ['Sí', 'No'], defaultValue: 'Sí' }
        ],
        createdAt: new Date().toISOString()
      };
      await workspaceDb.insert(transporteTable);
      console.log('  ✅ Tabla Transporte creada');

      // ════════════════════════════════════════════════════════════════════
      // TABLA 6: GUÍAS
      // ════════════════════════════════════════════════════════════════════
      const guiasTableId = uuidv4();
      const guiasTable = {
        _id: guiasTableId,
        name: 'Guías',
        type: 'staff',
        displayField: 'nombre',
        description: 'Guías turísticos',
        permissions: {
          allowQuery: true,
          allowCreate: false,
          allowUpdate: false,
          allowDelete: false
        },
        headers: [
          { key: 'nombre', label: 'Nombre', type: 'text', required: true, emoji: '👤', priority: 1 },
          { key: 'telefono', label: 'Teléfono', type: 'phone', required: true, emoji: '📱', priority: 2 },
          { key: 'email', label: 'Email', type: 'email', required: false, emoji: '📧' },
          { key: 'especialidad', label: 'Especialidad', type: 'select', required: true, emoji: '🎯', options: ['Playa', 'Montaña', 'Aventura', 'General'], priority: 3 },
          { key: 'idiomas', label: 'Idiomas', type: 'text', required: false, emoji: '🗣️' },
          { key: 'certificaciones', label: 'Certificaciones', type: 'text', required: false, emoji: '📜' },
          { key: 'estado', label: 'Estado', type: 'select', required: true, emoji: '📊', options: ['Activo', 'Vacaciones', 'Inactivo'], defaultValue: 'Activo' },
          { key: 'puntuacion', label: 'Puntuación', type: 'number', required: false, emoji: '⭐', validation: { min: 0, max: 5 }, defaultValue: 4.5 }
        ],
        createdAt: new Date().toISOString()
      };
      await workspaceDb.insert(guiasTable);
      console.log('  ✅ Tabla Guías creada');

      // ════════════════════════════════════════════════════════════════════
      // TABLA 7: RESEÑAS
      // ════════════════════════════════════════════════════════════════════
      const resenasTableId = uuidv4();
      const resenasTable = {
        _id: resenasTableId,
        name: 'Reseñas',
        type: 'feedback',
        displayField: 'cliente',
        description: 'Reseñas y calificaciones de clientes',
        permissions: {
          allowQuery: true,
          allowCreate: true,
          allowUpdate: false,
          allowDelete: false
        },
        headers: [
          { 
            key: 'cliente', 
            label: 'Cliente', 
            type: 'relation', 
            required: true, 
            emoji: '👤',
            relation: {
              tableName: 'Clientes',
              displayField: 'nombre',
              searchField: 'nombre',
              autoCreate: false,
              validateOnInput: true
            }
          },
          { 
            key: 'destino', 
            label: 'Destino', 
            type: 'relation', 
            required: true, 
            emoji: '🏝️',
            relation: {
              tableName: 'Destinos',
              displayField: 'nombre',
              searchField: 'nombre',
              autoCreate: false,
              validateOnInput: true
            }
          },
          { key: 'calificacion', label: 'Calificación', type: 'number', required: true, emoji: '⭐', validation: { min: 1, max: 5 } },
          { key: 'comentario', label: 'Comentario', type: 'text', required: true, emoji: '💬' },
          { key: 'fecha', label: 'Fecha', type: 'date', required: false, emoji: '📅', defaultValue: 'today' },
          { key: 'recomendaria', label: '¿Recomendaría?', type: 'select', required: false, emoji: '👍', options: ['Sí', 'No', 'Tal vez'], defaultValue: 'Sí' }
        ],
        createdAt: new Date().toISOString()
      };
      await workspaceDb.insert(resenasTable);
      console.log('  ✅ Tabla Reseñas creada');

      // ════════════════════════════════════════════════════════════════════
      // TABLA 8: PROMOCIONES
      // ════════════════════════════════════════════════════════════════════
      const promocionesTableId = uuidv4();
      const promocionesTable = {
        _id: promocionesTableId,
        name: 'Promociones',
        type: 'marketing',
        displayField: 'codigo',
        description: 'Códigos de descuento y promociones',
        permissions: {
          allowQuery: true,
          allowCreate: false,
          allowUpdate: false,
          allowDelete: false
        },
        headers: [
          { key: 'codigo', label: 'Código', type: 'text', required: true, emoji: '🎟️', priority: 1 },
          { key: 'nombre', label: 'Nombre Promoción', type: 'text', required: true, emoji: '🏷️', priority: 2 },
          { key: 'tipoDescuento', label: 'Tipo', type: 'select', required: true, emoji: '💰', options: ['Porcentaje', 'Monto fijo', '2x1', 'Niño gratis'], priority: 3 },
          { key: 'valor', label: 'Valor Descuento', type: 'number', required: true, emoji: '💵', validation: { min: 0 }, priority: 4 },
          { key: 'fechaInicio', label: 'Fecha Inicio', type: 'date', required: true, emoji: '📅' },
          { key: 'fechaFin', label: 'Fecha Fin', type: 'date', required: true, emoji: '📅' },
          { key: 'usosMaximos', label: 'Usos Máximos', type: 'number', required: false, emoji: '🔢', validation: { min: 1 } },
          { key: 'usosActuales', label: 'Usos Actuales', type: 'number', required: false, emoji: '📊', defaultValue: 0, hiddenFromChat: true },
          { key: 'estado', label: 'Estado', type: 'select', required: true, emoji: '✅', options: ['Activa', 'Inactiva', 'Agotada', 'Expirada'], defaultValue: 'Activa' },
          { key: 'destinos', label: 'Aplica a', type: 'text', required: false, emoji: '🏝️' }
        ],
        createdAt: new Date().toISOString()
      };
      await workspaceDb.insert(promocionesTable);
      console.log('  ✅ Tabla Promociones creada');

      // ════════════════════════════════════════════════════════════════════
      // DATOS DE EJEMPLO: DESTINOS
      // ════════════════════════════════════════════════════════════════════
      const dataDb = await connectDB(getTableDataDbName(WORKSPACE_ID, destinosTableId));
      
      const destinos = [
        {
          _id: uuidv4(),
          tableId: destinosTableId,
          nombre: 'Playa Blanca - Cartagena',
          ubicacion: 'Isla Barú, Cartagena de Indias',
          descripcion: 'Disfruta de las aguas cristalinas y arena blanca de la playa más hermosa de Colombia. Incluye tour en lancha, almuerzo típico y deportes acuáticos.',
          precioAdulto: 89000,
          precioNino: 59000,
          duracion: '12 horas',
          incluye: 'Transporte A/C, lancha, almuerzo, seguro, guía, sillas y parasol',
          horaSalida: '5:00 AM',
          horaRegreso: '6:00 PM',
          capacidadMax: 45,
          disponible: 'Sí',
          categoria: 'Playa',
          puntuacion: 4.8,
          createdAt: new Date().toISOString()
        },
        {
          _id: uuidv4(),
          tableId: destinosTableId,
          nombre: 'Islas del Rosario',
          ubicacion: 'Archipiélago Islas del Rosario, Cartagena',
          descripcion: 'Explora el archipiélago más bello del Caribe. Snorkel, oceanario, playa privada y almuerzo gourmet frente al mar.',
          precioAdulto: 145000,
          precioNino: 95000,
          duracion: '10 horas',
          incluye: 'Transporte, lancha rápida, entrada oceanario, snorkel, almuerzo, bebidas',
          horaSalida: '7:00 AM',
          horaRegreso: '5:00 PM',
          capacidadMax: 30,
          disponible: 'Sí',
          categoria: 'Playa',
          puntuacion: 4.9,
          createdAt: new Date().toISOString()
        },
        {
          _id: uuidv4(),
          tableId: destinosTableId,
          nombre: 'Río Claro - Aventura',
          ubicacion: 'Cañón del Río Claro, Antioquia',
          descripcion: 'Aventura extrema en el cañón de mármol. Rafting, caminata ecológica, cavernas y pozos naturales de agua cristalina.',
          precioAdulto: 175000,
          precioNino: 125000,
          duracion: '14 horas',
          incluye: 'Transporte, desayuno, almuerzo, equipamiento rafting, guía certificado, seguro',
          horaSalida: '4:00 AM',
          horaRegreso: '8:00 PM',
          capacidadMax: 25,
          disponible: 'Sí',
          categoria: 'Aventura',
          puntuacion: 4.7,
          createdAt: new Date().toISOString()
        },
        {
          _id: uuidv4(),
          tableId: destinosTableId,
          nombre: 'Termales Santa Rosa',
          ubicacion: 'Santa Rosa de Cabal, Risaralda',
          descripcion: 'Relájate en aguas termales naturales rodeadas de bosque de niebla. Incluye masaje y almuerzo típico paisa.',
          precioAdulto: 125000,
          precioNino: 85000,
          duracion: '11 horas',
          incluye: 'Transporte, entrada termales, toalla, almuerzo, refrigerio',
          horaSalida: '5:30 AM',
          horaRegreso: '7:00 PM',
          capacidadMax: 40,
          disponible: 'Sí',
          categoria: 'Familiar',
          puntuacion: 4.6,
          createdAt: new Date().toISOString()
        },
        {
          _id: uuidv4(),
          tableId: destinosTableId,
          nombre: 'San Andrés - Full Day',
          ubicacion: 'Isla de San Andrés',
          descripcion: 'Vuelo + pasadía en el mar de los 7 colores. Incluye snorkel en el acuario, Johnny Cay y almuerzo caribeño.',
          precioAdulto: 450000,
          precioNino: 380000,
          duracion: '15 horas',
          incluye: 'Vuelo ida y vuelta, traslados, tour acuario, Johnny Cay, almuerzo, snorkel',
          horaSalida: '5:00 AM',
          horaRegreso: '9:00 PM',
          capacidadMax: 20,
          disponible: 'Sí',
          categoria: 'Playa',
          puntuacion: 4.9,
          createdAt: new Date().toISOString()
        },
        {
          _id: uuidv4(),
          tableId: destinosTableId,
          nombre: 'Guatapé y Piedra del Peñol',
          ubicacion: 'Guatapé, Antioquia',
          descripcion: 'Sube los 740 escalones del Peñol para la mejor vista de Colombia. Tour en lancha y almuerzo en el pueblo más colorido.',
          precioAdulto: 95000,
          precioNino: 65000,
          duracion: '12 horas',
          incluye: 'Transporte, desayuno, entrada Peñol, tour lancha, almuerzo, guía',
          horaSalida: '6:00 AM',
          horaRegreso: '7:00 PM',
          capacidadMax: 45,
          disponible: 'Sí',
          categoria: 'Familiar',
          puntuacion: 4.8,
          createdAt: new Date().toISOString()
        },
        {
          _id: uuidv4(),
          tableId: destinosTableId,
          nombre: 'Santander Extremo',
          ubicacion: 'San Gil, Santander',
          descripcion: 'El destino de deportes extremos de Colombia. Rafting en el río Fonce, parapente y torrentismo.',
          precioAdulto: 220000,
          precioNino: 160000,
          duracion: '2 días',
          incluye: 'Transporte, hospedaje, rafting, parapente, torrentismo, 3 comidas, seguro',
          horaSalida: '5:00 AM',
          horaRegreso: '8:00 PM',
          capacidadMax: 20,
          disponible: 'Sí',
          categoria: 'Aventura',
          puntuacion: 4.9,
          createdAt: new Date().toISOString()
        },
        {
          _id: uuidv4(),
          tableId: destinosTableId,
          nombre: 'Hacienda Nápoles',
          ubicacion: 'Puerto Triunfo, Antioquia',
          descripcion: 'Parque temático con zoológico, parque acuático, museo y safari africano. Diversión para toda la familia.',
          precioAdulto: 145000,
          precioNino: 115000,
          duracion: '14 horas',
          incluye: 'Transporte, entrada general, almuerzo buffet, seguro',
          horaSalida: '5:00 AM',
          horaRegreso: '8:00 PM',
          capacidadMax: 45,
          disponible: 'Sí',
          categoria: 'Familiar',
          puntuacion: 4.5,
          createdAt: new Date().toISOString()
        },
        {
          _id: uuidv4(),
          tableId: destinosTableId,
          nombre: 'Coveñas Premium',
          ubicacion: 'Coveñas, Sucre',
          descripcion: 'Relax total en las playas de aguas tranquilas del Golfo de Morrosquillo. Playa privada, hamacas y cocteles incluidos.',
          precioAdulto: 110000,
          precioNino: 75000,
          duracion: '13 horas',
          incluye: 'Transporte A/C, almuerzo premium, hamaca, bebidas, seguro',
          horaSalida: '4:30 AM',
          horaRegreso: '7:30 PM',
          capacidadMax: 35,
          disponible: 'Sí',
          categoria: 'Playa',
          puntuacion: 4.6,
          createdAt: new Date().toISOString()
        },
        {
          _id: uuidv4(),
          tableId: destinosTableId,
          nombre: 'Laguna de Guatavita',
          ubicacion: 'Sesquilé, Cundinamarca',
          descripcion: 'Visita la laguna sagrada de los Muiscas, lugar de la leyenda de El Dorado. Caminata ecológica y tour histórico.',
          precioAdulto: 75000,
          precioNino: 50000,
          duracion: '8 horas',
          incluye: 'Transporte, entrada, guía certificado, refrigerio, seguro',
          horaSalida: '6:30 AM',
          horaRegreso: '4:30 PM',
          capacidadMax: 30,
          disponible: 'Sí',
          categoria: 'Montaña',
          puntuacion: 4.4,
          createdAt: new Date().toISOString()
        }
      ];
      
      for (const destino of destinos) {
        await dataDb.insert(destino);
      }
      console.log('  ✅ Datos de Destinos insertados');

      // ════════════════════════════════════════════════════════════════════
      // DATOS DE EJEMPLO: CLIENTES
      // ════════════════════════════════════════════════════════════════════
      const clientesDataDb = await connectDB(getTableDataDbName(WORKSPACE_ID, clientesTableId));
      
      const clientes = [
        { _id: uuidv4(), tableId: clientesTableId, nombre: 'María González Pérez', cedula: '1098765432', telefono: '3001234567', email: 'maria.gonzalez@email.com', ciudad: 'Bogotá', tipoCliente: 'VIP', totalReservas: 8, fechaRegistro: '2024-06-15', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: clientesTableId, nombre: 'Carlos Andrés Martínez', cedula: '1087654321', telefono: '3109876543', email: 'carlos.martinez@email.com', ciudad: 'Medellín', tipoCliente: 'Frecuente', totalReservas: 5, fechaRegistro: '2024-08-20', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: clientesTableId, nombre: 'Ana María López', cedula: '1076543210', telefono: '3201234567', email: 'ana.lopez@email.com', ciudad: 'Cali', tipoCliente: 'Frecuente', totalReservas: 3, fechaRegistro: '2024-10-05', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: clientesTableId, nombre: 'Juan Pablo Rodríguez', cedula: '1065432109', telefono: '3159876543', email: 'juanp.rodriguez@gmail.com', ciudad: 'Barranquilla', tipoCliente: 'Nuevo', totalReservas: 1, fechaRegistro: '2025-01-10', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: clientesTableId, nombre: 'Laura Valentina Torres', cedula: '1054321098', telefono: '3187654321', email: 'laura.torres@email.com', ciudad: 'Cartagena', tipoCliente: 'VIP', totalReservas: 12, fechaRegistro: '2024-03-01', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: clientesTableId, nombre: 'Diego Alejandro Vargas', cedula: '1043210987', telefono: '3001112233', email: 'diego.vargas@outlook.com', ciudad: 'Pereira', tipoCliente: 'Nuevo', totalReservas: 0, fechaRegistro: '2025-03-20', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: clientesTableId, nombre: 'Sofía Hernández Castro', cedula: '1032109876', telefono: '3124445566', email: 'sofia.hernandez@email.com', ciudad: 'Bucaramanga', tipoCliente: 'Frecuente', totalReservas: 4, fechaRegistro: '2024-11-15', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: clientesTableId, nombre: 'Familia Ramírez Ospina', cedula: '1021098765', telefono: '3167778899', email: 'ramirez.familia@email.com', ciudad: 'Bogotá', tipoCliente: 'VIP', totalReservas: 15, notas: 'Grupo familiar de 6 personas, prefieren destinos familiares', fechaRegistro: '2023-12-01', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: clientesTableId, nombre: 'Andrés Felipe Muñoz', cedula: '1010987654', telefono: '3145556677', email: 'andres.munoz@gmail.com', ciudad: 'Armenia', tipoCliente: 'Frecuente', totalReservas: 6, fechaRegistro: '2024-04-10', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: clientesTableId, nombre: 'Valentina Reyes Gómez', cedula: '1009876543', telefono: '3178889900', email: 'vale.reyes@hotmail.com', ciudad: 'Manizales', tipoCliente: 'Nuevo', totalReservas: 2, fechaRegistro: '2025-02-28', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: clientesTableId, nombre: 'Roberto Jiménez Peña', cedula: '998765432', telefono: '3001234890', email: 'roberto.j@email.com', ciudad: 'Cúcuta', tipoCliente: 'Frecuente', totalReservas: 4, fechaRegistro: '2024-07-22', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: clientesTableId, nombre: 'Camila Andrea Ruiz', cedula: '987654321', telefono: '3209998877', email: 'camila.ruiz@gmail.com', ciudad: 'Santa Marta', tipoCliente: 'Nuevo', totalReservas: 1, fechaRegistro: '2025-03-15', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: clientesTableId, nombre: 'Familia Herrera López', cedula: '976543210', telefono: '3156667788', email: 'familia.herrera@email.com', ciudad: 'Villavicencio', tipoCliente: 'VIP', totalReservas: 9, notas: 'Prefieren tours de aventura, 4 adultos', fechaRegistro: '2024-01-15', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: clientesTableId, nombre: 'Paola Sánchez Díaz', cedula: '965432109', telefono: '3183334455', email: 'paola.sanchez@outlook.com', ciudad: 'Ibagué', tipoCliente: 'Frecuente', totalReservas: 3, fechaRegistro: '2024-09-05', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: clientesTableId, nombre: 'Miguel Ángel Ospina', cedula: '954321098', telefono: '3012223344', email: 'miguel.ospina@email.com', ciudad: 'Pasto', tipoCliente: 'Nuevo', totalReservas: 0, fechaRegistro: '2025-03-25', createdAt: new Date().toISOString() }
      ];
      
      for (const cliente of clientes) {
        await clientesDataDb.insert(cliente);
      }
      console.log('  ✅ Datos de Clientes insertados');

      // ════════════════════════════════════════════════════════════════════
      // DATOS DE EJEMPLO: TRANSPORTE
      // ════════════════════════════════════════════════════════════════════
      const transporteDataDb = await connectDB(getTableDataDbName(WORKSPACE_ID, transporteTableId));
      
      const vehiculos = [
        { _id: uuidv4(), tableId: transporteTableId, placa: 'ABC-123', tipo: 'Bus', capacidad: 45, conductor: 'Roberto Gómez Pérez', telefonoConductor: '3001234567', estado: 'Disponible', aireAcondicionado: 'Sí', wifi: 'Sí', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: transporteTableId, placa: 'DEF-456', tipo: 'Bus', capacidad: 40, conductor: 'Mario Sánchez Luna', telefonoConductor: '3109876543', estado: 'Disponible', aireAcondicionado: 'Sí', wifi: 'Sí', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: transporteTableId, placa: 'GHI-789', tipo: 'Buseta', capacidad: 25, conductor: 'Pedro Castillo Ríos', telefonoConductor: '3201234567', estado: 'Disponible', aireAcondicionado: 'Sí', wifi: 'No', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: transporteTableId, placa: 'JKL-012', tipo: 'Van', capacidad: 12, conductor: 'Luis Morales Díaz', telefonoConductor: '3159876543', estado: 'En ruta', aireAcondicionado: 'Sí', wifi: 'Sí', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: transporteTableId, placa: 'MNO-345', tipo: 'Camioneta', capacidad: 8, conductor: 'Andrés Ruiz Vargas', telefonoConductor: '3187654321', estado: 'Disponible', aireAcondicionado: 'Sí', wifi: 'Sí', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: transporteTableId, placa: 'PQR-678', tipo: 'Bus', capacidad: 50, conductor: 'Héctor Mejía Torres', telefonoConductor: '3145678901', estado: 'Disponible', aireAcondicionado: 'Sí', wifi: 'Sí', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: transporteTableId, placa: 'STU-901', tipo: 'Van', capacidad: 15, conductor: 'Fernando López García', telefonoConductor: '3178901234', estado: 'Mantenimiento', aireAcondicionado: 'Sí', wifi: 'Sí', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: transporteTableId, placa: 'VWX-234', tipo: 'Buseta', capacidad: 30, conductor: 'Óscar Parra Mendoza', telefonoConductor: '3012345678', estado: 'En ruta', aireAcondicionado: 'Sí', wifi: 'No', createdAt: new Date().toISOString() }
      ];
      
      for (const vehiculo of vehiculos) {
        await transporteDataDb.insert(vehiculo);
      }
      console.log('  ✅ Datos de Transporte insertados');

      // ════════════════════════════════════════════════════════════════════
      // DATOS DE EJEMPLO: GUÍAS
      // ════════════════════════════════════════════════════════════════════
      const guiasDataDb = await connectDB(getTableDataDbName(WORKSPACE_ID, guiasTableId));
      
      const guias = [
        { _id: uuidv4(), tableId: guiasTableId, nombre: 'Patricia Mendoza Rivera', telefono: '3001234567', email: 'patricia.m@pasadiasparaiso.com', especialidad: 'Playa', idiomas: 'Español, Inglés', certificaciones: 'Primeros auxilios, Buceo PADI Open Water', estado: 'Activo', puntuacion: 4.9, createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: guiasTableId, nombre: 'Fernando Restrepo Marín', telefono: '3109876543', email: 'fernando.r@pasadiasparaiso.com', especialidad: 'Aventura', idiomas: 'Español, Inglés, Portugués', certificaciones: 'Rafting certificado IRF, Escalada deportiva', estado: 'Activo', puntuacion: 4.8, createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: guiasTableId, nombre: 'Claudia Vega Hernández', telefono: '3201234567', email: 'claudia.v@pasadiasparaiso.com', especialidad: 'General', idiomas: 'Español, Inglés', certificaciones: 'Guía turístico nacional certificado', estado: 'Activo', puntuacion: 4.7, createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: guiasTableId, nombre: 'Miguel Ángel Castro Ríos', telefono: '3159876543', email: 'miguel.c@pasadiasparaiso.com', especialidad: 'Montaña', idiomas: 'Español, Francés', certificaciones: 'Montañismo UIAGM, Primeros auxilios avanzado', estado: 'Activo', puntuacion: 4.6, createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: guiasTableId, nombre: 'Sandra Milena Ochoa', telefono: '3187654321', email: 'sandra.o@pasadiasparaiso.com', especialidad: 'Playa', idiomas: 'Español, Inglés, Italiano', certificaciones: 'Snorkel instructor, Socorrista', estado: 'Activo', puntuacion: 4.9, createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: guiasTableId, nombre: 'Jorge Eduardo Pineda', telefono: '3145678901', email: 'jorge.p@pasadiasparaiso.com', especialidad: 'General', idiomas: 'Español', certificaciones: 'Guía turístico regional, Historia del arte', estado: 'Vacaciones', puntuacion: 4.5, createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: guiasTableId, nombre: 'Natalia Cárdenas Mejía', telefono: '3178901234', email: 'natalia.c@pasadiasparaiso.com', especialidad: 'Aventura', idiomas: 'Español, Inglés', certificaciones: 'Parapente tándem, Torrentismo', estado: 'Activo', puntuacion: 4.8, createdAt: new Date().toISOString() }
      ];
      
      for (const guia of guias) {
        await guiasDataDb.insert(guia);
      }
      console.log('  ✅ Datos de Guías insertados');

      // ════════════════════════════════════════════════════════════════════
      // DATOS DE EJEMPLO: PROMOCIONES
      // ════════════════════════════════════════════════════════════════════
      const promocionesDataDb = await connectDB(getTableDataDbName(WORKSPACE_ID, promocionesTableId));
      
      const promociones = [
        { _id: uuidv4(), tableId: promocionesTableId, codigo: 'VERANO2026', nombre: 'Verano 2026', tipoDescuento: 'Porcentaje', valor: 15, fechaInicio: '2026-06-01', fechaFin: '2026-08-31', usosMaximos: 100, usosActuales: 0, estado: 'Activa', destinos: 'Todos los destinos de playa', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: promocionesTableId, codigo: 'FAMILIA50', nombre: 'Niños Gratis', tipoDescuento: 'Niño gratis', valor: 100, fechaInicio: '2026-01-01', fechaFin: '2026-12-31', usosMaximos: 200, usosActuales: 45, estado: 'Activa', destinos: 'Guatapé, Hacienda Nápoles, Termales', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: promocionesTableId, codigo: 'BIENVENIDO', nombre: 'Primera Reserva', tipoDescuento: 'Monto fijo', valor: 20000, fechaInicio: '2026-01-01', fechaFin: '2026-12-31', usosMaximos: 500, usosActuales: 89, estado: 'Activa', destinos: 'Todos', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: promocionesTableId, codigo: '2X1AVENTURA', nombre: '2x1 en Aventura', tipoDescuento: '2x1', valor: 50, fechaInicio: '2026-04-01', fechaFin: '2026-04-30', usosMaximos: 30, usosActuales: 12, estado: 'Activa', destinos: 'Río Claro, Santander Extremo', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: promocionesTableId, codigo: 'SEMANASANTA', nombre: 'Semana Santa 2026', tipoDescuento: 'Porcentaje', valor: 10, fechaInicio: '2026-03-29', fechaFin: '2026-04-06', usosMaximos: 150, usosActuales: 0, estado: 'Activa', destinos: 'Playa Blanca, Islas del Rosario, Coveñas', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: promocionesTableId, codigo: 'MARZO10', nombre: 'Marzo Loco', tipoDescuento: 'Monto fijo', valor: 15000, fechaInicio: '2026-03-01', fechaFin: '2026-03-31', usosMaximos: 80, usosActuales: 23, estado: 'Activa', destinos: 'Guatapé, Laguna de Guatavita', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: promocionesTableId, codigo: 'PAREJAS', nombre: 'Escapada Romántica', tipoDescuento: 'Porcentaje', valor: 20, fechaInicio: '2026-02-01', fechaFin: '2026-02-28', usosMaximos: 40, usosActuales: 35, estado: 'Activa', destinos: 'Islas del Rosario, Termales Santa Rosa', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: promocionesTableId, codigo: 'GRUPOVIP', nombre: 'Grupos +10 personas', tipoDescuento: 'Porcentaje', valor: 25, fechaInicio: '2026-01-01', fechaFin: '2026-12-31', usosMaximos: 50, usosActuales: 8, estado: 'Activa', destinos: 'Todos (mínimo 10 personas)', createdAt: new Date().toISOString() }
      ];
      
      for (const promo of promociones) {
        await promocionesDataDb.insert(promo);
      }
      console.log('  ✅ Datos de Promociones insertados');

      // ════════════════════════════════════════════════════════════════════
      // DATOS DE EJEMPLO: RESERVAS
      // ════════════════════════════════════════════════════════════════════
      const reservasDataDb = await connectDB(getTableDataDbName(WORKSPACE_ID, reservasTableId));
      
      const reservas = [
        { _id: uuidv4(), tableId: reservasTableId, codigoReserva: 'RES-00125', cliente: 'María González Pérez', destino: 'Playa Blanca - Cartagena', fechaViaje: '2026-04-05', adultos: 2, ninos: 1, puntoRecogida: 'Terminal Norte', totalPagar: 237000, abono: 120000, saldo: 117000, estadoReserva: 'Confirmada', metodoPago: 'Nequi', fechaReserva: '2026-03-20', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: reservasTableId, codigoReserva: 'RES-00126', cliente: 'Familia Ramírez Ospina', destino: 'Guatapé y Piedra del Peñol', fechaViaje: '2026-04-12', adultos: 4, ninos: 2, puntoRecogida: 'Centro Comercial Plaza', totalPagar: 510000, abono: 510000, saldo: 0, estadoReserva: 'Pagada', metodoPago: 'Transferencia', fechaReserva: '2026-03-15', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: reservasTableId, codigoReserva: 'RES-00127', cliente: 'Carlos Andrés Martínez', destino: 'Río Claro - Aventura', fechaViaje: '2026-04-20', adultos: 3, ninos: 0, puntoRecogida: 'Terminal Sur', totalPagar: 525000, abono: 200000, saldo: 325000, estadoReserva: 'Confirmada', metodoPago: 'Daviplata', fechaReserva: '2026-03-22', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: reservasTableId, codigoReserva: 'RES-00128', cliente: 'Laura Valentina Torres', destino: 'Islas del Rosario', fechaViaje: '2026-04-08', adultos: 2, ninos: 0, puntoRecogida: 'Hotel zona centro', totalPagar: 290000, abono: 290000, saldo: 0, estadoReserva: 'Pagada', metodoPago: 'Tarjeta', notasEspeciales: 'Pareja en luna de miel, solicitan mesa privada almuerzo', fechaReserva: '2026-03-10', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: reservasTableId, codigoReserva: 'RES-00129', cliente: 'Juan Pablo Rodríguez', destino: 'San Andrés - Full Day', fechaViaje: '2026-05-01', adultos: 1, ninos: 0, puntoRecogida: 'Aeropuerto', totalPagar: 450000, abono: 100000, saldo: 350000, estadoReserva: 'Pendiente', metodoPago: 'Efectivo', fechaReserva: '2026-03-25', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: reservasTableId, codigoReserva: 'RES-00130', cliente: 'Andrés Felipe Muñoz', destino: 'Termales Santa Rosa', fechaViaje: '2026-04-15', adultos: 2, ninos: 0, puntoRecogida: 'Terminal Norte', totalPagar: 250000, abono: 250000, saldo: 0, estadoReserva: 'Pagada', metodoPago: 'Nequi', fechaReserva: '2026-03-28', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: reservasTableId, codigoReserva: 'RES-00131', cliente: 'Valentina Reyes Gómez', destino: 'Hacienda Nápoles', fechaViaje: '2026-04-19', adultos: 3, ninos: 2, puntoRecogida: 'Centro Comercial Plaza', totalPagar: 665000, abono: 300000, saldo: 365000, estadoReserva: 'Confirmada', metodoPago: 'Transferencia', fechaReserva: '2026-03-26', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: reservasTableId, codigoReserva: 'RES-00132', cliente: 'Roberto Jiménez Peña', destino: 'Santander Extremo', fechaViaje: '2026-04-26', adultos: 4, ninos: 0, puntoRecogida: 'Terminal Sur', totalPagar: 880000, abono: 440000, saldo: 440000, estadoReserva: 'Confirmada', metodoPago: 'Daviplata', notasEspeciales: 'Grupo de amigos, todos con experiencia en deportes extremos', fechaReserva: '2026-03-20', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: reservasTableId, codigoReserva: 'RES-00133', cliente: 'Familia Herrera López', destino: 'Coveñas Premium', fechaViaje: '2026-04-30', adultos: 4, ninos: 0, puntoRecogida: 'Parque Principal', totalPagar: 440000, abono: 440000, saldo: 0, estadoReserva: 'Pagada', metodoPago: 'Tarjeta', fechaReserva: '2026-03-18', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: reservasTableId, codigoReserva: 'RES-00134', cliente: 'Paola Sánchez Díaz', destino: 'Laguna de Guatavita', fechaViaje: '2026-03-29', adultos: 2, ninos: 1, puntoRecogida: 'Terminal Norte', totalPagar: 200000, abono: 200000, saldo: 0, estadoReserva: 'Completada', metodoPago: 'Nequi', fechaReserva: '2026-03-15', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: reservasTableId, codigoReserva: 'RES-00135', cliente: 'Sofía Hernández Castro', destino: 'Playa Blanca - Cartagena', fechaViaje: '2026-03-22', adultos: 2, ninos: 0, puntoRecogida: 'Hotel zona centro', totalPagar: 178000, abono: 178000, saldo: 0, estadoReserva: 'Completada', metodoPago: 'Transferencia', fechaReserva: '2026-03-10', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: reservasTableId, codigoReserva: 'RES-00136', cliente: 'Ana María López', destino: 'Guatapé y Piedra del Peñol', fechaViaje: '2026-03-15', adultos: 1, ninos: 0, puntoRecogida: 'Centro Comercial Plaza', totalPagar: 95000, abono: 95000, saldo: 0, estadoReserva: 'Completada', metodoPago: 'Efectivo', fechaReserva: '2026-03-08', createdAt: new Date().toISOString() }
      ];
      
      for (const reserva of reservas) {
        await reservasDataDb.insert(reserva);
      }
      console.log('  ✅ Datos de Reservas insertados');

      // ════════════════════════════════════════════════════════════════════
      // DATOS DE EJEMPLO: RESEÑAS
      // ════════════════════════════════════════════════════════════════════
      const resenasDataDb = await connectDB(getTableDataDbName(WORKSPACE_ID, resenasTableId));
      
      const resenas = [
        { _id: uuidv4(), tableId: resenasTableId, cliente: 'María González Pérez', destino: 'Playa Blanca - Cartagena', calificacion: 5, comentario: '¡Increíble experiencia! El agua cristalina, el almuerzo delicioso y el guía súper atento. 100% recomendado.', fecha: '2026-03-15', recomendaria: 'Sí', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: resenasTableId, cliente: 'Familia Ramírez Ospina', destino: 'Hacienda Nápoles', calificacion: 5, comentario: 'Excelente para ir en familia. Los niños la pasaron increíble con los animales y el parque acuático. Volveremos!', fecha: '2026-02-20', recomendaria: 'Sí', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: resenasTableId, cliente: 'Carlos Andrés Martínez', destino: 'Río Claro - Aventura', calificacion: 5, comentario: 'El rafting fue lo máximo! Adrenalina pura. El cañón es espectacular. El guía Fernando sabe mucho del tema.', fecha: '2026-01-28', recomendaria: 'Sí', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: resenasTableId, cliente: 'Laura Valentina Torres', destino: 'Islas del Rosario', calificacion: 4, comentario: 'Hermoso lugar, agua increíble. El oceanario muy bonito. Solo el almuerzo podría mejorar un poco.', fecha: '2026-03-01', recomendaria: 'Sí', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: resenasTableId, cliente: 'Sofía Hernández Castro', destino: 'Termales Santa Rosa', calificacion: 5, comentario: 'Perfecto para desconectarse. Las aguas termales son relajantes y el paisaje hermoso. El masaje incluido fue un plus.', fecha: '2026-02-14', recomendaria: 'Sí', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: resenasTableId, cliente: 'Andrés Felipe Muñoz', destino: 'Guatapé y Piedra del Peñol', calificacion: 5, comentario: 'La vista desde el Peñol es impresionante. El pueblo es muy bonito y colorido. El tour en lancha espectacular.', fecha: '2026-03-20', recomendaria: 'Sí', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: resenasTableId, cliente: 'Familia Herrera López', destino: 'Santander Extremo', calificacion: 5, comentario: '2 días de pura aventura! El rafting en el Fonce es nivel mundial. El parapente fue lo mejor. Muy bien organizado todo.', fecha: '2026-02-25', recomendaria: 'Sí', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: resenasTableId, cliente: 'Paola Sánchez Díaz', destino: 'San Andrés - Full Day', calificacion: 4, comentario: 'El mar de los 7 colores es real! Johnny Cay hermoso. Un poco cansado el viaje pero vale la pena.', fecha: '2026-01-15', recomendaria: 'Sí', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: resenasTableId, cliente: 'Roberto Jiménez Peña', destino: 'Coveñas Premium', calificacion: 4, comentario: 'Muy relajante. El servicio excelente, los cocteles deliciosos. La playa tranquila, perfecta para descansar.', fecha: '2026-03-10', recomendaria: 'Sí', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: resenasTableId, cliente: 'Ana María López', destino: 'Laguna de Guatavita', calificacion: 4, comentario: 'Historia fascinante sobre El Dorado. La caminata un poco exigente pero el paisaje lo compensa. Recomendado para los que les gusta la historia.', fecha: '2026-03-18', recomendaria: 'Sí', createdAt: new Date().toISOString() }
      ];
      
      for (const resena of resenas) {
        await resenasDataDb.insert(resena);
      }
      console.log('  ✅ Datos de Reseñas insertados');

      // ════════════════════════════════════════════════════════════════════
      // DATOS DE EJEMPLO: PAGOS
      // ════════════════════════════════════════════════════════════════════
      const pagosDataDb = await connectDB(getTableDataDbName(WORKSPACE_ID, pagosTableId));
      
      const pagos = [
        { _id: uuidv4(), tableId: pagosTableId, codigoPago: 'PAG-00201', reserva: 'RES-00125', monto: 120000, metodoPago: 'Nequi', referencia: 'NEQ20260320001', fechaPago: '2026-03-20', estado: 'Verificado', recibidoPor: 'Sistema', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: pagosTableId, codigoPago: 'PAG-00202', reserva: 'RES-00126', monto: 510000, metodoPago: 'Transferencia', referencia: 'TRF20260315002', fechaPago: '2026-03-15', estado: 'Verificado', recibidoPor: 'Patricia Mendoza', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: pagosTableId, codigoPago: 'PAG-00203', reserva: 'RES-00127', monto: 200000, metodoPago: 'Daviplata', referencia: 'DVP20260322001', fechaPago: '2026-03-22', estado: 'Verificado', recibidoPor: 'Sistema', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: pagosTableId, codigoPago: 'PAG-00204', reserva: 'RES-00128', monto: 290000, metodoPago: 'Tarjeta', referencia: 'VISA20260310001', fechaPago: '2026-03-10', estado: 'Verificado', recibidoPor: 'PayU', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: pagosTableId, codigoPago: 'PAG-00205', reserva: 'RES-00129', monto: 100000, metodoPago: 'Efectivo', referencia: 'EFE20260325001', fechaPago: '2026-03-25', estado: 'Verificado', recibidoPor: 'Claudia Vega', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: pagosTableId, codigoPago: 'PAG-00206', reserva: 'RES-00130', monto: 250000, metodoPago: 'Nequi', referencia: 'NEQ20260328002', fechaPago: '2026-03-28', estado: 'Verificado', recibidoPor: 'Sistema', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: pagosTableId, codigoPago: 'PAG-00207', reserva: 'RES-00131', monto: 300000, metodoPago: 'Transferencia', referencia: 'TRF20260326001', fechaPago: '2026-03-26', estado: 'Verificado', recibidoPor: 'Patricia Mendoza', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: pagosTableId, codigoPago: 'PAG-00208', reserva: 'RES-00132', monto: 440000, metodoPago: 'Daviplata', referencia: 'DVP20260320002', fechaPago: '2026-03-20', estado: 'Verificado', recibidoPor: 'Sistema', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: pagosTableId, codigoPago: 'PAG-00209', reserva: 'RES-00133', monto: 440000, metodoPago: 'Tarjeta', referencia: 'MC20260318001', fechaPago: '2026-03-18', estado: 'Verificado', recibidoPor: 'PayU', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: pagosTableId, codigoPago: 'PAG-00210', reserva: 'RES-00134', monto: 200000, metodoPago: 'Nequi', referencia: 'NEQ20260315003', fechaPago: '2026-03-15', estado: 'Verificado', recibidoPor: 'Sistema', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: pagosTableId, codigoPago: 'PAG-00211', reserva: 'RES-00135', monto: 178000, metodoPago: 'Transferencia', referencia: 'TRF20260310002', fechaPago: '2026-03-10', estado: 'Verificado', recibidoPor: 'Fernando Restrepo', createdAt: new Date().toISOString() },
        { _id: uuidv4(), tableId: pagosTableId, codigoPago: 'PAG-00212', reserva: 'RES-00136', monto: 95000, metodoPago: 'Efectivo', referencia: 'EFE20260308001', fechaPago: '2026-03-08', estado: 'Verificado', recibidoPor: 'Claudia Vega', createdAt: new Date().toISOString() }
      ];
      
      for (const pago of pagos) {
        await pagosDataDb.insert(pago);
      }
      console.log('  ✅ Datos de Pagos insertados');

      // ════════════════════════════════════════════════════════════════════
      // AGENTE 1: ASISTENTE DE RESERVAS
      // ════════════════════════════════════════════════════════════════════
      const agenteReservasId = uuidv4();
      const agenteReservas = {
        _id: agenteReservasId,
        type: 'agent',
        name: 'Asistente de Reservas',
        description: 'Especializado en reservas de pasadías, consulta de destinos y atención al cliente',
        tables: [
          { tableId: destinosTableId, tableName: 'Destinos', fullAccess: true, permissions: { query: true, create: false, update: false, delete: false } },
          { tableId: clientesTableId, tableName: 'Clientes', fullAccess: true, permissions: { query: true, create: true, update: true, delete: false } },
          { tableId: reservasTableId, tableName: 'Reservas', fullAccess: true, permissions: { query: true, create: true, update: true, delete: false } },
          { tableId: pagosTableId, tableName: 'Pagos', fullAccess: true, permissions: { query: true, create: true, update: false, delete: false } },
          { tableId: promocionesTableId, tableName: 'Promociones', fullAccess: true, permissions: { query: true, create: false, update: false, delete: false } },
        ],
        
        engineMode: 'llm-first',
        vertical: 'tourism',
        toneStyle: 'friendly',
        
        fewShotExamples: [
          {
            user: 'quiero reservar un pasadía',
            assistant: '¡Hola! 🏝️ Con gusto te ayudo a reservar tu pasadía. Tenemos destinos increíbles:\n\n🏖️ **Playa Blanca** - $89.000 adulto\n🌊 **Islas del Rosario** - $145.000 adulto\n🏔️ **Río Claro Aventura** - $175.000 adulto\n♨️ **Termales Santa Rosa** - $125.000 adulto\n\n¿Cuál te interesa? Te cuento más detalles.'
          },
          {
            user: 'cuánto cuesta playa blanca para 2 adultos y 1 niño',
            assistant: '¡Excelente elección! 🏖️ **Playa Blanca** es uno de nuestros destinos favoritos.\n\n💰 **Precio:**\n• 2 Adultos × $89.000 = $178.000\n• 1 Niño × $59.000 = $59.000\n• **Total: $237.000**\n\n✅ **Incluye:** Transporte A/C, lancha, almuerzo típico, sillas, parasol, guía y seguro.\n\n¿Te gustaría reservar? Solo necesito tu nombre, cédula y teléfono.'
          },
          {
            user: 'hay algún descuento',
            assistant: '¡Sí tenemos promociones activas! 🎉\n\n🏷️ **BIENVENIDO** - $20.000 de descuento (primera reserva)\n☀️ **SUMMER2025** - 15% en destinos de playa\n👶 **FAMILIA50** - Niño gratis en Guatapé, Hacienda Nápoles y Termales\n\n¿Tienes algún código? Lo aplico a tu reserva.'
          }
        ],
        
        enabledTools: ['create_record', 'query_records', 'update_record', 'general_conversation'],
        disabledTools: ['analyze_data'],
        
        businessHours: {
          timezone: 'America/Bogota',
          schedule: {
            'lunes_sabado': '07:00-20:00',
            'domingo': '08:00-18:00'
          },
          outsideHoursMessage: '¡Hola! 🌙 Estamos fuera de horario. Te atendemos mañana a partir de las 7am. Mientras tanto, puedes explorar nuestros destinos en pasadiasparaiso.com'
        },
        
        customInstructions: `Eres el asistente de reservas de Pasadías Paraíso, una agencia de turismo de día en Colombia.

PERSONALIDAD:
- Eres amigable, entusiasta pero profesional
- Usas emojis moderadamente (1-2 por mensaje)
- Respondes en español colombiano
- Eres proactivo sugiriendo destinos según intereses

PROCESO DE RESERVA:
1. Pregunta qué tipo de experiencia busca (playa, aventura, relax, familiar)
2. Recomienda 2-3 destinos según su interés
3. Muestra precios detallados (adultos + niños)
4. Solicita datos: nombre, cédula, teléfono, fecha del viaje, punto de recogida
5. Pregunta si tiene código de descuento
6. Confirma la reserva y explica el proceso de pago

INFORMACIÓN DE CONTACTO:
📱 WhatsApp: 300-123-4567
📧 Email: reservas@pasadiasparaiso.com
📍 Oficina: Centro Comercial Plaza, Local 201

POLÍTICAS:
- Abono mínimo: 50% del total
- Cancelación gratis hasta 48h antes
- Menores de 3 años: GRATIS
- Niños: 4 a 12 años

PUNTOS DE RECOGIDA: Terminal Norte, Terminal Sur, Centro Comercial Plaza, Parque Principal, Hotel zona centro, Aeropuerto`,
        
        prompt: `Eres el asistente de ventas de ${WORKSPACE_NAME}, una agencia de pasadías turísticos en Colombia.

DESTINOS PRINCIPALES:
- Playa Blanca (Cartagena): $89.000 adulto / $59.000 niño - 12 horas
- Islas del Rosario: $145.000 adulto / $95.000 niño - 10 horas
- Río Claro Aventura: $175.000 adulto / $125.000 niño - 14 horas
- Termales Santa Rosa: $125.000 adulto / $85.000 niño - 11 horas
- San Andrés Full Day: $450.000 adulto / $380.000 niño - 15 horas
- Guatapé: $95.000 adulto / $65.000 niño - 12 horas

PROCESO:
1. Saluda y pregunta qué experiencia busca
2. Recomienda destinos según interés
3. Calcula precios (adultos × precio + niños × precio niño)
4. Recoge datos para la reserva
5. Confirma y explica pago

DATOS PARA RESERVA: nombre, cédula, teléfono, fecha viaje, punto de recogida, número de adultos y niños

Mantén un tono amigable y usa emojis apropiados. Siempre ofrece ayuda adicional.`,
        
        aiModel: ['gpt-4o-mini'],
        useFlows: true,
        hasFlows: true,
        active: true,
        createdAt: new Date().toISOString()
      };
      await agentsDb.insert(agenteReservas);
      console.log('  ✅ Agente de Reservas creado');

      // ════════════════════════════════════════════════════════════════════
      // AGENTE 2: ANALISTA DE VENTAS
      // ════════════════════════════════════════════════════════════════════
      const agenteAnalistaId = uuidv4();
      const agenteAnalista = {
        _id: agenteAnalistaId,
        type: 'agent',
        name: 'Analista de Ventas',
        description: 'Especializado en reportes, estadísticas y análisis de reservas',
        tables: [
          { tableId: destinosTableId, tableName: 'Destinos', fullAccess: true, permissions: { query: true, create: false, update: false, delete: false } },
          { tableId: clientesTableId, tableName: 'Clientes', fullAccess: true, permissions: { query: true, create: false, update: false, delete: false } },
          { tableId: reservasTableId, tableName: 'Reservas', fullAccess: true, permissions: { query: true, create: false, update: false, delete: false } },
          { tableId: pagosTableId, tableName: 'Pagos', fullAccess: true, permissions: { query: true, create: false, update: false, delete: false } },
          { tableId: resenasTableId, tableName: 'Reseñas', fullAccess: true, permissions: { query: true, create: false, update: false, delete: false } },
          { tableId: transporteTableId, tableName: 'Transporte', fullAccess: true, permissions: { query: true, create: false, update: false, delete: false } },
          { tableId: guiasTableId, tableName: 'Guías', fullAccess: true, permissions: { query: true, create: false, update: false, delete: false } },
        ],
        
        engineMode: 'llm-first',
        vertical: 'analytics',
        toneStyle: 'professional',
        
        fewShotExamples: [
          {
            user: 'cuántas reservas hay para abril',
            assistant: '📊 **Reservas de Abril 2025:**\n\nTotal: 5 reservas\n• Confirmadas: 3\n• Pagadas: 2\n• Pendientes: 1\n\n💰 Valor total: $2.012.000\n💵 Cobrado: $1.220.000\n📉 Pendiente por cobrar: $792.000\n\n¿Necesitas más detalles por destino?'
          },
          {
            user: 'cuál es el destino más vendido',
            assistant: '🏆 **Top Destinos (últimos 30 días):**\n\n1. 🏖️ Playa Blanca - 45 reservas (35%)\n2. 🏔️ Guatapé - 28 reservas (22%)\n3. 🌊 Islas del Rosario - 24 reservas (19%)\n\n⭐ Mejor calificación: Islas del Rosario (4.9/5)'
          }
        ],
        
        enabledTools: ['query_records', 'analyze_data', 'general_conversation'],
        disabledTools: ['create_record', 'update_record'],
        
        customInstructions: 'Presenta los datos de forma clara con tablas y estadísticas. Siempre incluye insights y tendencias.',
        
        prompt: `Eres el analista de datos de ${WORKSPACE_NAME}.

REPORTES QUE GENERAS:
📊 Reservas por periodo (día/semana/mes)
💰 Ingresos y pendientes de cobro
🏆 Destinos más populares
👥 Clientes frecuentes vs nuevos
⭐ Calificaciones y reseñas
🚌 Ocupación de transporte
👤 Rendimiento de guías

FORMATO:
- Usa tablas para comparaciones
- Incluye totales y porcentajes
- Destaca tendencias positivas/negativas
- Sugiere acciones basadas en datos

Sé analítico y objetivo. Presenta información visualmente clara.`,
        
        aiModel: ['gpt-4o-mini'],
        useFlows: false,
        hasFlows: false,
        active: true,
        createdAt: new Date().toISOString()
      };
      await agentsDb.insert(agenteAnalista);
      console.log('  ✅ Agente Analista creado');

      // ════════════════════════════════════════════════════════════════════
      // VARIABLES GLOBALES
      // ════════════════════════════════════════════════════════════════════
      const globalVarsDoc = {
        _id: 'global_variables',
        type: 'config',
        variables: {
          nombreNegocio: 'Pasadías Paraíso',
          slogan: 'Tu aventura comienza aquí',
          telefono: '300-123-4567',
          whatsapp: '3001234567',
          email: 'reservas@pasadiasparaiso.com',
          direccion: 'Centro Comercial Plaza, Local 201',
          ciudad: 'Bogotá',
          horarioAtencion: 'Lunes a Sábado 7am-8pm, Domingo 8am-6pm',
          politicaCancelacion: 'Cancelación gratis hasta 48 horas antes del viaje',
          abonoMinimo: '50% del valor total',
          edadNino: '4 a 12 años',
          edadGratis: 'Menores de 3 años',
          puntosRecogida: ['Terminal Norte', 'Terminal Sur', 'Centro Comercial Plaza', 'Parque Principal', 'Hotel zona centro', 'Aeropuerto'],
          redesSociales: {
            instagram: '@pasadiasparaiso',
            facebook: 'PasadiasParaisoCO',
            tiktok: '@pasadiasparaiso'
          }
        },
        createdAt: new Date().toISOString()
      };
      await workspaceDb.insert(globalVarsDoc);
      console.log('  ✅ Variables Globales creadas');

      // ════════════════════════════════════════════════════════════════════
      // WORKSPACE DOC
      // ════════════════════════════════════════════════════════════════════
      const workspaceDoc = {
        _id: '_design/workspace',
        name: WORKSPACE_NAME,
        description: 'Sistema completo de gestión de pasadías turísticos',
        type: 'tourism',
        defaultAgentId: agenteReservasId,
        plan: 'premium',
        settings: {
          timezone: 'America/Bogota',
          currency: 'COP',
          language: 'es'
        },
        createdAt: new Date().toISOString()
      };
      await workspaceDb.insert(workspaceDoc);
      
      // ════════════════════════════════════════════════════════════════════
      // FLUJOS AUTOMATIZADOS
      // ════════════════════════════════════════════════════════════════════
      const flowsDb = await connectDB(getFlowsDbName(WORKSPACE_ID));
      
      // FLUJO 1: Confirmación automática de nueva reserva
      const flowConfirmacionId = uuidv4();
      const flowConfirmacion = {
        _id: flowConfirmacionId,
        name: 'Confirmación de Reserva',
        description: 'Envía confirmación automática cuando se crea una nueva reserva',
        icon: '✅',
        color: 'emerald',
        active: true,
        workspaceId: WORKSPACE_ID,
        nodes: [
          {
            id: 'start-1',
            type: 'start',
            position: { x: 250, y: 50 },
            data: {
              label: 'Nueva Reserva',
              trigger: 'afterCreate',
              tableId: reservasTableId,
              tableName: 'Reservas'
            }
          },
          {
            id: 'condition-1',
            type: 'condition',
            position: { x: 250, y: 180 },
            data: {
              label: '¿Tiene abono?',
              field: 'record.abono',
              operator: 'greaterThan',
              value: 0
            }
          },
          {
            id: 'message-con-abono',
            type: 'message',
            position: { x: 100, y: 320 },
            data: {
              label: 'Confirmación con abono',
              message: `🎉 ¡Reserva Confirmada!\n\nHola {{record.cliente}},\n\n✅ Tu reserva está lista:\n📍 Destino: {{record.destino}}\n📅 Fecha: {{record.fechaViaje}}\n👥 Personas: {{record.adultos}} adultos, {{record.ninos}} niños\n📍 Recogida: {{record.puntoRecogida}}\n\n💰 Total: \${{record.totalPagar}}\n✅ Abono recibido: \${{record.abono}}\n⏳ Saldo pendiente: \${{record.saldo}}\n\n📞 ¿Dudas? Escríbenos al 300-123-4567\n\n¡Gracias por elegir Pasadías Paraíso! 🏝️`
            }
          },
          {
            id: 'message-sin-abono',
            type: 'message',
            position: { x: 400, y: 320 },
            data: {
              label: 'Reserva pendiente pago',
              message: `⏳ Reserva en Proceso\n\nHola {{record.cliente}},\n\nTu reserva está registrada pero requiere confirmación de pago:\n\n📍 Destino: {{record.destino}}\n📅 Fecha: {{record.fechaViaje}}\n💰 Total a pagar: \${{record.totalPagar}}\n\n💳 Métodos de pago:\n• Nequi: 300-123-4567\n• Daviplata: 300-123-4567\n• Transferencia: Bancolombia 123-456789-00\n\n⚠️ Confirma tu pago en las próximas 24 horas para asegurar tu cupo.\n\n📞 ¿Dudas? Escríbenos al 300-123-4567`
            }
          },
          {
            id: 'notify-team',
            type: 'notify',
            position: { x: 250, y: 460 },
            data: {
              label: 'Notificar equipo',
              channel: 'internal',
              message: '📋 Nueva reserva registrada\n\nCliente: {{record.cliente}}\nDestino: {{record.destino}}\nFecha: {{record.fechaViaje}}\nTotal: \${{record.totalPagar}}\nEstado: {{record.estadoReserva}}'
            }
          }
        ],
        edges: [
          { id: 'e1', source: 'start-1', target: 'condition-1' },
          { id: 'e2', source: 'condition-1', target: 'message-con-abono', sourceHandle: 'true' },
          { id: 'e3', source: 'condition-1', target: 'message-sin-abono', sourceHandle: 'false' },
          { id: 'e4', source: 'message-con-abono', target: 'notify-team' },
          { id: 'e5', source: 'message-sin-abono', target: 'notify-team' }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await flowsDb.insert(flowConfirmacion);
      
      // FLUJO 2: Recordatorio de pago pendiente
      const flowRecordatorioId = uuidv4();
      const flowRecordatorio = {
        _id: flowRecordatorioId,
        name: 'Recordatorio de Pago',
        description: 'Recuerda a clientes con saldo pendiente 3 días antes del viaje',
        icon: '🔔',
        color: 'amber',
        active: true,
        workspaceId: WORKSPACE_ID,
        nodes: [
          {
            id: 'start-1',
            type: 'start',
            position: { x: 250, y: 50 },
            data: {
              label: 'Verificación diaria',
              trigger: 'schedule',
              schedule: {
                type: 'daily',
                time: '09:00',
                timezone: 'America/Bogota'
              }
            }
          },
          {
            id: 'query-1',
            type: 'query',
            position: { x: 250, y: 180 },
            data: {
              label: 'Buscar reservas con saldo',
              tableId: reservasTableId,
              tableName: 'Reservas',
              filters: [
                { field: 'saldo', operator: 'greaterThan', value: 0 },
                { field: 'estadoReserva', operator: 'notEquals', value: 'Cancelada' }
              ]
            }
          },
          {
            id: 'loop-1',
            type: 'loop',
            position: { x: 250, y: 310 },
            data: {
              label: 'Por cada reserva',
              variable: 'reserva'
            }
          },
          {
            id: 'condition-fecha',
            type: 'condition',
            position: { x: 250, y: 440 },
            data: {
              label: '¿Viaje en 3 días?',
              field: 'reserva.fechaViaje',
              operator: 'daysUntil',
              value: 3
            }
          },
          {
            id: 'message-recordatorio',
            type: 'message',
            position: { x: 250, y: 570 },
            data: {
              label: 'Enviar recordatorio',
              message: `⏰ Recordatorio de Pago\n\nHola {{reserva.cliente}},\n\n¡Tu pasadía a {{reserva.destino}} es en 3 días! 🏖️\n\n💰 Saldo pendiente: \${{reserva.saldo}}\n📅 Fecha del viaje: {{reserva.fechaViaje}}\n\nPara confirmar tu cupo, realiza el pago antes de mañana:\n\n💳 Nequi/Daviplata: 300-123-4567\n🏦 Bancolombia: 123-456789-00\n\n📸 Envía tu comprobante por WhatsApp.\n\n¡Te esperamos! 🌴`
            }
          }
        ],
        edges: [
          { id: 'e1', source: 'start-1', target: 'query-1' },
          { id: 'e2', source: 'query-1', target: 'loop-1' },
          { id: 'e3', source: 'loop-1', target: 'condition-fecha' },
          { id: 'e4', source: 'condition-fecha', target: 'message-recordatorio', sourceHandle: 'true' }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await flowsDb.insert(flowRecordatorio);
      
      // FLUJO 3: Solicitar reseña post-viaje
      const flowResenaId = uuidv4();
      const flowResena = {
        _id: flowResenaId,
        name: 'Solicitar Reseña',
        description: 'Envía solicitud de reseña cuando una reserva se marca como completada',
        icon: '⭐',
        color: 'yellow',
        active: true,
        workspaceId: WORKSPACE_ID,
        nodes: [
          {
            id: 'start-1',
            type: 'start',
            position: { x: 250, y: 50 },
            data: {
              label: 'Reserva actualizada',
              trigger: 'afterUpdate',
              tableId: reservasTableId,
              tableName: 'Reservas'
            }
          },
          {
            id: 'condition-1',
            type: 'condition',
            position: { x: 250, y: 180 },
            data: {
              label: '¿Estado = Completada?',
              field: 'record.estadoReserva',
              operator: 'equals',
              value: 'Completada'
            }
          },
          {
            id: 'delay-1',
            type: 'delay',
            position: { x: 250, y: 310 },
            data: {
              label: 'Esperar 1 día',
              duration: 1,
              unit: 'days'
            }
          },
          {
            id: 'message-resena',
            type: 'message',
            position: { x: 250, y: 440 },
            data: {
              label: 'Solicitar reseña',
              message: `⭐ ¿Cómo estuvo tu experiencia?\n\nHola {{record.cliente}},\n\n¡Esperamos que hayas disfrutado tu pasadía a {{record.destino}}! 🏝️\n\nTu opinión nos ayuda a mejorar. ¿Podrías regalarnos una reseña?\n\n📝 Cuéntanos:\n• ¿Qué te gustó más?\n• ¿El servicio cumplió tus expectativas?\n• ¿Recomendarías este destino?\n\nResponde este mensaje con tu experiencia y una calificación del 1 al 5 ⭐\n\n¡Gracias por viajar con Pasadías Paraíso! 🌴`
            }
          },
          {
            id: 'update-cliente',
            type: 'update',
            position: { x: 250, y: 570 },
            data: {
              label: 'Marcar cliente activo',
              tableId: clientesTableId,
              tableName: 'Clientes',
              filters: [{ field: 'nombre', equals: '{{record.cliente}}' }],
              fields: [
                { key: 'ultimoViaje', value: '{{record.fechaViaje}}' }
              ]
            }
          }
        ],
        edges: [
          { id: 'e1', source: 'start-1', target: 'condition-1' },
          { id: 'e2', source: 'condition-1', target: 'delay-1', sourceHandle: 'true' },
          { id: 'e3', source: 'delay-1', target: 'message-resena' },
          { id: 'e4', source: 'message-resena', target: 'update-cliente' }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await flowsDb.insert(flowResena);
      
      // FLUJO 4: Bienvenida nuevo cliente
      const flowBienvenidaId = uuidv4();
      const flowBienvenida = {
        _id: flowBienvenidaId,
        name: 'Bienvenida Cliente',
        description: 'Envía mensaje de bienvenida y promociones a nuevos clientes',
        icon: '👋',
        color: 'blue',
        active: true,
        workspaceId: WORKSPACE_ID,
        nodes: [
          {
            id: 'start-1',
            type: 'start',
            position: { x: 250, y: 50 },
            data: {
              label: 'Nuevo Cliente',
              trigger: 'afterCreate',
              tableId: clientesTableId,
              tableName: 'Clientes'
            }
          },
          {
            id: 'message-bienvenida',
            type: 'message',
            position: { x: 250, y: 180 },
            data: {
              label: 'Mensaje de bienvenida',
              message: `🎉 ¡Bienvenido a Pasadías Paraíso!\n\nHola {{record.nombre}},\n\n¡Gracias por unirte a nuestra comunidad viajera! 🌴\n\n🎁 Por ser nuevo cliente, tienes un 10% de descuento en tu primera reserva.\nUsa el código: BIENVENIDO10\n\n✨ Destinos más populares:\n🏖️ Playa Blanca - $89.000\n🏔️ Guatapé - $95.000\n🌊 Islas del Rosario - $145.000\n\n📱 Síguenos en Instagram: @pasadiasparaiso\n\n¿Listo para tu próxima aventura? ¡Escríbenos! 🚀`
            }
          },
          {
            id: 'query-promos',
            type: 'query',
            position: { x: 250, y: 320 },
            data: {
              label: 'Buscar promos activas',
              tableId: promocionesTableId,
              tableName: 'Promociones',
              filters: [
                { field: 'estado', operator: 'equals', value: 'Activa' }
              ],
              limit: 3
            }
          },
          {
            id: 'condition-promos',
            type: 'condition',
            position: { x: 250, y: 450 },
            data: {
              label: '¿Hay promociones?',
              field: 'queryResult.length',
              operator: 'greaterThan',
              value: 0
            }
          },
          {
            id: 'message-promos',
            type: 'message',
            position: { x: 250, y: 580 },
            data: {
              label: 'Enviar promociones',
              message: `🔥 ¡Promociones Activas!\n\n{{#each queryResult}}\n🎟️ {{nombre}}: {{valor}}% OFF\n   Código: {{codigo}}\n{{/each}}\n\n¡No te las pierdas! Vigencia limitada.`
            }
          }
        ],
        edges: [
          { id: 'e1', source: 'start-1', target: 'message-bienvenida' },
          { id: 'e2', source: 'message-bienvenida', target: 'query-promos' },
          { id: 'e3', source: 'query-promos', target: 'condition-promos' },
          { id: 'e4', source: 'condition-promos', target: 'message-promos', sourceHandle: 'true' }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await flowsDb.insert(flowBienvenida);
      
      // FLUJO 5: Notificación día anterior al viaje
      const flowDiaAnteriorId = uuidv4();
      const flowDiaAnterior = {
        _id: flowDiaAnteriorId,
        name: 'Recordatorio Día Anterior',
        description: 'Envía instrucciones y recordatorio el día antes del viaje',
        icon: '📅',
        color: 'indigo',
        active: true,
        workspaceId: WORKSPACE_ID,
        nodes: [
          {
            id: 'start-1',
            type: 'start',
            position: { x: 250, y: 50 },
            data: {
              label: 'Verificación 6pm',
              trigger: 'schedule',
              schedule: {
                type: 'daily',
                time: '18:00',
                timezone: 'America/Bogota'
              }
            }
          },
          {
            id: 'query-1',
            type: 'query',
            position: { x: 250, y: 180 },
            data: {
              label: 'Reservas para mañana',
              tableId: reservasTableId,
              tableName: 'Reservas',
              filters: [
                { field: 'fechaViaje', operator: 'equals', value: '{{tomorrow}}' },
                { field: 'estadoReserva', operator: 'in', value: ['Confirmada', 'Pagada'] }
              ]
            }
          },
          {
            id: 'loop-1',
            type: 'loop',
            position: { x: 250, y: 310 },
            data: {
              label: 'Por cada reserva',
              variable: 'reserva'
            }
          },
          {
            id: 'message-instrucciones',
            type: 'message',
            position: { x: 250, y: 440 },
            data: {
              label: 'Enviar instrucciones',
              message: `🌅 ¡Mañana es el gran día!\n\nHola {{reserva.cliente}},\n\n🏝️ Tu pasadía a {{reserva.destino}} es MAÑANA.\n\n📍 PUNTO DE RECOGIDA:\n{{reserva.puntoRecogida}}\n\n⏰ HORA: 5:00 AM (estar 10 min antes)\n\n🎒 QUÉ LLEVAR:\n• Documento de identidad\n• Ropa cómoda y traje de baño\n• Protector solar y gorra\n• Dinero en efectivo para extras\n• Toalla (opcional)\n\n⚠️ IMPORTANTE:\n• El bus sale puntual, no espera\n• Llevar snacks para el viaje\n• Confirmar asistencia respondiendo este mensaje\n\n📞 Emergencias: 300-123-4567\n\n¡Prepárate para una experiencia increíble! 🚀`
            }
          },
          {
            id: 'notify-team',
            type: 'notify',
            position: { x: 250, y: 580 },
            data: {
              label: 'Notificar logística',
              channel: 'internal',
              message: '🚌 Viaje mañana: {{reserva.destino}}\nCliente: {{reserva.cliente}}\nRecogida: {{reserva.puntoRecogida}}\nPersonas: {{reserva.adultos}} adultos + {{reserva.ninos}} niños'
            }
          }
        ],
        edges: [
          { id: 'e1', source: 'start-1', target: 'query-1' },
          { id: 'e2', source: 'query-1', target: 'loop-1' },
          { id: 'e3', source: 'loop-1', target: 'message-instrucciones' },
          { id: 'e4', source: 'message-instrucciones', target: 'notify-team' }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await flowsDb.insert(flowDiaAnterior);
      
      // FLUJO 6: Registro de pago recibido
      const flowPagoId = uuidv4();
      const flowPago = {
        _id: flowPagoId,
        name: 'Confirmación de Pago',
        description: 'Confirma el pago y actualiza el estado de la reserva',
        icon: '💳',
        color: 'green',
        active: true,
        workspaceId: WORKSPACE_ID,
        nodes: [
          {
            id: 'start-1',
            type: 'start',
            position: { x: 250, y: 50 },
            data: {
              label: 'Nuevo Pago',
              trigger: 'afterCreate',
              tableId: pagosTableId,
              tableName: 'Pagos'
            }
          },
          {
            id: 'query-reserva',
            type: 'query',
            position: { x: 250, y: 180 },
            data: {
              label: 'Buscar reserva',
              tableId: reservasTableId,
              tableName: 'Reservas',
              filters: [
                { field: 'codigoReserva', operator: 'equals', value: '{{record.reserva}}' }
              ],
              single: true
            }
          },
          {
            id: 'condition-completo',
            type: 'condition',
            position: { x: 250, y: 310 },
            data: {
              label: '¿Pago completo?',
              expression: '{{queryResult.saldo}} - {{record.monto}} <= 0'
            }
          },
          {
            id: 'update-pagada',
            type: 'update',
            position: { x: 100, y: 440 },
            data: {
              label: 'Marcar como Pagada',
              tableId: reservasTableId,
              tableName: 'Reservas',
              filters: [{ field: 'codigoReserva', equals: '{{record.reserva}}' }],
              fields: [
                { key: 'estadoReserva', value: 'Pagada' },
                { key: 'saldo', value: 0 },
                { key: 'abono', value: '{{queryResult.totalPagar}}' }
              ]
            }
          },
          {
            id: 'update-abono',
            type: 'update',
            position: { x: 400, y: 440 },
            data: {
              label: 'Actualizar abono',
              tableId: reservasTableId,
              tableName: 'Reservas',
              filters: [{ field: 'codigoReserva', equals: '{{record.reserva}}' }],
              fields: [
                { key: 'abono', value: '{{add queryResult.abono record.monto}}' },
                { key: 'saldo', value: '{{subtract queryResult.saldo record.monto}}' }
              ]
            }
          },
          {
            id: 'message-pago-completo',
            type: 'message',
            position: { x: 100, y: 580 },
            data: {
              label: 'Confirmación total',
              message: `✅ ¡Pago Completo!\n\nHola {{queryResult.cliente}},\n\n🎉 Tu reserva está 100% pagada.\n\n📍 Destino: {{queryResult.destino}}\n📅 Fecha: {{queryResult.fechaViaje}}\n💰 Total pagado: \${{queryResult.totalPagar}}\n\n¡Solo queda disfrutar! Recibirás las instrucciones el día anterior.\n\nGracias por tu confianza 🙏`
            }
          },
          {
            id: 'message-abono',
            type: 'message',
            position: { x: 400, y: 580 },
            data: {
              label: 'Confirmación abono',
              message: `✅ Abono Recibido\n\nHola {{queryResult.cliente}},\n\nHemos recibido tu pago de \${{record.monto}}.\n\n💰 Nuevo saldo pendiente: \${{subtract queryResult.saldo record.monto}}\n📅 Fecha de viaje: {{queryResult.fechaViaje}}\n\nRecuerda completar el pago antes del viaje. ¡Gracias! 🙏`
            }
          }
        ],
        edges: [
          { id: 'e1', source: 'start-1', target: 'query-reserva' },
          { id: 'e2', source: 'query-reserva', target: 'condition-completo' },
          { id: 'e3', source: 'condition-completo', target: 'update-pagada', sourceHandle: 'true' },
          { id: 'e4', source: 'condition-completo', target: 'update-abono', sourceHandle: 'false' },
          { id: 'e5', source: 'update-pagada', target: 'message-pago-completo' },
          { id: 'e6', source: 'update-abono', target: 'message-abono' }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await flowsDb.insert(flowPago);
      
      console.log('  ✅ 6 Flujos automatizados creados');
    }
    
    // ════════════════════════════════════════════════════════════════════
    // REGISTRAR WORKSPACE EN BASE DE DATOS CENTRAL
    // ════════════════════════════════════════════════════════════════════
    try {
      await workspacesDb.get(WORKSPACE_ID);
      console.log('  ⏭️ Workspace ya registrado en central');
    } catch {
      const centralWorkspaceDoc = {
        _id: WORKSPACE_ID,
        name: WORKSPACE_NAME,
        color: '#0ea5e9', // sky-500
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'seed',
        plan: 'premium',
        members: [],
        isDemo: true
      };
      await workspacesDb.insert(centralWorkspaceDoc);
      console.log('  ✅ Workspace registrado en central');
    }
    
    // ════════════════════════════════════════════════════════════════════
    // ASIGNAR WORKSPACE A TODOS LOS USUARIOS
    // ════════════════════════════════════════════════════════════════════
    const users = await getAllUsers();
    console.log(`  👥 Encontrados ${users.length} usuarios`);
    
    for (const user of users) {
      await assignWorkspaceToUser(user.id, WORKSPACE_ID, WORKSPACE_NAME);
    }
    console.log('  ✅ Workspace asignado a todos los usuarios');
    
    console.log(`\n🎉 Seed de ${WORKSPACE_NAME} completado exitosamente!\n`);
    
  } catch (error) {
    console.error('❌ Error en seed:', error.message);
    throw error;
  }
}

export default seed;


