import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, X, Check, Plus } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  subLabel?: string;
}

interface SearchableDropdownProps {
  options: (DropdownOption | string)[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  allowCustom?: boolean;
  customButtonText?: string;
  onCustomAdd?: (customVal: string) => void;
  className?: string;
  label?: string;
}

export const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  disabled = false,
  allowClear = true,
  searchPlaceholder = 'Type to search...',
  emptyMessage = 'No matching options found',
  allowCustom = false,
  customButtonText = 'Add custom option',
  onCustomAdd,
  className = '',
  label,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Normalize options to DropdownOption objects
  const normalizedOptions: DropdownOption[] = useMemo(() => {
    return options.map((opt) =>
      typeof opt === 'string'
        ? { value: opt, label: opt }
        : opt
    );
  }, [options]);

  // Find currently selected label
  const selectedOption = useMemo(() => {
    return normalizedOptions.find(
      (opt) => opt.value.toLowerCase() === (value || '').toLowerCase()
    );
  }, [normalizedOptions, value]);

  // Smart Filtering with Prefix Prioritization:
  // e.g. "K" prioritizes "Karnataka", "Kerala" at top; "Kar" prioritizes "Karnataka"
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;

    const query = searchQuery.trim().toLowerCase();
    const startsWith: DropdownOption[] = [];
    const contains: DropdownOption[] = [];

    normalizedOptions.forEach((opt) => {
      const lbl = opt.label.toLowerCase();
      if (lbl.startsWith(query)) {
        startsWith.push(opt);
      } else if (lbl.includes(query) || (opt.subLabel && opt.subLabel.toLowerCase().includes(query))) {
        contains.push(opt);
      }
    });

    return [...startsWith, ...contains];
  }, [normalizedOptions, searchQuery]);

  // Reset highlight on search change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredOptions]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        scrollHighlightedIntoView(highlightedIndex + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        scrollHighlightedIntoView(highlightedIndex - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex].value);
        } else if (allowCustom && searchQuery.trim()) {
          handleCreateCustom();
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  const scrollHighlightedIntoView = (index: number) => {
    if (!listRef.current) return;
    const item = listRef.current.children[index] as HTMLElement;
    if (item) {
      item.scrollIntoView({ block: 'nearest' });
    }
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
  };

  const handleCreateCustom = () => {
    const custom = searchQuery.trim();
    if (!custom) return;
    if (onCustomAdd) {
      onCustomAdd(custom);
    } else {
      onChange(custom);
    }
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div ref={containerRef} className={`relative text-xs ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          {label}
        </label>
      )}

      {/* Main Trigger Bar */}
      <div
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`w-full min-h-[38px] px-3 py-2 bg-white dark:bg-slate-900 border rounded-xl flex items-center justify-between gap-2 cursor-pointer select-none transition-all ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800'
            : isOpen
            ? 'border-brand-500 ring-2 ring-brand-500/20 shadow-xs'
            : 'border-slate-300 dark:border-slate-700 hover:border-slate-400'
        }`}
      >
        <span
          className={`truncate font-medium ${
            selectedOption || value
              ? 'text-slate-900 dark:text-white'
              : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          {selectedOption ? selectedOption.label : value || placeholder}
        </span>

        <div className="flex items-center gap-1 flex-shrink-0">
          {allowClear && value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-brand-600' : ''
            }`}
          />
        </div>
      </div>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100 min-w-[220px]">
          {/* Search Input Bar */}
          <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Options Scroll List */}
          <ul
            ref={listRef}
            className="max-h-60 overflow-y-auto py-1 divide-y divide-slate-50 dark:divide-slate-850 focus:outline-none"
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => {
                const isSelected =
                  opt.value.toLowerCase() === (value || '').toLowerCase();
                const isHighlighted = idx === highlightedIndex;

                return (
                  <li
                    key={opt.value + idx}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => handleSelect(opt.value)}
                    className={`px-3 py-2 flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-bold'
                        : isHighlighted
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="truncate">{opt.label}</span>
                      {opt.subLabel && (
                        <span className="text-[10px] text-slate-400 truncate">
                          {opt.subLabel}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-brand-600 flex-shrink-0 ml-2" />
                    )}
                  </li>
                );
              })
            ) : (
              <li className="px-3 py-4 text-center text-slate-400 text-xs">
                {emptyMessage}
              </li>
            )}
          </ul>

          {/* Add Custom Value Prompt if enabled */}
          {allowCustom && searchQuery.trim() && (
            <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
              <button
                type="button"
                onClick={handleCreateCustom}
                className="w-full px-2.5 py-1.5 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/50 dark:hover:bg-brand-900/50 text-brand-700 dark:text-brand-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>
                  {customButtonText}: "{searchQuery.trim()}"
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
