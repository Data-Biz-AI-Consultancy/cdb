'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, ApiResponse } from '@/lib/api';

export default function HomePage() {
  const [stats, setStats] = useState({
    persons: 0,
    companies: 0,
    activities: 0,
    leads: 0,
    opportunities: 0,
    erQueue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCounts() {
      try {
        const [p, c, a, l, o, er] = await Promise.allSettled([
          apiFetch<ApiResponse<any[]>>('/api/v1/persons?page_size=1'),
          apiFetch<ApiResponse<any[]>>('/api/v1/companies?page_size=1'),
          apiFetch<ApiResponse<any[]>>('/api/v1/activities?page_size=1'),
          apiFetch<ApiResponse<any[]>>('/api/v1/leads?page_size=1'),
          apiFetch<ApiResponse<any[]>>('/api/v1/opportunities?page_size=1'),
          apiFetch<ApiResponse<any[]>>('/api/v1/er/queue?page_size=1'),
        ]);

        const getTotal = (res: PromiseSettledResult<any>) => {
          if (res.status !== 'fulfilled' || !res.value) return 0;
          return res.value.pagination?.total ?? res.value.meta?.total ?? 0;
        };

        setStats({
          persons: getTotal(p),
          companies: getTotal(c),
          activities: getTotal(a),
          leads: getTotal(l),
          opportunities: getTotal(o),
          erQueue: getTotal(er),
        });
      } catch (err) {
        console.error('Failed loading stats:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCounts();
  }, []);

  const cards = [
    { title: 'Persons', count: stats.persons, href: '/persons', desc: 'Unified Golden Contact Records' },
    { title: 'Companies', count: stats.companies, href: '/companies', desc: 'Organizations and Relationships' },
    { title: 'Activities', count: stats.activities, href: '/activities', desc: 'Interactions, Meetings, Messages' },
    { title: 'Leads', count: stats.leads, href: '/leads', desc: 'Inbound Signals & Lead Status' },
    { title: 'Opportunities', count: stats.opportunities, href: '/opportunities', desc: 'Deals & Stage Tracking' },
    { title: 'ER Review Queue', count: stats.erQueue, href: '/entity-resolution', desc: 'Duplicate Merge Candidates' },
  ];

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
          <p className="text-sm text-slate-500">Welcome to CDB Client DataBase</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="block p-5 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-slate-400 transition"
          >
            <div className="flex justify-between items-start">
              <h2 className="text-base font-semibold text-slate-800">{card.title}</h2>
              <span className="text-2xl font-bold text-slate-900">
                {loading ? '...' : card.count}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">{card.desc}</p>
            <div className="mt-4 text-xs font-medium text-blue-600">
              View {card.title} →
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
