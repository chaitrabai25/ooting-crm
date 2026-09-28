import React from 'react';

interface BrandLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'fullscreen';
  text?: string;
  subtext?: string;
  className?: string;
}

/**
 * Executive Brand Loader for Ooting CRM
 * Features the authentic company logo with spinning brand accents,
 * smooth pulse animation, and high-contrast dark/light mode compatibility.
 */
export const BrandLoader: React.FC<BrandLoaderProps> = ({
  size = 'md',
  text = 'Loading Ooting CRM...',
  subtext,
  className = '',
}) => {
  if (size === 'sm') {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <div className="relative flex items-center justify-center w-5 h-5 shrink-0">
          <div className="absolute inset-0 rounded-full border-2 border-brand-200 dark:border-brand-950 border-t-[#C91F28] animate-spin" />
          <div className="w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center p-0.5 overflow-hidden shadow-2xs">
            <img
              src="/assets/ooting-logo.png"
              alt="Ooting"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/assets/ooting-logo.jpg';
              }}
            />
          </div>
        </div>
        {text && <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{text}</span>}
      </div>
    );
  }

  const isFullscreen = size === 'fullscreen';
  const isLarge = size === 'lg' || isFullscreen;

  const content = (
    <div className={`flex flex-col items-center justify-center p-6 text-center select-none animate-fadeIn ${className}`}>
      {/* Central Animated Logo Emblem with Concentric Orbit Rings */}
      <div className="relative flex items-center justify-center mb-5">
        {/* Outer subtle glow aura */}
        <div
          className={`absolute rounded-full bg-[#C91F28]/10 dark:bg-[#C91F28]/15 blur-xl animate-pulse ${
            isLarge ? 'w-28 h-28' : 'w-20 h-20'
          }`}
        />

        {/* Outer Orbiting Gradient Ring */}
        <div
          className={`rounded-full border-2 border-slate-200/60 dark:border-slate-800 border-t-[#C91F28] border-r-amber-400 animate-spin ${
            isLarge ? 'w-20 h-20' : 'w-16 h-16'
          }`}
          style={{ animationDuration: '1.2s' }}
        />

        {/* Counter-rotating Inner Accent Ring */}
        <div
          className={`absolute rounded-full border border-dashed border-[#C91F28]/40 dark:border-amber-400/40 animate-spin ${
            isLarge ? 'w-16 h-16' : 'w-12 h-12'
          }`}
          style={{ animationDirection: 'reverse', animationDuration: '3s' }}
        />

        {/* Pure White Central Logo Shield */}
        <div
          className={`absolute rounded-2xl bg-white p-1.5 shadow-md shadow-slate-900/10 border border-slate-200/80 flex items-center justify-center overflow-hidden transition-transform duration-300 hover:scale-105 ${
            isLarge ? 'w-12 h-12' : 'w-9 h-9'
          }`}
        >
          <img
            src="/assets/ooting-logo.png"
            alt="Ooting Logo"
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/assets/ooting-logo.jpg';
            }}
          />
        </div>
      </div>

      {/* Brand Typography & Status Message */}
      <div className="space-y-1.5 max-w-xs">
        <div className="flex items-center justify-center gap-1.5">
          <span className="text-xs font-black tracking-[0.25em] text-slate-900 dark:text-white uppercase">
            OOTING
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#C91F28] inline-block animate-ping" />
        </div>

        {text && (
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            {text}
          </p>
        )}

        {subtext ? (
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            {subtext}
          </p>
        ) : (
          <p className="text-[10px] text-slate-400 dark:text-slate-500 tracking-wide font-medium">
            Journeys Beyond Ordinary
          </p>
        )}
      </div>

      {/* Shimmering Progress Bar */}
      <div className="w-36 h-1 mt-4 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden relative">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#C91F28] via-amber-400 to-[#C91F28] w-1/2 rounded-full animate-pulse"
          style={{
            animation: 'shimmerSlide 1.5s infinite ease-in-out',
          }}
        />
      </div>

      <style>{`
        @keyframes shimmerSlide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
      `}</style>
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
};

export default BrandLoader;
