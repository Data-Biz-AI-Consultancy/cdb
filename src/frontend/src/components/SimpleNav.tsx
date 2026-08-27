'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearAuthToken } from '@/lib/api';
import CdbIcon from '@/components/CdbIcon';
import packageJson from '../../package.json';

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || `v${packageJson.version}`;

interface NavItem {
  href: string;
  label: string;
  desc?: string;
  badge?: string;
}

interface NavGroup {
  name: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    name: 'Directory',
    items: [
      {
        href: '/persons',
        label: 'Persons',
        desc: 'The very first class citizen in CDB',
      },
      {
        href: '/entity-resolution',
        label: 'Entity Resolution',
        desc: 'ML feature to merge records into golden records',
        badge: 'ML',
      },
      {
        href: '/companies',
        label: 'Companies',
        desc: 'Potential clients & organizations',
      },
    ],
  },
  {
    name: 'Pipeline & Engagements',
    items: [
      {
        href: '/activities',
        label: 'Activities',
        desc: 'LinkedIn messages, Notion notes & work emails',
      },
      {
        href: '/leads',
        label: 'Leads',
        desc: 'Distilled potential leads to job opportunities',
      },
      {
        href: '/opportunities',
        label: 'Opportunities',
        desc: 'Tangibly convertible deals & pipeline',
      },
      {
        href: '/engagements',
        label: 'Engagements',
        desc: 'Ongoing jobs with existing clients & activities',
        badge: 'New',
      },
    ],
  },
  {
    name: 'Settings',
    items: [
      {
        href: '/ingestion',
        label: 'Ingestion',
        desc: 'Data intake & background pipeline jobs',
      },
      {
        href: '/settings',
        label: 'Settings',
        desc: 'Platform configuration, ER thresholds & health',
      },
    ],
  },
];

export default function SimpleNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenGroup(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdowns on route change
  useEffect(() => {
    setOpenGroup(null);
    setMobileMenuOpen(false);
  }, [pathname]);

  if (pathname === '/login') return null;

  const handleLogout = () => {
    clearAuthToken();
    router.push('/login');
  };

  const isOverviewActive = pathname === '/';

  return (
    <nav className="bg-slate-900 text-white shadow relative z-40" ref={navRef}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Left Brand + Navigation Groups */}
          <div className="flex items-center space-x-6">
            <Link
              href="/"
              className="flex items-center space-x-2.5 font-bold text-lg text-emerald-400 tracking-wide hover:text-emerald-300 transition shrink-0"
            >
              <CdbIcon className="w-6 h-6 shrink-0" />
              <span>CDB</span>
            </Link>

            {/* Desktop Navigation Groups */}
            <div className="hidden md:flex items-center space-x-1">
              <Link
                href="/"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  isOverviewActive
                    ? 'bg-slate-800 text-emerald-400 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                Overview
              </Link>

              {NAV_GROUPS.map((group) => {
                const isGroupActive = group.items.some((item) =>
                  pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                );
                const isOpen = openGroup === group.name;

                return (
                  <div key={group.name} className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenGroup(isOpen ? null : group.name)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition ${
                        isGroupActive
                          ? 'bg-slate-800 text-white font-semibold'
                          : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                      } ${isOpen ? 'ring-1 ring-slate-700 bg-slate-800' : ''}`}
                    >
                      <span>{group.name}</span>
                      <svg
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-emerald-400' : 'text-slate-400'
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Dropdown Menu */}
                    {isOpen && (
                      <div className="absolute top-full left-0 mt-1.5 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                        <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800/80 mb-1">
                          {group.name}
                        </div>
                        <div className="space-y-1">
                          {group.items.map((item) => {
                            const isItemActive =
                              pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setOpenGroup(null)}
                                className={`group block px-3 py-2 rounded-lg text-sm transition ${
                                  isItemActive
                                    ? 'bg-slate-800 text-emerald-400 font-semibold'
                                    : 'text-slate-200 hover:bg-slate-800/70 hover:text-white'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">{item.label}</span>
                                  {item.badge && (
                                    <span
                                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                                        item.badge === 'ML'
                                          ? 'bg-purple-900/60 text-purple-300 border border-purple-700'
                                          : 'bg-emerald-900/60 text-emerald-300 border border-emerald-700'
                                      }`}
                                    >
                                      {item.badge}
                                    </span>
                                  )}
                                </div>
                                {item.desc && (
                                  <p className="text-xs text-slate-400 group-hover:text-slate-300 mt-0.5 line-clamp-1">
                                    {item.desc}
                                  </p>
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="hidden md:flex items-center space-x-3">
            <span className="text-xs text-slate-400 border border-slate-800 bg-slate-900/50 px-2.5 py-1 rounded-md font-mono">
              {APP_VERSION}
            </span>
            <button
              onClick={handleLogout}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 font-medium transition"
            >
              Log Out
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            <span className="text-xs text-slate-400 border border-slate-800 px-2 py-0.5 rounded font-mono">
              {APP_VERSION}
            </span>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-t border-slate-800 px-4 pt-2 pb-4 space-y-4">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3 py-2 rounded-md text-sm font-medium ${
              isOverviewActive ? 'bg-slate-800 text-emerald-400' : 'text-slate-300'
            }`}
          >
            Overview
          </Link>

          {NAV_GROUPS.map((group) => (
            <div key={group.name} className="space-y-1">
              <div className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {group.name}
              </div>
              {group.items.map((item) => {
                const isItemActive =
                  pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-1.5 rounded-md text-sm ${
                      isItemActive
                        ? 'bg-slate-800 text-emerald-400 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}

          <div className="pt-2 border-t border-slate-800 flex justify-end">
            <button
              onClick={handleLogout}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded border border-slate-700 font-medium"
            >
              Log Out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
