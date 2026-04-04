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
          { key: 'imagen', label: 'Imagen', type: 'file', required: false, emoji: '🖼️', hiddenFromChat: true },
          { key: 'imagenUrl', label: 'Foto', type: 'text', required: false, emoji: '📷', hiddenFromChat: false }
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
            askMessage: '¿A nombre de quién va la reserva?',
            relation: {
              tableName: 'Clientes',
              displayField: 'nombre',
              searchField: 'nombre',
              confirmOnMatch: true,
              autoCreate: true,
              autoCreateFields: ['nombre', 'telefono'],
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
          { key: 'fechaViaje', label: 'Fecha del Viaje', type: 'date', required: true, emoji: '📅', priority: 4, askMessage: '¿Para qué fecha deseas reservar? (Verificaré disponibilidad)' },
          { key: 'adultos', label: 'Adultos', type: 'number', required: true, emoji: '👨', priority: 5, validation: { min: 1, max: 50 }, defaultValue: 1, askMessage: '¿Para cuántas personas adultas?' },
          { key: 'ninos', label: 'Niños', type: 'number', required: false, emoji: '👶', priority: 6, validation: { min: 0, max: 20 }, defaultValue: 0, askMessage: '¿Van niños? ¿Cuántos? (Si no van niños, dime 0 o "ninguno")' },
          { key: 'puntoRecogida', label: 'Punto de Recogida', type: 'select', required: true, emoji: '📍', priority: 7, options: ['Terminal Norte', 'Terminal Sur', 'Centro Comercial Plaza', 'Parque Principal', 'Hotel zona centro', 'Aeropuerto'], askMessage: '¿En qué punto de recogida te queda más cómodo?' },
          { key: 'totalPagar', label: 'Total a Pagar', type: 'number', required: false, emoji: '💰', priority: 8, hiddenFromChat: true, autoCalculate: true },
          { key: 'abono', label: 'Abono', type: 'number', required: false, emoji: '💵', validation: { min: 0 }, defaultValue: 0 },
          { key: 'saldo', label: 'Saldo Pendiente', type: 'number', required: false, emoji: '💳', hiddenFromChat: true },
          { key: 'estadoReserva', label: 'Estado', type: 'select', required: true, emoji: '📊', options: ['Pendiente', 'Confirmada', 'Pagada', 'En curso', 'Completada', 'Cancelada'], defaultValue: 'Pendiente', hiddenFromChat: true },
          { key: 'metodoPago', label: 'Método Pago', type: 'select', required: false, emoji: '💳', options: ['Efectivo', 'Transferencia', 'Nequi', 'Daviplata', 'Tarjeta', 'PayU'] },
          { key: 'codigoPromo', label: 'Código Promo', type: 'text', required: false, emoji: '🎟️' },
          { key: 'notasEspeciales', label: 'Notas Especiales', type: 'text', required: false, emoji: '📝' },
          { key: 'fechaReserva', label: 'Fecha Reserva', type: 'date', required: false, emoji: '📅', defaultValue: 'today', hiddenFromChat: true },
          { key: 'guiaAsignado', label: 'Guía Asignado', type: 'text', required: false, emoji: '🧑‍🦯', hiddenFromChat: true },
          { key: 'telefonoGuia', label: 'Tel. Guía', type: 'phone', required: false, emoji: '📱', hiddenFromChat: true },
          { key: 'transporteAsignado', label: 'Transporte', type: 'text', required: false, emoji: '🚌', hiddenFromChat: true },
          { key: 'conductorAsignado', label: 'Conductor', type: 'text', required: false, emoji: '👨‍✈️', hiddenFromChat: true }
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
          imagenUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=350&fit=crop',
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
          imagenUrl: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=600&h=350&fit=crop',
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
          imagenUrl: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600&h=350&fit=crop',
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
          imagenUrl: 'https://images.unsplash.com/photo-1596178060671-7a9bc86b89e3?w=600&h=350&fit=crop',
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
          imagenUrl: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600&h=350&fit=crop',
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
          imagenUrl: 'https://images.unsplash.com/photo-1590393801942-6ec49bb73b12?w=600&h=350&fit=crop',
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
          imagenUrl: 'https://images.unsplash.com/photo-1533227268428-f9ed0900fb3b?w=600&h=350&fit=crop',
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
          imagenUrl: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=600&h=350&fit=crop',
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
          imagenUrl: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=600&h=350&fit=crop',
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
          imagenUrl: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=600&h=350&fit=crop',
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
      // AGENTE 1: ASISTENTE DE RESERVAS (Bot de clientes — WhatsApp / Web)
      // ════════════════════════════════════════════════════════════════════
      const agenteReservasId = uuidv4();
      const agenteReservas = {
        _id: agenteReservasId,
        type: 'agent',
        name: 'Asistente de Reservas',
        description: 'Bot de atención al cliente: reservas, pagos, cancelaciones, estado de reserva y reseñas',
        tables: [
          { tableId: destinosTableId,    tableName: 'Destinos',    fullAccess: true, permissions: { query: true,  create: false, update: false, delete: false } },
          { tableId: clientesTableId,    tableName: 'Clientes',    fullAccess: true, permissions: { query: false, create: true,  update: true,  delete: false } },
          { tableId: reservasTableId,    tableName: 'Reservas',    fullAccess: true, permissions: { query: true,  create: true,  update: true,  delete: false } },
          { tableId: pagosTableId,       tableName: 'Pagos',       fullAccess: true, permissions: { query: true,  create: true,  update: false, delete: false } },
          { tableId: promocionesTableId, tableName: 'Promociones', fullAccess: true, permissions: { query: true,  create: false, update: false, delete: false } },
          { tableId: resenasTableId,     tableName: 'Reseñas',     fullAccess: true, permissions: { query: true,  create: true,  update: true,  delete: false } },
        ],

        engineMode: 'llm-first',
        vertical: 'tourism',
        toneStyle: 'friendly',

        fewShotExamples: [
          {
            user: 'quiero reservar un pasadía',
            assistant: '¡Hola! 🏝️ Con gusto te ayudo. ¿Qué tipo de experiencia buscas?\n\n🏖️ Playa | 🏔️ Aventura | ♨️ Relax | 👨‍👩‍👧 Familiar\n\nCuéntame y te recomiendo las mejores opciones.'
          },
          {
            user: 'cuánto cuesta playa blanca para 2 adultos y 1 niño',
            assistant: '🏖️ *Playa Blanca* — Isla Barú, Cartagena\n\n2 adultos × $89.000 = $178.000\n1 niño × $59.000 = $59.000\n*Total: $237.000*\n\n✅ Incluye transporte A/C, lancha, almuerzo, sillas y guía.\n\n¿Reservamos? Dime tu nombre, cédula, teléfono y la fecha del viaje.'
          },
          {
            user: 'cómo está mi reserva RES-00234',
            assistant: 'Déjame verificar tu reserva...\n\n📋 *RES-00234*\n🏝️ Destino: Playa Blanca\n📅 Fecha: 2025-04-12\n💰 Total: $237.000 | Abono: $118.500 | Saldo: $118.500\n📌 Estado: Confirmada\n\n¿Quieres pagar el saldo restante o tienes alguna pregunta?'
          },
          {
            user: 'quiero cancelar mi reserva',
            assistant: 'Claro, puedo ayudarte con eso. ¿Me das el código de tu reserva?\n\nRecuerda que las cancelaciones son *gratis hasta 48 horas antes* del viaje. Después se cobra el 30% del total como penalización. 🙏'
          },
          {
            user: 'tengo un código de descuento VERANO25',
            assistant: 'Perfecto, déjame verificar ese código...\n\nSi es válido, lo aplico directamente al crear tu reserva. ¿Ya tienes destino y fecha en mente, o quieres que te muestre las opciones disponibles?'
          },
          {
            user: 'qué debo llevar al pasadía',
            assistant: '🎒 *Para tu pasadía lleva:*\n\n• Documento de identidad\n• Ropa cómoda + traje de baño\n• Protector solar y gorra\n• Toalla (opcional, hay para alquilar)\n• Dinero en efectivo para extras\n• Snacks para el camino\n\n⏰ El bus sale puntual. Llega 10 min antes al punto de recogida. ¿Algo más?'
          },
          {
            user: 'quiero dejar una reseña del pasadía a guatapé',
            assistant: '¡Qué bueno que te acompañamos! 🌟 Cuéntame:\n\n1. ¿Del 1 al 5, qué calificación le darías?\n2. ¿Qué fue lo que más disfrutaste?\n3. ¿Lo recomendarías a un amigo?\n\nCon eso registro tu reseña. ¡Gracias por confiar en Pasadías Paraíso!'
          }
        ],

        responseTemplates: {
          createSuccess: '✅ ¡Reserva registrada! Tu código es *{{codigoReserva}}*. Te llegará confirmación en un momento.',
          createConfirm: '¿Confirmo la reserva?\n\n🏝️ {{destino}} — {{fechaViaje}}\n👥 {{adultos}} adultos, {{ninos}} niños\n📍 {{puntoRecogida}}\n💰 Total: ${{totalPagar}}\n\n¿Está todo correcto?',
          updateSuccess: '✅ Listo, tu reserva ha sido actualizada.',
          notFound: 'No encontré esa información. ¿Puedes verificar el dato e intentarlo de nuevo? También puedes escribirnos al 300-123-4567.',
          error: '😅 Tuve un pequeño inconveniente. Vuelve a intentarlo o escríbenos directo al 300-123-4567.'
        },

        enabledTools: ['create_record', 'query_records', 'update_record', 'general_conversation'],
        disabledTools: ['analyze_data'],

        businessHours: {
          timezone: 'America/Bogota',
          schedule: {
            lunes_sabado: '07:00-20:00',
            domingo: '08:00-18:00'
          },
          outsideHoursMessage: '¡Hola! 🌙 Estamos fuera de horario (7am-8pm L-S, 8am-6pm dom). Te respondemos pronto. También puedes dejar tu mensaje y te contactamos mañana. 🙏'
        },

        customInstructions: `Eres el asistente virtual de *Pasadías Paraíso*, agencia de turismo de día en Colombia. Atiendes por WhatsApp y chat web.

═══ FORMATO (MUY IMPORTANTE) ═══
• Respuestas CORTAS — máximo 500 caracteres
• Máximo 3 opciones por lista (ofrece "¿quieres ver más?" si hay más)
• Nunca listes todos los destinos a la vez
• Usa *negrita* para destacar datos clave
• 1-2 emojis por mensaje, no más

═══ PERSONALIDAD ═══
• Amigable, cálida, entusiasta pero sin exagerar
• Español colombiano natural
• Proactiva: si detectas interés por playas, sugiere opciones de playa directamente

═══ FLUJOS PRINCIPALES ═══

🗓️ NUEVA RESERVA:
1. Pregunta categoría (playa / aventura / relax / familiar)
2. Recomienda 2-3 destinos con precio y destacado
3. Al elegir: pide nombre completo, cédula, teléfono, fecha del viaje, punto de recogida, adultos, niños
4. Confirma resumen y crea la reserva
5. Informa que recibirá confirmación y pasos del pago

💳 PAGO / ABONO:
Cuando el cliente quiera pagar:
1. Pide el código de reserva
2. Verifica el saldo pendiente (consulta la reserva)
3. Registra el pago en tabla Pagos con: reserva (código), monto, metodoPago
4. Informa el nuevo saldo

🔍 CONSULTAR RESERVA:
1. Pide el código de reserva o nombre del cliente
2. Muestra: destino, fecha, estado, total, saldo pendiente, guía asignado
3. Ofrece ayuda adicional

❌ CANCELACIÓN:
1. Pide código de reserva
2. Informa la política: gratis hasta 48h antes, 30% penalización después
3. Con confirmación explícita: actualiza estadoReserva a "Cancelada"

⭐ RESEÑA:
Al terminar un viaje o si el cliente la ofrece:
1. Pide calificación del 1 al 5 y comentario
2. Pregunta si recomendaría el destino
3. Crea registro en tabla Reseñas con: cliente, destino, calificacion, comentario, fecha, recomendaria

🎟️ CÓDIGO PROMO:
Si el cliente menciona un código:
1. Verifica en tabla Promociones que el código exista y esté Activa
2. Si es válido: informa el descuento y aplica al crear la reserva con campo codigoPromo
3. Si es inválido: informa amablemente y continúa sin código

═══ POLÍTICA DE PRECIOS ═══
• Niños menores de 3 años: GRATIS
• Abono mínimo: 50% del total para confirmar cupo
• Pago completo: hasta el día anterior al viaje

═══ PREGUNTAS FRECUENTES ═══
Qué llevar: doc de identidad, ropa cómoda, traje de baño, protector solar, gorra, toalla, efectivo para extras
Horario: salida 5am (10 min antes al punto de recogida), el bus sale puntual
Cancelación: gratis hasta 48h antes
Contacto: 300-123-4567 | reservas@pasadiasparaiso.com`,

        prompt: `Eres el asistente virtual de Pasadías Paraíso (turismo de día, Colombia).

⚠️ FORMATO: Respuestas cortas (máx 500 chars). Máximo 3 opciones en listas. Usa *negrita* para datos clave.

ACCIONES DISPONIBLES:
→ Crear reserva (tabla Reservas: cliente, destino, fechaViaje, adultos, ninos, puntoRecogida, abono, codigoPromo)
→ Registrar pago (tabla Pagos: reserva=codigoReserva, monto, metodoPago)
→ Consultar/actualizar reserva por codigoReserva o cliente
→ Verificar código promo (tabla Promociones, campo codigo)
→ Registrar reseña (tabla Reseñas: cliente, destino, calificacion 1-5, comentario, recomendaria)

PRECIOS CLAVE (adulto/niño):
🏖️ Playa Blanca $89k/$59k | 🌊 Islas Rosario $145k/$95k | 🏔️ Río Claro $175k/$125k
♨️ Termales $125k/$85k | 🚤 Guatapé $95k/$65k | 🌿 Tayrona $160k/$110k

FLUJO: Saluda → Pregunta interés → 2-3 opciones → Recoge datos → Confirma → Crea registro`,

        aiModel: ['gpt-4o-mini'],
        useFlows: true,
        hasFlows: true,
        active: true,
        createdAt: new Date().toISOString()
      };
      await agentsDb.insert(agenteReservas);
      console.log('  ✅ Agente de Reservas creado');

      // ════════════════════════════════════════════════════════════════════
      // AGENTE 2: ANALISTA OPERATIVO (Admin — Web)
      // ════════════════════════════════════════════════════════════════════
      const agenteAnalistaId = uuidv4();
      const agenteAnalista = {
        _id: agenteAnalistaId,
        type: 'agent',
        name: 'Panel Operativo',
        description: 'Agente para el equipo interno: reportes, gestión de reservas, guías, transporte y operaciones del día',
        tables: [
          { tableId: destinosTableId,    tableName: 'Destinos',    fullAccess: true, permissions: { query: true, create: false, update: true,  delete: false } },
          { tableId: clientesTableId,    tableName: 'Clientes',    fullAccess: true, permissions: { query: true, create: true,  update: true,  delete: false } },
          { tableId: reservasTableId,    tableName: 'Reservas',    fullAccess: true, permissions: { query: true, create: true,  update: true,  delete: false } },
          { tableId: pagosTableId,       tableName: 'Pagos',       fullAccess: true, permissions: { query: true, create: true,  update: true,  delete: false } },
          { tableId: resenasTableId,     tableName: 'Reseñas',     fullAccess: true, permissions: { query: true, create: false, update: false, delete: false } },
          { tableId: transporteTableId,  tableName: 'Transporte',  fullAccess: true, permissions: { query: true, create: false, update: true,  delete: false } },
          { tableId: guiasTableId,       tableName: 'Guías',       fullAccess: true, permissions: { query: true, create: false, update: true,  delete: false } },
          { tableId: promocionesTableId, tableName: 'Promociones', fullAccess: true, permissions: { query: true, create: true,  update: true,  delete: false } },
        ],

        engineMode: 'llm-first',
        vertical: 'analytics',
        toneStyle: 'professional',

        fewShotExamples: [
          {
            user: 'reservas para esta semana',
            assistant: '📅 *Esta semana:* 8 reservas\nConfirmadas: 5 | Pagadas: 3 | Pendientes: 0\n💰 Ingresado: $1.840.000\n\n¿Quieres el detalle por día o por destino?'
          },
          {
            user: 'qué guías están activos hoy',
            assistant: 'Consultando guías activos...\n\nEncontré 4 guías con estado Activo. ¿Quieres ver cuáles tienen reservas asignadas para hoy?'
          },
          {
            user: 'cambiar estado de reserva RES-00128 a Completada',
            assistant: 'Actualicé la reserva RES-00128 a *Completada*. Esto también disparará el flujo de solicitud de reseña al cliente. ✅'
          },
          {
            user: 'cuánto hay pendiente de cobro este mes',
            assistant: 'Revisando saldos pendientes de marzo...\n\nTe doy el total de reservas activas con saldo > 0. Un momento.'
          },
          {
            user: 'marcar vehículo TMX-002 como disponible',
            assistant: 'Actualicé el estado del vehículo TMX-002 a *Disponible*. ✅'
          }
        ],

        enabledTools: ['query_records', 'analyze_data', 'update_record', 'create_record', 'general_conversation'],
        disabledTools: [],

        customInstructions: `Eres el asistente operativo interno de Pasadías Paraíso. Solo lo usan los administradores y coordinadores.

FORMATO:
• Respuestas directas y concisas (máx 600 chars)
• Datos numéricos con formato claro
• Sin saludos largos — ve al grano
• Usa tablas compactas solo cuando sean necesarias

CAPACIDADES:
➤ Reportes y estadísticas (reservas, ingresos, destinos populares, tasa de cancelación)
➤ Consultar y actualizar reservas (estado, guía asignado, transporte)
➤ Gestión de guías (consultar disponibilidad, cambiar estado: Activo/Vacaciones/Inactivo)
➤ Gestión de transporte (consultar disponibilidad, cambiar estado: Disponible/En ruta/Mantenimiento)
➤ Revisar reseñas y calificaciones
➤ Crear y actualizar promociones
➤ Registrar pagos manuales

OPERACIONES FRECUENTES:
• "reservas del [fecha]" → listado del día con estado y guía asignado
• "saldos pendientes" → reservas con saldo > 0
• "guías disponibles" → guías con estado Activo
• "vehículos disponibles" → transporte con estado Disponible
• "cambiar estado de [reserva] a [estado]" → actualiza directamente
• "marcar [vehículo] como disponible/en ruta" → actualiza transporte
• "reporte de [mes]" → resumen de reservas, ingresos y métricas

Tono: profesional, eficiente. Sin emojis excesivos.`,

        prompt: `Eres el panel operativo interno de Pasadías Paraíso para el equipo admin.

⚠️ FORMATO: Respuestas cortas y concretas. Datos clave sin relleno.

ACCIONES: Consultar/actualizar reservas, guías, transporte · Reportes de ventas e ingresos · Gestionar promociones · Registrar pagos · Ver reseñas

ESTADOS DE RESERVA: Pendiente → Confirmada → Pagada → En curso → Completada → Cancelada
ESTADOS GUÍA: Activo | Vacaciones | Inactivo
ESTADOS TRANSPORTE: Disponible | En ruta | Mantenimiento | Fuera de servicio

REGLA: Si actualizas un campo de estado, confirma el cambio con el nuevo valor.`,

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

      // ─────────────────────────────────────────────────────────────────────
      // FLUJO 1: Confirmación de Reserva  (afterCreate → Reservas)
      // Envía al cliente confirmación con o sin abono, notifica al equipo
      // ─────────────────────────────────────────────────────────────────────
      const flowConfirmacionId = uuidv4();
      const flowConfirmacion = {
        _id: flowConfirmacionId,
        name: 'Confirmación de Reserva',
        description: 'Envía confirmación automática cuando se crea una nueva reserva',
        icon: 'check',
        color: 'emerald',
        active: true,
        triggerType: 'create',
        triggerTable: reservasTableId,
        workspaceId: WORKSPACE_ID,
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger',
            position: { x: 250, y: 50 },
            data: { label: 'Nueva Reserva', trigger: 'afterCreate', tableId: reservasTableId, tableName: 'Reservas' }
          },
          {
            id: 'cond-abono',
            type: 'condition',
            position: { x: 250, y: 180 },
            data: { label: '¿Tiene abono?', field: 'abono', operator: '>', value: '0' }
          },
          {
            id: 'msg-con-abono',
            type: 'action',
            position: { x: 80, y: 320 },
            data: {
              actionType: 'send_message',
              targetType: 'origin_chat',
              channel: 'chat',
              label: 'Confirmación con abono',
              message: '✅ *Reserva Confirmada*\n\nHola {{cliente}}, tu reserva está lista:\n\n🏝️ Destino: {{destino}}\n📅 Fecha: {{fechaViaje}}\n👥 {{adultos}} adultos, {{ninos}} niños\n📍 Recogida: {{puntoRecogida}}\n\n💰 Total: ${{totalPagar}}\n✔️ Abono recibido: ${{abono}}\n💳 Saldo pendiente: ${{saldo}}\n\n¿Dudas? Escríbenos al 300-123-4567'
            }
          },
          {
            id: 'msg-sin-abono',
            type: 'action',
            position: { x: 420, y: 320 },
            data: {
              actionType: 'send_message',
              targetType: 'origin_chat',
              channel: 'chat',
              label: 'Reserva pendiente pago',
              message: '⏳ *Reserva Registrada*\n\nHola {{cliente}}, tu reserva requiere confirmación de pago:\n\n🏝️ {{destino}} — {{fechaViaje}}\n💰 Total a pagar: ${{totalPagar}}\n\nMétodos de pago:\n• Nequi/Daviplata: 300-123-4567\n• Bancolombia: 123-456789-00\n\nConfirma tu pago en las próximas 24h para asegurar tu cupo. ¡Gracias!'
            }
          },
          {
            id: 'notif-equipo',
            type: 'notification',
            position: { x: 250, y: 470 },
            data: { label: 'Notificar equipo', message: '📋 Nueva reserva: {{cliente}} → {{destino}} el {{fechaViaje}} | Total ${{totalPagar}} | Estado: {{estadoReserva}}' }
          }
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'cond-abono' },
          { id: 'e2', source: 'cond-abono', target: 'msg-con-abono', label: 'Sí' },
          { id: 'e3', source: 'cond-abono', target: 'msg-sin-abono', label: 'No' },
          { id: 'e4', source: 'msg-con-abono', target: 'notif-equipo' },
          { id: 'e5', source: 'msg-sin-abono', target: 'notif-equipo' }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await flowsDb.insert(flowConfirmacion);

      // ─────────────────────────────────────────────────────────────────────
      // FLUJO 2: Bienvenida Cliente  (afterCreate → Clientes)
      // Busca una promo activa y envía bienvenida personalizada
      // ─────────────────────────────────────────────────────────────────────
      const flowBienvenidaId = uuidv4();
      const flowBienvenida = {
        _id: flowBienvenidaId,
        name: 'Bienvenida Cliente',
        description: 'Envía mensaje de bienvenida con promo activa a nuevos clientes',
        icon: 'hand',
        color: 'blue',
        active: true,
        triggerType: 'create',
        triggerTable: clientesTableId,
        workspaceId: WORKSPACE_ID,
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger',
            position: { x: 250, y: 50 },
            data: { label: 'Nuevo Cliente', trigger: 'afterCreate', tableId: clientesTableId, tableName: 'Clientes' }
          },
          {
            id: 'query-promo',
            type: 'query',
            position: { x: 250, y: 180 },
            data: {
              label: 'Buscar promo activa',
              targetTable: promocionesTableId,
              filterField: 'estado',
              filterValueType: 'fixed',
              filterValueFixed: 'Activa',
              outputVar: 'promo'
            }
          },
          {
            id: 'msg-con-promo',
            type: 'action',
            position: { x: 80, y: 330 },
            data: {
              actionType: 'send_message',
              targetType: 'origin_chat',
              channel: 'chat',
              label: 'Bienvenida con promo',
              message: '🎉 *¡Bienvenido a Pasadías Paraíso, {{nombre}}!*\n\nGracias por unirte a nuestra comunidad viajera.\n\n🎟️ Tenemos una oferta especial para ti:\n*{{promo.nombre}}* — usa el código *{{promo.codigo}}* y obtén {{promo.valor}}% de descuento en tu primera reserva.\n\nEscríbenos para elegir tu destino favorito. ¡Te esperamos!'
            }
          },
          {
            id: 'msg-sin-promo',
            type: 'action',
            position: { x: 420, y: 330 },
            data: {
              actionType: 'send_message',
              targetType: 'origin_chat',
              channel: 'chat',
              label: 'Bienvenida sin promo',
              message: '🎉 *¡Bienvenido a Pasadías Paraíso, {{nombre}}!*\n\nGracias por unirte a nuestra comunidad viajera.\n\nNuestros destinos más populares:\n🏖️ Playa Blanca — $89.000\n🏝️ Islas del Rosario — $145.000\n🌊 Río Claro Aventura — $175.000\n\nEscríbenos para reservar. ¡Te esperamos!'
            }
          }
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'query-promo' },
          { id: 'e2', source: 'query-promo', target: 'msg-con-promo', sourceHandle: 'yes' },
          { id: 'e3', source: 'query-promo', target: 'msg-sin-promo', sourceHandle: 'no' }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await flowsDb.insert(flowBienvenida);

      // ─────────────────────────────────────────────────────────────────────
      // FLUJO 3: Solicitar Reseña  (afterUpdate → Reservas)
      // Cuando la reserva se marca Completada, pide reseña al cliente
      // ─────────────────────────────────────────────────────────────────────
      const flowResenaId = uuidv4();
      const flowResena = {
        _id: flowResenaId,
        name: 'Solicitar Reseña',
        description: 'Pide reseña al cliente cuando su reserva se marca como Completada',
        icon: 'star',
        color: 'yellow',
        active: true,
        triggerType: 'update',
        triggerTable: reservasTableId,
        workspaceId: WORKSPACE_ID,
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger',
            position: { x: 250, y: 50 },
            data: { label: 'Reserva actualizada', trigger: 'afterUpdate', tableId: reservasTableId, tableName: 'Reservas' }
          },
          {
            id: 'cond-completada',
            type: 'condition',
            position: { x: 250, y: 180 },
            data: { label: '¿Estado = Completada?', field: 'estadoReserva', operator: '==', value: 'Completada' }
          },
          {
            id: 'msg-resena',
            type: 'action',
            position: { x: 250, y: 330 },
            data: {
              actionType: 'send_message',
              targetType: 'origin_chat',
              channel: 'chat',
              label: 'Pedir reseña',
              message: '⭐ *¿Cómo estuvo tu experiencia, {{cliente}}?*\n\nEsperamos que hayas disfrutado tu pasadía a {{destino}}.\n\nTu opinión nos ayuda a mejorar. ¿Puedes compartir:\n1. ¿Qué fue lo que más te gustó?\n2. Del 1 al 5, ¿cómo calificarías el servicio?\n3. ¿Recomendarías este destino a un amigo?\n\nGracias por viajar con Pasadías Paraíso 🙏'
            }
          }
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'cond-completada' },
          { id: 'e2', source: 'cond-completada', target: 'msg-resena', label: 'Sí' }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await flowsDb.insert(flowResena);

      // ─────────────────────────────────────────────────────────────────────
      // FLUJO 4: Confirmación de Pago  (afterCreate → Pagos)
      // Actualiza la reserva y notifica si el pago está completo o parcial
      // ─────────────────────────────────────────────────────────────────────
      const flowPagoId = uuidv4();
      const flowPago = {
        _id: flowPagoId,
        name: 'Confirmación de Pago',
        description: 'Confirma el pago, actualiza saldo de la reserva y notifica al cliente',
        icon: 'credit-card',
        color: 'green',
        active: true,
        triggerType: 'create',
        triggerTable: pagosTableId,
        workspaceId: WORKSPACE_ID,
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger',
            position: { x: 250, y: 50 },
            data: { label: 'Nuevo Pago', trigger: 'afterCreate', tableId: pagosTableId, tableName: 'Pagos' }
          },
          {
            id: 'query-reserva',
            type: 'query',
            position: { x: 250, y: 180 },
            data: {
              label: 'Buscar reserva',
              targetTable: reservasTableId,
              filterField: 'codigoReserva',
              filterValueType: 'trigger',
              filterValueField: 'reserva',
              outputVar: 'reservaData'
            }
          },
          {
            id: 'cond-pago-completo',
            type: 'condition',
            position: { x: 250, y: 320 },
            data: { label: '¿Pago completa el saldo?', field: 'reservaData.saldo', operator: '<=', value: '{{monto}}' }
          },
          {
            id: 'update-pagada',
            type: 'action',
            position: { x: 80, y: 470 },
            data: {
              actionType: 'update',
              targetTable: reservasTableId,
              targetTableName: 'Reservas',
              filterField: 'codigoReserva',
              filterValueType: 'trigger',
              filterValueField: 'reserva',
              fields: { estadoReserva: 'Pagada', saldo: '0', abono: '{{reservaData.totalPagar}}' }
            }
          },
          {
            id: 'msg-pago-completo',
            type: 'action',
            position: { x: 80, y: 620 },
            data: {
              actionType: 'send_message',
              targetType: 'origin_chat',
              channel: 'chat',
              label: 'Pago 100% confirmado',
              message: '🎉 *¡Reserva 100% Pagada!*\n\nHola {{reservaData.cliente}}, tu reserva está completamente pagada.\n\n🏝️ {{reservaData.destino}}\n📅 {{reservaData.fechaViaje}}\n💰 Total pagado: ${{reservaData.totalPagar}}\n\nSolo queda disfrutar. Recibirás instrucciones el día anterior.\n¡Gracias por tu confianza!'
            }
          },
          {
            id: 'update-abono',
            type: 'action',
            position: { x: 420, y: 470 },
            data: {
              actionType: 'update',
              targetTable: reservasTableId,
              targetTableName: 'Reservas',
              filterField: 'codigoReserva',
              filterValueType: 'trigger',
              filterValueField: 'reserva',
              fields: {
                abono: '{{reservaData.abono + monto}}',
                saldo: '{{reservaData.saldo - monto}}'
              }
            }
          },
          {
            id: 'msg-abono',
            type: 'action',
            position: { x: 420, y: 620 },
            data: {
              actionType: 'send_message',
              targetType: 'origin_chat',
              channel: 'chat',
              label: 'Abono recibido',
              message: '✅ *Abono Recibido*\n\nHola {{reservaData.cliente}}, hemos registrado tu pago de ${{monto}}.\n\n🏝️ {{reservaData.destino}} — {{reservaData.fechaViaje}}\n💳 Saldo pendiente: ${{reservaData.saldo - monto}}\n\nRecuerda completar el pago antes del viaje. ¡Gracias!'
            }
          },
          {
            id: 'notif-sin-reserva',
            type: 'notification',
            position: { x: 250, y: 470 },
            data: { label: 'Reserva no encontrada', message: '⚠️ Pago {{codigoPago}} registrado pero no se encontró la reserva {{reserva}}. Verificar manualmente.' }
          }
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'query-reserva' },
          { id: 'e2', source: 'query-reserva', target: 'cond-pago-completo', sourceHandle: 'yes' },
          { id: 'e3', source: 'query-reserva', target: 'notif-sin-reserva', sourceHandle: 'no' },
          { id: 'e4', source: 'cond-pago-completo', target: 'update-pagada', label: 'Sí' },
          { id: 'e5', source: 'cond-pago-completo', target: 'update-abono', label: 'No' },
          { id: 'e6', source: 'update-pagada', target: 'msg-pago-completo' },
          { id: 'e7', source: 'update-abono', target: 'msg-abono' }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await flowsDb.insert(flowPago);

      // ─────────────────────────────────────────────────────────────────────
      // FLUJO 5: Asignar Guía Disponible  (afterCreate → Reservas)
      // Busca el primer guía Activo y lo asigna a la reserva
      // ─────────────────────────────────────────────────────────────────────
      const flowAsignarGuiaId = uuidv4();
      const flowAsignarGuia = {
        _id: flowAsignarGuiaId,
        name: 'Asignar Guía Disponible',
        description: 'Asigna automáticamente un guía activo a cada nueva reserva',
        icon: 'user-check',
        color: 'teal',
        active: true,
        triggerType: 'create',
        triggerTable: reservasTableId,
        workspaceId: WORKSPACE_ID,
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger',
            position: { x: 250, y: 50 },
            data: { label: 'Nueva Reserva', trigger: 'afterCreate', tableId: reservasTableId, tableName: 'Reservas' }
          },
          {
            id: 'query-guia',
            type: 'query',
            position: { x: 250, y: 180 },
            data: {
              label: 'Buscar guía activo',
              targetTable: guiasTableId,
              filterField: 'estado',
              filterValueType: 'fixed',
              filterValueFixed: 'Activo',
              outputVar: 'guia'
            }
          },
          {
            id: 'update-reserva-guia',
            type: 'action',
            position: { x: 80, y: 330 },
            data: {
              actionType: 'update',
              targetTable: reservasTableId,
              targetTableName: 'Reservas',
              fields: { guiaAsignado: '{{guia.nombre}}', telefonoGuia: '{{guia.telefono}}' }
            }
          },
          {
            id: 'notif-guia-ok',
            type: 'notification',
            position: { x: 80, y: 470 },
            data: { label: 'Guía asignado', message: '✅ Guía {{guia.nombre}} (📱 {{guia.telefono}}) asignado a reserva {{codigoReserva}} — {{cliente}} el {{fechaViaje}}' }
          },
          {
            id: 'notif-sin-guia',
            type: 'notification',
            position: { x: 420, y: 330 },
            data: { label: 'Sin guía disponible', message: '⚠️ Sin guías activos disponibles para la reserva {{codigoReserva}} — {{cliente}} / {{destino}} el {{fechaViaje}}. Asignar manualmente.' }
          }
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'query-guia' },
          { id: 'e2', source: 'query-guia', target: 'update-reserva-guia', sourceHandle: 'yes' },
          { id: 'e3', source: 'query-guia', target: 'notif-sin-guia', sourceHandle: 'no' },
          { id: 'e4', source: 'update-reserva-guia', target: 'notif-guia-ok' }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await flowsDb.insert(flowAsignarGuia);

      // ─────────────────────────────────────────────────────────────────────
      // FLUJO 6: Asignar Transporte  (afterCreate → Reservas)
      // Busca el primer vehículo disponible y lo asigna a la reserva
      // ─────────────────────────────────────────────────────────────────────
      const flowAsignarTransporteId = uuidv4();
      const flowAsignarTransporte = {
        _id: flowAsignarTransporteId,
        name: 'Asignar Transporte',
        description: 'Asigna automáticamente el primer vehículo disponible a cada nueva reserva',
        icon: 'truck',
        color: 'indigo',
        active: true,
        triggerType: 'create',
        triggerTable: reservasTableId,
        workspaceId: WORKSPACE_ID,
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger',
            position: { x: 250, y: 50 },
            data: { label: 'Nueva Reserva', trigger: 'afterCreate', tableId: reservasTableId, tableName: 'Reservas' }
          },
          {
            id: 'query-vehiculo',
            type: 'query',
            position: { x: 250, y: 180 },
            data: {
              label: 'Buscar vehículo disponible',
              targetTable: transporteTableId,
              filterField: 'estado',
              filterValueType: 'fixed',
              filterValueFixed: 'Disponible',
              outputVar: 'vehiculo'
            }
          },
          {
            id: 'update-reserva-transporte',
            type: 'action',
            position: { x: 80, y: 330 },
            data: {
              actionType: 'update',
              targetTable: reservasTableId,
              targetTableName: 'Reservas',
              fields: { transporteAsignado: '{{vehiculo.placa}}', conductorAsignado: '{{vehiculo.conductor}}' }
            }
          },
          {
            id: 'notif-transporte-ok',
            type: 'notification',
            position: { x: 80, y: 470 },
            data: { label: 'Transporte asignado', message: '🚌 Vehículo {{vehiculo.placa}} ({{vehiculo.tipo}}, {{vehiculo.capacidad}} pasajeros) — conductor {{vehiculo.conductor}} asignado a reserva {{codigoReserva}}' }
          },
          {
            id: 'notif-sin-transporte',
            type: 'notification',
            position: { x: 420, y: 330 },
            data: { label: 'Sin transporte disponible', message: '⚠️ Sin vehículos disponibles para reserva {{codigoReserva}} — {{cliente}} / {{destino}} el {{fechaViaje}}. Asignar manualmente.' }
          }
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'query-vehiculo' },
          { id: 'e2', source: 'query-vehiculo', target: 'update-reserva-transporte', sourceHandle: 'yes' },
          { id: 'e3', source: 'query-vehiculo', target: 'notif-sin-transporte', sourceHandle: 'no' },
          { id: 'e4', source: 'update-reserva-transporte', target: 'notif-transporte-ok' }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await flowsDb.insert(flowAsignarTransporte);

      // ─────────────────────────────────────────────────────────────────────
      // FLUJO 7: Validar Código Promo  (beforeCreate → Reservas)
      // Si se ingresa un codigoPromo, verifica que exista y esté Activa
      // ─────────────────────────────────────────────────────────────────────
      const flowValidarPromoId = uuidv4();
      const flowValidarPromo = {
        _id: flowValidarPromoId,
        name: 'Validar Código Promo',
        description: 'Verifica que el código de descuento sea válido y esté activo antes de crear la reserva',
        icon: 'shield-check',
        color: 'orange',
        active: true,
        triggerType: 'beforeCreate',
        triggerTable: reservasTableId,
        workspaceId: WORKSPACE_ID,
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger',
            position: { x: 250, y: 50 },
            data: { label: 'Antes de crear Reserva', trigger: 'beforeCreate', tableId: reservasTableId, tableName: 'Reservas' }
          },
          {
            id: 'cond-tiene-promo',
            type: 'condition',
            position: { x: 250, y: 180 },
            data: { label: '¿Código promo ingresado?', field: 'codigoPromo', operator: '!=', value: '' }
          },
          {
            id: 'query-promo',
            type: 'query',
            position: { x: 80, y: 330 },
            data: {
              label: 'Buscar código en Promociones',
              targetTable: promocionesTableId,
              filterField: 'codigo',
              filterValueType: 'trigger',
              filterValueField: 'codigoPromo',
              outputVar: 'promo'
            }
          },
          {
            id: 'cond-promo-activa',
            type: 'condition',
            position: { x: 80, y: 480 },
            data: { label: '¿Promo Activa?', field: 'promo.estado', operator: '==', value: 'Activa' }
          },
          {
            id: 'error-promo-inactiva',
            type: 'action',
            position: { x: 80, y: 630 },
            data: {
              actionType: 'error',
              message: '❌ El código "{{codigoPromo}}" está vencido o inactivo. Verifica el código e intenta de nuevo, o reserva sin código de descuento.'
            }
          },
          {
            id: 'error-promo-invalida',
            type: 'action',
            position: { x: 350, y: 480 },
            data: {
              actionType: 'error',
              message: '❌ El código de descuento "{{codigoPromo}}" no existe. Por favor verifica el código e intenta de nuevo.'
            }
          }
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'cond-tiene-promo' },
          { id: 'e2', source: 'cond-tiene-promo', target: 'query-promo', label: 'Sí' },
          { id: 'e3', source: 'query-promo', target: 'cond-promo-activa', sourceHandle: 'yes' },
          { id: 'e4', source: 'query-promo', target: 'error-promo-invalida', sourceHandle: 'no' },
          { id: 'e5', source: 'cond-promo-activa', target: 'error-promo-inactiva', label: 'No' }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await flowsDb.insert(flowValidarPromo);

      // ─────────────────────────────────────────────────────────────────────
      // FLUJO 8: Cancelación de Reserva  (afterUpdate → Reservas)
      // Cuando se cancela una reserva, notifica al cliente y al equipo
      // ─────────────────────────────────────────────────────────────────────
      const flowCancelacionId = uuidv4();
      const flowCancelacion = {
        _id: flowCancelacionId,
        name: 'Cancelación de Reserva',
        description: 'Notifica al cliente y al equipo cuando se cancela una reserva',
        icon: 'x-circle',
        color: 'red',
        active: true,
        triggerType: 'update',
        triggerTable: reservasTableId,
        workspaceId: WORKSPACE_ID,
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger',
            position: { x: 250, y: 50 },
            data: { label: 'Reserva actualizada', trigger: 'afterUpdate', tableId: reservasTableId, tableName: 'Reservas' }
          },
          {
            id: 'cond-cancelada',
            type: 'condition',
            position: { x: 250, y: 180 },
            data: { label: '¿Estado = Cancelada?', field: 'estadoReserva', operator: '==', value: 'Cancelada' }
          },
          {
            id: 'msg-cancelacion',
            type: 'action',
            position: { x: 250, y: 330 },
            data: {
              actionType: 'send_message',
              targetType: 'origin_chat',
              channel: 'chat',
              label: 'Notificar cancelación',
              message: '❌ *Reserva Cancelada*\n\nHola {{cliente}}, tu reserva a {{destino}} del {{fechaViaje}} ha sido cancelada.\n\nSi tienes alguna pregunta sobre tu reembolso o quieres reprogramar, escríbenos al 300-123-4567.\n\n¡Esperamos verte pronto!'
            }
          },
          {
            id: 'notif-equipo-cancelacion',
            type: 'notification',
            position: { x: 250, y: 480 },
            data: { label: 'Alerta equipo', message: '🔴 Reserva CANCELADA: {{codigoReserva}} | {{cliente}} / {{destino}} el {{fechaViaje}} | Total: ${{totalPagar}}' }
          }
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'cond-cancelada' },
          { id: 'e2', source: 'cond-cancelada', target: 'msg-cancelacion', label: 'Sí' },
          { id: 'e3', source: 'msg-cancelacion', target: 'notif-equipo-cancelacion' }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await flowsDb.insert(flowCancelacion);

      // ─────────────────────────────────────────────────────────────────────
      // FLUJO 9: Generar Factura Electrónica  (afterCreate → Pagos)
      // Cuando el pago completa el saldo → dispara API de Alegra (demo mock)
      // Guarda número de factura y CUFE en la reserva.
      // En producción: configurar credenciales reales en Integraciones → Alegra
      // ─────────────────────────────────────────────────────────────────────
      const flowFacturaId = uuidv4();
      const flowFactura = {
        _id: flowFacturaId,
        name: 'Generar Factura Electrónica',
        description: 'Cuando el pago queda completo, genera la factura electrónica en Alegra y notifica al cliente con el PDF',
        icon: 'file-text',
        color: 'purple',
        active: false, // inactivo hasta que el cliente configure sus credenciales de Alegra
        triggerType: 'create',
        triggerTable: pagosTableId,
        workspaceId: WORKSPACE_ID,
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger',
            position: { x: 250, y: 50 },
            data: { label: 'Nuevo Pago', trigger: 'afterCreate', tableId: pagosTableId, tableName: 'Pagos' }
          },
          {
            id: 'query-reserva',
            type: 'query',
            position: { x: 250, y: 180 },
            data: {
              label: 'Buscar reserva',
              targetTable: reservasTableId,
              filterField: 'codigoReserva',
              filterValueType: 'trigger',
              filterValueField: 'reserva',
              outputVar: 'reservaData'
            }
          },
          {
            id: 'cond-pago-completo',
            type: 'condition',
            position: { x: 250, y: 320 },
            data: { label: '¿Pago completa el saldo?', field: 'reservaData.saldo', operator: '<=', value: '{{monto}}' }
          },
          {
            // Aplica el fieldMapping guardado en workspace.integrations.externalApis
            // para transformar los datos de la reserva al formato que espera Alegra
            id: 'apply-mapping',
            type: 'action',
            position: { x: 250, y: 470 },
            data: {
              actionType: 'apply_mapping',
              // Mapeo inline de demostración (en producción viene de workspace.integrations)
              mapping: {
                'client.name':           'reservaData.cliente',
                'client.identification': 'reservaData.cedula',
                'client.email':          'reservaData.email',
                'items[0].description':  'reservaData.destino',
                'items[0].price':        'reservaData.totalPagar',
                'items[0].quantity':     '1',
                'date':                  'reservaData.fechaViaje',
                'observations':          'reservaData.codigoReserva',
              },
              outputVar: 'alegraPayload'
            }
          },
          {
            // ⚠️  URL DE DEMOSTRACIÓN — Cambiar por https://api.alegra.com/api/v1/invoices
            // en producción. Las credenciales van en workspace.integrations.externalApis
            id: 'http-alegra',
            type: 'action',
            position: { x: 250, y: 620 },
            data: {
              actionType: 'http_request',
              method: 'POST',
              url: 'https://httpbin.org/post', // ← mock: devuelve lo que recibe
              headers: {
                'Content-Type': 'application/json',
                // En producción: 'Authorization': 'Basic {{workspace.integrations.alegra.credentials}}'
              },
              body: '{{alegraPayload}}',
              outputVar: 'facturaAlegra',
              onError: 'continue', // no romper el flujo si falla la factura
              timeout: 12000
            }
          },
          {
            id: 'notif-factura',
            type: 'notification',
            position: { x: 250, y: 770 },
            data: {
              label: 'Factura generada',
              message: '🧾 Factura generada para reserva {{reservaData.codigoReserva}} — {{reservaData.cliente}}. Estado HTTP: {{facturaAlegra.success}}'
            }
          },
          {
            id: 'msg-factura-cliente',
            type: 'action',
            position: { x: 250, y: 920 },
            data: {
              actionType: 'send_message',
              targetType: 'origin_chat',
              channel: 'chat',
              label: 'Enviar factura al cliente',
              message: '🧾 *¡Factura lista, {{reservaData.cliente}}!*\n\nTu pago de ${{monto}} quedó registrado y tu factura electrónica fue generada.\n\n📋 Reserva: {{reservaData.codigoReserva}}\n🏝️ Destino: {{reservaData.destino}}\n📅 Fecha: {{reservaData.fechaViaje}}\n💰 Total: ${{reservaData.totalPagar}}\n\n¿Necesitas el PDF por email? Escríbenos tu correo. ¡Gracias!'
            }
          },
          {
            id: 'skip-notif',
            type: 'notification',
            position: { x: 500, y: 470 },
            data: {
              label: 'Pago parcial — sin factura',
              message: '💳 Abono de ${{monto}} recibido para reserva {{reserva}}. Factura se generará al completar el pago total.'
            }
          }
        ],
        edges: [
          { id: 'e1', source: 'trigger-1',       target: 'query-reserva' },
          { id: 'e2', source: 'query-reserva',    target: 'cond-pago-completo', sourceHandle: 'yes' },
          { id: 'e3', source: 'query-reserva',    target: 'skip-notif',         sourceHandle: 'no' },
          { id: 'e4', source: 'cond-pago-completo', target: 'apply-mapping',    label: 'Sí' },
          { id: 'e5', source: 'cond-pago-completo', target: 'skip-notif',       label: 'No' },
          { id: 'e6', source: 'apply-mapping',    target: 'http-alegra' },
          { id: 'e7', source: 'http-alegra',      target: 'notif-factura' },
          { id: 'e8', source: 'notif-factura',    target: 'msg-factura-cliente' }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await flowsDb.insert(flowFactura);

      console.log('  ✅ 9 Flujos automatizados creados');
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


