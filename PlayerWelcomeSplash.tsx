import React, { useEffect, useState } from 'react';
import ClubLogo from './ClubLogo';
import { Trophy, Award, Sparkles, ChevronLeft, Flame } from 'lucide-react';
import { Person } from '../types';

interface PlayerWelcomeSplashProps {
  player: Person;
  onComplete: () => void;
}

export const PlayerWelcomeSplash: React.FC<PlayerWelcomeSplashProps> = ({ player, onComplete }) => {
  const [stage, setStage] = useState<'logo' | 'trophies' | 'text' | 'ready'>('logo');
  const [isClosing, setIsClosing] = useState(false);
  const [progress, setProgress] = useState(0);

  // Staged entrance animation sequence
  useEffect(() => {
    const t1 = setTimeout(() => setStage('trophies'), 600);
    const t2 = setTimeout(() => setStage('text'), 1300);
    const t3 = setTimeout(() => setStage('ready'), 2000);

    // Progress bar for auto-exit (~5.5 seconds)
    const startTime = Date.now();
    const duration = 5500;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(interval);
        handleClose();
      }
    }, 40);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearInterval(interval);
    };
  }, []);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onComplete();
    }, 650); // Wait for exit animation to finish
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-hidden font-['IBM_Plex_Sans_Arabic'] select-none transition-all duration-700 ease-out ${
        isClosing ? 'opacity-0 scale-105 pointer-events-none blur-sm' : 'opacity-100 scale-100'
      }`}
      style={{
        background: 'radial-gradient(ellipse at center, #0b254e 0%, #061530 45%, #020917 100%)'
      }}
      dir="rtl"
    >
      {/* Dynamic Background Elements: Club Colors (Royal Blue, Pure White, Vibrant Orange) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Deep Royal Blue Radial Aura */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] sm:w-[600px] h-[380px] sm:h-[600px] bg-gradient-to-r from-blue-600/35 via-indigo-500/25 to-blue-400/20 rounded-full blur-[110px] animate-pulse"></div>

        {/* Fiery Club Orange Aura for contrast */}
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-orange-500/25 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '4s' }}></div>
        <div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-blue-500/20 rounded-full blur-[90px]"></div>

        {/* Floating Sparks and Stars in Club Colors (Blue, Orange, White) */}
        <div className="absolute top-12 right-16 text-orange-400/80 animate-bounce text-sm">✦</div>
        <div className="absolute top-24 left-20 text-white/90 animate-pulse text-lg">★</div>
        <div className="absolute bottom-20 right-28 text-blue-300/80 animate-pulse text-base">✦</div>
        <div className="absolute bottom-32 left-16 text-orange-400/90 animate-bounce text-sm">★</div>
        <div className="absolute top-1/3 right-1/4 text-white/50 text-xs">✦</div>
        <div className="absolute bottom-1/3 left-1/4 text-blue-400/50 text-xs">★</div>
        <div className="absolute top-16 left-1/3 text-orange-300/70 text-xs animate-ping">✦</div>

        {/* Subtle Pitch Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.05]" 
          style={{
            backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', 
            backgroundSize: '32px 32px'
          }}
        ></div>
      </div>

      {/* Main Container */}
      <div className="relative z-10 max-w-lg w-full mx-4 px-4 py-8 sm:py-10 text-center flex flex-col items-center">
        
        {/* Club Logo with Radiant Halo in Blue, White & Orange */}
        <div className="relative mb-6">
          {/* Animated Club Rings (Blue & Orange) */}
          <div className="absolute -inset-4 sm:-inset-6 rounded-full border-2 border-dashed border-blue-400/40 animate-spin" style={{ animationDuration: '20s' }}></div>
          <div className="absolute -inset-2 sm:-inset-3 rounded-full border-2 border-orange-500/50 animate-pulse"></div>

          {/* Logo Card with 3D Shadow & Crisp White Background */}
          <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-white p-2.5 sm:p-3 shadow-[0_0_50px_rgba(37,99,235,0.45),0_0_80px_rgba(249,115,22,0.35)] border-4 border-white flex items-center justify-center transform hover:scale-105 transition-transform duration-500">
            <ClubLogo size={120} className="w-full h-full object-contain" />
            
            {/* Shimmer Badge at top right with Club Orange & White */}
            <div className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white p-1.5 rounded-full shadow-lg border-2 border-white">
              <Sparkles size={16} className="animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            {/* Shimmer Badge at bottom left with Club Blue */}
            <div className="absolute -bottom-2 -left-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-1.5 rounded-full shadow-lg border-2 border-white">
              <Flame size={15} className="animate-pulse" />
            </div>
          </div>
        </div>

        {/* Trophy and Medal Section (بدون أي كتابة تحتهما - بألوان النادي: أزرق، أبيض، برتقالي) */}
        <div 
          className={`flex items-center justify-center gap-5 sm:gap-7 my-3 transition-all duration-700 transform ${
            stage === 'logo' ? 'opacity-0 scale-75 translate-y-4' : 'opacity-100 scale-100 translate-y-0'
          }`}
        >
          {/* Trophy (كأس - بدون أي كتابة تحته) */}
          <div className="group">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-orange-500/25 via-orange-600/15 to-blue-900/30 border-2 border-orange-400/80 flex items-center justify-center shadow-[0_0_25px_rgba(249,115,22,0.5)] transform hover:scale-110 active:scale-95 transition-all">
              <Trophy size={32} className="text-orange-400 drop-shadow-[0_2px_12px_rgba(249,115,22,0.85)] animate-pulse" />
            </div>
          </div>

          {/* Central Club Crest Divider (Blue, White, Orange) */}
          <div className="flex items-center gap-1.5 px-1 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_#ffffff]"></span>
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></span>
          </div>

          {/* Medal (ميدالية - بدون أي كتابة تحتها) */}
          <div className="group">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-blue-500/25 via-blue-600/15 to-orange-900/20 border-2 border-blue-400/80 flex items-center justify-center shadow-[0_0_25px_rgba(59,130,246,0.5)] transform hover:scale-110 active:scale-95 transition-all">
              <Award size={34} className="text-white drop-shadow-[0_2px_12px_rgba(59,130,246,0.9)] animate-pulse" />
            </div>
          </div>
        </div>

        {/* Text Section (الرسالة المطلوبة بألوان النادي: الأزرق، الأبيض، والبرتقالي) */}
        <div 
          className={`space-y-3 mt-4 transition-all duration-700 transform ${
            stage === 'text' || stage === 'ready' 
              ? 'opacity-100 translate-y-0 scale-100' 
              : 'opacity-0 translate-y-6 scale-95'
          }`}
        >
          {/* Main Title 1: باللون الأبيض الناصع مع توهج أزرق ملكي */}
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white drop-shadow-[0_2px_15px_rgba(59,130,246,0.6)] leading-tight tracking-tight">
            أهلاً بأحد أفضل لاعبي كرة القدم في سوريا
          </h2>

          {/* Subtitle 2: بلون النادي البرتقالي المتوهج مع تدرج أبيض */}
          <p className="text-base sm:text-lg md:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-white drop-shadow-[0_2px_10px_rgba(249,115,22,0.4)] leading-relaxed">
            مرحباً بك في النادي الأعظم في سوريا
          </p>

          {/* Player Badge بألوان النادي */}
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-900/80 via-blue-800/80 to-blue-950/80 backdrop-blur-md border border-blue-400/40 px-4 py-1.5 rounded-full text-white text-xs sm:text-sm font-bold shadow-[0_4px_20px_rgba(0,0,0,0.3)] mt-2">
            <span className="text-orange-400 font-black">الكابتن:</span>
            <span className="text-white font-extrabold">{player.name}</span>
            {player.number && (
              <span className="bg-orange-500 text-white font-black px-2 py-0.5 rounded-full text-[10px] shadow-sm">
                #{player.number}
              </span>
            )}
            <span className="text-blue-200 text-[11px]">| فئة {player.category}</span>
          </div>
        </div>

        {/* Action Button & Auto-progress */}
        <div 
          className={`w-full mt-8 space-y-4 transition-all duration-500 ${
            stage === 'ready' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          {/* Main Enter Button بألوان النادي (أزرق - أبيض - برتقالي) */}
          <button
            onClick={handleClose}
            className="w-full sm:w-auto min-w-[260px] mx-auto bg-gradient-to-r from-blue-600 via-blue-500 to-orange-500 hover:from-blue-500 hover:to-orange-400 text-white font-black text-sm sm:text-base py-3 px-8 rounded-2xl shadow-[0_0_35px_rgba(249,115,22,0.4),0_0_20px_rgba(37,99,235,0.4)] transform active:scale-95 hover:scale-105 transition-all flex items-center justify-center gap-2 border-2 border-white/40"
          >
            <span>دخول إلى معقل الأبطال</span>
            <ChevronLeft size={20} className="animate-pulse" />
          </button>

          {/* Progress Bar & Subtext */}
          <div className="max-w-xs mx-auto space-y-1.5">
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/10">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 via-white to-orange-500 rounded-full transition-all duration-100 ease-linear shadow-[0_0_8px_rgba(249,115,22,0.6)]"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-blue-200 font-bold px-1">
              <span>جاري تحضير ملفك الرياضي...</span>
              <button 
                onClick={handleClose} 
                className="text-orange-400 hover:text-orange-300 font-bold underline underline-offset-2 transition-colors"
              >
                تخطي العرض
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PlayerWelcomeSplash;
