/**
 * EmailService.js
 * Servicio de email usando Resend API
 * Docs: https://resend.com/docs
 */

import axios from 'axios';
import logger from '../config/logger.js';

// --- Templates HTML ---

function baseLayout(content, title = 'FlowAI') {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #e2e8f0; }
    .wrapper { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #7c3aed, #4f46e5); padding: 32px 40px; text-align: center; }
    .header-logo { display: inline-flex; align-items: center; gap: 12px; margin-bottom: 8px; }
    .logo-icon { width: 40px; height: 40px; background: rgba(255,255,255,0.15); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
    .logo-text { font-size: 24px; font-weight: 700; color: white; }
    .body { padding: 40px; }
    .body h2 { font-size: 22px; font-weight: 700; color: #f1f5f9; margin-bottom: 12px; }
    .body p { font-size: 15px; line-height: 1.7; color: #94a3b8; margin-bottom: 16px; }
    .btn { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: white !important; text-decoration: none; border-radius: 10px; font-size: 15px; font-weight: 600; letter-spacing: 0.3px; margin: 8px 0 24px; }
    .highlight-box { background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 20px 24px; margin: 20px 0; }
    .highlight-box .label { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 8px; }
    .highlight-box .value { font-size: 20px; font-weight: 700; color: #a78bfa; font-family: monospace; letter-spacing: 4px; }
    .divider { border: none; border-top: 1px solid #334155; margin: 28px 0; }
    .footer { padding: 24px 40px; text-align: center; border-top: 1px solid #1e293b; }
    .footer p { font-size: 12px; color: #475569; line-height: 1.6; }
    .feature-row { display: flex; gap: 16px; margin: 12px 0; }
    .feature-icon { width: 36px; height: 36px; background: rgba(124,58,237,0.15); border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 16px; }
    .feature-text strong { display: block; font-size: 14px; color: #e2e8f0; margin-bottom: 2px; }
    .feature-text span { font-size: 13px; color: #64748b; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="header-logo">
          <div class="logo-icon">⚡</div>
          <div class="logo-text">FlowAI</div>
        </div>
      </div>
      <div class="body">
        ${content}
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} FlowAI · Automatización inteligente para tu negocio</p>
        <p style="margin-top:6px;">Si no solicitaste este correo, puedes ignorarlo.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

const templates = {
  welcome: ({ name }) => baseLayout(`
    <h2>¡Bienvenido a FlowAI, ${name}! 🎉</h2>
    <p>Tu cuenta está lista. En minutos puedes tener tu negocio funcionando con inteligencia artificial.</p>

    <div style="margin: 28px 0;">
      <div class="feature-row">
        <div class="feature-icon">🤖</div>
        <div class="feature-text">
          <strong>Agente IA</strong>
          <span>Crea un asistente que atiende a tus clientes 24/7</span>
        </div>
      </div>
      <div class="feature-row">
        <div class="feature-icon">📊</div>
        <div class="feature-text">
          <strong>Tablas dinámicas</strong>
          <span>Gestiona clientes, ventas, citas y más sin código</span>
        </div>
      </div>
      <div class="feature-row">
        <div class="feature-icon">⚡</div>
        <div class="feature-text">
          <strong>Flujos automáticos</strong>
          <span>Automatiza tareas repetitivas con un editor visual</span>
        </div>
      </div>
    </div>

    <a href="${process.env.APP_PUBLIC_URL || 'http://localhost:3020'}" class="btn">Ir a mi cuenta →</a>

    <hr class="divider" />
    <p style="font-size:13px;">¿Necesitas ayuda? Responde este correo y te asistimos con gusto.</p>
  `, 'Bienvenido a FlowAI'),

  resetPassword: ({ name, resetUrl, code }) => baseLayout(`
    <h2>Restablecer contraseña</h2>
    <p>Hola ${name}, recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
    <p>Usa el siguiente código o haz clic en el botón:</p>

    <div class="highlight-box">
      <div class="label">Código de verificación</div>
      <div class="value">${code}</div>
    </div>

    <a href="${resetUrl}" class="btn">Restablecer contraseña</a>

    <p style="font-size:13px;color:#64748b;">Este enlace expira en <strong style="color:#94a3b8;">30 minutos</strong>. Si no solicitaste esto, ignora este email.</p>
  `, 'Restablecer contraseña · FlowAI'),

  paymentConfirmed: ({ name, amount, currency, description, paymentId, date }) => baseLayout(`
    <h2>¡Pago confirmado! ✅</h2>
    <p>Hola ${name}, tu pago ha sido procesado exitosamente.</p>

    <div class="highlight-box">
      <div class="label">Monto pagado</div>
      <div class="value" style="font-size:28px;letter-spacing:0;">${currency} ${amount}</div>
      ${description ? `<p style="margin-top:8px;font-size:13px;color:#64748b;">${description}</p>` : ''}
    </div>

    <p style="font-size:13px;color:#64748b;">ID de pago: <code style="color:#a78bfa;">${paymentId}</code></p>
    <p style="font-size:13px;color:#64748b;">Fecha: ${date}</p>
  `, 'Pago confirmado · FlowAI'),

  planUpgrade: ({ name, planName, features }) => baseLayout(`
    <h2>¡Tu plan ha sido actualizado! 🚀</h2>
    <p>Hola ${name}, ahora tienes acceso a <strong style="color:#a78bfa;">${planName}</strong>.</p>

    <div style="margin: 20px 0;">
      ${(features || []).map(f => `
      <div class="feature-row">
        <div class="feature-icon">✓</div>
        <div class="feature-text"><strong>${f}</strong></div>
      </div>`).join('')}
    </div>

    <a href="${process.env.APP_PUBLIC_URL || 'http://localhost:3020'}" class="btn">Explorar nuevas funciones →</a>
  `, `Plan ${planName} activado · FlowAI`),
};

// --- EmailService class ---

class EmailService {
  constructor() {
    this.apiKey = process.env.RESEND_API_KEY;
    this.from = process.env.EMAIL_FROM || 'FlowAI <noreply@flowai.app>';
    this.enabled = !!this.apiKey && this.apiKey !== 'your-resend-api-key';
    
    if (!this.enabled) {
      logger.warn('[EmailService] RESEND_API_KEY no configurado — emails desactivados');
    }
  }

  /**
   * Envía un email raw
   */
  async send({ to, subject, html, text }) {
    if (!this.enabled) {
      logger.info(`[EmailService] Email simulado → ${to} | Asunto: ${subject}`);
      return { success: true, simulated: true };
    }

    try {
      const payload = {
        from: this.from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      };
      if (text) payload.text = text;

      const { data } = await axios.post('https://api.resend.com/emails', payload, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      logger.info(`[EmailService] Email enviado → ${to} | ID: ${data.id}`);
      return { success: true, id: data.id };
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      logger.error(`[EmailService] Error enviando email: ${msg}`);
      return { success: false, error: msg };
    }
  }

  /**
   * Bienvenida al registrarse
   */
  async sendWelcome(email, name) {
    return this.send({
      to: email,
      subject: `¡Bienvenido a FlowAI, ${name}!`,
      html: templates.welcome({ name }),
    });
  }

  /**
   * Restablecimiento de contraseña
   */
  async sendPasswordReset(email, name, { resetUrl, code }) {
    return this.send({
      to: email,
      subject: 'Restablecer tu contraseña · FlowAI',
      html: templates.resetPassword({ name, resetUrl, code }),
    });
  }

  /**
   * Confirmación de pago
   */
  async sendPaymentConfirmed(email, name, { amount, currency = 'USD', description, paymentId, date }) {
    const formattedDate = date
      ? new Date(date).toLocaleDateString('es-ES', { dateStyle: 'long' })
      : new Date().toLocaleDateString('es-ES', { dateStyle: 'long' });

    return this.send({
      to: email,
      subject: 'Pago confirmado · FlowAI',
      html: templates.paymentConfirmed({ name, amount, currency, description, paymentId, date: formattedDate }),
    });
  }

  /**
   * Cambio de plan
   */
  async sendPlanUpgrade(email, name, { planName, features }) {
    return this.send({
      to: email,
      subject: `¡Plan ${planName} activado! · FlowAI`,
      html: templates.planUpgrade({ name, planName, features }),
    });
  }
}

// Singleton
let _instance = null;

export function getEmailService() {
  if (!_instance) _instance = new EmailService();
  return _instance;
}

export default EmailService;
