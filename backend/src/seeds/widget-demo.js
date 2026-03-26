/**
 * Seed: Widget de prueba
 *
 * Activa el widget embebible en el workspace "dulce-momento"
 * con un token fijo para pruebas. También se puede correr con
 * cualquier workspace pasando --workspace=<id>.
 *
 * Uso:
 *   node src/seeds/widget-demo.js
 *   node src/seeds/widget-demo.js --workspace=mi-workspace
 */

import 'dotenv/config';
import { connectDB, getWorkspacesDbName } from '../config/db.js';

const WIDGET_TOKEN = 'widget-demo-token-12345';
const DEFAULT_WORKSPACE = 'dulce-momento';

function getTargetWorkspace() {
  const arg = process.argv.find(a => a.startsWith('--workspace='));
  return arg ? arg.split('=')[1] : DEFAULT_WORKSPACE;
}

export async function seed() {
  const workspaceId = getTargetWorkspace();
  console.log(`\n[Widget Seed] Activando widget en workspace "${workspaceId}"...`);

  try {
    const db = await connectDB(getWorkspacesDbName());
    const configId = `config_${workspaceId}`;

    let config;
    try {
      config = await db.get(configId);
    } catch (e) {
      if (e.status === 404) {
        console.log(`  ⚠️  Config "${configId}" no existe. Creando...`);
        config = {
          _id: configId,
          type: 'workspace_config',
          workspaceId,
          plan: 'basic',
          integrations: {},
          createdAt: new Date().toISOString(),
        };
      } else throw e;
    }

    // Activar widget
    config.integrations = config.integrations || {};
    config.integrations.widget = {
      enabled: true,
      token: WIDGET_TOKEN,
      agentId: null, // Se asignará automáticamente al primer agente activo
      theme: {
        primaryColor: '#F59E0B',
        position: 'bottom-right',
        title: '🧁 Dulce Momento',
        subtitle: '¿En qué te podemos ayudar?',
        avatarUrl: null,
      },
    };
    config.updatedAt = new Date().toISOString();

    if (config._rev) {
      await db.insert(config);
    } else {
      await db.insert(config);
    }

    console.log(`  ✅ Widget activado`);
    console.log(`  🔑 Token: ${WIDGET_TOKEN}`);
    console.log(`  🌐 Prueba: http://localhost:5173/widget/embed?token=${WIDGET_TOKEN}`);
    console.log(`  📋 Snippet:`);
    console.log(`     <script src="http://localhost:5173/widget.js" data-token="${WIDGET_TOKEN}"></script>`);
  } catch (err) {
    console.error(`  ❌ Error: ${err.message}`);
  }
}

// Ejecutar directamente
if (process.argv[1]?.includes('widget-demo')) {
  seed().then(() => process.exit(0)).catch(() => process.exit(1));
}
