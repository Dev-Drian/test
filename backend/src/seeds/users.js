/**
 * Seed: Usuarios de prueba
 * 
 * Crea usuarios con diferentes planes para testing:
 * - demo@migracion.ai (premium) - con workspace CRM
 * - nuevo@migracion.ai (free) - sin workspaces (para probar onboarding)
 * - starter@migracion.ai (starter) - con 1 workspace básico
 * - admin@migracion.ai (enterprise + superAdmin)
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { connectDB, getDbPrefix, getWorkspaceDbName, getAgentsDbName, getWorkspacesDbName } from '../config/db.js';

// Hash de contraseña
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

// Usuarios de prueba
const TEST_USERS = [
  {
    _id: 'user-demo',
    email: 'demo@migracion.ai',
    password: 'demo123',
    name: 'Usuario Demo',
    plan: 'premium',
    role: 'user',
    workspacesOwner: ['premium-crm'], // Vinculado al CRM premium existente
    workspaces: [{ id: 'premium-crm', role: 'owner' }],
    onboardingCompleted: true,
    businessType: 'services'
  },
  {
    _id: 'user-nuevo',
    email: 'nuevo@migracion.ai',
    password: 'nuevo123',
    name: 'Nuevo Usuario',
    plan: 'free',
    role: 'user',
    workspacesOwner: [],
    workspaces: [],
    onboardingCompleted: false,
    businessType: null
  },
  {
    _id: 'user-starter',
    email: 'starter@migracion.ai',
    password: 'starter123',
    name: 'Usuario Starter',
    plan: 'starter',
    role: 'user',
    workspacesOwner: [], // Se crea workspace en el seed
    workspaces: [],
    onboardingCompleted: true,
    businessType: 'store'
  },
  {
    _id: 'user-admin',
    email: 'admin@migracion.ai',
    password: 'admin123',
    name: 'Super Admin',
    plan: 'enterprise',
    role: 'superAdmin',
    workspacesOwner: [],
    workspaces: [],
    onboardingCompleted: true,
    businessType: null,
    permissions: {
      managePlans: true,
      manageUsers: true,
      viewAnalytics: true,
      systemSettings: true
    }
  }
];

// Workspace básico para usuario starter
const STARTER_WORKSPACE = {
  id: 'starter-tienda',
  name: 'Mi Tienda',
  color: '#3b82f6',
  tables: [
    {
      name: 'Productos',
      type: 'catalog',
      displayField: 'nombre',
      headers: [
        { key: 'nombre', label: 'Nombre', type: 'text', required: true },
        { key: 'precio', label: 'Precio', type: 'number', required: true },
        { key: 'stock', label: 'Stock', type: 'number', required: false, defaultValue: 0 },
        { key: 'categoria', label: 'Categoría', type: 'select', options: ['Electrónica', 'Ropa', 'Hogar', 'Otros'] }
      ]
    }
  ],
  agent: {
    name: 'Asistente de Tienda',
    description: 'Te ayudo a gestionar productos y ventas'
  }
};

export async function seedUsers() {
  console.log('\n[Seed Users] Iniciando seed de usuarios de prueba...');
  
  try {
    const accountsDb = await connectDB(`${getDbPrefix()}accounts`);
    const workspacesDb = await connectDB(getWorkspacesDbName());
    
    for (const userData of TEST_USERS) {
      try {
        // Verificar si ya existe
        const existing = await accountsDb.get(userData._id).catch(() => null);
        
        // Hash password
        const { hash, salt } = hashPassword(userData.password);
        
        // Preservar workspaces existentes si ya tiene (vinculados por workspaces-by-plan.js)
        const workspacesOwner = existing?.workspacesOwner?.length 
          ? existing.workspacesOwner 
          : [...userData.workspacesOwner];
        const workspaces = existing?.workspaces?.length 
          ? existing.workspaces 
          : [...userData.workspaces];
        
        const userDoc = {
          _id: userData._id,
          email: userData.email,
          password: { hash, salt },
          name: userData.name,
          plan: userData.plan,
          planExpiresAt: null, // null = no expira
          role: userData.role,
          workspacesOwner,
          workspaces,
          onboardingCompleted: userData.onboardingCompleted,
          businessType: userData.businessType,
          permissions: userData.permissions || {},
          status: 'active',
          createdAt: existing?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        if (existing) {
          userDoc._rev = existing._rev;
          console.log(`⏭️  Usuario "${userData.email}" ya existe, actualizando...`);
        }
        
        await accountsDb.insert(userDoc);
        console.log(`✅ Usuario "${userData.email}" (${userData.plan}) creado/actualizado`);
        
        // Crear workspace para starter si no existe
        if (userData._id === 'user-starter' && !userData.workspacesOwner.length) {
          await createStarterWorkspace(userData._id, accountsDb, workspacesDb);
        }
        
      } catch (err) {
        console.error(`❌ Error creando usuario "${userData.email}":`, err.message);
      }
    }
    
    console.log('\n[Seed Users] ✅ Usuarios creados/actualizados');
    console.log('');
    console.log('📧 Credenciales de prueba:');
    console.log('────────────────────────────────────────');
    console.log('🆓 FREE (sin config):  nuevo@migracion.ai / nuevo123');
    console.log('⭐ STARTER:           starter@migracion.ai / starter123');
    console.log('💎 PREMIUM (con CRM): demo@migracion.ai / demo123');
    console.log('👑 SUPER ADMIN:       admin@migracion.ai / admin123');
    console.log('────────────────────────────────────────');
    
  } catch (err) {
    console.error('[Seed Users] Error:', err.message);
    throw err;
  }
}

async function createStarterWorkspace(userId, accountsDb, workspacesDb) {
  console.log('  📦 Creando workspace para usuario starter...');
  
  try {
    // Crear workspace
    const workspaceDoc = {
      _id: STARTER_WORKSPACE.id,
      name: STARTER_WORKSPACE.name,
      color: STARTER_WORKSPACE.color,
      ownerId: userId,
      createdAt: new Date().toISOString()
    };
    
    await workspacesDb.insert(workspaceDoc).catch(async (err) => {
      if (err.statusCode === 409) {
        const existing = await workspacesDb.get(STARTER_WORKSPACE.id);
        await workspacesDb.insert({ ...workspaceDoc, _rev: existing._rev });
      } else throw err;
    });
    
    // Crear tablas
    const workspaceDb = await connectDB(getWorkspaceDbName(STARTER_WORKSPACE.id));
    
    for (const table of STARTER_WORKSPACE.tables) {
      const tableDoc = {
        _id: uuidv4(),
        ...table,
        createdAt: new Date().toISOString()
      };
      await workspaceDb.insert(tableDoc);
      console.log(`    ✅ Tabla "${table.name}" creada`);
    }
    
    // Crear agente
    const agentsDb = await connectDB(getAgentsDbName(STARTER_WORKSPACE.id));
    const agentDoc = {
      _id: uuidv4(),
      ...STARTER_WORKSPACE.agent,
      aiModel: ['gpt-4o-mini'],
      tables: [],
      status: 'active',
      createdAt: new Date().toISOString()
    };
    await agentsDb.insert(agentDoc);
    console.log(`    ✅ Agente "${STARTER_WORKSPACE.agent.name}" creado`);
    
    // Actualizar usuario con workspace
    const user = await accountsDb.get(userId);
    user.workspacesOwner = [STARTER_WORKSPACE.id];
    user.workspaces = [{ id: STARTER_WORKSPACE.id, role: 'owner' }];
    await accountsDb.insert(user);
    
    console.log(`  ✅ Workspace "${STARTER_WORKSPACE.name}" creado para starter`);
    
  } catch (err) {
    console.error('  ❌ Error creando workspace starter:', err.message);
  }
}

export default seedUsers;
