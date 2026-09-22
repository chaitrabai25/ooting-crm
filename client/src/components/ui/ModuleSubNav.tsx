import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';

export interface SubNavItem {
  name: string;
  path: string;
  icon: LucideIcon;
  count?: number;
  badge?: string;
  matchQuery?: { param: string; value: string };
}

interface ModuleSubNavProps {
  items: SubNavItem[];
  className?: string;
}

export const ModuleSubNav: React.FC<ModuleSubNavProps> = ({ items, className = '' }) => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  const isItemActive = (item: SubNavItem): boolean => {
    const itemUrl = new URL(item.path, 'http://dummy.com');
    const itemPath = itemUrl.pathname;
    const itemParams = itemUrl.searchParams;

    // Check base path match
    if (location.pathname !== itemPath && !location.pathname.startsWith(`${itemPath}/`)) {
      return false;
    }

    // If query match specified or item has search params
    if (item.matchQuery) {
      const currentVal = searchParams.get(item.matchQuery.param) || '';
      return currentVal === item.matchQuery.value;
    }

    if (itemParams.has('tab')) {
      const targetTab = itemParams.get('tab');
      const currentTab = searchParams.get('tab') || 'all';
      return currentTab === targetTab;
    }

    return true;
  };

  return (
    <div
      className={`flex items-center gap-1.5 p-1.5 bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl overflow-x-auto select-none shadow-xs backdrop-blur-xs ${className}`}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = isItemActive(item);

        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              active
                ? 'bg-[#C91F28] text-white shadow-sm shadow-red-950/20 font-bold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800'
            }`}
          >
            <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
            <span>{item.name}</span>

            {typeof item.count === 'number' && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  active
                    ? 'bg-white/25 text-white'
                    : 'bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {item.count}
              </span>
            )}

            {item.badge && (
              <span
                className={`px-1.5 py-0.2 rounded-md text-[9px] uppercase tracking-wider font-extrabold ${
                  active
                    ? 'bg-white/20 text-white'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                }`}
              >
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
};
