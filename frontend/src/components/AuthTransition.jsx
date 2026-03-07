/**
 * AuthTransition.jsx
 * Componente de transición premium para login/logout
 */
import { useEffect, useState, useMemo } from 'react';
import { LogIn, LogOut, CheckCircle, Shield, Fingerprint, Lock, Unlock, UserCheck, Zap } from 'lucide-react';

export default function AuthTransition({ type = 'login', userName = '', onComplete }) {
  const [stage, setStage] = useState(0); // 0: enter, 1: verifying, 2: processing, 3: complete
  const [progress, setProgress] = useState(0);

  const isLogin = type === 'login';

  // Mensajes dinámicos según la etapa
  const stageConfig = useMemo(() => ({
    login: [
      { icon: Fingerprint, text: 'Verificando identidad...', subtext: 'Validando credenciales de seguridad' },
      { icon: Shield, text: 'Autenticando...', subtext: 'Estableciendo conexión segura' },
      { icon: Lock, text: 'Configurando sesión...', subtext: 'Preparando tu espacio de trabajo' },
      { icon: UserCheck, text: '¡Bienvenido!', subtext: userName ? `Hola de nuevo, ${userName}` : 'Acceso concedido' },
    ],
    logout: [
      { icon: Lock, text: 'Cerrando sesión...', subtext: 'Guardando tu progreso' },
      { icon: Shield, text: 'Protegiendo datos...', subtext: 'Asegurando tu información' },
      { icon: Unlock, text: 'Finalizando...', subtext: 'Limpiando caché local' },
      { icon: CheckCircle, text: '¡Hasta pronto!', subtext: 'Tu sesión fue cerrada de forma segura' },
    ]
  }), [userName]);

  const currentStage = stageConfig[isLogin ? 'login' : 'logout'][stage] || stageConfig[isLogin ? 'login' : 'logout'][0];
  const StageIcon = currentStage.icon;

  useEffect(() => {
    // Progreso suave
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 0.8, 100));
    }, 25);

    // Transiciones de etapa
    const timers = [
      setTimeout(() => setStage(1), 600),
      setTimeout(() => setStage(2), 1200),
      setTimeout(() => setStage(3), 1800),
      setTimeout(() => onComplete?.(), 2600),
    ];

    return () => {
      clearInterval(progressInterval);
      timers.forEach(clearTimeout);
    };
  }, [onComplete]);

  // Generar partículas
  const particles = useMemo(() => 
    [...Array(30)].map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * 2,
      duration: 4 + Math.random() * 6,
      delay: Math.random() * 3,
      opacity: 0.1 + Math.random() * 0.3
    })), []
  );

  // Generar líneas de conexión (efecto tech)
  const lines = useMemo(() => 
    [...Array(8)].map((_, i) => ({
      id: i,
      angle: (i * 45) + Math.random() * 20,
      length: 80 + Math.random() * 120,
      delay: i * 0.1
    })), []
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden">
      {/* Fondo con gradiente animado */}
      <div 
        className="absolute inset-0 transition-all duration-1000"
        style={{ 
          background: isLogin
            ? 'radial-gradient(ellipse at center, rgba(30, 27, 75, 0.95) 0%, rgba(10, 10, 15, 0.98) 70%)'
            : 'radial-gradient(ellipse at center, rgba(50, 20, 20, 0.95) 0%, rgba(10, 10, 15, 0.98) 70%)',
        }}
      />

      {/* Grid pattern de fondo */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Partículas flotantes */}
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: isLogin ? '#8b5cf6' : '#ef4444',
            opacity: p.opacity,
            animation: `authFloat ${p.duration}s ease-in-out infinite`,
            animationDelay: `${p.delay}s`
          }}
        />
      ))}

      {/* Contenido principal */}
      <div className="relative z-10 flex flex-col items-center">
        
        {/* Contenedor del icono con efectos */}
        <div className="relative mb-10">
          {/* Anillos expandibles */}
          {[1, 2, 3].map(ring => (
            <div
              key={ring}
              className="absolute inset-0 rounded-full border"
              style={{
                borderColor: isLogin ? 'rgba(139, 92, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                animation: `authRing 2s ease-out infinite`,
                animationDelay: `${ring * 0.3}s`,
                transform: 'scale(1)'
              }}
            />
          ))}

          {/* Líneas de conexión tech */}
          <div className="absolute inset-0 flex items-center justify-center">
            {lines.map(line => (
              <div
                key={line.id}
                className="absolute h-[1px] origin-left"
                style={{
                  width: line.length,
                  background: `linear-gradient(90deg, ${isLogin ? 'rgba(139, 92, 246, 0.5)' : 'rgba(239, 68, 68, 0.4)'} 0%, transparent 100%)`,
                  transform: `rotate(${line.angle}deg)`,
                  animation: `authLine 1.5s ease-out forwards`,
                  animationDelay: `${line.delay}s`,
                  opacity: stage >= 1 ? 1 : 0
                }}
              />
            ))}
          </div>

          {/* Glow principal */}
          <div 
            className="absolute -inset-8 rounded-full blur-3xl transition-all duration-700"
            style={{ 
              background: isLogin 
                ? 'radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(239, 68, 68, 0.35) 0%, transparent 70%)',
              transform: stage === 3 ? 'scale(1.3)' : 'scale(1)'
            }} 
          />
          
          {/* Círculo principal con icono */}
          <div 
            className="relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-500"
            style={{ 
              background: isLogin
                ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.9) 0%, rgba(99, 102, 241, 0.9) 100%)'
                : 'linear-gradient(135deg, rgba(239, 68, 68, 0.9) 0%, rgba(249, 115, 22, 0.9) 100%)',
              boxShadow: isLogin
                ? '0 0 60px rgba(139, 92, 246, 0.5), inset 0 0 30px rgba(255,255,255,0.1)'
                : '0 0 60px rgba(239, 68, 68, 0.4), inset 0 0 30px rgba(255,255,255,0.1)',
              transform: stage === 3 ? 'scale(1.1)' : 'scale(1)'
            }}
          >
            {/* Borde brillante */}
            <div 
              className="absolute inset-0 rounded-full"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%, rgba(255,255,255,0.1) 100%)',
                padding: '2px'
              }}
            />
            
            {/* Icono con transición */}
            <div className="relative transition-all duration-300" style={{ transform: `scale(${stage === 3 ? 1.1 : 1})` }}>
              <StageIcon 
                className={`w-12 h-12 text-white transition-all duration-300 ${stage === 3 ? 'drop-shadow-lg' : ''}`}
                strokeWidth={stage === 3 ? 2.5 : 2}
              />
            </div>

            {/* Indicador de carga orbital */}
            {stage < 3 && (
              <div 
                className="absolute inset-[-8px] rounded-full border-2 border-transparent"
                style={{
                  borderTopColor: 'rgba(255,255,255,0.6)',
                  borderRightColor: 'rgba(255,255,255,0.3)',
                  animation: 'authSpin 1s linear infinite'
                }}
              />
            )}
          </div>

          {/* Badges de estado */}
          {stage >= 2 && (
            <div 
              className="absolute -right-2 -top-2 w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.5)',
                animation: 'authPop 0.3s ease-out forwards'
              }}
            >
              <Zap className="w-4 h-4 text-white" />
            </div>
          )}
        </div>

        {/* Texto con transiciones */}
        <div className="text-center mb-8 h-20">
          <h2 
            className="text-3xl font-bold text-white mb-3 transition-all duration-300"
            style={{ 
              textShadow: isLogin 
                ? '0 0 30px rgba(139, 92, 246, 0.5)' 
                : '0 0 30px rgba(239, 68, 68, 0.4)'
            }}
          >
            {currentStage.text}
          </h2>
          <p className="text-slate-400 text-sm transition-all duration-300">
            {currentStage.subtext}
          </p>
        </div>

        {/* Barra de progreso premium */}
        <div className="w-72 relative">
          {/* Fondo de la barra */}
          <div 
            className="h-2 rounded-full overflow-hidden relative"
            style={{ background: 'rgba(71, 85, 105, 0.3)' }}
          >
            {/* Barra de progreso con brillo */}
            <div 
              className="h-full rounded-full transition-all duration-200 ease-out relative overflow-hidden"
              style={{ 
                width: `${progress}%`,
                background: isLogin
                  ? 'linear-gradient(90deg, #8b5cf6 0%, #6366f1 50%, #8b5cf6 100%)'
                  : 'linear-gradient(90deg, #ef4444 0%, #f97316 50%, #ef4444 100%)',
                backgroundSize: '200% 100%',
                animation: 'authShimmer 1.5s linear infinite'
              }}
            >
              {/* Efecto de brillo que pasa */}
              <div 
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                  animation: 'authShine 1s ease-in-out infinite'
                }}
              />
            </div>
          </div>

          {/* Porcentaje */}
          <div className="flex justify-between mt-3 text-xs">
            <span className="text-slate-500">Progreso</span>
            <span 
              className="font-mono font-medium transition-all duration-200"
              style={{ color: isLogin ? '#a78bfa' : '#fca5a5' }}
            >
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        {/* Indicadores de etapa */}
        <div className="flex gap-2 mt-8">
          {[0, 1, 2, 3].map(s => (
            <div
              key={s}
              className="w-2 h-2 rounded-full transition-all duration-300"
              style={{
                background: s <= stage 
                  ? (isLogin ? '#8b5cf6' : '#ef4444')
                  : 'rgba(71, 85, 105, 0.4)',
                transform: s === stage ? 'scale(1.3)' : 'scale(1)',
                boxShadow: s <= stage 
                  ? `0 0 10px ${isLogin ? 'rgba(139, 92, 246, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`
                  : 'none'
              }}
            />
          ))}
        </div>
      </div>

      {/* Estilos de animación */}
      <style>{`
        @keyframes authFloat {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-30px) scale(1.2); }
        }
        @keyframes authRing {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes authLine {
          0% { transform: rotate(var(--angle)) scaleX(0); opacity: 0; }
          100% { transform: rotate(var(--angle)) scaleX(1); opacity: 1; }
        }
        @keyframes authSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes authPop {
          0% { transform: scale(0); }
          70% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        @keyframes authShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes authShine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
