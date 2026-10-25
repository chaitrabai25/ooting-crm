import React from 'react';

interface BadgeProps {
  status?: string;
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'default' | string;
  size?: 'sm' | 'md' | 'lg' | string;
  showDot?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  status,
  variant,
  size = 'md',
  showDot = true,
  className = '',
  children,
}) => {
  const getBadgeStyle = (s: string) => {
    switch (s?.toUpperCase()) {
      case 'DANGER':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60';
      case 'SUCCESS':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60';
      case 'WARNING':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60';
      case 'INFO':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60';
      // Lead Statuses
      case 'NEW':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60';
      case 'CONTACTED':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/60';
      case 'QUALIFIED':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60';
      case 'QUOTATION_SENT':
        return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/60';
      case 'FOLLOW_UP':
        return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800/60';
      case 'WON':
      case 'CONFIRMED':
      case 'COMPLETED':
      case 'ACTIVE':
      case 'PAID':
      case 'ACCEPTED':
      case 'LOGIN':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60';
      case 'LOGOUT':
        return 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 font-medium';
      case 'STATUS_CHANGE':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/60';
      case 'IMPORT':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800/60';
      case 'EXPORT':
        return 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800/60';
      case 'CREATE':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60';
      case 'UPDATE':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60';
      case 'DELETE':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60';
      case 'CONVERT':
        return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/60';
      case 'LOST':
      case 'CANCELLED':
      case 'FAILED':
      case 'REJECTED':
      case 'SUSPENDED':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60';
      case 'PENDING':
      case 'HOLD':
      case 'ENQUIRY':
      case 'DRAFT':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60';
      case 'URGENT':
      case 'HIGH':
        return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800/60 font-semibold';
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60';
      case 'LOW':
        return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  const getDotColor = (s: string) => {
    switch (s?.toUpperCase()) {
      case 'DANGER':
      case 'LOST':
      case 'CANCELLED':
      case 'FAILED':
      case 'REJECTED':
      case 'SUSPENDED':
      case 'DELETE':
      case 'URGENT':
      case 'HIGH':
        return 'bg-rose-500';
      case 'SUCCESS':
      case 'WON':
      case 'CONFIRMED':
      case 'COMPLETED':
      case 'ACTIVE':
      case 'PAID':
      case 'ACCEPTED':
      case 'LOGIN':
        return 'bg-emerald-500';
      case 'WARNING':
      case 'QUALIFIED':
      case 'FOLLOW_UP':
      case 'UPDATE':
      case 'PENDING':
      case 'HOLD':
      case 'ENQUIRY':
      case 'DRAFT':
      case 'MEDIUM':
        return 'bg-amber-500';
      case 'INFO':
      case 'NEW':
      case 'CREATE':
        return 'bg-blue-500';
      case 'CONTACTED':
      case 'STATUS_CHANGE':
        return 'bg-indigo-500';
      case 'QUOTATION_SENT':
      case 'CONVERT':
        return 'bg-purple-500';
      case 'IMPORT':
        return 'bg-cyan-500';
      case 'EXPORT':
        return 'bg-teal-500';
      default:
        return 'bg-slate-400';
    }
  };

  const formatText = (s: string) => {
    if (!s) return '';
    return s.replace(/_/g, ' ');
  };

  const effectiveStatus = status || (typeof children === 'string' ? children : variant || 'DEFAULT');
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium border ${getBadgeStyle(
        effectiveStatus
      )} ${sizeClasses} ${className}`}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full mr-1.5 flex-shrink-0 ${getDotColor(
            effectiveStatus
          )}`}
        />
      )}
      {children || formatText(effectiveStatus)}
    </span>
  );
};
