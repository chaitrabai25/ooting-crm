import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  AlertCircle,
  Clock,
} from 'lucide-react';
import {
  formatDateDisplay,
  parseDateString,
  MONTHS_LONG,
  MONTHS_SHORT,
  DAYS_SHORT,
  addDays,
} from '../../utils/dateHelper.js';

export interface DatePickerProps {
  value: string;
  onChange: (dateStr: string) => void;
  label?: string;
  placeholder?: string;
  recommendedDate?: string | null;
  duplicateWarning?: string | null;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  label = 'Date',
  placeholder = 'Select date from calendar...',
  recommendedDate,
  duplicateWarning,
  required = false,
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse currently selected value or fallback to today
  const parsedValue = parseDateString(value);
  const today = new Date();

  // Active viewing month and year in calendar
  const [viewYear, setViewYear] = useState<number>(
    parsedValue ? parsedValue.getFullYear() : today.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState<number>(
    parsedValue ? parsedValue.getMonth() : today.getMonth()
  );

  // Sync viewing month when value changes
  useEffect(() => {
    if (parsedValue) {
      setViewYear(parsedValue.getFullYear());
      setViewMonth(parsedValue.getMonth());
    }
  }, [value]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDate = (day: number) => {
    const targetDate = new Date(viewYear, viewMonth, day);
    onChange(formatDateDisplay(targetDate));
    setIsOpen(false);
  };

  const handleApplyToday = () => {
    const t = new Date();
    onChange(formatDateDisplay(t));
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
    setIsOpen(false);
  };

  const handleApplyTomorrow = () => {
    const t = addDays(new Date(), 1);
    onChange(formatDateDisplay(t));
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
    setIsOpen(false);
  };

  const handleApplyRecommended = () => {
    if (recommendedDate) {
      onChange(recommendedDate);
      const parsed = parseDateString(recommendedDate);
      if (parsed) {
        setViewYear(parsed.getFullYear());
        setViewMonth(parsed.getMonth());
      }
      setIsOpen(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  // Generate day matrix for current viewing month
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          {label} {required && <span className="text-[#C91F28]">*</span>}
        </label>
      )}

      {/* Date Field Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer select-none text-left ${
          isOpen
            ? 'border-[#C91F28] ring-2 ring-[#C91F28]/20 bg-white dark:bg-slate-900'
            : duplicateWarning
            ? 'border-amber-400 bg-amber-50/40 dark:bg-amber-950/20'
            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 hover:border-slate-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <CalendarIcon
            className={`w-4 h-4 shrink-0 ${
              value ? 'text-[#C91F28]' : 'text-slate-400 dark:text-slate-500'
            }`}
          />
          {value ? (
            <span className="text-slate-900 dark:text-white font-bold tracking-tight truncate">
              {value}
            </span>
          ) : (
            <span className="text-slate-400 dark:text-slate-500 font-normal truncate">
              {placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              title="Clear date"
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
            Pick
          </span>
        </div>
      </button>

      {/* Duplicate Date Warning Underneath Field */}
      {duplicateWarning && (
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400 mt-1 animate-in fade-in">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{duplicateWarning}</span>
        </div>
      )}

      {/* Interactive Calendar Popover */}
      {isOpen && (
        <div className="absolute left-0 mt-2 z-50 w-72 sm:w-80 p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          {/* Quick Preset Action Chips */}
          <div className="flex items-center gap-1.5 flex-wrap pb-2.5 mb-2.5 border-b border-slate-100 dark:border-slate-800">
            {recommendedDate && recommendedDate !== value && (
              <button
                type="button"
                onClick={handleApplyRecommended}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[10.5px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-all cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-emerald-200" />
                <span>Next Day: {recommendedDate}</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleApplyToday}
              className="px-2 py-0.5 text-[10.5px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={handleApplyTomorrow}
              className="px-2 py-0.5 text-[10.5px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
            >
              Tomorrow
            </button>
          </div>

          {/* Month / Year Header Navigation */}
          <div className="flex items-center justify-between mb-3 px-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
              <span>{MONTHS_LONG[viewMonth]}</span>
              <span>{viewYear}</span>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Names */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {DAYS_SHORT.map((day) => (
              <div key={day} className="py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Day Grid Cells */}
          <div className="grid grid-cols-7 gap-1 text-xs">
            {/* Empty padding slots before 1st of month */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="p-2" />
            ))}

            {/* Day numbers */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const cellDate = new Date(viewYear, viewMonth, day);
              const cellDateStr = formatDateDisplay(cellDate);

              const isSelected = parsedValue
                ? parsedValue.getFullYear() === viewYear &&
                  parsedValue.getMonth() === viewMonth &&
                  parsedValue.getDate() === day
                : false;

              const isToday =
                today.getFullYear() === viewYear &&
                today.getMonth() === viewMonth &&
                today.getDate() === day;

              const isRecommended = recommendedDate === cellDateStr;

              return (
                <button
                  type="button"
                  key={day}
                  onClick={() => handleSelectDate(day)}
                  className={`p-2 rounded-xl text-center font-semibold text-xs transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-[#C91F28] text-white shadow-xs font-bold scale-105'
                      : isToday
                      ? 'bg-red-50 text-[#C91F28] dark:bg-red-950/40 dark:text-red-300 font-bold border border-red-200 dark:border-red-900'
                      : isRecommended
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold border border-emerald-300'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{day}</span>
                  {isRecommended && !isSelected && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-600" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer Note */}
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
            <span>Click any day to select</span>
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="text-rose-600 hover:underline font-semibold cursor-pointer"
              >
                Clear Date
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
