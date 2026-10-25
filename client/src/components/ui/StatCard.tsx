import React from 'react';
import { LucideIcon, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
  onClick?: () => void;
  to?: string;
  className?: string;
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
  onClick,
  to,
  className = '',
}) => {
  const navigate = useNavigate();
  const isNumeric = typeof numericValue === 'number' || typeof value === 'number';
  const targetNum = typeof numericValue === 'number' ? numericValue : (typeof value === 'number' ? value : 0);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (to) {
      navigate(to);
    }
  };

  const isClickable = Boolean(onClick || to);

  return (
    <div
      onClick={isClickable ? handleClick : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick();
              }
            }
          : undefined
      }
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={isClickable ? `${title} - View details` : title}
      className={`crm-card-interactive ${
        isClickable ? 'crm-card-clickable group cursor-pointer' : ''
      } bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs hover:border-brand-500/40 ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
          {title}
        </span>
        <div className="flex items-center gap-1.5">
          {isClickable && (
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-all duration-200 -translate-x-1 group-hover:translate-x-0" />
          )}
          <div className={`crm-card-icon p-2.5 rounded-xl ${iconBg} ${iconColor}`}>
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
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
