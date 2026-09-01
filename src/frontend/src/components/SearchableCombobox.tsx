'use client';

import React, { useState, useEffect, useRef, useId } from 'react';

export interface ComboboxOption {
  id: string;
  label: string;
  subtext?: string | null;
  badge?: string | null;
}

export interface SearchableComboboxProps {
  label?: string;
  value: string;
  onChange: (id: string, option?: ComboboxOption | null) => void;
  onSearch?: (query: string) => Promise<ComboboxOption[]>;
  options?: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  selectedLabel?: string;
  'data-testid'?: string;
}

export default function SearchableCombobox({
  label,
  value,
  onChange,
  onSearch,
  options = [],
  placeholder = 'Select an option...',
  searchPlaceholder = 'Type to search...',
  emptyMessage = 'No results found',
  disabled = false,
  required = false,
  className = '',
  selectedLabel,
  'data-testid': testId,
}: SearchableComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ComboboxOption[]>(options);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync internal search results if initial options change and no query is typed
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(options);
    }
  }, [options, searchQuery]);

  // Outside click listener
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Handle Search Input Change
  const handleQueryChange = (q: string) => {
    setSearchQuery(q);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!q.trim()) {
      setSearchResults(options);
      setLoading(false);
      return;
    }

    // Local filter fallback
    const localFiltered = options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q.toLowerCase()) ||
        (opt.subtext && opt.subtext.toLowerCase().includes(q.toLowerCase()))
    );
    setSearchResults(localFiltered);

    if (onSearch) {
      setLoading(true);
      debounceTimerRef.current = setTimeout(async () => {
        try {
          const remoteResults = await onSearch(q.trim());
          setSearchResults(remoteResults);
        } catch {
          // If remote search fails, fallback to local results
        } finally {
          setLoading(false);
        }
      }, 250);
    }
  };

  const handleSelect = (option: ComboboxOption) => {
    onChange(option.id, option);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', null);
  };

  // Determine current display label
  const selectedOption =
    options.find((opt) => opt.id === value) ||
    searchResults.find((opt) => opt.id === value);
  const displayLabel = selectedLabel || selectedOption?.label || '';

  return (
    <div className={`relative ${className}`} ref={dropdownRef} data-testid={testId}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Hidden input for HTML form validation if required */}
      {required && (
        <input
          type="text"
          value={value}
          onChange={() => {}}
          required={required}
          className="sr-only"
          tabIndex={-1}
        />
      )}

      {/* Trigger Button */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setIsOpen(!isOpen);
          } else if (e.key === 'Escape') {
            setIsOpen(false);
          }
        }}
        className={`w-full px-3 py-2 border rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer select-none bg-white ${
          disabled
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200'
            : isOpen
            ? 'border-indigo-500 ring-2 ring-indigo-500/20'
            : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        <div className="flex items-center gap-2 truncate pr-2">
          {value && displayLabel ? (
            <span className="font-medium text-slate-900 truncate">
              {displayLabel}
              {selectedOption?.subtext && (
                <span className="ml-1 text-slate-400 font-normal">({selectedOption.subtext})</span>
              )}
            </span>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition-colors"
              title="Clear selection"
              aria-label="Clear selection"
            >
              ✕
            </button>
          )}
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Floating Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in-50 duration-150">
          {/* Search Box */}
          <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <svg
              className="w-4 h-4 text-slate-400 shrink-0 ml-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsOpen(false);
                }
              }}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent border-none text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
            />
            {loading && (
              <span className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin shrink-0 mr-1" />
            )}
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-50 p-1">
            {searchResults.length === 0 ? (
              <div className="py-4 px-3 text-center text-xs text-slate-400 italic">
                {loading ? 'Searching...' : emptyMessage}
              </div>
            ) : (
              searchResults.map((opt) => {
                const isSelected = opt.id === value;
                return (
                  <div
                    key={opt.id}
                    onClick={() => handleSelect(opt)}
                    className={`px-3 py-2 text-xs rounded-lg cursor-pointer flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-indigo-50 text-indigo-900 font-semibold'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex flex-col truncate pr-2">
                      <span className="truncate">{opt.label}</span>
                      {opt.subtext && (
                        <span className="text-[10px] text-slate-400 truncate">{opt.subtext}</span>
                      )}
                    </div>
                    {opt.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-normal shrink-0">
                        {opt.badge}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
