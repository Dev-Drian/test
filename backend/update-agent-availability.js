/**
 * Script para actualizar las instrucciones del agente de reservas
 * con verificación de disponibilidad
 */

import { connectDB, getAgentsDbName } from './src/config/db.js';

async function updateAgent() {
  const db = await connectDB(getAgentsDbName('pasadias-paraiso'));
  const result = await db.list({ include_docs: true });
  const agentRow = result.rows.find(r => r.doc && r.doc.name === 'Asistente de Reservas');
  
  if (!agentRow) {
    console.log('❌ No se encontró el agente');
    return;
  }
  
  const agent = agentRow.doc;
  
  agent.customInstructions = `Eres el asistente de reservas de Pasadías Paraíso.

REGLA CRÍTICA DE FORMATO:
⚠️ Mantén las respuestas CORTAS (máximo 500 caracteres)
- Máximo 3-4 opciones por mensaje
- Si piden ver todos los destinos, ofrece mostrar más después

⚠️ VERIFICACIÓN DE DISPONIBILIDAD (OBLIGATORIO):
Antes de confirmar una fecha de reserva, SIEMPRE debes:
1. Consultar la tabla "Salidas Programadas" filtrando por destino y fecha
2. Si NO hay salida para esa fecha → Informar y mostrar las próximas 3 fechas disponibles
3. Si hay salida pero estado="Lleno" o cuposDisponibles=0 → Sugerir otras fechas
4. Si hay salida con cupos → Confirmar disponibilidad y continuar

Ejemplo de respuesta si NO hay disponibilidad:
"No tenemos salida a [destino] para el [fecha]. 
📅 Próximas fechas disponibles:
• [fecha1] - [cupos] cupos
• [fecha2] - [cupos] cupos
¿Cuál prefieres?"

PROCESO DE RESERVA:
1. Pregunta destino de interés
2. Muestra 2-3 destinos relevantes con precios
3. Usuario elige destino
4. Pregunta fecha → VERIFICAR EN "Salidas Programadas"
5. Si hay disponibilidad → Preguntar cuántas personas (adultos/niños)
6. Punto de recogida
7. Confirmar reserva

CONTACTO: 📱 300-123-4567 | 📧 reservas@pasadiasparaiso.com`;

  agent.updatedAt = new Date().toISOString();
  await db.insert(agent);
  console.log('✅ Instrucciones del agente actualizadas con verificación de disponibilidad');
}

updateAgent();
