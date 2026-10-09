import React from 'react';
import { useCompanySettings, NEUTRAL_TENANT_LOGO } from '../../context/CompanySettingsContext.js';

interface BrandLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'fullscreen';
  text?: string;
  subtext?: string;
  className?: string;
}

/**
 * Executive Brand Loader
 * Dynamically uses the official company logo configured in Settings,
 * featuring smooth dual concentric orbital rings, glowing ambient pulse,
 * and high-contrast dark/light mode compatibility.
 */
export const BrandLoader: React.FC<BrandLoaderProps> = ({
  size = 'md',
  text,
  subtext,
  className = '',
}) => {
  let logoUrl = NEUTRAL_TENANT_LOGO;
  let companyName = 'CRM';
  let companyTagline = '';
  let isOoting = false;
  let primaryColor = '#2563eb';

  try {
    const { company, effectiveLogoUrl } = useCompanySettings();
    if (effectiveLogoUrl) logoUrl = effectiveLogoUrl;
    if (company?.name) companyName = company.name.toUpperCase();
    if (company?.tagline) companyTagline = company.tagline;
    if (company?.isOoting) isOoting = true;
    if (company?.primaryColor) primaryColor = company.primaryColor;
  } catch {
    // Graceful fallback when rendered outside CompanySettingsProvider
  }

  const fallbackLogo = isOoting ? '/assets/ooting-logo.jpg' : NEUTRAL_TENANT_LOGO;
  const loadingText = text || (isOoting ? 'Loading Ooting CRM...' : `Loading ${companyName}...`);

  if (size === 'sm') {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <div className="relative flex items-center justify-center w-5 h-5 shrink-0">
          <div
            className="absolute inset-0 rounded-full border-2 border-slate-200 dark:border-slate-800 animate-spin"
            style={{ borderTopColor: primaryColor }}
          />
          <div className="w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center p-0.5 overflow-hidden shadow-2xs">
            <img
              src={logoUrl}
              alt={companyName}
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = fallbackLogo;
              }}
            />
          </div>
        </div>
        {loadingText && <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{loadingText}</span>}
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
          className={`absolute rounded-full blur-2xl animate-pulse ${
            isLarge ? 'w-32 h-32' : 'w-24 h-24'
          }`}
          style={{ backgroundColor: `${primaryColor}25` }}
        />

        {/* Outer Orbiting Gradient Ring */}
        <div
          className={`rounded-full border-2 border-slate-200/80 dark:border-slate-800 border-r-amber-500 animate-spin ${
            isLarge ? 'w-24 h-24' : 'w-18 h-18'
          }`}
          style={{ animationDuration: '1.2s', borderTopColor: primaryColor }}
        />

        {/* Counter-rotating Inner Accent Ring */}
        <div
          className={`absolute rounded-full border-2 border-dashed dark:border-amber-400/40 animate-spin ${
            isLarge ? 'w-18 h-18' : 'w-14 h-14'
          }`}
          style={{ animationDirection: 'reverse', animationDuration: '3s', borderColor: `${primaryColor}66` }}
        />

        {/* Pure White Central Logo Shield */}
        <div
          className={`absolute rounded-2xl bg-white p-2 shadow-xl shadow-slate-900/10 border border-slate-200/90 flex items-center justify-center overflow-hidden transition-transform duration-300 hover:scale-105 ${
            isLarge ? 'w-14 h-14' : 'w-11 h-11'
          }`}
        >
          <img
            src={logoUrl}
            alt={companyName}
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = fallbackLogo;
            }}
          />
        </div>
      </div>

      {/* Brand Typography & Status Message */}
      <div className="space-y-1.5 max-w-xs">
        <div className="flex items-center justify-center gap-1.5">
          <span className="text-xs font-black tracking-[0.25em] text-slate-900 dark:text-white uppercase">
            {companyName}
          </span>
          <span
            className="w-1.5 h-1.5 rounded-full inline-block animate-ping"
            style={{ backgroundColor: primaryColor }}
          />
        </div>

        {loadingText && (
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            {loadingText}
          </p>
        )}

        {subtext ? (
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            {subtext}
          </p>
        ) : companyTagline ? (
          <p className="text-[10px] text-slate-400 dark:text-slate-500 tracking-wide font-medium">
            {companyTagline}
          </p>
        ) : null}
      </div>

      {/* Shimmering Progress Bar */}
      <div className="w-36 h-1 mt-4 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden relative">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-indigo-400 to-blue-500 w-1/2 rounded-full animate-pulse"
          style={{
            animation: 'shimmerSlide 1.5s infinite ease-in-out',
            background: `linear-gradient(to right, ${primaryColor}, #f59e0b, ${primaryColor})`,
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
