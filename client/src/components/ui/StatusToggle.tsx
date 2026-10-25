import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { showToast, notifyError } from '../../utils/sweetalert.js';

export interface StatusToggleProps {
  status: string;
  activeValue?: string;
  inactiveValue?: string;
  activeLabel?: string;
  inactiveLabel?: string;
  onToggle: (nextStatus: string) => Promise<boolean | void>;
  disabled?: boolean;
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
  title?: string;
}

export const StatusToggle: React.FC<StatusToggleProps> = ({
  status,
  activeValue = 'ACTIVE',
  inactiveValue = 'INACTIVE',
  activeLabel = 'Active',
  inactiveLabel = 'Inactive',
  onToggle,
  disabled = false,
  size = 'sm',
  showLabel = true,
  className = '',
  title,
}) => {
  const [localStatus, setLocalStatus] = useState(status);
  const [isUpdating, setIsUpdating] = useState(false);

  // Keep in sync if parent changes status from outside
  React.useEffect(() => {
    setLocalStatus(status);
  }, [status]);

  const isActive = localStatus === activeValue;

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (disabled || isUpdating) return;

    const previousStatus = localStatus;
    const nextStatus = isActive ? inactiveValue : activeValue;

    // Optimistic UI update
    setLocalStatus(nextStatus);
    setIsUpdating(true);

    try {
      const res = await onToggle(nextStatus);
      if (res === false) {
        // Explicitly rejected
        setLocalStatus(previousStatus);
      } else {
        const nextLabel = nextStatus === activeValue ? activeLabel : inactiveLabel;
        showToast(`Status changed to ${nextLabel}`);
      }
    } catch (err: any) {
      // Rollback to previous state on failure
      setLocalStatus(previousStatus);
      notifyError('Status Update Failed', err.response?.data?.message || err.message || 'Could not update status.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Dimensions based on size
  const sizeConfig = {
    xs: {
      track: 'w-7 h-4',
      knob: 'w-3 h-3',
      knobActive: 'translate-x-3',
      knobInactive: 'translate-x-0.5',
      spinner: 'w-2.5 h-2.5',
      text: 'text-[10px]',
      badgePad: 'px-1.5 py-0.5',
    },
    sm: {
      track: 'w-9 h-5',
      knob: 'w-3.5 h-3.5',
      knobActive: 'translate-x-4.5',
      knobInactive: 'translate-x-0.5',
      spinner: 'w-3 h-3',
      text: 'text-xs',
      badgePad: 'px-2 py-0.5',
    },
    md: {
      track: 'w-11 h-6',
      knob: 'w-4.5 h-4.5',
      knobActive: 'translate-x-5.5',
      knobInactive: 'translate-x-0.5',
      spinner: 'w-3.5 h-3.5',
      text: 'text-xs',
      badgePad: 'px-2.5 py-1',
    },
  }[size];

  const currentLabel = isActive ? activeLabel : inactiveLabel;

  return (
    <div
      onClick={handleClick}
      title={title || `Click to switch to ${isActive ? inactiveLabel : activeLabel}`}
      className={`inline-flex items-center gap-1.5 select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${className}`}
    >
      {/* Switch Track */}
      <button
        type="button"
        role="switch"
        aria-checked={isActive}
        disabled={disabled || isUpdating}
        className={`relative inline-flex items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-500 cursor-pointer ${
          sizeConfig.track
        } ${
          isActive
            ? 'bg-emerald-500 hover:bg-emerald-600 shadow-xs'
            : 'bg-rose-500 hover:bg-rose-600 shadow-xs'
        }`}
      >
        {/* Switch Knob */}
        <span
          className={`inline-block transform rounded-full bg-white shadow-xs transition-transform duration-200 flex items-center justify-center ${
            sizeConfig.knob
          } ${isActive ? sizeConfig.knobActive : sizeConfig.knobInactive}`}
        >
          {isUpdating ? (
            <Loader2 className={`animate-spin text-slate-500 ${sizeConfig.spinner}`} />
          ) : (
            <span
              className={`rounded-full ${
                isActive ? 'bg-emerald-600' : 'bg-rose-600'
              } ${size === 'xs' ? 'w-1 h-1' : 'w-1.5 h-1.5'}`}
            />
          )}
        </span>
      </button>

      {/* Text Badge */}
      {showLabel && (
        <span
          className={`font-bold uppercase tracking-wider rounded-full border ${
            sizeConfig.text
          } ${sizeConfig.badgePad} ${
            isActive
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60'
              : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60'
          }`}
        >
          {currentLabel}
        </span>
      )}
    </div>
  );
};
