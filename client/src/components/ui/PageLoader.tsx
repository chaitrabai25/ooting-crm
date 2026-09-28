import React from 'react';

/**
 * PageLoader Component
 * Sleek, professional full-page / route-transition loading placeholder
 * that prevents layout shifts while lazy routes are loaded asynchronously.
 */
export const PageLoader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full p-8 space-y-4 animate-fadeIn">
      <div className="relative flex items-center justify-center">
        {/* Outer glowing pulsing ring */}
        <div className="w-12 h-12 rounded-full border-2 border-brand-200 dark:border-brand-900 animate-ping opacity-25" />
        {/* Spinning brand loader */}
        <div className="absolute w-10 h-10 rounded-full border-3 border-brand-100 dark:border-slate-800 border-t-brand-600 dark:border-t-brand-500 animate-spin" />
      </div>
      <div className="flex flex-col items-center space-y-1">
        <span className="text-xs font-semibold tracking-wider text-slate-700 dark:text-slate-300 uppercase">
          Loading Ooting CRM...
        </span>
        <span className="text-[11px] text-slate-400 dark:text-slate-500">
          Preparing workspace data
        </span>
      </div>
    </div>
  );
};

export default PageLoader;
