'use client';

import { useState, useEffect } from 'react';

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-[#F8F7FF] p-8">
      <h1 className="text-[#1a1a2e] text-3xl font-semibold mb-2 text-center">Comparatif Design</h1>
      <p className="text-[#6B7280] text-center mb-12">Clique sur celui qui te plaît le plus</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 max-w-7xl mx-auto">
        <SaasModern />
        <SwissRailway />
        <NeoBrutalist />
        <HauteHorlogerie />
        <JapaneseMinimal />
        <RetroTerminal />
      </div>
    </div>
  );
}

// ============================================
// SAAS MODERN (Alan-style)
// ============================================
function SaasModern() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="bg-white rounded-3xl p-6 relative overflow-hidden transition-all duration-500 ease-out hover:shadow-2xl hover:shadow-violet-200/50"
      style={{
        boxShadow: '0 4px 24px -4px rgba(139, 92, 246, 0.12), 0 0 0 1px rgba(139, 92, 246, 0.05)'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        .saas-font { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
      `}</style>

      {/* Gradient blob decoration */}
      <div
        className="absolute -top-20 -right-20 w-40 h-40 rounded-full transition-transform duration-700"
        style={{
          background: 'linear-gradient(135deg, #E0E7FF 0%, #DDD6FE 50%, #FECACA 100%)',
          filter: 'blur(40px)',
          opacity: 0.6,
          transform: isHovered ? 'scale(1.2)' : 'scale(1)'
        }}
      />

      <div className="relative saas-font">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shadow-lg shadow-violet-200">
              JM
            </div>
            <div>
              <h3 className="font-semibold text-[#1a1a2e]">Jean Martin</h3>
              <p className="text-sm text-[#6B7280]">Développeur</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-medium text-emerald-700">En ligne</span>
          </div>
        </div>

        {/* Time cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-gradient-to-br from-[#F8F7FF] to-[#EEF2FF] rounded-2xl p-4 border border-violet-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14" />
                </svg>
              </div>
              <span className="text-xs font-medium text-[#6B7280]">Arrivée</span>
            </div>
            <p className="text-2xl font-bold text-[#1a1a2e]">09:03</p>
          </div>

          <div className="bg-gradient-to-br from-[#FFF7ED] to-[#FFEDD5] rounded-2xl p-4 border border-orange-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-orange-100 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
              <span className="text-xs font-medium text-[#6B7280]">Départ</span>
            </div>
            <p className="text-2xl font-bold text-[#1a1a2e]">18:27</p>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-[#1a1a2e] rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-violet-300 text-xs font-medium mb-1">Heures travaillées</p>
              <p className="text-white text-2xl font-bold">9h 24min</p>
            </div>
            <div className="text-right">
              <p className="text-violet-300 text-xs font-medium mb-1">Surplus</p>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </div>
                <span className="text-emerald-400 text-xl font-bold">+1h24</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium text-[#6B7280]">Objectif hebdo</span>
            <span className="text-xs font-semibold text-violet-600">87%</span>
          </div>
          <div className="h-2 bg-violet-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-1000"
              style={{ width: '87%' }}
            />
          </div>
        </div>

        <p className="text-center text-violet-300 text-xs mt-6 tracking-widest font-medium">SAAS MODERN</p>
      </div>
    </div>
  );
}

// ============================================
// 1. SWISS RAILWAY
// ============================================
function SwissRailway() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-[#1a1a1a] p-6 rounded-sm border-t-4 border-[#EC0000] font-sans">
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=DIN+Alternate:wght@700&display=swap');
        .swiss-font { font-family: 'Helvetica Neue', 'Arial Black', sans-serif; }
        .flip-digit {
          background: #2a2a2a;
          border-radius: 4px;
          padding: 8px 12px;
          font-size: 2rem;
          font-weight: bold;
          color: #fff;
          font-family: 'Helvetica Neue', monospace;
          box-shadow: inset 0 -2px 0 rgba(0,0,0,0.3);
        }
      `}</style>

      <div className="flex items-center justify-between mb-6">
        <span className="text-[#EC0000] font-bold text-sm tracking-wider">● SBB CFF FFS</span>
        <div className="flex items-center gap-1 text-white swiss-font text-2xl font-bold">
          {time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          <span className="w-2 h-2 bg-[#EC0000] rounded-full animate-pulse ml-2"></span>
        </div>
      </div>

      <div className="border-t border-b border-neutral-700 py-4 mb-4">
        <div className="grid grid-cols-[auto_1fr_auto] gap-4 items-center">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <div>
            <p className="text-white font-bold text-lg swiss-font">MARTIN Jean</p>
            <p className="text-neutral-500 text-sm">Développeur</p>
          </div>
          <span className="text-green-400 text-sm font-bold tracking-wider">À L'HEURE</span>
        </div>
      </div>

      <div className="flex justify-center gap-4 mb-6">
        <div className="text-center">
          <p className="text-neutral-500 text-xs mb-2 tracking-wider">ENTRÉE</p>
          <div className="flex gap-1">
            <span className="flip-digit">0</span>
            <span className="flip-digit">9</span>
            <span className="text-white text-2xl font-bold self-center">:</span>
            <span className="flip-digit">0</span>
            <span className="flip-digit">3</span>
          </div>
        </div>
        <div className="text-center">
          <p className="text-neutral-500 text-xs mb-2 tracking-wider">SORTIE</p>
          <div className="flex gap-1">
            <span className="flip-digit">1</span>
            <span className="flip-digit">8</span>
            <span className="text-white text-2xl font-bold self-center">:</span>
            <span className="flip-digit">2</span>
            <span className="flip-digit">7</span>
          </div>
        </div>
      </div>

      <div className="bg-[#2a2a2a] p-3 flex justify-between items-center">
        <span className="text-neutral-400 text-sm">DURÉE TOTALE</span>
        <span className="text-[#FFCC00] font-bold text-xl swiss-font">09:24</span>
      </div>

      <p className="text-center text-neutral-600 text-xs mt-4 tracking-widest">SWISS RAILWAY</p>
    </div>
  );
}

// ============================================
// 2. NEO-BRUTALIST
// ============================================
function NeoBrutalist() {
  return (
    <div className="bg-[#FDF6E3] p-6 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Space+Mono:wght@400;700&display=swap');
        .brutalist-title { font-family: 'Playfair Display', serif; }
        .brutalist-mono { font-family: 'Space Mono', monospace; }
        .stamp {
          position: absolute;
          transform: rotate(-12deg);
          border: 3px solid #C41E3A;
          color: #C41E3A;
          padding: 4px 12px;
          font-family: 'Space Mono', monospace;
          font-weight: bold;
          font-size: 0.75rem;
        }
      `}</style>

      {/* Texture grain */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
      }}></div>

      <div className="stamp top-4 right-4">VALIDÉ ✓</div>

      <h2 className="brutalist-title text-3xl text-black mb-1">POINTAGE</h2>
      <p className="brutalist-mono text-xs text-neutral-600 mb-6 border-b-2 border-black pb-2">
        ÉDITION DU 22 JANVIER 2026
      </p>

      <div className="border-2 border-black p-4 mb-4 bg-white">
        <p className="brutalist-mono text-xs text-neutral-500 mb-1">NOM DE L'EMPLOYÉ</p>
        <p className="brutalist-title text-2xl text-black">Martin Jean</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="border-2 border-black p-3 bg-white">
          <p className="brutalist-mono text-xs text-neutral-500">ARRIVÉE</p>
          <p className="brutalist-mono text-3xl text-black font-bold">09:03</p>
        </div>
        <div className="border-2 border-black p-3 bg-white">
          <p className="brutalist-mono text-xs text-neutral-500">DÉPART</p>
          <p className="brutalist-mono text-3xl text-black font-bold">18:27</p>
        </div>
      </div>

      <div className="bg-black text-[#FDF6E3] p-4 brutalist-mono">
        <div className="flex justify-between items-center">
          <span className="text-sm">HEURES TRAVAILLÉES</span>
          <span className="text-2xl font-bold">09h24</span>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-sm">SURPLUS</span>
          <span className="text-green-400 font-bold">+01h24</span>
        </div>
      </div>

      <p className="text-center text-neutral-400 text-xs mt-4 brutalist-mono tracking-widest">NEO-BRUTALIST</p>
    </div>
  );
}

// ============================================
// 3. HAUTE HORLOGERIE
// ============================================
function HauteHorlogerie() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setSeconds(s => (s + 1) % 60), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-gradient-to-b from-[#0A1628] to-[#0D1E36] p-6 rounded-lg relative overflow-hidden">
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&display=swap');
        .horlogerie-serif { font-family: 'Cormorant Garamond', serif; }
        .gold-text { color: #D4AF37; }
        .guilloche {
          background-image: repeating-linear-gradient(
            45deg,
            transparent,
            transparent 2px,
            rgba(212, 175, 55, 0.03) 2px,
            rgba(212, 175, 55, 0.03) 4px
          );
        }
      `}</style>

      {/* Guilloche pattern */}
      <div className="absolute inset-0 guilloche"></div>

      {/* Decorative circle */}
      <div className="absolute top-4 right-4 w-16 h-16 rounded-full border border-[#D4AF37]/20 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border border-[#D4AF37]/30 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border border-[#D4AF37]/40 flex items-center justify-center">
            <div
              className="w-1 h-4 bg-[#D4AF37] origin-bottom rounded-full"
              style={{ transform: `rotate(${seconds * 6}deg)` }}
            ></div>
          </div>
        </div>
      </div>

      <p className="text-[#D4AF37]/60 text-xs tracking-[0.3em] mb-1 horlogerie-serif">MANUFACTURE</p>
      <h2 className="horlogerie-serif text-3xl gold-text mb-6">Pointage</h2>

      <div className="mb-6">
        <p className="text-[#8899AA] text-xs tracking-wider mb-1">COLLABORATEUR</p>
        <p className="horlogerie-serif text-xl text-white">Jean Martin</p>
        <p className="text-[#8899AA]/60 text-sm horlogerie-serif italic">Maître Horloger</p>
      </div>

      <div className="flex gap-8 mb-6">
        <div>
          <p className="text-[#D4AF37]/60 text-xs tracking-wider mb-2">ENTRÉE</p>
          <p className="horlogerie-serif text-4xl text-white tracking-wider">
            <span className="gold-text">IX</span>
            <span className="text-[#D4AF37]/40 mx-1">:</span>
            <span>03</span>
          </p>
        </div>
        <div>
          <p className="text-[#D4AF37]/60 text-xs tracking-wider mb-2">SORTIE</p>
          <p className="horlogerie-serif text-4xl text-white tracking-wider">
            <span className="gold-text">XVIII</span>
            <span className="text-[#D4AF37]/40 mx-1">:</span>
            <span>27</span>
          </p>
        </div>
      </div>

      <div className="border-t border-[#D4AF37]/20 pt-4">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-[#8899AA]/60 text-xs tracking-wider">HEURES OUVRÉES</p>
            <p className="horlogerie-serif text-2xl text-white">9h 24min</p>
          </div>
          <div className="text-right">
            <p className="text-[#8899AA]/60 text-xs tracking-wider">EXCÉDENT</p>
            <p className="horlogerie-serif text-xl gold-text">+1h 24</p>
          </div>
        </div>
      </div>

      <p className="text-center text-[#D4AF37]/30 text-xs mt-6 tracking-[0.2em] horlogerie-serif">HAUTE HORLOGERIE</p>
    </div>
  );
}

// ============================================
// 4. JAPANESE MINIMAL
// ============================================
function JapaneseMinimal() {
  return (
    <div className="bg-[#FAFAF8] p-8 rounded-2xl relative">
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@400;600&family=Noto+Sans+JP:wght@300;400;500&display=swap');
        .jp-serif { font-family: 'Fraunces', serif; }
        .jp-sans { font-family: 'Noto Sans JP', sans-serif; }
      `}</style>

      {/* Organic shape */}
      <div className="absolute top-6 right-6 w-20 h-20 rounded-full bg-[#C45B28]/10"></div>
      <div className="absolute top-10 right-10 w-12 h-12 rounded-full bg-[#C45B28]/5"></div>

      <p className="jp-sans text-[#C45B28] text-xs tracking-widest mb-8 font-light">出勤管理</p>

      <h2 className="jp-serif text-2xl text-[#2D2D2D] mb-1 font-semibold">Martin Jean</h2>
      <p className="jp-sans text-sm text-[#9A9A9A] font-light mb-10">エンジニア</p>

      <div className="space-y-8 mb-10">
        <div className="flex items-end justify-between border-b border-[#E8E8E6] pb-4">
          <div>
            <p className="jp-sans text-xs text-[#9A9A9A] mb-1 font-light">入</p>
            <p className="jp-serif text-3xl text-[#2D2D2D]">09:03</p>
          </div>
          <div className="w-8 h-[1px] bg-[#C45B28]/40"></div>
          <div className="text-right">
            <p className="jp-sans text-xs text-[#9A9A9A] mb-1 font-light">出</p>
            <p className="jp-serif text-3xl text-[#2D2D2D]">18:27</p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-end">
        <div>
          <p className="jp-sans text-xs text-[#9A9A9A] font-light">合計</p>
          <p className="jp-serif text-xl text-[#2D2D2D]">9時間24分</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#C45B28]"></div>
          <span className="jp-sans text-sm text-[#C45B28]">+1:24</span>
        </div>
      </div>

      <p className="text-center text-[#D4D4D4] text-xs mt-8 tracking-[0.3em] jp-sans">JAPANESE MINIMAL</p>
    </div>
  );
}

// ============================================
// 5. RETRO TERMINAL
// ============================================
function RetroTerminal() {
  const [bootComplete, setBootComplete] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    const bootTimer = setTimeout(() => setBootComplete(true), 500);
    const cursorTimer = setInterval(() => setCursorVisible(v => !v), 530);
    return () => {
      clearTimeout(bootTimer);
      clearInterval(cursorTimer);
    };
  }, []);

  return (
    <div className="bg-[#0D0208] p-6 rounded-lg relative overflow-hidden border border-[#00FF41]/30">
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&display=swap');
        .terminal-font { font-family: 'IBM Plex Mono', monospace; }
        .glow { text-shadow: 0 0 10px #00FF41, 0 0 20px #00FF41, 0 0 30px #00FF41; }
        .scanlines {
          background: repeating-linear-gradient(
            0deg,
            rgba(0, 0, 0, 0.15),
            rgba(0, 0, 0, 0.15) 1px,
            transparent 1px,
            transparent 2px
          );
        }
        .crt-flicker {
          animation: flicker 0.15s infinite;
        }
        @keyframes flicker {
          0% { opacity: 0.97; }
          50% { opacity: 1; }
          100% { opacity: 0.98; }
        }
      `}</style>

      {/* Scanlines overlay */}
      <div className="absolute inset-0 scanlines pointer-events-none"></div>

      {/* CRT glow effect */}
      <div className="absolute inset-0 bg-[#00FF41]/5 rounded-lg"></div>

      <div className="relative terminal-font crt-flicker">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#00FF41]/30">
          <span className="text-[#00FF41]/60">⬤</span>
          <span className="text-[#00FF41] text-sm">POINTEUSE v2.4.1</span>
        </div>

        {bootComplete ? (
          <>
            <div className="text-[#00FF41] text-sm mb-4 space-y-1">
              <p><span className="text-[#00FF41]/60">&gt;</span> UTILISATEUR: <span className="glow">MARTIN_J</span></p>
              <p><span className="text-[#00FF41]/60">&gt;</span> POSTE: DEVELOPPEUR</p>
              <p><span className="text-[#00FF41]/60">&gt;</span> STATUS: <span className="text-green-400">ACTIF</span></p>
            </div>

            <div className="border border-[#00FF41]/40 p-4 mb-4 bg-[#00FF41]/5">
              <p className="text-[#00FF41]/60 text-xs mb-2">═══ HORAIRES DU JOUR ═══</p>
              <div className="grid grid-cols-2 gap-4 text-[#00FF41]">
                <div>
                  <p className="text-xs text-[#00FF41]/60">ENTRÉE</p>
                  <p className="text-2xl glow">09:03:27</p>
                </div>
                <div>
                  <p className="text-xs text-[#00FF41]/60">SORTIE</p>
                  <p className="text-2xl glow">18:27:14</p>
                </div>
              </div>
            </div>

            <div className="text-[#00FF41] text-sm space-y-1">
              <p><span className="text-[#00FF41]/60">&gt;</span> HEURES_TRAVAILLEES: <span className="text-[#FFFF00]">09:23:47</span></p>
              <p><span className="text-[#00FF41]/60">&gt;</span> SURPLUS: <span className="text-[#00FF00]">+01:23:47</span></p>
              <p className="mt-2">
                <span className="text-[#00FF41]/60">&gt;</span> PRÊT{cursorVisible ? '█' : ' '}
              </p>
            </div>
          </>
        ) : (
          <div className="text-[#00FF41] text-sm">
            <p>INITIALISATION...</p>
            <p className="animate-pulse">████████████░░░░░░░░</p>
          </div>
        )}
      </div>

      <p className="text-center text-[#00FF41]/30 text-xs mt-4 terminal-font tracking-widest relative">RETRO TERMINAL</p>
    </div>
  );
}
