import React from 'react';

interface BadgeProps {
  status: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, className = '' }) => {
  const getBadgeStyle = (s: string) => {
    switch (s?.toUpperCase()) {
      // Lead Statuses
      case 'NEW':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'CONTACTED':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'QUALIFIED':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'QUOTATION_SENT':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'FOLLOW_UP':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'WON':
      case 'CONFIRMED':
      case 'COMPLETED':
      case 'SUCCESS':
      case 'ACTIVE':
      case 'PAID':
      case 'ACCEPTED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'LOST':
      case 'CANCELLED':
      case 'FAILED':
      case 'REJECTED':
      case 'SUSPENDED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'PENDING':
      case 'HOLD':
      case 'ENQUIRY':
      case 'DRAFT':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'URGENT':
      case 'HIGH':
        return 'bg-red-50 text-red-700 border-red-200 font-semibold';
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'LOW':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const formatText = (s: string) => {
    if (!s) return '';
    return s.replace(/_/g, ' ');
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getBadgeStyle(
        status
      )} ${className}`}
    >
      {formatText(status)}
    </span>
  );
};
