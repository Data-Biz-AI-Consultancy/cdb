'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearAuthToken } from '@/lib/api';
import packageJson from '../../package.json';

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || `v${packageJson.version}`;

export default function SimpleNav() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === '/login') return null;

  const navItems = [
    { href: '/', label: 'Overview' },
    { href: '/persons', label: 'Persons' },
    { href: '/companies', label: 'Companies' },
    { href: '/activities', label: 'Activities' },
    { href: '/leads', label: 'Leads' },
    { href: '/opportunities', label: 'Opportunities' },
    { href: '/entity-resolution', label: 'ER Review Queue' },
    { href: '/ingestion', label: 'Ingestion' },
  ];

  const handleLogout = () => {
    clearAuthToken();
    router.push('/login');
  };

  return (
    <nav className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between shadow">
      <div className="flex items-center space-x-6">
        <Link href="/" className="font-bold text-lg text-emerald-400 tracking-wide">
          CDB
        </Link>
        <div className="flex space-x-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                  isActive
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <span className="text-xs text-slate-400 border border-slate-700 px-2 py-0.5 rounded">
          {APP_VERSION}
        </span>
        <button
          onClick={handleLogout}
          className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded border border-slate-700 font-medium"
        >
          Log Out
        </button>
      </div>
    </nav>
  );
}
