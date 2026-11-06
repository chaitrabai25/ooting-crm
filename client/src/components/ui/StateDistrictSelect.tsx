import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X, Check, MapPin, Globe } from 'lucide-react';
import {
  ALL_INDIAN_STATES,
  ALL_COUNTRIES,
  DEFAULT_COUNTRY,
  DEFAULT_STATE,
  getDistrictsForState,
  isIndia,
} from '../../data/indiaLocations.js';

interface SearchableDropdownProps {
  label: string;
  placeholder: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
  disabled?: boolean;
  required?: boolean;
  allowCustom?: boolean;
}

export const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  label,
  placeholder,
  value,
  options,
  onChange,
  disabled = false,
  required = false,
  allowCustom = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionsListRef = useRef<HTMLDivElement>(null);

  // Filter options
  const filtered = options.filter((opt) =>
    opt.toLowerCase().includes(search.toLowerCase().trim())
  );

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Focus search when opening
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setHighlightIndex(0);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && optionsListRef.current) {
      const activeEl = optionsListRef.current.children[highlightIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightIndex, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlightIndex]) {
        onChange(filtered[highlightIndex]);
        setIsOpen(false);
      } else if (allowCustom && search.trim()) {
        onChange(search.trim());
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.trim()})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.trim().toLowerCase() ? (
        <span key={i} className="font-black text-[#C91F28] dark:text-brand-400 bg-red-50 dark:bg-brand-950/40 px-0.5 rounded">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  const hasExactMatch = options.some(
    (o) => o.toLowerCase() === search.trim().toLowerCase()
  );

  return (
    <div className="relative space-y-1 text-xs" ref={containerRef}>
      {label && (
        <label className="font-semibold text-slate-700 dark:text-slate-300 block">
          {label} {required && <span className="text-[#C91F28]">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-xl border transition-all ${
          disabled
            ? 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 border-slate-200 dark:border-slate-800 cursor-not-allowed'
            : isOpen
            ? 'border-[#C91F28] ring-2 ring-[#C91F28]/20 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 text-slate-900 dark:text-white'
        }`}
      >
        <span className={`truncate ${!value ? 'text-slate-400 dark:text-slate-500' : 'font-medium'}`}>
          {value || placeholder}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {value && !disabled && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden animate-in fade-in-50 slide-in-from-top-1 duration-150">
          {/* Search Box at Top */}
          <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setHighlightIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder={`Search ${label.toLowerCase()}...`}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#C91F28]"
              />
            </div>
          </div>

          {/* Options List */}
          <div ref={optionsListRef} className="max-h-52 overflow-y-auto py-1 divide-y divide-slate-50 dark:divide-slate-850">
            {filtered.length > 0 ? (
              <>
                {filtered.map((item, idx) => {
                  const isSelected = item.toLowerCase() === value.toLowerCase();
                  const isHighlighted = idx === highlightIndex;

                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        onChange(item);
                        setIsOpen(false);
                      }}
                      onMouseEnter={() => setHighlightIndex(idx)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors ${
                        isSelected
                          ? 'bg-red-50/80 dark:bg-brand-950/40 text-[#C91F28] dark:text-brand-300 font-bold'
                          : isHighlighted
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <span>{highlightMatch(item, search)}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#C91F28] flex-shrink-0" />}
                    </button>
                  );
                })}

                {allowCustom && search.trim() && !hasExactMatch && (
                  <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
                    <button
                      type="button"
                      onClick={() => {
                        onChange(search.trim());
                        setIsOpen(false);
                      }}
                      className="w-full py-1.5 px-3 bg-[#C91F28] hover:bg-[#a81920] text-white rounded-lg font-semibold text-xs transition-colors cursor-pointer text-center"
                    >
                      Use custom "{search.trim()}"
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="p-4 text-center text-xs">
                {allowCustom && search.trim() ? (
                  <button
                    type="button"
                    onClick={() => {
                      onChange(search.trim());
                      setIsOpen(false);
                    }}
                    className="w-full py-1.5 px-3 bg-[#C91F28] hover:bg-[#a81920] text-white rounded-lg font-semibold text-xs transition-colors cursor-pointer text-center"
                  >
                    Use "{search.trim()}"
                  </button>
                ) : (
                  <div className="text-slate-400 dark:text-slate-500">
                    No matching {label.toLowerCase()} found.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export interface StateDistrictSelectProps {
  country?: string;
  state: string;
  district: string;
  onCountryChange?: (country: string) => void;
  onStateChange: (state: string) => void;
  onDistrictChange: (district: string) => void;
  showCountry?: boolean;
  countryLabel?: string;
  stateLabel?: string;
  districtLabel?: string;
  required?: boolean;
}

export const StateDistrictSelect: React.FC<StateDistrictSelectProps> = ({
  country,
  state,
  district,
  onCountryChange,
  onStateChange,
  onDistrictChange,
  showCountry = false,
  countryLabel = 'Country',
  stateLabel = 'State',
  districtLabel = 'District',
  required = false,
}) => {
  const currentCountry = country || DEFAULT_COUNTRY;
  const isDomestic = isIndia(currentCountry);
  const districts = isDomestic ? getDistrictsForState(state) : [];

  const handleCountrySelect = (newCountry: string) => {
    if (onCountryChange) {
      onCountryChange(newCountry);
    }
    // If user switches between domestic and international, adjust defaults cleanly
    if (isIndia(newCountry)) {
      if (!state) onStateChange(DEFAULT_STATE);
    }
  };

  const handleStateSelect = (newState: string) => {
    onStateChange(newState);
    if (newState !== state) {
      onDistrictChange('');
    }
  };

  const shouldRenderCountry = showCountry || Boolean(onCountryChange);

  return (
    <div className={`grid gap-3 ${shouldRenderCountry ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
      {shouldRenderCountry && (
        <SearchableDropdown
          label={countryLabel}
          placeholder="Select country..."
          value={currentCountry}
          options={ALL_COUNTRIES}
          onChange={handleCountrySelect}
          required={required}
          allowCustom={true}
        />
      )}

      <SearchableDropdown
        label={isDomestic ? stateLabel : 'State / Province'}
        placeholder={isDomestic ? 'Select or search state...' : 'Enter state or province...'}
        value={state}
        options={isDomestic ? ALL_INDIAN_STATES : []}
        onChange={handleStateSelect}
        required={required}
        allowCustom={!isDomestic}
      />

      <SearchableDropdown
        label={isDomestic ? districtLabel : 'City / Region'}
        placeholder={
          isDomestic
            ? (state ? 'Select or search district...' : 'Select state first')
            : 'Enter city or region...'
        }
        value={district}
        options={isDomestic ? districts : []}
        onChange={onDistrictChange}
        disabled={isDomestic && !state}
        required={required}
        allowCustom={!isDomestic}
      />
    </div>
  );
};
