import React from "react";
import { Link } from "react-router-dom";

const Icons = {
  logo: (
    <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
      <rect width="40" height="40" rx="10" className="fill-violet-600"/>
      <path d="M12 20L18 14L24 20L18 26L12 20Z" fill="white" fillOpacity="0.9"/>
      <path d="M18 14L24 20L30 14" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M18 26L24 20L30 26" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.6"/>
    </svg>
  ),
  arrowLeft: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  ),
};

export default function Privacy() {
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8">{Icons.logo}</div>
            <span className="text-xl font-bold text-white">FlowAI</span>
          </Link>
          <Link
            to="/"
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            {Icons.arrowLeft}
            <span>Volver</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-8 md:p-12">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Política de Privacidad
          </h1>
          <p className="text-slate-400 mb-8">
            Última actualización: 7 de marzo de 2026
          </p>

          <div className="prose prose-invert prose-slate max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">1. Información que Recopilamos</h2>
              <p className="text-slate-300 leading-relaxed">
                En FlowAI recopilamos información para proporcionar y mejorar nuestros servicios:
              </p>
              
              <h3 className="text-lg font-medium text-white mt-6 mb-3">1.1 Información que usted proporciona</h3>
              <ul className="list-disc list-inside text-slate-300 space-y-2">
                <li><strong>Datos de registro:</strong> nombre, correo electrónico, contraseña</li>
                <li><strong>Datos de perfil:</strong> foto, nombre de empresa, tipo de negocio</li>
                <li><strong>Datos de facturación:</strong> procesados por nuestros proveedores de pago (Wompi, MercadoPago)</li>
                <li><strong>Contenido:</strong> datos que ingresa en tablas, configuraciones de agentes y flujos</li>
              </ul>

              <h3 className="text-lg font-medium text-white mt-6 mb-3">1.2 Información recopilada automáticamente</h3>
              <ul className="list-disc list-inside text-slate-300 space-y-2">
                <li><strong>Datos de uso:</strong> páginas visitadas, funciones utilizadas, tiempo de sesión</li>
                <li><strong>Datos del dispositivo:</strong> tipo de navegador, sistema operativo, dirección IP</li>
                <li><strong>Cookies:</strong> para mantener su sesión y preferencias</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">2. Cómo Usamos su Información</h2>
              <ul className="list-disc list-inside text-slate-300 space-y-2">
                <li>Proporcionar, mantener y mejorar el Servicio</li>
                <li>Procesar transacciones y enviar notificaciones relacionadas</li>
                <li>Enviar comunicaciones técnicas, actualizaciones y alertas de seguridad</li>
                <li>Responder a sus comentarios y preguntas</li>
                <li>Monitorear y analizar tendencias de uso</li>
                <li>Detectar, prevenir y abordar problemas técnicos y de seguridad</li>
                <li>Personalizar su experiencia en la plataforma</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">3. Compartir Información</h2>
              <p className="text-slate-300 leading-relaxed">
                No vendemos su información personal. Podemos compartir información con:
              </p>
              <ul className="list-disc list-inside text-slate-300 space-y-2 mt-4">
                <li><strong>Proveedores de servicio:</strong> que nos ayudan a operar la plataforma (hosting, pagos, email)</li>
                <li><strong>Cumplimiento legal:</strong> cuando sea requerido por ley o proceso legal</li>
                <li><strong>Protección de derechos:</strong> para proteger nuestros derechos, privacidad, seguridad o propiedad</li>
                <li><strong>Con su consentimiento:</strong> cuando usted autoriza expresamente el compartir</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">4. Inteligencia Artificial y sus Datos</h2>
              <p className="text-slate-300 leading-relaxed">
                Nuestros agentes de IA procesan los datos de sus conversaciones para proporcionar respuestas. Es importante entender que:
              </p>
              <ul className="list-disc list-inside text-slate-300 space-y-2 mt-4">
                <li>Las conversaciones se procesan a través de OpenAI siguiendo sus políticas de privacidad</li>
                <li>No usamos sus datos para entrenar modelos de terceros</li>
                <li>Los datos de conversaciones se almacenan en su workspace y usted controla su retención</li>
                <li>Puede eliminar conversaciones y datos en cualquier momento</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">5. Seguridad de Datos</h2>
              <p className="text-slate-300 leading-relaxed">
                Implementamos medidas de seguridad para proteger su información:
              </p>
              <ul className="list-disc list-inside text-slate-300 space-y-2 mt-4">
                <li>Cifrado de datos en tránsito (HTTPS/TLS)</li>
                <li>Contraseñas almacenadas con hash seguro (bcrypt)</li>
                <li>Tokens de autenticación con expiración (JWT)</li>
                <li>Acceso restringido a datos personales solo a personal autorizado</li>
                <li>Monitoreo de accesos y actividad sospechosa</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">6. Retención de Datos</h2>
              <p className="text-slate-300 leading-relaxed">
                Retenemos su información mientras su cuenta esté activa o sea necesaria para proporcionarle servicios. Después de cerrar su cuenta:
              </p>
              <ul className="list-disc list-inside text-slate-300 space-y-2 mt-4">
                <li>Datos de cuenta: eliminados en 30 días</li>
                <li>Datos de facturación: retenidos según requisitos legales (hasta 5 años)</li>
                <li>Logs de sistema: eliminados después de 90 días</li>
                <li>Backups: rotados y eliminados según política de retención</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">7. Sus Derechos</h2>
              <p className="text-slate-300 leading-relaxed">
                Bajo las leyes de protección de datos aplicables, usted tiene derecho a:
              </p>
              <ul className="list-disc list-inside text-slate-300 space-y-2 mt-4">
                <li><strong>Acceso:</strong> solicitar una copia de sus datos personales</li>
                <li><strong>Rectificación:</strong> corregir datos inexactos o incompletos</li>
                <li><strong>Eliminación:</strong> solicitar la eliminación de sus datos</li>
                <li><strong>Portabilidad:</strong> recibir sus datos en formato estructurado</li>
                <li><strong>Oposición:</strong> oponerse al procesamiento de sus datos</li>
                <li><strong>Retiro de consentimiento:</strong> en cualquier momento</li>
              </ul>
              <p className="text-slate-300 leading-relaxed mt-4">
                Para ejercer estos derechos, contáctenos en{" "}
                <a href="mailto:privacy@flowai.com" className="text-violet-400 hover:text-violet-300">
                  privacy@flowai.com
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">8. Cookies</h2>
              <p className="text-slate-300 leading-relaxed">
                Utilizamos cookies esenciales para el funcionamiento del servicio:
              </p>
              <ul className="list-disc list-inside text-slate-300 space-y-2 mt-4">
                <li><strong>Cookies de sesión:</strong> para mantenerlo autenticado</li>
                <li><strong>Cookies de preferencias:</strong> para recordar su configuración</li>
                <li><strong>Cookies analíticas:</strong> para entender el uso del servicio (anonimizadas)</li>
              </ul>
              <p className="text-slate-300 leading-relaxed mt-4">
                Puede configurar su navegador para rechazar cookies, pero esto puede afectar la funcionalidad del servicio.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">9. Menores de Edad</h2>
              <p className="text-slate-300 leading-relaxed">
                El Servicio no está dirigido a menores de 18 años. No recopilamos intencionalmente información de menores. Si descubrimos que hemos recopilado información de un menor, la eliminaremos inmediatamente.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">10. Transferencias Internacionales</h2>
              <p className="text-slate-300 leading-relaxed">
                Sus datos pueden ser transferidos y procesados en servidores ubicados fuera de su país de residencia. Tomamos medidas para asegurar que sus datos reciban protección adecuada según las leyes aplicables.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">11. Cambios a esta Política</h2>
              <p className="text-slate-300 leading-relaxed">
                Podemos actualizar esta política ocasionalmente. Le notificaremos cambios significativos por email o mediante un aviso destacado en el Servicio antes de que los cambios entren en vigor.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">12. Contacto</h2>
              <p className="text-slate-300 leading-relaxed">
                Si tiene preguntas sobre esta Política de Privacidad o nuestras prácticas de datos:
              </p>
              <ul className="list-none text-slate-300 space-y-2 mt-4">
                <li>Email: <a href="mailto:privacy@flowai.com" className="text-violet-400 hover:text-violet-300">privacy@flowai.com</a></li>
                <li>Responsable de datos: FlowAI S.A.S.</li>
                <li>Ubicación: Bogotá, Colombia</li>
              </ul>
            </section>
          </div>
        </div>

        {/* Footer links */}
        <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-slate-500">
          <Link to="/terms" className="hover:text-violet-400 transition-colors">
            Términos y Condiciones
          </Link>
          <Link to="/" className="hover:text-violet-400 transition-colors">
            Inicio
          </Link>
          <Link to="/login" className="hover:text-violet-400 transition-colors">
            Iniciar Sesión
          </Link>
        </div>
      </main>
    </div>
  );
}
