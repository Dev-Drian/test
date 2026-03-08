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

export default function Terms() {
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
            Términos y Condiciones de Uso
          </h1>
          <p className="text-slate-400 mb-8">
            Última actualización: 7 de marzo de 2026
          </p>

          <div className="prose prose-invert prose-slate max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">1. Aceptación de los Términos</h2>
              <p className="text-slate-300 leading-relaxed">
                Al acceder y utilizar la plataforma FlowAI ("el Servicio"), usted acepta estar sujeto a estos Términos y Condiciones de Uso. Si no está de acuerdo con alguna parte de estos términos, no podrá acceder al Servicio.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">2. Descripción del Servicio</h2>
              <p className="text-slate-300 leading-relaxed">
                FlowAI es una plataforma de automatización empresarial que permite a los usuarios crear agentes conversacionales con inteligencia artificial, gestionar bases de datos y automatizar flujos de trabajo. El servicio incluye:
              </p>
              <ul className="list-disc list-inside text-slate-300 space-y-2 mt-4">
                <li>Creación y gestión de chatbots con IA</li>
                <li>Almacenamiento de datos en tablas personalizables</li>
                <li>Automatización de flujos de trabajo sin código</li>
                <li>Integración con servicios de terceros</li>
                <li>Análisis y reportes de actividad</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">3. Registro y Cuenta</h2>
              <p className="text-slate-300 leading-relaxed">
                Para utilizar el Servicio, debe crear una cuenta proporcionando información veraz y completa. Usted es responsable de:
              </p>
              <ul className="list-disc list-inside text-slate-300 space-y-2 mt-4">
                <li>Mantener la confidencialidad de su contraseña</li>
                <li>Todas las actividades que ocurran bajo su cuenta</li>
                <li>Notificar inmediatamente cualquier uso no autorizado</li>
                <li>Mantener actualizada su información de contacto</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">4. Planes y Pagos</h2>
              <p className="text-slate-300 leading-relaxed">
                FlowAI ofrece diferentes planes de suscripción con distintas funcionalidades y límites. Los pagos se procesan a través de Wompi, un proveedor de pago seguro. Al suscribirse a un plan de pago:
              </p>
              <ul className="list-disc list-inside text-slate-300 space-y-2 mt-4">
                <li>Acepta los precios vigentes al momento de la suscripción</li>
                <li>Autoriza el cargo recurrente según el período seleccionado</li>
                <li>Puede cancelar en cualquier momento desde su cuenta</li>
                <li>Los reembolsos se evaluarán caso por caso</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">5. Uso Aceptable</h2>
              <p className="text-slate-300 leading-relaxed">
                Usted se compromete a no utilizar el Servicio para:
              </p>
              <ul className="list-disc list-inside text-slate-300 space-y-2 mt-4">
                <li>Actividades ilegales o fraudulentas</li>
                <li>Enviar spam o comunicaciones no solicitadas</li>
                <li>Distribuir malware o contenido malicioso</li>
                <li>Violar derechos de propiedad intelectual</li>
                <li>Intentar acceder a sistemas sin autorización</li>
                <li>Sobrecargar o interferir con la infraestructura del servicio</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">6. Propiedad Intelectual</h2>
              <p className="text-slate-300 leading-relaxed">
                FlowAI y sus licenciantes retienen todos los derechos de propiedad intelectual sobre el Servicio, incluyendo software, diseño, logos y contenido. Usted retiene la propiedad de los datos que ingresa en la plataforma.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">7. Limitación de Responsabilidad</h2>
              <p className="text-slate-300 leading-relaxed">
                El Servicio se proporciona "tal cual" sin garantías de ningún tipo. FlowAI no será responsable por daños indirectos, incidentales o consecuentes que surjan del uso del servicio. Nuestra responsabilidad máxima se limita al monto pagado por usted en los últimos 12 meses.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">8. Modificaciones</h2>
              <p className="text-slate-300 leading-relaxed">
                Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios significativos serán notificados por email con al menos 30 días de anticipación. El uso continuado del Servicio después de los cambios constituye aceptación de los nuevos términos.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">9. Terminación</h2>
              <p className="text-slate-300 leading-relaxed">
                Podemos suspender o terminar su acceso al Servicio por violación de estos términos o por cualquier motivo, con previo aviso cuando sea posible. Usted puede cerrar su cuenta en cualquier momento desde la configuración de su perfil.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">10. Ley Aplicable</h2>
              <p className="text-slate-300 leading-relaxed">
                Estos términos se rigen por las leyes de la República de Colombia. Cualquier disputa será resuelta en los tribunales competentes de Bogotá, Colombia.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">11. Contacto</h2>
              <p className="text-slate-300 leading-relaxed">
                Para preguntas sobre estos términos, contáctenos en:{" "}
                <a href="mailto:legal@flowai.com" className="text-violet-400 hover:text-violet-300">
                  legal@flowai.com
                </a>
              </p>
            </section>
          </div>
        </div>

        {/* Footer links */}
        <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-slate-500">
          <Link to="/privacy" className="hover:text-violet-400 transition-colors">
            Política de Privacidad
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
