import React from 'react';
import { LucideIcon } from 'lucide-react';
import { AnimatedCounter } from './AnimatedCounter.js';

interface StatCardProps {
  title: string;
  value?: string | number;
  numericValue?: number;
  prefix?: string;
  suffix?: string;
  subtitle?: string;
  icon: LucideIcon;
  iconBg?: string;
  iconColor?: string;
  trend?: string;
  trendPositive?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  numericValue,
  prefix = '',
  suffix = '',
  subtitle,
  icon: Icon,
  iconBg = 'bg-brand-50 dark:bg-brand-950/40',
  iconColor = 'text-brand-600 dark:text-brand-400',
  trend,
  trendPositive,
}) => {
  const isNumeric = typeof numericValue === 'number' || typeof value === 'number';
  const targetNum = typeof numericValue === 'number' ? numericValue : (typeof value === 'number' ? value : 0);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition-all">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
          {title}
        </span>
        <div className={`p-2.5 rounded-lg ${iconBg} ${iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {isNumeric ? (
            <AnimatedCounter value={targetNum} prefix={prefix} suffix={suffix} />
          ) : (
            value
          )}
        </span>
        {trend && (
          <span
            className={`text-xs font-semibold ${
              trendPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {trend}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
    </div>
  );
};
export default StatCard;
