/**
 * Seed PROFESIONAL: La Brasería del Chef
 * 
 * Restaurante de parrilla premium con:
 * - 6 Tablas (Menú, Servicios, Horarios, Clientes, Reservas, Pedidos)
 * - 2 Agentes (Atención al Cliente + Gestión Interna)
 * - Flujos reales de negocio
 */

import { v4 as uuidv4 } from 'uuid';
import { connectDB, getWorkspaceDbName, getWorkspacesDbName, getTableDataDbName, getAgentsDbName, getFlowsDbName } from '../config/db.js';

const WORKSPACE_ID = 'braseria-restaurant';
const WORKSPACE_NAME = 'La Brasería del Chef';

export async function seed() {
  console.log(`\n🔥 [Seed] Iniciando seed para ${WORKSPACE_NAME}...`);
  
  try {
    const workspaceDb = await connectDB(getWorkspaceDbName(WORKSPACE_ID));
    const workspacesDb = await connectDB(getWorkspacesDbName());
    const agentsDb = await connectDB(getAgentsDbName(WORKSPACE_ID));
    const flowsDb = await connectDB(getFlowsDbName(WORKSPACE_ID));
    
    // ══════════════════════════════════════════════════════════════
    // TABLA 1: MENÚ - Carta del restaurante (PÚBLICA)
    // ══════════════════════════════════════════════════════════════
    const menuTableId = uuidv4();
    const menuTable = {
      _id: menuTableId,
      name: 'Menú',
      type: 'catalog',
      displayField: 'nombre',
      description: 'Carta de platos y bebidas',
      permissions: {
        allowQuery: true,
        allowCreate: false,
        allowUpdate: false,
        allowDelete: false
      },
      headers: [
        { key: 'nombre', label: 'Plato', type: 'text', required: true, emoji: '🍖', priority: 1 },
        { key: 'categoria', label: 'Categoría', type: 'select', required: true, emoji: '📂', 
          options: ['Entradas', 'Carnes', 'Pastas', 'Ensaladas', 'Postres', 'Bebidas', 'Vinos'], priority: 2 },
        { key: 'descripcion', label: 'Descripción', type: 'text', required: false, emoji: '📝', priority: 3 },
        { key: 'precio', label: 'Precio', type: 'number', required: true, emoji: '💰', priority: 4, validation: { min: 0 } },
        { key: 'disponible', label: 'Disponible', type: 'select', required: false, emoji: '✅', 
          options: ['Sí', 'No'], defaultValue: 'Sí', hiddenFromChat: true }
      ],
      createdAt: new Date().toISOString()
    };
    await workspaceDb.insert(menuTable);
    console.log('✅ Tabla Menú creada');
    
    // ══════════════════════════════════════════════════════════════
    // TABLA 2: SERVICIOS - Tipos de servicio (PÚBLICA)
    // ══════════════════════════════════════════════════════════════
    const serviciosTableId = uuidv4();
    const serviciosTable = {
      _id: serviciosTableId,
      name: 'Servicios',
      type: 'catalog',
      displayField: 'nombre',
      description: 'Servicios del restaurante',
      permissions: {
        allowQuery: true,
        allowCreate: false,
        allowUpdate: false,
        allowDelete: false
      },
      headers: [
        { key: 'nombre', label: 'Servicio', type: 'text', required: true, emoji: '🍽️', priority: 1 },
        { key: 'horario', label: 'Horario', type: 'text', required: true, emoji: '🕐', priority: 2 },
        { key: 'descripcion', label: 'Descripción', type: 'text', required: false, emoji: '📝', priority: 3 },
        { key: 'precio_minimo', label: 'Consumo mínimo', type: 'number', required: false, emoji: '💵', priority: 4 }
      ],
      createdAt: new Date().toISOString()
    };
    await workspaceDb.insert(serviciosTable);
    console.log('✅ Tabla Servicios creada');
    
    // ══════════════════════════════════════════════════════════════
    // TABLA 3: HORARIOS - Horarios de atención (PÚBLICA)
    // ══════════════════════════════════════════════════════════════
    const horariosTableId = uuidv4();
    const horariosTable = {
      _id: horariosTableId,
      name: 'Horarios',
      type: 'schedule',
      displayField: 'dia',
      description: 'Horarios de atención',
      permissions: {
        allowQuery: true,
        allowCreate: false,
        allowUpdate: false,
        allowDelete: false
      },
      headers: [
        { key: 'dia', label: 'Día', type: 'select', required: true, emoji: '📅',
          options: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'], priority: 1 },
        { key: 'apertura', label: 'Apertura', type: 'time', required: true, emoji: '🌅', priority: 2 },
        { key: 'cierre', label: 'Cierre', type: 'time', required: true, emoji: '🌙', priority: 3 },
        { key: 'cerrado', label: 'Cerrado', type: 'select', required: false, emoji: '🚫',
          options: ['Sí', 'No'], defaultValue: 'No' }
      ],
      createdAt: new Date().toISOString()
    };
    await workspaceDb.insert(horariosTable);
    console.log('✅ Tabla Horarios creada');
    
    // ══════════════════════════════════════════════════════════════
    // TABLA 4: CLIENTES - Base de clientes (PRIVADA)
    // ══════════════════════════════════════════════════════════════
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
        allowUpdate: false,
        allowDelete: false
      },
      headers: [
        { key: 'nombre', label: 'Nombre', type: 'text', required: true, emoji: '👤', priority: 1,
          askMessage: '¿Cuál es tu nombre?' },
        { key: 'telefono', label: 'Teléfono', type: 'phone', required: true, emoji: '📱', priority: 2,
          askMessage: '¿Cuál es tu teléfono?', validation: { digits: 10 } },
        { key: 'email', label: 'Email', type: 'email', required: false, emoji: '📧', priority: 3 },
        { key: 'fechaRegistro', label: 'Fecha Registro', type: 'date', required: false, emoji: '📅',
          defaultValue: 'today', hiddenFromChat: true },
        { key: 'tipo', label: 'Tipo', type: 'select', required: false, emoji: '⭐',
          options: ['Regular', 'VIP', 'Corporativo'], defaultValue: 'Regular', hiddenFromChat: true }
      ],
      createdAt: new Date().toISOString()
    };
    await workspaceDb.insert(clientesTable);
    console.log('✅ Tabla Clientes creada');
    
    // ══════════════════════════════════════════════════════════════
    // TABLA 5: RESERVAS - Reservaciones (PRIVADA)
    // ══════════════════════════════════════════════════════════════
    const reservasTableId = uuidv4();
    const reservasTable = {
      _id: reservasTableId,
      name: 'Reservas',
      type: 'bookings',
      displayField: 'cliente',
      description: 'Reservaciones de mesas',
      permissions: {
        allowQuery: true,
        allowCreate: true,
        allowUpdate: true,  // Para cancelar/modificar
        allowDelete: false
      },
      // Validación de unicidad: no puede haber 2 reservas misma fecha+hora+mesa
      uniqueConstraint: {
        fields: ['fecha', 'hora', 'mesa'],
        excludeWhen: { estado: 'Cancelada' },
        errorMessage: 'Ya hay una reserva para esa mesa a esa hora'
      },
      headers: [
        { key: 'cliente', label: 'Cliente', type: 'relation', required: true, emoji: '👤', priority: 1,
          askMessage: '¿A nombre de quién será la reserva?',
          relation: {
            tableName: 'Clientes',
            displayField: 'nombre',
            searchField: 'nombre',
            autoCreate: true,  // Si no existe, crear cliente
            showOptionsOnNotFound: false
          }
        },
        { key: 'telefono', label: 'Teléfono', type: 'phone', required: true, emoji: '📱', priority: 2,
          askMessage: '¿A qué teléfono te contactamos?', validation: { digits: 10 } },
        { key: 'fecha', label: 'Fecha', type: 'date', required: true, emoji: '📅', priority: 3,
          askMessage: '¿Para qué fecha necesitas la reserva?' },
        { key: 'hora', label: 'Hora', type: 'time', required: true, emoji: '🕐', priority: 4,
          askMessage: '¿A qué hora te gustaría?' },
        { key: 'personas', label: 'Personas', type: 'number', required: true, emoji: '👥', priority: 5,
          askMessage: '¿Para cuántas personas?', validation: { min: 1, max: 20 } },
        { key: 'servicio', label: 'Servicio', type: 'relation', required: true, emoji: '🍽️', priority: 6,
          askMessage: '¿Para qué servicio? (Almuerzo, Cena, etc.)',
          relation: {
            tableName: 'Servicios',
            displayField: 'nombre',
            searchField: 'nombre',
            autoCreate: false,
            showOptionsOnNotFound: true
          }
        },
        { key: 'mesa', label: 'Mesa', type: 'select', required: false, emoji: '🪑', priority: 7,
          options: ['Terraza', 'Salón Principal', 'Privado', 'Barra'], defaultValue: 'Salón Principal' },
        { key: 'notas', label: 'Notas', type: 'text', required: false, emoji: '📝',
          askMessage: '¿Alguna nota especial? (cumpleaños, alergias, etc.)' },
        { key: 'estado', label: 'Estado', type: 'select', required: false, emoji: '📊',
          options: ['Pendiente', 'Confirmada', 'Cancelada', 'Completada'], 
          defaultValue: 'Pendiente', hiddenFromChat: true }
      ],
      createdAt: new Date().toISOString()
    };
    await workspaceDb.insert(reservasTable);
    console.log('✅ Tabla Reservas creada');
    
    // ══════════════════════════════════════════════════════════════
    // TABLA 6: PEDIDOS - Pedidos a domicilio (PRIVADA)
    // ══════════════════════════════════════════════════════════════
    const pedidosTableId = uuidv4();
    const pedidosTable = {
      _id: pedidosTableId,
      name: 'Pedidos',
      type: 'orders',
      displayField: 'cliente',
      description: 'Pedidos a domicilio',
      permissions: {
        allowQuery: true,
        allowCreate: true,
        allowUpdate: true,
        allowDelete: false
      },
      headers: [
        { key: 'cliente', label: 'Cliente', type: 'relation', required: true, emoji: '👤', priority: 1,
          askMessage: '¿A nombre de quién es el pedido?',
          relation: {
            tableName: 'Clientes',
            displayField: 'nombre',
            searchField: 'nombre',
            autoCreate: true
          }
        },
        { key: 'telefono', label: 'Teléfono', type: 'phone', required: true, emoji: '📱', priority: 2,
          askMessage: '¿Teléfono de contacto?', validation: { digits: 10 } },
        { key: 'direccion', label: 'Dirección', type: 'text', required: true, emoji: '📍', priority: 3,
          askMessage: '¿A qué dirección enviamos?' },
        { key: 'platos', label: 'Platos', type: 'text', required: true, emoji: '🍖', priority: 4,
          askMessage: '¿Qué platos deseas ordenar?' },
        { key: 'total', label: 'Total', type: 'number', required: false, emoji: '💰', hiddenFromChat: true },
        { key: 'metodoPago', label: 'Método de Pago', type: 'select', required: true, emoji: '💳', priority: 5,
          options: ['Efectivo', 'Tarjeta', 'Transferencia', 'Nequi/Daviplata'],
          askMessage: '¿Cómo deseas pagar?' },
        { key: 'notas', label: 'Notas', type: 'text', required: false, emoji: '📝' },
        { key: 'estado', label: 'Estado', type: 'select', required: false, emoji: '📊',
          options: ['Recibido', 'Preparando', 'En camino', 'Entregado', 'Cancelado'],
          defaultValue: 'Recibido', hiddenFromChat: true },
        { key: 'fecha', label: 'Fecha', type: 'date', required: false, emoji: '📅',
          defaultValue: 'today', hiddenFromChat: true }
      ],
      createdAt: new Date().toISOString()
    };
    await workspaceDb.insert(pedidosTable);
    console.log('✅ Tabla Pedidos creada');
    
    // ══════════════════════════════════════════════════════════════
    // DATOS DEL MENÚ
    // ══════════════════════════════════════════════════════════════
    const menuDataDb = await connectDB(getTableDataDbName(WORKSPACE_ID, menuTableId));
    const menuItems = [
      // Entradas
      { nombre: 'Chorizo Argentino', categoria: 'Entradas', descripcion: 'Chorizo parrillero con chimichurri', precio: 25000, disponible: 'Sí' },
      { nombre: 'Provoleta', categoria: 'Entradas', descripcion: 'Queso provolone a la parrilla con orégano', precio: 28000, disponible: 'Sí' },
      { nombre: 'Empanadas (3 unid)', categoria: 'Entradas', descripcion: 'Carne, pollo o mixtas', precio: 18000, disponible: 'Sí' },
      { nombre: 'Tabla de Embutidos', categoria: 'Entradas', descripcion: 'Selección de jamones, quesos y aceitunas', precio: 45000, disponible: 'Sí' },
      // Carnes
      { nombre: 'Bife de Chorizo', categoria: 'Carnes', descripcion: '400g de corte premium argentino', precio: 68000, disponible: 'Sí' },
      { nombre: 'Ojo de Bife', categoria: 'Carnes', descripcion: '350g, el corte más tierno', precio: 72000, disponible: 'Sí' },
      { nombre: 'Entraña', categoria: 'Carnes', descripcion: '300g, corte jugoso con sabor intenso', precio: 58000, disponible: 'Sí' },
      { nombre: 'Costilla BBQ', categoria: 'Carnes', descripcion: 'Costilla de res bañada en salsa BBQ', precio: 62000, disponible: 'Sí' },
      { nombre: 'Parrillada para 2', categoria: 'Carnes', descripcion: 'Bife, chorizo, morcilla, entraña y guarniciones', precio: 145000, disponible: 'Sí' },
      { nombre: 'Pollo a la Brasa', categoria: 'Carnes', descripcion: 'Medio pollo marinado a las hierbas', precio: 38000, disponible: 'Sí' },
      // Pastas
      { nombre: 'Ravioles de Carne', categoria: 'Pastas', descripcion: 'Con salsa bolognesa casera', precio: 35000, disponible: 'Sí' },
      { nombre: 'Fetuccini Alfredo', categoria: 'Pastas', descripcion: 'Pasta fresca con crema y parmesano', precio: 32000, disponible: 'Sí' },
      // Ensaladas
      { nombre: 'Ensalada César', categoria: 'Ensaladas', descripcion: 'Lechuga, crutones, parmesano y aderezo césar', precio: 22000, disponible: 'Sí' },
      { nombre: 'Ensalada de la Casa', categoria: 'Ensaladas', descripcion: 'Mixta con tomate, cebolla y aguacate', precio: 18000, disponible: 'Sí' },
      // Postres
      { nombre: 'Flan Casero', categoria: 'Postres', descripcion: 'Con dulce de leche y crema', precio: 15000, disponible: 'Sí' },
      { nombre: 'Tiramisú', categoria: 'Postres', descripcion: 'Receta italiana tradicional', precio: 18000, disponible: 'Sí' },
      { nombre: 'Brownie con Helado', categoria: 'Postres', descripcion: 'Brownie tibio con helado de vainilla', precio: 20000, disponible: 'Sí' },
      // Bebidas
      { nombre: 'Limonada Natural', categoria: 'Bebidas', descripcion: 'Limonada fresca con hierbabuena', precio: 8000, disponible: 'Sí' },
      { nombre: 'Gaseosa', categoria: 'Bebidas', descripcion: 'Coca-Cola, Sprite o Quatro', precio: 6000, disponible: 'Sí' },
      { nombre: 'Agua Mineral', categoria: 'Bebidas', descripcion: 'Con o sin gas', precio: 5000, disponible: 'Sí' },
      { nombre: 'Cerveza Artesanal', categoria: 'Bebidas', descripcion: 'Rubia, roja o negra', precio: 12000, disponible: 'Sí' },
      // Vinos
      { nombre: 'Malbec Reserva', categoria: 'Vinos', descripcion: 'Vino tinto argentino, botella 750ml', precio: 85000, disponible: 'Sí' },
      { nombre: 'Cabernet Sauvignon', categoria: 'Vinos', descripcion: 'Vino tinto chileno, botella 750ml', precio: 75000, disponible: 'Sí' },
      { nombre: 'Copa de Vino', categoria: 'Vinos', descripcion: 'Tinto o blanco de la casa', precio: 18000, disponible: 'Sí' },
    ];
    
    for (const item of menuItems) {
      await menuDataDb.insert({ _id: uuidv4(), ...item, createdAt: new Date().toISOString() });
    }
    console.log(`✅ ${menuItems.length} platos agregados al menú`);
    
    // ══════════════════════════════════════════════════════════════
    // DATOS DE SERVICIOS
    // ══════════════════════════════════════════════════════════════
    const serviciosDataDb = await connectDB(getTableDataDbName(WORKSPACE_ID, serviciosTableId));
    const servicios = [
      { nombre: 'Almuerzo', horario: '12:00 PM - 3:00 PM', descripcion: 'Menú ejecutivo y carta completa', precio_minimo: 0 },
      { nombre: 'Cena', horario: '6:00 PM - 11:00 PM', descripcion: 'Experiencia gastronómica completa', precio_minimo: 0 },
      { nombre: 'Brunch Dominical', horario: '10:00 AM - 2:00 PM (Solo Domingos)', descripcion: 'Buffet + bebida incluida', precio_minimo: 55000 },
      { nombre: 'Eventos Privados', horario: 'Según disponibilidad', descripcion: 'Salón privado para grupos de 10-30 personas', precio_minimo: 500000 },
    ];
    
    for (const s of servicios) {
      await serviciosDataDb.insert({ _id: uuidv4(), ...s, createdAt: new Date().toISOString() });
    }
    console.log(`✅ ${servicios.length} servicios agregados`);
    
    // ══════════════════════════════════════════════════════════════
    // DATOS DE HORARIOS
    // ══════════════════════════════════════════════════════════════
    const horariosDataDb = await connectDB(getTableDataDbName(WORKSPACE_ID, horariosTableId));
    const horarios = [
      { dia: 'Lunes', apertura: '12:00', cierre: '22:00', cerrado: 'No' },
      { dia: 'Martes', apertura: '12:00', cierre: '22:00', cerrado: 'No' },
      { dia: 'Miércoles', apertura: '12:00', cierre: '22:00', cerrado: 'No' },
      { dia: 'Jueves', apertura: '12:00', cierre: '23:00', cerrado: 'No' },
      { dia: 'Viernes', apertura: '12:00', cierre: '00:00', cerrado: 'No' },
      { dia: 'Sábado', apertura: '12:00', cierre: '00:00', cerrado: 'No' },
      { dia: 'Domingo', apertura: '10:00', cierre: '17:00', cerrado: 'No' },
    ];
    
    for (const h of horarios) {
      await horariosDataDb.insert({ _id: uuidv4(), ...h, createdAt: new Date().toISOString() });
    }
    console.log(`✅ Horarios configurados`);
    
    // ══════════════════════════════════════════════════════════════
    // DATOS DE CLIENTES DE EJEMPLO
    // ══════════════════════════════════════════════════════════════
    const clientesDataDb = await connectDB(getTableDataDbName(WORKSPACE_ID, clientesTableId));
    const clientes = [
      { nombre: 'Juan Pérez', telefono: '3001234567', email: 'juan@email.com', tipo: 'VIP', fechaRegistro: '2025-01-15' },
      { nombre: 'María García', telefono: '3109876543', email: 'maria@email.com', tipo: 'Regular', fechaRegistro: '2025-02-01' },
      { nombre: 'Carlos Rodríguez', telefono: '3205551234', email: 'carlos@empresa.com', tipo: 'Corporativo', fechaRegistro: '2025-01-20' },
      { nombre: 'Ana Martínez', telefono: '3157778899', email: 'ana@email.com', tipo: 'VIP', fechaRegistro: '2024-12-10' },
    ];
    
    const clienteIds = {};
    for (const c of clientes) {
      const id = uuidv4();
      clienteIds[c.nombre] = id;
      await clientesDataDb.insert({ _id: id, ...c, createdAt: new Date().toISOString() });
    }
    console.log(`✅ ${clientes.length} clientes de ejemplo agregados`);
    
    // ══════════════════════════════════════════════════════════════
    // DATOS DE RESERVAS DE EJEMPLO
    // ══════════════════════════════════════════════════════════════
    const reservasDataDb = await connectDB(getTableDataDbName(WORKSPACE_ID, reservasTableId));
    const reservas = [
      { cliente: 'Juan Pérez', telefono: '3001234567', fecha: '2026-02-14', hora: '20:00', personas: 2, servicio: 'Cena', mesa: 'Privado', notas: 'Aniversario - decoración especial', estado: 'Confirmada' },
      { cliente: 'Carlos Rodríguez', telefono: '3205551234', fecha: '2026-02-15', hora: '13:00', personas: 8, servicio: 'Almuerzo', mesa: 'Salón Principal', notas: 'Reunión de trabajo', estado: 'Confirmada' },
      { cliente: 'María García', telefono: '3109876543', fecha: '2026-02-16', hora: '12:30', personas: 4, servicio: 'Brunch Dominical', mesa: 'Terraza', notas: '', estado: 'Pendiente' },
    ];
    
    for (const r of reservas) {
      await reservasDataDb.insert({ _id: uuidv4(), ...r, createdAt: new Date().toISOString() });
    }
    console.log(`✅ ${reservas.length} reservas de ejemplo agregadas`);
    
    // ══════════════════════════════════════════════════════════════
    // DATOS DE PEDIDOS DE EJEMPLO
    // ══════════════════════════════════════════════════════════════
    const pedidosDataDb = await connectDB(getTableDataDbName(WORKSPACE_ID, pedidosTableId));
    const pedidos = [
      { cliente: 'Ana Martínez', telefono: '3157778899', direccion: 'Calle 80 #45-23, Apto 501', platos: 'Parrillada para 2, Limonada x2', total: 161000, metodoPago: 'Tarjeta', estado: 'Entregado', fecha: '2026-02-10' },
      { cliente: 'Juan Pérez', telefono: '3001234567', direccion: 'Carrera 15 #93-12', platos: 'Bife de Chorizo, Ensalada César, Copa de Vino', total: 108000, metodoPago: 'Nequi/Daviplata', estado: 'En camino', fecha: '2026-02-12' },
    ];
    
    for (const p of pedidos) {
      await pedidosDataDb.insert({ _id: uuidv4(), ...p, createdAt: new Date().toISOString() });
    }
    console.log(`✅ ${pedidos.length} pedidos de ejemplo agregados`);
    
    // ══════════════════════════════════════════════════════════════
    // AGENTE 1: ATENCIÓN AL CLIENTE (WhatsApp/Web)
    // ══════════════════════════════════════════════════════════════
    const agentClienteId = uuidv4();
    const agentCliente = {
      _id: agentClienteId,
      type: 'agent',
      name: 'Chef Virtual',
      description: 'Asistente para clientes - reservas, menú y pedidos',
      tables: [
        { tableId: menuTableId, fullAccess: true },      // Menú: todos ven todo
        { tableId: serviciosTableId, fullAccess: true }, // Servicios: todos ven todo
        { tableId: horariosTableId, fullAccess: true },  // Horarios: todos ven todo
        { tableId: clientesTableId, fullAccess: false }, // Clientes: solo su registro
        { tableId: reservasTableId, fullAccess: false }, // Reservas: solo sus reservas
        { tableId: pedidosTableId, fullAccess: false },  // Pedidos: solo sus pedidos
      ],
      prompt: `Eres el Chef Virtual de **${WORKSPACE_NAME}** 🔥, un restaurante de parrilla premium.

PERSONALIDAD:
- Amable, profesional y con pasión por la buena comida
- Usa emojis apropiados pero sin exagerar
- Respuestas concisas y útiles

INFORMACIÓN DEL RESTAURANTE:
- Especialidad: Carnes a la parrilla estilo argentino
- Ubicación: Zona Gourmet, Centro Comercial Premium
- Contacto: 601-555-1234

QUÉ PUEDES HACER:
1. 📋 Mostrar el MENÚ y recomendar platos
2. 📅 Hacer RESERVAS de mesa
3. 🛵 Tomar PEDIDOS a domicilio
4. 🕐 Informar HORARIOS y servicios
5. ❓ Responder preguntas sobre el restaurante

REGLAS IMPORTANTES:
1. Si preguntan por el menú, muestra los platos con precios
2. Para reservas, necesitas: nombre, teléfono, fecha, hora, personas, servicio
3. Para pedidos, necesitas: nombre, teléfono, dirección, platos, método de pago
4. Valida que el servicio exista (Almuerzo, Cena, Brunch Dominical, Eventos)
5. Confirma todos los datos antes de crear reserva/pedido

RECOMENDACIONES:
- Para parejas: Privado + Cena
- Para grupos grandes: Salón Principal
- Domingos: Recomienda el Brunch
- Platos estrella: Parrillada para 2, Bife de Chorizo, Ojo de Bife

RESPUESTAS DE EJEMPLO:
- "¡Hola! 🔥 Bienvenido a La Brasería del Chef. ¿En qué puedo ayudarte hoy?"
- "Nuestro Bife de Chorizo es espectacular, 400g de puro sabor argentino 🥩"
- "¡Perfecto! Tu reserva está confirmada. ¡Te esperamos! 🍽️"`,
      aiModel: ['gpt-4o-mini'],
      useFlows: true,
      hasFlows: true,
      responseTemplates: {
        greeting: '¡Hola! 🔥 Bienvenido a **La Brasería del Chef**.\n\n¿En qué puedo ayudarte?\n• 📋 Ver menú\n• 📅 Hacer reserva\n• 🛵 Pedir a domicilio\n• 🕐 Consultar horarios',
        createSuccess: '✅ **¡Listo!**\n\n{{emoji}} {{cliente}}\n📱 {{telefono}}\n📅 {{fecha}}\n🕐 {{hora}}\n👥 {{personas}} personas\n🍽️ {{servicio}}\n🪑 {{mesa}}\n\n¡Te esperamos! 🔥',
      },
      createdAt: new Date().toISOString()
    };
    await agentsDb.insert(agentCliente);
    console.log('✅ Agente "Chef Virtual" creado');
    
    // ══════════════════════════════════════════════════════════════
    // AGENTE 2: GESTIÓN INTERNA (Dashboard)
    // ══════════════════════════════════════════════════════════════
    const agentInternoId = uuidv4();
    const agentInterno = {
      _id: agentInternoId,
      type: 'agent',
      name: 'Asistente de Gestión',
      description: 'Panel interno para administrar el restaurante',
      tables: [
        { tableId: menuTableId, fullAccess: true },
        { tableId: serviciosTableId, fullAccess: true },
        { tableId: horariosTableId, fullAccess: true },
        { tableId: clientesTableId, fullAccess: true },   // Ve TODOS los clientes
        { tableId: reservasTableId, fullAccess: true },   // Ve TODAS las reservas
        { tableId: pedidosTableId, fullAccess: true },    // Ve TODOS los pedidos
      ],
      prompt: `Eres el asistente de gestión interna de **${WORKSPACE_NAME}**.

Tu rol es ayudar al personal del restaurante a:
1. Ver y gestionar RESERVAS del día/semana
2. Ver y actualizar estado de PEDIDOS
3. Consultar información de CLIENTES
4. Ver estadísticas (cuántas reservas, pedidos, etc.)

COMANDOS ÚTILES:
- "Reservas de hoy" → Lista reservas del día
- "Pedidos pendientes" → Pedidos sin entregar
- "Clientes VIP" → Lista de clientes VIP
- "Cancelar reserva de [nombre]" → Actualiza estado a Cancelada

Responde de forma profesional y directa. 
Cuando muestres datos, usa formato tabla si hay varios registros.`,
      aiModel: ['gpt-4o-mini'],
      useFlows: true,
      hasFlows: true,
      createdAt: new Date().toISOString()
    };
    await agentsDb.insert(agentInterno);
    console.log('✅ Agente "Asistente de Gestión" creado');
    
    // ══════════════════════════════════════════════════════════════
    // REGISTRAR WORKSPACE
    // ══════════════════════════════════════════════════════════════
    try {
      const existing = await workspacesDb.get(WORKSPACE_ID);
      await workspacesDb.insert({ ...existing, name: WORKSPACE_NAME, updatedAt: new Date().toISOString() });
    } catch (e) {
      await workspacesDb.insert({
        _id: WORKSPACE_ID,
        name: WORKSPACE_NAME,
        description: 'Restaurante de parrilla premium',
        createdAt: new Date().toISOString()
      });
    }
    console.log('✅ Workspace registrado');
    
    console.log(`\n🔥 ¡Seed "${WORKSPACE_NAME}" completado exitosamente!`);
    console.log(`\n📊 Resumen:`);
    console.log(`   • 6 tablas creadas`);
    console.log(`   • ${menuItems.length} platos en el menú`);
    console.log(`   • ${servicios.length} servicios`);
    console.log(`   • ${clientes.length} clientes de ejemplo`);
    console.log(`   • 2 agentes:`);
    console.log(`     - Chef Virtual: Menú/Servicios/Horarios=Todo, Reservas/Pedidos=Filtrado`);
    console.log(`     - Asistente Gestión: Todo=Acceso completo`);
    
    return { success: true, workspaceId: WORKSPACE_ID };
    
  } catch (error) {
    console.error('❌ Error en seed:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (process.argv[1].includes('braseria-restaurant')) {
  seed().then(() => process.exit(0)).catch(() => process.exit(1));
}
