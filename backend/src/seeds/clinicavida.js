/**
 * Seed: ClínicaVida 🏥
 * Centro médico multiespecialista — Bogotá
 *
 * Tablas: Pacientes, Médicos, Especialidades, Citas, HorariosDisponibles, Exámenes, Recordatorios
 * Agentes: 2 (Recepcionista IA, Analista Clínico)
 * Flujos: 4 (Agendar Cita, Recordatorio 24h, Cancelación, Examen Listo)
 * Datos: ~80 pacientes, 4 médicos, ~50 citas, ~30 exámenes — generados con helpers aleatorios
 */

import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import {
  connectDB, getWorkspaceDbName, getWorkspacesDbName,
  getTableDataDbName, getAgentsDbName, getFlowsDbName, getDbPrefix,
} from '../config/db.js';

const WORKSPACE_ID   = 'clinicavida';
const WORKSPACE_NAME = 'ClínicaVida 🏥';

// ─── Helpers de generación aleatoria ───────────────────────────────────────
const pick  = arr => arr[Math.floor(Math.random() * arr.length)];
const range = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pad   = n => String(n).padStart(2, '0');
const isoDate = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

const NOMBRES_F = ['Laura','Sofia','Valentina','Isabella','Camila','Daniela','María','Paula','Andrea','Natalia','Juliana','Diana','Paola','Ana','Sandra','Claudia','Mariana','Catalina','Sara','Luisa'];
const NOMBRES_M = ['Carlos','Andrés','Juan','David','Santiago','Felipe','Jorge','Miguel','Luis','Javier','Alejandro','Diego','Sebastián','Ricardo','Mauricio','Daniel','Oscar','Hernán','Fabio','Camilo'];
const APELLIDOS = ['García','Rodríguez','González','López','Martínez','Pérez','Gómez','Herrera','Torres','Vargas','Castro','Moreno','Ortiz','Ramírez','Jiménez','Díaz','Rojas','Cruz','Silva','Reyes','Ramos','Sánchez','Mendoza','Nieto','Blanco'];
const BARRIOS   = ['Chapinero','Usaquén','Suba','Kennedy','Bosa','Fontibón','Teusaquillo','Candelaria','Santa Bárbara','Rosales','Chico','Galerías','Palermo','Modelia','Cedritos'];
const EPS_LIST  = ['Sura','Compensar','Nueva EPS','Famisanar','Salud Total','Sanitas','Coosalud','Aliansalud','Coomeva','Particular'];

function genNombre(sexo) {
  const n = sexo === 'F' ? pick(NOMBRES_F) : pick(NOMBRES_M);
  return `${n} ${pick(APELLIDOS)} ${pick(APELLIDOS)}`;
}
function genCedula() { return String(range(10000000, 1099999999)); }
function genTel()    { return `3${range(0,2)}${range(10000000,99999999)}`; }
function genEmail(nombre) {
  return `${nombre.split(' ')[0].toLowerCase()}.${nombre.split(' ')[1].toLowerCase()}${range(10,99)}@gmail.com`;
}
function genFechaNac() {
  return isoDate(range(1950, 2005), range(1, 12), range(1, 28));
}
function edad(fechaNac) {
  return 2026 - parseInt(fechaNac.slice(0, 4));
}
function dateOffset(days) {
  const d = new Date('2026-03-05');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function timeSlot() {
  const hour = pick([7,8,9,10,11,14,15,16,17]);
  const min  = pick([0, 15, 30, 45]);
  return `${pad(hour)}:${pad(min)}`;
}

async function tableExists(db, name) {
  try {
    const r = await db.list({ include_docs: true });
    return r.rows.some(x => x.doc && x.doc.name === name && x.doc.headers);
  } catch { return false; }
}

// ─── SEED ──────────────────────────────────────────────────────────────────
export async function seed() {
  console.log(`\n[Seed] Iniciando seed CLINICAVIDA para ${WORKSPACE_NAME}...`);
  try {
    const workspaceDb  = await connectDB(getWorkspaceDbName(WORKSPACE_ID));
    const workspacesDb = await connectDB(getWorkspacesDbName());
    const agentsDb     = await connectDB(getAgentsDbName(WORKSPACE_ID));
    const flowsDb      = await connectDB(getFlowsDbName(WORKSPACE_ID));

    if (await tableExists(workspaceDb, 'Pacientes')) {
      console.log('  ⏭️  Workspace ya tiene datos, saltando...');
      return;
    }

    // ══════════════════════════════════════════
    // TABLAS
    // ══════════════════════════════════════════

    const pacientesId     = uuidv4();
    const medicosId       = uuidv4();
    const especialidadesId = uuidv4();
    const citasId         = uuidv4();
    const horariosId      = uuidv4();
    const examenesId      = uuidv4();
    const recordatoriosId = uuidv4();

    await workspaceDb.insert({
      _id: pacientesId, name: 'Pacientes', type: 'patients', displayField: 'nombre',
      description: 'Registro de pacientes de ClínicaVida',
      permissions: { allowQuery: true, allowCreate: true, allowUpdate: true, allowDelete: false },
      headers: [
        { key: 'nombre',       label: 'Nombre completo', type: 'text',   required: true,  emoji: '👤', priority: 1 },
        { key: 'cedula',       label: 'Cédula',          type: 'text',   required: true,  emoji: '🪪', priority: 2 },
        { key: 'telefono',     label: 'Teléfono',        type: 'phone',  required: true,  emoji: '📱', priority: 3 },
        { key: 'email',        label: 'Email',           type: 'email',  required: false, emoji: '📧', priority: 4 },
        { key: 'fechaNac',     label: 'Fecha Nacimiento',type: 'date',   required: true,  emoji: '🎂', priority: 5 },
        { key: 'sexo',         label: 'Sexo',            type: 'select', required: true,  emoji: '⚥',  options: ['Femenino','Masculino','Otro'] },
        { key: 'eps',          label: 'EPS / Seguro',    type: 'select', required: true,  emoji: '🏥', options: EPS_LIST },
        { key: 'tipoAfiliacion', label: 'Afiliación',   type: 'select', required: true,  emoji: '📋', options: ['Contribuyente','Beneficiario','Subsidiado','Particular'], defaultValue: 'Contribuyente' },
        { key: 'barrio',       label: 'Barrio',          type: 'text',   required: false, emoji: '📍' },
        { key: 'ciudad',       label: 'Ciudad',          type: 'select', required: true,  emoji: '🏙️', options: ['Bogotá','Otro'], defaultValue: 'Bogotá' },
        { key: 'antecedentes', label: 'Antecedentes',    type: 'text',   required: false, emoji: '📝' },
        { key: 'activo',       label: 'Activo',          type: 'select', required: true,  emoji: '✅', options: ['Sí','No'], defaultValue: 'Sí' },
      ],
      createdAt: new Date().toISOString(),
    });

    await workspaceDb.insert({
      _id: especialidadesId, name: 'Especialidades', type: 'catalog', displayField: 'nombre',
      permissions: { allowQuery: true, allowCreate: false, allowUpdate: false, allowDelete: false },
      headers: [
        { key: 'nombre',      label: 'Especialidad', type: 'text',   required: true,  emoji: '🩺', priority: 1 },
        { key: 'descripcion', label: 'Descripción',  type: 'text',   required: false, emoji: '📝' },
        { key: 'duracionMin', label: 'Duración (min)',type: 'number', required: true,  emoji: '⏱️', defaultValue: 20 },
        { key: 'valorCoperta',label: 'Copago COP',   type: 'number', required: false, emoji: '💰', defaultValue: 0 },
        { key: 'valorParticular', label: 'Particular COP', type: 'number', required: false, emoji: '💵', defaultValue: 0 },
      ],
      createdAt: new Date().toISOString(),
    });

    await workspaceDb.insert({
      _id: medicosId, name: 'Médicos', type: 'staff', displayField: 'nombre',
      permissions: { allowQuery: true, allowCreate: false, allowUpdate: true, allowDelete: false },
      headers: [
        { key: 'nombre',        label: 'Nombre',        type: 'text',   required: true,  emoji: '👨‍⚕️', priority: 1 },
        { key: 'especialidad',  label: 'Especialidad',  type: 'text',   required: true,  emoji: '🩺', priority: 2 },
        { key: 'registro',      label: 'Registro médico',type: 'text',  required: true,  emoji: '🪪' },
        { key: 'telefono',      label: 'Teléfono',      type: 'phone',  required: true,  emoji: '📱' },
        { key: 'email',         label: 'Email',         type: 'email',  required: true,  emoji: '📧' },
        { key: 'consultorio',   label: 'Consultorio',   type: 'text',   required: true,  emoji: '🚪', priority: 3 },
        { key: 'diasAtencion',  label: 'Días atención', type: 'text',   required: true,  emoji: '📅' },
        { key: 'horaInicio',    label: 'Hora inicio',   type: 'text',   required: true,  emoji: '🕗', defaultValue: '07:00' },
        { key: 'horaFin',       label: 'Hora fin',      type: 'text',   required: true,  emoji: '🕔', defaultValue: '17:00' },
      ],
      createdAt: new Date().toISOString(),
    });

    await workspaceDb.insert({
      _id: citasId, name: 'Citas', type: 'appointments', displayField: 'paciente',
      permissions: { allowQuery: true, allowCreate: true, allowUpdate: true, allowDelete: false },
      headers: [
        { key: 'paciente',      label: 'Paciente',       type: 'text',   required: true,  emoji: '👤', priority: 1 },
        { key: 'cedula',        label: 'Cédula',         type: 'text',   required: true,  emoji: '🪪', priority: 2 },
        { key: 'telefono',      label: 'Teléfono',       type: 'phone',  required: true,  emoji: '📱', priority: 3 },
        { key: 'medico',        label: 'Médico',         type: 'text',   required: true,  emoji: '👨‍⚕️',priority: 4 },
        { key: 'especialidad',  label: 'Especialidad',   type: 'text',   required: true,  emoji: '🩺', priority: 5 },
        { key: 'fecha',         label: 'Fecha',          type: 'date',   required: true,  emoji: '📅', priority: 6 },
        { key: 'hora',          label: 'Hora',           type: 'text',   required: true,  emoji: '🕐', priority: 7 },
        { key: 'consultorio',   label: 'Consultorio',    type: 'text',   required: true,  emoji: '🚪' },
        { key: 'motivo',        label: 'Motivo consulta',type: 'text',   required: true,  emoji: '📋' },
        { key: 'eps',           label: 'EPS',            type: 'text',   required: false, emoji: '🏥' },
        { key: 'estado',        label: 'Estado',         type: 'select', required: true,  emoji: '📊', options: ['Programada','Confirmada','En consulta','Atendida','Cancelada','No asistió'], defaultValue: 'Programada', priority: 8 },
        { key: 'notas',         label: 'Notas',          type: 'text',   required: false, emoji: '📝' },
        { key: 'recordatorioEnviado', label: 'Recordatorio enviado', type: 'select', options: ['Sí','No'], defaultValue: 'No' },
      ],
      createdAt: new Date().toISOString(),
    });

    await workspaceDb.insert({
      _id: horariosId, name: 'HorariosDisponibles', type: 'schedule', displayField: 'medico',
      permissions: { allowQuery: true, allowCreate: false, allowUpdate: true, allowDelete: false },
      headers: [
        { key: 'medico',       label: 'Médico',       type: 'text',   required: true,  emoji: '👨‍⚕️', priority: 1 },
        { key: 'especialidad', label: 'Especialidad', type: 'text',   required: true,  emoji: '🩺',  priority: 2 },
        { key: 'fecha',        label: 'Fecha',        type: 'date',   required: true,  emoji: '📅',  priority: 3 },
        { key: 'hora',         label: 'Hora',         type: 'text',   required: true,  emoji: '🕐',  priority: 4 },
        { key: 'disponible',   label: 'Disponible',   type: 'select', required: true,  emoji: '✅',  options: ['Sí','No'], defaultValue: 'Sí' },
        { key: 'citaId',       label: 'ID Cita',      type: 'text',   required: false, emoji: '🔗' },
      ],
      createdAt: new Date().toISOString(),
    });

    await workspaceDb.insert({
      _id: examenesId, name: 'Exámenes', type: 'labs', displayField: 'paciente',
      permissions: { allowQuery: true, allowCreate: true, allowUpdate: true, allowDelete: false },
      headers: [
        { key: 'paciente',    label: 'Paciente',       type: 'text',   required: true,  emoji: '👤', priority: 1 },
        { key: 'cedula',      label: 'Cédula',         type: 'text',   required: true,  emoji: '🪪', priority: 2 },
        { key: 'telefono',    label: 'Teléfono',       type: 'phone',  required: true,  emoji: '📱', priority: 3 },
        { key: 'tipoExamen',  label: 'Tipo de examen', type: 'select', required: true,  emoji: '🔬', priority: 4, options: ['Hemograma','Glicemia','Perfil lipídico','Orina parcial','Coprológico','TSH','Creatinina','Rx Tórax','Ecografía','EKG','Espirometría','Otro'] },
        { key: 'medico',      label: 'Médico',         type: 'text',   required: true,  emoji: '👨‍⚕️' },
        { key: 'fechaPedido', label: 'Fecha pedido',   type: 'date',   required: true,  emoji: '📅', priority: 5 },
        { key: 'fechaResult', label: 'Fecha resultado',type: 'date',   required: false, emoji: '📆' },
        { key: 'estado',      label: 'Estado',         type: 'select', required: true,  emoji: '📊', options: ['Pendiente','Procesando','Listo','Entregado'], defaultValue: 'Pendiente', priority: 6 },
        { key: 'resultado',   label: 'Resultado',      type: 'text',   required: false, emoji: '📋' },
        { key: 'notificado',  label: 'Paciente notificado', type: 'select', options: ['Sí','No'], defaultValue: 'No' },
      ],
      createdAt: new Date().toISOString(),
    });

    await workspaceDb.insert({
      _id: recordatoriosId, name: 'Recordatorios', type: 'reminders', displayField: 'paciente',
      permissions: { allowQuery: true, allowCreate: true, allowUpdate: true, allowDelete: false },
      headers: [
        { key: 'paciente',   label: 'Paciente',  type: 'text',   required: true,  emoji: '👤', priority: 1 },
        { key: 'telefono',   label: 'Teléfono',  type: 'phone',  required: true,  emoji: '📱', priority: 2 },
        { key: 'fechaCita',  label: 'Fecha Cita',type: 'date',   required: true,  emoji: '📅', priority: 3 },
        { key: 'horaCita',   label: 'Hora Cita', type: 'text',   required: true,  emoji: '🕐', priority: 4 },
        { key: 'medico',     label: 'Médico',    type: 'text',   required: true,  emoji: '👨‍⚕️' },
        { key: 'canal',      label: 'Canal',     type: 'select', required: true,  emoji: '📲', options: ['WhatsApp','Email','Llamada'], defaultValue: 'WhatsApp' },
        { key: 'estado',     label: 'Estado',    type: 'select', required: true,  emoji: '📊', options: ['Pendiente','Enviado','Fallido'], defaultValue: 'Pendiente' },
        { key: 'enviadoEn',  label: 'Enviado en',type: 'text',   required: false, emoji: '⏰' },
      ],
      createdAt: new Date().toISOString(),
    });

    console.log('✅ 7 tablas creadas');

    // ══════════════════════════════════════════
    // DATOS ESTÁTICOS: Especialidades y Médicos
    // ══════════════════════════════════════════
    const espDb   = await connectDB(getTableDataDbName(WORKSPACE_ID, especialidadesId));
    const espData = [
      { nombre: 'Medicina General',       descripcion: 'Consulta general y preventiva',        duracionMin: 20, valorCoperta: 5600,  valorParticular: 60000  },
      { nombre: 'Cardiología',            descripcion: 'Diagnóstico y tratamiento cardiovascular',duracionMin: 30, valorCoperta: 12000, valorParticular: 150000 },
      { nombre: 'Ginecología',            descripcion: 'Salud femenina y control prenatal',      duracionMin: 25, valorCoperta: 10000, valorParticular: 120000 },
      { nombre: 'Pediatría',              descripcion: 'Atención médica para niños',             duracionMin: 20, valorCoperta: 7000,  valorParticular: 80000  },
      { nombre: 'Ortopedia',              descripcion: 'Huesos, músculos y articulaciones',      duracionMin: 30, valorCoperta: 12000, valorParticular: 140000 },
      { nombre: 'Dermatología',           descripcion: 'Enfermedades de la piel',               duracionMin: 20, valorCoperta: 10000, valorParticular: 110000 },
    ];
    const espIds = {};
    for (const e of espData) {
      const id = uuidv4();
      espIds[e.nombre] = id;
      await espDb.insert({ _id: id, tableId: especialidadesId, ...e, createdAt: new Date().toISOString() });
    }

    const medicosDb  = await connectDB(getTableDataDbName(WORKSPACE_ID, medicosId));
    const medicosData = [
      { nombre: 'Dr. Rodrigo Vargas',      especialidad: 'Medicina General', registro: 'RM-20451', telefono: '3001112233', email: 'r.vargas@clinicavida.co', consultorio: 'Cons. 101', diasAtencion: 'Lunes a Viernes', horaInicio: '07:00', horaFin: '17:00' },
      { nombre: 'Dra. Patricia Morales',   especialidad: 'Cardiología',       registro: 'RM-31872', telefono: '3113334455', email: 'p.morales@clinicavida.co', consultorio: 'Cons. 201', diasAtencion: 'Lunes, Miércoles y Viernes', horaInicio: '08:00', horaFin: '16:00' },
      { nombre: 'Dra. Lucía Fernández',    especialidad: 'Ginecología',       registro: 'RM-44521', telefono: '3225556677', email: 'l.fernandez@clinicavida.co', consultorio: 'Cons. 301', diasAtencion: 'Martes, Jueves y Sábado', horaInicio: '07:00', horaFin: '15:00' },
      { nombre: 'Dr. Camilo Suárez',       especialidad: 'Pediatría',         registro: 'RM-57893', telefono: '3157778899', email: 'c.suarez@clinicavida.co', consultorio: 'Cons. 102', diasAtencion: 'Lunes a Sábado', horaInicio: '08:00', horaFin: '18:00' },
    ];
    const medicoIds = [];
    for (const m of medicosData) {
      const id = uuidv4();
      medicoIds.push({ id, ...m });
      await medicosDb.insert({ _id: id, tableId: medicosId, ...m, createdAt: new Date().toISOString() });
    }
    console.log('✅ Especialidades y Médicos creados');

    // ══════════════════════════════════════════
    // DATOS GENERADOS: Pacientes (80)
    // ══════════════════════════════════════════
    const pacientesDb = await connectDB(getTableDataDbName(WORKSPACE_ID, pacientesId));
    const pacientesArr = [];
    for (let i = 0; i < 80; i++) {
      const sexo    = pick(['F','M']);
      const nombre  = genNombre(sexo);
      const fechaNac= genFechaNac();
      const p = {
        nombre, cedula: genCedula(), telefono: genTel(),
        email: genEmail(nombre), fechaNac, sexo: sexo === 'F' ? 'Femenino' : 'Masculino',
        eps: pick(EPS_LIST),
        tipoAfiliacion: pick(['Contribuyente','Beneficiario','Subsidiado','Particular']),
        barrio: pick(BARRIOS), ciudad: 'Bogotá',
        antecedentes: pick(['Ninguno','HTA','Diabetes tipo 2','Asma','Hipotiroidismo','Ninguno','Ninguno','Ninguno']),
        activo: 'Sí',
      };
      pacientesArr.push(p);
      await pacientesDb.insert({ _id: uuidv4(), tableId: pacientesId, ...p, createdAt: new Date().toISOString() });
    }
    console.log(`✅ ${pacientesArr.length} pacientes generados`);

    // ══════════════════════════════════════════
    // DATOS GENERADOS: Citas (52)
    // ══════════════════════════════════════════
    const citasDb    = await connectDB(getTableDataDbName(WORKSPACE_ID, citasId));
    const recordDb   = await connectDB(getTableDataDbName(WORKSPACE_ID, recordatoriosId));
    const horariosDb = await connectDB(getTableDataDbName(WORKSPACE_ID, horariosId));

    const MOTIVOS = ['Control rutinario','Dolor de cabeza persistente','Revisión de resultados','Chequeo general','Dolor abdominal','Control hipertensión','Vacunación','Consulta preventiva','Fiebre y malestar','Control post-operatorio','Dificultad respiratoria','Control embarazo','Erupción cutánea'];
    const ESTADOS_PASADOS = ['Atendida','Atendida','Atendida','No asistió','Cancelada'];
    const ESTADOS_FUTUROS = ['Programada','Confirmada','Programada','Programada'];

    let citasCreadas = 0;
    for (let i = 0; i < 52; i++) {
      const pac    = pick(pacientesArr);
      const medico = pick(medicosData);
      const offset = range(-10, 14); // pasadas y futuras
      const fecha  = dateOffset(offset);
      const hora   = timeSlot();
      const estado = offset < 0 ? pick(ESTADOS_PASADOS) : pick(ESTADOS_FUTUROS);
      const c = {
        paciente: pac.nombre, cedula: pac.cedula, telefono: pac.telefono,
        medico: medico.nombre, especialidad: medico.especialidad,
        fecha, hora, consultorio: medico.consultorio,
        motivo: pick(MOTIVOS), eps: pac.eps, estado, notas: '',
        recordatorioEnviado: offset < 1 ? 'Sí' : 'No',
      };
      await citasDb.insert({ _id: uuidv4(), tableId: citasId, ...c, createdAt: new Date().toISOString() });

      // Recordatorio para citas futuras confirmadas
      if (offset >= 0 && offset <= 3 && (estado === 'Confirmada' || estado === 'Programada')) {
        await recordDb.insert({
          _id: uuidv4(), tableId: recordatoriosId,
          paciente: pac.nombre, telefono: pac.telefono,
          fechaCita: fecha, horaCita: hora, medico: medico.nombre,
          canal: pick(['WhatsApp','Email']),
          estado: offset === 0 ? 'Enviado' : 'Pendiente',
          enviadoEn: offset === 0 ? new Date().toISOString() : '',
          createdAt: new Date().toISOString(),
        });
      }

      // Horario bloqueado
      await horariosDb.insert({
        _id: uuidv4(), tableId: horariosId,
        medico: medico.nombre, especialidad: medico.especialidad,
        fecha, hora, disponible: 'No', citaId: c.cedula,
        createdAt: new Date().toISOString(),
      });
      citasCreadas++;
    }

    // Horarios disponibles adicionales (slots libres próximos 7 días)
    for (const med of medicosData) {
      for (let d = 1; d <= 7; d++) {
        const fecha = dateOffset(d);
        const slots = [{ hora: '09:00' },{ hora: '10:00' },{ hora: '11:00' },{ hora: '14:00' },{ hora: '15:00' }];
        for (const s of slots) {
          await horariosDb.insert({
            _id: uuidv4(), tableId: horariosId,
            medico: med.nombre, especialidad: med.especialidad,
            fecha, hora: s.hora, disponible: 'Sí', citaId: '',
            createdAt: new Date().toISOString(),
          });
        }
      }
    }
    console.log(`✅ ${citasCreadas} citas · recordatorios · horarios creados`);

    // ══════════════════════════════════════════
    // DATOS GENERADOS: Exámenes (32)
    // ══════════════════════════════════════════
    const examenesDb = await connectDB(getTableDataDbName(WORKSPACE_ID, examenesId));
    const TIPOS_EX   = ['Hemograma','Glicemia','Perfil lipídico','Orina parcial','TSH','Creatinina','Rx Tórax','Ecografía','EKG'];
    const RESULTADOS = ['Dentro de límites normales','Leve elevación de glucosa, se recomienda control','Perfil lipídico en límites normales','Sin hallazgos patológicos','TSH normal','Función renal normal','Sin infiltrados','Ecografía sin alteraciones','Ritmo sinusal normal'];

    for (let i = 0; i < 32; i++) {
      const pac    = pick(pacientesArr);
      const medico = pick(medicosData);
      const tipo   = pick(TIPOS_EX);
      const offset = range(-15, 5);
      const estado = offset < -3 ? pick(['Listo','Entregado','Listo']) : offset < 0 ? 'Procesando' : 'Pendiente';
      await examenesDb.insert({
        _id: uuidv4(), tableId: examenesId,
        paciente: pac.nombre, cedula: pac.cedula, telefono: pac.telefono,
        tipoExamen: tipo, medico: medico.nombre,
        fechaPedido: dateOffset(offset - 2),
        fechaResult: estado === 'Listo' || estado === 'Entregado' ? dateOffset(offset) : '',
        estado, notificado: estado === 'Entregado' ? 'Sí' : 'No',
        resultado: estado === 'Listo' || estado === 'Entregado' ? pick(RESULTADOS) : '',
        createdAt: new Date().toISOString(),
      });
    }
    console.log('✅ 32 exámenes generados');

    // ══════════════════════════════════════════
    // AGENTES
    // ══════════════════════════════════════════
    const agente1Id = uuidv4();
    await agentsDb.insert({
      _id: agente1Id, type: 'agent',
      name: 'Recepcionista IA', description: 'Agenda citas, consulta disponibilidad y gestiona pacientes',
      tables: [
        { tableId: pacientesId,     tableName: 'Pacientes',           fullAccess: true,  permissions: { query: true, create: true, update: true, delete: false } },
        { tableId: medicosId,       tableName: 'Médicos',             fullAccess: false, permissions: { query: true, create: false, update: false, delete: false } },
        { tableId: especialidadesId,tableName: 'Especialidades',      fullAccess: false, permissions: { query: true, create: false, update: false, delete: false } },
        { tableId: citasId,         tableName: 'Citas',               fullAccess: true,  permissions: { query: true, create: true, update: true, delete: false } },
        { tableId: horariosId,      tableName: 'HorariosDisponibles', fullAccess: false, permissions: { query: true, create: false, update: true, delete: false } },
        { tableId: recordatoriosId, tableName: 'Recordatorios',       fullAccess: true,  permissions: { query: true, create: true, update: true, delete: false } },
      ],
      engineMode: 'llm-first', vertical: 'healthcare', toneStyle: 'professional',
      fewShotExamples: [
        { user: 'necesito una cita con cardiología', assistant: '¡Con gusto! Para agendar su cita con Cardiología, ¿me podría indicar su nombre completo y número de cédula?' },
        { user: 'tienen disponibilidad para el viernes', assistant: 'Déjeme revisar la disponibilidad del próximo viernes. ¿Tiene preferencia de horario, mañana o tarde?' },
        { user: 'quiero cancelar mi cita', assistant: 'Claro, para gestionar su cancelación necesito su número de cédula o el nombre completo con el que quedó agendada la cita.' },
      ],
      enabledTools: ['query_records','create_record','update_record','general_conversation'],
      customInstructions: 'Siempre verifica si el paciente existe antes de crear uno nuevo. Al agendar, consulta HorariosDisponibles antes de crear la cita. Cuando crees una cita, actualiza el horario a disponible=No.',
      prompt: `Eres la Recepcionista Virtual de ClínicaVida 🏥, centro médico multiespecialista en Bogotá.

TU FUNCIÓN:
- Agendar, confirmar, modificar y cancelar citas médicas
- Registrar pacientes nuevos
- Informar sobre especialidades y médicos disponibles
- Consultar resultados de exámenes (solo si el paciente los solicita con cédula)
- Enviar recordatorios de citas

ESPECIALIDADES: Medicina General, Cardiología, Ginecología, Pediatría, Ortopedia, Dermatología
HORARIO: Lunes a Sábado 7:00am - 6:00pm | Urgencias 24h

PROCESO AGENDA:
1. Solicita nombre completo y cédula
2. Busca si el paciente existe en la BD
3. Consulta disponibilidad del médico solicitado
4. Confirma fecha, hora y consultorio
5. Registra la cita
6. Informa copago según EPS

Usa un tono amable, profesional y empático. Nunca des diagnósticos médicos.`,
      aiModel: ['gpt-4o-mini'], useFlows: true, hasFlows: true, active: true,
      planFeatures: { canCreate: true, canUpdate: true, canQuery: true, canDelete: false, hasAutomations: true },
      createdAt: new Date().toISOString(),
    });

    const agente2Id = uuidv4();
    await agentsDb.insert({
      _id: agente2Id, type: 'agent',
      name: 'Analista Clínico', description: 'Consulta estadísticas, reportes de citas y seguimiento de pacientes',
      tables: [
        { tableId: pacientesId,      tableName: 'Pacientes',  fullAccess: false, permissions: { query: true, create: false, update: false, delete: false } },
        { tableId: citasId,          tableName: 'Citas',      fullAccess: false, permissions: { query: true, create: false, update: false, delete: false } },
        { tableId: examenesId,       tableName: 'Exámenes',   fullAccess: true,  permissions: { query: true, create: false, update: true, delete: false } },
        { tableId: recordatoriosId,  tableName: 'Recordatorios', fullAccess: false, permissions: { query: true, create: false, update: false, delete: false } },
      ],
      engineMode: 'llm-first', vertical: 'healthcare', toneStyle: 'analytical',
      fewShotExamples: [
        { user: 'cuántas citas canceladas esta semana', assistant: 'Déjame consultar las citas de esta semana con estado Cancelada...' },
        { user: 'pacientes con exámenes listos sin notificar', assistant: 'Busco en Exámenes los registros con estado=Listo y notificado=No...' },
      ],
      enabledTools: ['query_records','update_record','general_conversation'],
      customInstructions: 'Eres analítico y preciso. Siempre filtra por fechas cuando consultes estadísticas. Cuando identifiques exámenes sin notificar, ofrece actualizarlos a notificado=Sí.',
      prompt: `Eres el Analista Clínico de ClínicaVida 🏥. Tu rol es apoyar al equipo médico con estadísticas, seguimiento y gestión interna.

CAPACIDADES:
- Estadísticas de citas (atendidas, canceladas, no asistidas, por médico, por especialidad)
- Seguimiento de exámenes pendientes de entrega
- Pacientes sin cita en los últimos 3 meses
- Médicos con mayor carga de trabajo
- Recordatorios pendientes de enviar

Sé conciso, usa tablas cuando sea posible y siempre indica el período de tiempo de los datos consultados.`,
      aiModel: ['gpt-4o-mini'], useFlows: false, hasFlows: false, active: true,
      planFeatures: { canCreate: false, canUpdate: true, canQuery: true, canDelete: false, hasAutomations: false },
      createdAt: new Date().toISOString(),
    });
    console.log('✅ 2 agentes creados');

    // ══════════════════════════════════════════
    // FLUJOS
    // ══════════════════════════════════════════

    // Flujo 1: Agendar Cita — beforeCreate en Citas
    await flowsDb.insert({
      _id: uuidv4(), name: 'Agendar Cita - Validación y Bloqueo',
      description: 'Verifica disponibilidad, registra paciente si es nuevo y bloquea el horario',
      triggerType: 'beforeCreate', triggerTable: citasId, triggerTableName: 'Citas', isActive: true,
      nodes: [
        { id: 't1', type: 'trigger',    position: { x: 300, y: 50  }, data: { label: 'Antes de crear Cita', triggerType: 'beforeCreate', table: citasId } },
        { id: 'q1', type: 'query',      position: { x: 300, y: 170 }, data: { label: '¿Horario disponible?', targetTable: horariosId, filterField: 'hora', filterValueType: 'trigger', filterValueField: 'hora', outputVar: 'horarioData' } },
        { id: 'c1', type: 'condition',  position: { x: 300, y: 300 }, data: { label: 'disponible = Sí?', field: 'horarioData.disponible', operator: '==', value: 'Sí' } },
        { id: 'a1', type: 'action',     position: { x: 150, y: 420 }, data: { label: 'Bloquear horario', actionType: 'update', targetTable: horariosId, filterField: 'hora', filterValueType: 'trigger', filterValueField: 'hora', fields: { disponible: 'No', citaId: '{{cedula}}' } } },
        { id: 'a2', type: 'action',     position: { x: 150, y: 540 }, data: { label: 'Crear recordatorio', actionType: 'create', targetTable: recordatoriosId, fields: { paciente: '{{paciente}}', telefono: '{{telefono}}', fechaCita: '{{fecha}}', horaCita: '{{hora}}', medico: '{{medico}}', canal: 'WhatsApp', estado: 'Pendiente' } } },
        { id: 'a3', type: 'action',     position: { x: 150, y: 660 }, data: { label: 'Aprobar cita', actionType: 'allow' } },
        { id: 'a4', type: 'action',     position: { x: 480, y: 420 }, data: { label: 'Bloquear: sin disponibilidad', actionType: 'block', message: 'Lo sentimos, ese horario no está disponible para el médico seleccionado.' } },
      ],
      edges: [
        { id: 'e1', source: 't1', target: 'q1' },
        { id: 'e2', source: 'q1', target: 'c1' },
        { id: 'e3-y', source: 'c1', sourceHandle: 'true',  target: 'a1', label: 'Disponible' },
        { id: 'e3-n', source: 'c1', sourceHandle: 'false', target: 'a4', label: 'Ocupado' },
        { id: 'e4', source: 'a1', target: 'a2' },
        { id: 'e5', source: 'a2', target: 'a3' },
      ],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });

    // Flujo 2: Recordatorio 24h — update en Citas cuando recordatorioEnviado cambia a Sí
    await flowsDb.insert({
      _id: uuidv4(), name: 'Enviar Recordatorio 24h',
      description: 'Cuando se marca recordatorioEnviado=Sí, notifica al paciente de su cita',
      triggerType: 'update', triggerTable: citasId, triggerTableName: 'Citas', isActive: true,
      nodes: [
        { id: 't1', type: 'trigger',   position: { x: 200, y: 50  }, data: { label: 'Cita Actualizada', triggerType: 'update', table: citasId } },
        { id: 'c1', type: 'condition', position: { x: 200, y: 170 }, data: { label: 'recordatorioEnviado = Sí?', field: 'recordatorioEnviado', operator: '==', value: 'Sí' } },
        { id: 'a1', type: 'action',    position: { x: 200, y: 310 }, data: { label: 'Notificar al paciente', actionType: 'notification', message: '🏥 Recordatorio ClínicaVida: Estimado/a {{paciente}}, le recordamos su cita de {{especialidad}} con {{medico}} mañana {{fecha}} a las {{hora}} en {{consultorio}}. Por favor confirme su asistencia.' } },
        { id: 'a2', type: 'action',    position: { x: 200, y: 430 }, data: { label: 'Actualizar recordatorio', actionType: 'update', targetTable: recordatoriosId, filterField: 'paciente', filterValueType: 'trigger', filterValueField: 'paciente', fields: { estado: 'Enviado', enviadoEn: '{{now}}' } } },
      ],
      edges: [
        { id: 'e1', source: 't1', target: 'c1' },
        { id: 'e2', source: 'c1', sourceHandle: 'true', target: 'a1', label: 'Sí' },
        { id: 'e3', source: 'a1', target: 'a2' },
      ],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });

    // Flujo 3: Cancelación — libera horario cuando estado → Cancelada
    await flowsDb.insert({
      _id: uuidv4(), name: 'Cancelación - Liberar Horario',
      description: 'Cuando una cita se cancela, libera el horario bloqueado',
      triggerType: 'update', triggerTable: citasId, triggerTableName: 'Citas', isActive: true,
      nodes: [
        { id: 't1', type: 'trigger',   position: { x: 200, y: 50  }, data: { label: 'Cita Actualizada', triggerType: 'update', table: citasId } },
        { id: 'c1', type: 'condition', position: { x: 200, y: 170 }, data: { label: 'Estado = Cancelada?', field: 'estado', operator: '==', value: 'Cancelada' } },
        { id: 'a1', type: 'action',    position: { x: 200, y: 310 }, data: { label: 'Liberar horario', actionType: 'update', targetTable: horariosId, filterField: 'hora', filterValueType: 'trigger', filterValueField: 'hora', fields: { disponible: 'Sí', citaId: '' } } },
        { id: 'a2', type: 'action',    position: { x: 200, y: 430 }, data: { label: 'Notificar equipo', actionType: 'notification', message: '📅 Cita cancelada: {{paciente}} ({{especialidad}}) el {{fecha}} a las {{hora}} con {{medico}} — horario liberado.' } },
      ],
      edges: [
        { id: 'e1', source: 't1', target: 'c1' },
        { id: 'e2', source: 'c1', sourceHandle: 'true', target: 'a1', label: 'Cancelada' },
        { id: 'e3', source: 'a1', target: 'a2' },
      ],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });

    // Flujo 4: Examen Listo — notifica al paciente
    await flowsDb.insert({
      _id: uuidv4(), name: 'Examen Listo - Notificar Paciente',
      description: 'Cuando un examen cambia a estado Listo, notifica automáticamente al paciente',
      triggerType: 'update', triggerTable: examenesId, triggerTableName: 'Exámenes', isActive: true,
      nodes: [
        { id: 't1', type: 'trigger',   position: { x: 200, y: 50  }, data: { label: 'Examen Actualizado', triggerType: 'update', table: examenesId } },
        { id: 'c1', type: 'condition', position: { x: 200, y: 170 }, data: { label: 'Estado = Listo?', field: 'estado', operator: '==', value: 'Listo' } },
        { id: 'a1', type: 'action',    position: { x: 200, y: 310 }, data: { label: 'Notificar paciente', actionType: 'notification', message: '🔬 ClínicaVida: Estimado/a {{paciente}}, sus resultados de {{tipoExamen}} ya están disponibles. Puede recogerlos en recepción o consultarlos con su médico {{medico}}.' } },
        { id: 'a2', type: 'action',    position: { x: 200, y: 430 }, data: { label: 'Marcar notificado', actionType: 'update', targetTable: examenesId, filterField: 'cedula', filterValueType: 'trigger', filterValueField: 'cedula', fields: { notificado: 'Sí' } } },
      ],
      edges: [
        { id: 'e1', source: 't1', target: 'c1' },
        { id: 'e2', source: 'c1', sourceHandle: 'true', target: 'a1', label: 'Listo' },
        { id: 'e3', source: 'a1', target: 'a2' },
      ],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    console.log('✅ 4 flujos creados');

    // ══════════════════════════════════════════
    // WORKSPACE DOCS
    // ══════════════════════════════════════════
    try {
      await workspaceDb.insert({
        _id: '_design/workspace', name: WORKSPACE_NAME,
        description: 'Centro médico multiespecialista en Bogotá',
        type: 'healthcare', defaultAgentId: agente1Id, plan: 'enterprise',
        settings: { timezone: 'America/Bogota', currency: 'COP', language: 'es' },
        createdAt: new Date().toISOString(),
      });
    } catch { /* ya existe */ }
    try {
      await workspacesDb.insert({
        _id: WORKSPACE_ID, name: WORKSPACE_NAME,
        color: 'rgb(59, 130, 246)', emoji: '🏥',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        createdBy: 'seed', plan: 'enterprise', members: [],
      });
    } catch { /* ya existe */ }

    // Vincular usuario
    try {
      const accountsDb = await connectDB(`${getDbPrefix()}accounts`);
      const res = await accountsDb.find({ selector: { email: 'starter@migracion.ai' }, limit: 1 });
      if (res.docs.length > 0) {
        const user = res.docs[0];
        if (!user.workspaces) user.workspaces = [];
        if (!user.workspaces.includes(WORKSPACE_ID)) {
          user.workspaces.push(WORKSPACE_ID);
          user.updatedAt = new Date().toISOString();
          await accountsDb.insert(user);
          console.log('✅ Workspace vinculado a starter@migracion.ai');
        }
      }
    } catch { /* ignorar */ }

    console.log(`\n✅ Seed CLINICAVIDA completado`);
    console.log(`   Workspace: ${WORKSPACE_ID} | Plan: enterprise`);
    console.log(`   Tablas: 7 | Agentes: 2 | Flujos: 4`);
    console.log(`   Datos: 80 pacientes · 4 médicos · ${citasCreadas} citas · 32 exámenes (aleatorizados)`);

  } catch (error) {
    console.error('❌ Error en seed ClínicaVida:', error);
    throw error;
  }
}

export default seed;
