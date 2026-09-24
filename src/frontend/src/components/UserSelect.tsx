'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { fetchUsers, UserItem } from '@/lib/api';

interface UserSelectProps {
  value: string;
  onChange: (userId: string, user?: UserItem | null) => void;
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  required?: boolean;
  disabled?: boolean;
  roleFilter?: string;
  id?: string;
}

export default function UserSelect({
  value,
  onChange,
  label,
  placeholder = 'Search & select a team member...',
  searchPlaceholder = 'Type name or email...',
  required = false,
  disabled = false,
  roleFilter,
  id = 'user-select',
}: UserSelectProps) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadUsers() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchUsers({ is_active: true, role: roleFilter, page_size: 100 });
        if (isMounted) {
          setUsers(res.items || []);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load team members');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadUsers();
    return () => {
      isMounted = false;
    };
  }, [roleFilter]);

  // Outside click listener to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectedUser = useMemo(() => {
    return users.find((u) => u.id === value);
  }, [users, value]);

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase().trim();
    return users.filter((u) => {
      const matchName = u.full_name?.toLowerCase().includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      const matchRole = u.role.toLowerCase().includes(q);
      return matchName || matchEmail || matchRole;
    });
  }, [users, searchQuery]);

  const getInitials = (name?: string | null, email?: string) => {
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/);
      return parts.length >= 2
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : name.slice(0, 2).toUpperCase();
    }
    return email ? email.slice(0, 2).toUpperCase() : '??';
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'manager':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ae':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'sdr':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const handleSelectUser = (user: UserItem | null) => {
    if (user) {
      onChange(user.id, user);
    } else {
      onChange('', null);
    }
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredUsers.length ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex === 0 && searchQuery) {
        // First option in search results
        if (filteredUsers[0]) handleSelectUser(filteredUsers[0]);
      } else if (highlightedIndex > 0 && filteredUsers[highlightedIndex - 1]) {
        handleSelectUser(filteredUsers[highlightedIndex - 1]);
      } else if (highlightedIndex === 0) {
        handleSelectUser(null);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="space-y-1.5 w-full relative">
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-slate-700">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Main Selected Trigger / Search Input Bar */}
      <div className="relative">
        <button
          type="button"
          id={id}
          disabled={disabled || loading}
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) {
              setTimeout(() => searchInputRef.current?.focus(), 50);
            }
          }}
          onKeyDown={handleKeyDown}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className={`w-full flex items-center justify-between text-left rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-sm hover:border-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 transition ${
            error ? 'border-rose-400' : ''
          }`}
        >
          {selectedUser ? (
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-5 h-5 rounded-full bg-slate-800 text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                {getInitials(selectedUser.full_name, selectedUser.email)}
              </div>
              <span className="font-semibold text-slate-900 truncate">
                {selectedUser.full_name || selectedUser.email}
              </span>
              <span className="text-[11px] text-slate-400 truncate hidden sm:inline">
                ({selectedUser.email})
              </span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wide border ${getRoleBadgeColor(
                  selectedUser.role
                )}`}
              >
                {selectedUser.role}
              </span>
            </div>
          ) : (
            <span className="text-slate-400">
              {loading ? 'Loading team directory...' : placeholder}
            </span>
          )}

          <div className="flex items-center gap-1.5 ml-2 text-slate-400 flex-shrink-0">
            {selectedUser && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectUser(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    handleSelectUser(null);
                  }
                }}
                className="hover:text-slate-600 p-0.5 rounded text-xs leading-none"
                title="Clear selection"
              >
                ✕
              </span>
            )}
            <span className="text-[10px]">▼</span>
          </div>
        </button>
      </div>

      {/* Dropdown Popup with Type & Search Input */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-scale-in">
          {/* Search Box Input */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder={searchPlaceholder}
                className="w-full text-xs px-3 py-2 pl-7 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 shadow-inner"
              />
              <span className="absolute left-2.5 top-2.5 text-slate-400 text-xs">🔍</span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Results List */}
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-50 p-1">
            {/* Unassigned / Clear Option */}
            <div
              onClick={() => handleSelectUser(null)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs cursor-pointer transition ${
                !value ? 'bg-slate-100 text-slate-900 font-bold' : 'hover:bg-slate-50 text-slate-600'
              }`}
            >
              <div className="w-5 h-5 rounded-full border border-dashed border-slate-300 text-slate-400 font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                ∅
              </div>
              <span>Unassigned (Queue for triage)</span>
              {!value && <span className="ml-auto text-indigo-600 text-xs">✓</span>}
            </div>

            {filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                No matching team members found for &ldquo;{searchQuery}&rdquo;
              </div>
            ) : (
              filteredUsers.map((u, idx) => {
                const isSelected = u.id === value;
                const isHighlighted = highlightedIndex === idx + 1;
                return (
                  <div
                    key={u.id}
                    onClick={() => handleSelectUser(u)}
                    onMouseEnter={() => setHighlightedIndex(idx + 1)}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs cursor-pointer transition ${
                      isSelected
                        ? 'bg-indigo-50 text-indigo-950 font-bold'
                        : isHighlighted
                        ? 'bg-slate-50 text-slate-900'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="w-6 h-6 rounded-full bg-slate-800 text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0 shadow-sm">
                        {getInitials(u.full_name, u.email)}
                      </div>
                      <div className="truncate">
                        <div className="font-semibold text-slate-900 truncate">
                          {u.full_name || u.email}
                        </div>
                        {u.full_name && (
                          <div className="text-[10px] text-slate-400 truncate">{u.email}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide border ${getRoleBadgeColor(
                          u.role
                        )}`}
                      >
                        {u.role}
                      </span>
                      {isSelected && <span className="text-indigo-600 font-bold text-xs">✓</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && <p className="text-[11px] text-rose-500">{error}</p>}
    </div>
  );
}
