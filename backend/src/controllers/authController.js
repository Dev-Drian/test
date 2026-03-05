/**
 * AuthController - Endpoints de autenticación
 * 
 * Registro, login, perfil, cambio de contraseña
 */

import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { connectDB, getDbPrefix } from '../config/db.js';
import { generateToken, invalidateUserCache } from '../middleware/auth.js';
import { getEmailService } from '../services/EmailService.js';

// ═══ HELPERS ═══

/**
 * Hash de contraseña con salt
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

/**
 * Verifica contraseña
 */
function verifyPassword(password, hash, salt) {
  const hashToVerify = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === hashToVerify;
}

/**
 * Valida formato de email
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ═══ ENDPOINTS ═══

/**
 * POST /auth/register
 * Registra un nuevo usuario
 */
export async function register(req, res) {
  try {
    const { email, password, name } = req.body;
    
    // Validaciones
    if (!email || !password || !name) {
      return res.status(400).json({ 
        error: 'Email, password y nombre son requeridos',
        code: 'MISSING_FIELDS'
      });
    }
    
    if (!isValidEmail(email)) {
      return res.status(400).json({ 
        error: 'Email inválido',
        code: 'INVALID_EMAIL'
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'La contraseña debe tener al menos 6 caracteres',
        code: 'PASSWORD_TOO_SHORT'
      });
    }
    
    const db = await connectDB(`${getDbPrefix()}accounts`);
    
    // Verificar si email ya existe
    try {
      const existing = await db.find({
        selector: { email: email.toLowerCase() },
        limit: 1
      });
      
      if (existing.docs.length > 0) {
        return res.status(409).json({ 
          error: 'El email ya está registrado',
          code: 'EMAIL_EXISTS'
        });
      }
    } catch (err) {
      // Si falla la búsqueda, continuar (DB puede estar vacía)
    }
    
    // Crear usuario
    const { hash, salt } = hashPassword(password);
    const userId = uuidv4();
    
    const newUser = {
      _id: userId,
      email: email.toLowerCase(),
      name,
      password: { hash, salt }, // Formato unificado con seed
      plan: 'free', // Plan por defecto
      role: 'user',
      profileImage: null,
      status: 'active',
      workspaces: [], // Workspaces donde es miembro
      workspacesOwner: [], // Workspaces que posee
      onboardingCompleted: false,
      businessType: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLoginAt: null,
    };
    
    await db.insert(newUser);
    
    // Enviar email de bienvenida (no bloquea respuesta)
    getEmailService().sendWelcome(email.toLowerCase(), name).catch(err =>
      console.error('[AuthController] Error enviando email bienvenida:', err.message)
    );
    
    // Generar token
    const token = generateToken(userId);
    
    // Respuesta sin datos sensibles
    const userPublic = { ...newUser };
    delete userPublic.password;
    
    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: userPublic,
      token,
    });
    
  } catch (error) {
    console.error('[AuthController] register error:', error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
}

/**
 * POST /auth/login
 * Inicia sesión
 */
export async function login(req, res) {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email y password son requeridos',
        code: 'MISSING_FIELDS'
      });
    }
    
    const db = await connectDB(`${getDbPrefix()}accounts`);
    
    // Buscar usuario
    const result = await db.find({
      selector: { email: email.toLowerCase() },
      limit: 1
    });
    
    if (result.docs.length === 0) {
      return res.status(401).json({ 
        error: 'Credenciales inválidas',
        code: 'INVALID_CREDENTIALS'
      });
    }
    
    const user = result.docs[0];
    
    // Verificar contraseña (soporta ambos formatos: { hash, salt } o campos separados)
    const passwordHash = user.password?.hash || user.password;
    const passwordSalt = user.password?.salt || user.salt;
    
    if (!passwordHash || !passwordSalt || !verifyPassword(password, passwordHash, passwordSalt)) {
      return res.status(401).json({ 
        error: 'Credenciales inválidas',
        code: 'INVALID_CREDENTIALS'
      });
    }
    
    // Verificar estado
    if (user.status === 'inactive') {
      return res.status(403).json({ 
        error: 'Cuenta desactivada',
        code: 'ACCOUNT_DISABLED'
      });
    }
    
    // Actualizar último login
    await db.insert({
      ...user,
      lastLoginAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    // Generar token
    const token = generateToken(user._id);
    
    // Respuesta sin datos sensibles
    const userPublic = { ...user };
    delete userPublic.password;
    delete userPublic.salt;
    
    res.json({
      message: 'Login exitoso',
      user: userPublic,
      token,
    });
    
  } catch (error) {
    console.error('[AuthController] login error:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
}

/**
 * GET /auth/me
 * Obtiene perfil del usuario autenticado
 */
export async function getProfile(req, res) {
  try {
    // req.user ya viene del middleware requireAuth
    res.json({
      user: req.user,
    });
    
  } catch (error) {
    console.error('[AuthController] getProfile error:', error);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
}

/**
 * PUT /auth/me
 * Actualiza perfil del usuario
 */
export async function updateProfile(req, res) {
  try {
    const userId = req.user._id;
    
    const db = await connectDB(`${getDbPrefix()}accounts`);
    const user = await db.get(userId);
    
    const { name, profileImage, onboardingCompleted, businessType } = req.body;
    
    const updates = {
      ...user,
      updatedAt: new Date().toISOString(),
    };
    
    if (name) updates.name = name;
    if (profileImage !== undefined) updates.profileImage = profileImage;
    if (onboardingCompleted !== undefined) updates.onboardingCompleted = !!onboardingCompleted;
    if (businessType !== undefined) updates.businessType = businessType;
    
    await db.insert(updates);
    
    // Invalidar cache
    invalidateUserCache(userId);
    
    const { password: _, salt: __, ...userPublic } = updates;
    
    res.json({
      message: 'Perfil actualizado',
      user: userPublic,
    });
    
  } catch (error) {
    console.error('[AuthController] updateProfile error:', error);
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
}

/**
 * POST /auth/change-password
 * Cambia contraseña del usuario
 */
export async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: 'Contraseña actual y nueva son requeridas',
        code: 'MISSING_FIELDS'
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        error: 'La nueva contraseña debe tener al menos 6 caracteres',
        code: 'PASSWORD_TOO_SHORT'
      });
    }
    
    const db = await connectDB(`${getDbPrefix()}accounts`);
    const user = await db.get(userId);
    
    // Verificar contraseña actual (soporta ambos formatos)
    const passwordHash = user.password?.hash || user.password;
    const passwordSalt = user.password?.salt || user.salt;
    
    if (!passwordHash || !passwordSalt || !verifyPassword(currentPassword, passwordHash, passwordSalt)) {
      return res.status(401).json({ 
        error: 'Contraseña actual incorrecta',
        code: 'INVALID_PASSWORD'
      });
    }
    
    // Generar nuevo hash
    const { hash, salt } = hashPassword(newPassword);
    
    // Limpiar campos antiguos si existen
    const updatedUser = { ...user };
    delete updatedUser.salt; // Eliminar campo legacy
    
    await db.insert({
      ...updatedUser,
      password: { hash, salt }, // Formato unificado
      updatedAt: new Date().toISOString(),
    });
    
    // Invalidar cache
    invalidateUserCache(userId);
    
    res.json({
      message: 'Contraseña cambiada exitosamente',
    });
    
  } catch (error) {
    console.error('[AuthController] changePassword error:', error);
    res.status(500).json({ error: 'Error al cambiar contraseña' });
  }
}

/**
 * GET /auth/workspaces
 * Lista los workspaces del usuario autenticado
 */
/**
 * POST /auth/forgot-password
 * Genera un código de restablecimiento y lo envía por email
 */
export async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requerido' });

    const db = await connectDB(`${getDbPrefix()}accounts`);
    const result = await db.find({ selector: { email: email.toLowerCase() }, limit: 1 });

    // Siempre responder 200 para no revelar si el email existe
    if (result.docs.length === 0) {
      return res.json({ message: 'Si el email existe, recibirás instrucciones' });
    }

    const user = result.docs[0];

    // Generar código 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min

    await db.insert({
      ...user,
      resetPasswordCode: code,
      resetPasswordExpiry: expiry,
      updatedAt: new Date().toISOString(),
    });

    const resetUrl = `${process.env.APP_PUBLIC_URL || 'http://localhost:3020'}/reset-password?code=${code}&email=${encodeURIComponent(email)}`;
    getEmailService().sendPasswordReset(user.email, user.name, { resetUrl, code }).catch(err =>
      console.error('[AuthController] Error enviando reset email:', err.message)
    );

    res.json({ message: 'Si el email existe, recibirás instrucciones' });
  } catch (error) {
    console.error('[AuthController] forgotPassword error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
}

/**
 * POST /auth/reset-password
 * Restablece la contraseña con el código enviado por email
 */
export async function resetPassword(req, res) {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, código y nueva contraseña son requeridos' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const db = await connectDB(`${getDbPrefix()}accounts`);
    const result = await db.find({ selector: { email: email.toLowerCase() }, limit: 1 });

    if (result.docs.length === 0) {
      return res.status(400).json({ error: 'Código inválido o expirado', code: 'INVALID_CODE' });
    }

    const user = result.docs[0];

    if (!user.resetPasswordCode || user.resetPasswordCode !== code) {
      return res.status(400).json({ error: 'Código inválido', code: 'INVALID_CODE' });
    }

    if (!user.resetPasswordExpiry || new Date(user.resetPasswordExpiry) < new Date()) {
      return res.status(400).json({ error: 'Código expirado', code: 'CODE_EXPIRED' });
    }

    const { hash, salt } = hashPassword(newPassword);
    const updatedUser = { ...user };
    delete updatedUser.resetPasswordCode;
    delete updatedUser.resetPasswordExpiry;
    delete updatedUser.salt;

    await db.insert({ ...updatedUser, password: { hash, salt }, updatedAt: new Date().toISOString() });
    invalidateUserCache(user._id);

    res.json({ message: 'Contraseña restablecida exitosamente' });
  } catch (error) {
    console.error('[AuthController] resetPassword error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
}

export async function getUserWorkspaces(req, res) {
  try {
    const user = req.user;
    
    // Combinar workspaces donde es dueño y donde es miembro
    const workspaceIds = [
      ...(user.workspacesOwner || []),
      ...(user.workspaces || []).map(w => w.id)
    ];
    
    // Eliminar duplicados
    const uniqueIds = [...new Set(workspaceIds)];
    
    if (uniqueIds.length === 0) {
      return res.json({ workspaces: [] });
    }
    
    // Cargar detalles de workspaces
    const workspacesDb = await connectDB(`${getDbPrefix()}workspaces`);
    const workspaces = [];
    
    for (const wsId of uniqueIds) {
      try {
        const ws = await workspacesDb.get(wsId);
        const isOwner = (user.workspacesOwner || []).includes(wsId);
        workspaces.push({
          _id: ws._id,
          name: ws.name,
          color: ws.color,
          plan: ws.plan,
          createdAt: ws.createdAt,
          role: isOwner ? 'owner' : 'member',
        });
      } catch (err) {
        // Workspace no existe, ignorar
      }
    }
    
    res.json({ workspaces });
    
  } catch (error) {
    console.error('[AuthController] getUserWorkspaces error:', error);
    res.status(500).json({ error: 'Error al obtener workspaces' });
  }
}
