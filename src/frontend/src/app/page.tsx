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
    engagements: 0,
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
          apiFetch<ApiResponse<any[]>>('/api/v1/opportunities?page_size=50'),
          apiFetch<ApiResponse<any[]>>('/api/v1/er/queue?page_size=1'),
        ]);

        const getTotal = (res: PromiseSettledResult<any>) => {
          if (res.status !== 'fulfilled' || !res.value) return 0;
          return res.value.pagination?.total ?? res.value.meta?.total ?? 0;
        };

        // Estimate active engagements from won / high-stage opportunities
        let engCount = 0;
        if (o.status === 'fulfilled' && o.value?.data) {
          engCount = o.value.data.filter((item: any) =>
            ['closed_won', 'negotiation', 'proposal', 'qualified'].includes(item.stage)
          ).length;
        }

        setStats({
          persons: getTotal(p),
          companies: getTotal(c),
          activities: getTotal(a),
          leads: getTotal(l),
          opportunities: getTotal(o),
          erQueue: getTotal(er),
          engagements: engCount,
        });
      } catch (err) {
        console.error('Failed loading stats:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCounts();
  }, []);

  const sections = [
    {
      group: 'Directory',
      tag: 'Core Entities & Identity Graph',
      color: 'border-emerald-200 bg-emerald-50/30',
      tagColor: 'bg-emerald-100 text-emerald-800',
      cards: [
        {
          title: 'Persons',
          count: stats.persons,
          href: '/persons',
          desc: 'The very first class citizen in CDB',
          badge: 'Primary',
        },
        {
          title: 'Entity Resolution',
          count: stats.erQueue,
          countSuffix: 'in queue',
          href: '/entity-resolution',
          desc: 'ML feature to merge different records of the same natural person into the same golden record (e.g. LinkedIn + Substack + Manual ingestion)',
          badge: 'ML Engine',
        },
        {
          title: 'Companies',
          count: stats.companies,
          href: '/companies',
          desc: 'Potential Clients & peer organizations with historical relationships',
        },
      ],
    },
    {
      group: 'Pipeline & Engagements',
      tag: 'CRM & Relationship Lifecycle',
      color: 'border-blue-200 bg-blue-50/30',
      tagColor: 'bg-blue-100 text-blue-800',
      cards: [
        {
          title: 'Activities',
          count: stats.activities,
          href: '/activities',
          desc: 'Reading from all LinkedIn Messages, Notion meeting notes, and potentially work emails',
        },
        {
          title: 'Leads',
          count: stats.leads,
          href: '/leads',
          desc: 'Distill from Activities, potential leads to job opportunities (Full Time employment, Freelance, Consultancy jobs, etc.)',
        },
        {
          title: 'Opportunities',
          count: stats.opportunities,
          href: '/opportunities',
          desc: 'Tangibly convertible Leads to Engagement (e.g. Interviewing, Negotiating terms with clients, etc.)',
        },
        {
          title: 'Engagements',
          count: stats.engagements,
          href: '/engagements',
          desc: 'Ongoing jobs with existing Clients, with all relevant activities & deliverable milestones',
          badge: 'New',
        },
      ],
    },
    {
      group: 'Settings',
      tag: 'Data Pipelines & Platform Health',
      color: 'border-slate-200 bg-slate-50/50',
      tagColor: 'bg-slate-200 text-slate-800',
      cards: [
        {
          title: 'Ingestion',
          count: 'Ready',
          href: '/ingestion',
          desc: 'Intake pipelines for LinkedIn archives, Notion exports, Substack subscriptions, and CSV data',
        },
        {
          title: 'Settings',
          count: 'Active',
          href: '/settings',
          desc: 'Platform configuration, entity resolution thresholds, database health, and system status',
        },
      ],
    },
  ];

  return (
    <div className="space-y-10">
      {/* Hero Welcome */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              CDB <span className="text-emerald-400 font-light">| Client DataBase</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-300 mt-2 max-w-2xl">
              AI & ML-native personal CRM & CDP — unifying contact identities, communication streams, business leads, and active client engagements into a single self-hosted system of record.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/engagements"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-semibold text-sm rounded-lg shadow-sm transition"
            >
              View Engagements
            </Link>
            <Link
              href="/ingestion"
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium text-sm rounded-lg transition"
            >
              Ingest Data
            </Link>
          </div>
        </div>
      </div>

      {/* Grouped Visual Sections */}
      <div className="space-y-10">
        {sections.map((section) => (
          <section key={section.group} className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-slate-900">{section.group}</h2>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${section.tagColor}`}>
                  {section.tag}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {section.cards.map((card) => (
                <Link
                  key={card.title}
                  href={card.href}
                  className="group relative flex flex-col justify-between p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-slate-400 transition"
                >
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-900 group-hover:text-blue-600 transition">
                          {card.title}
                        </h3>
                        {card.badge && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {card.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-2xl font-bold text-slate-900 shrink-0">
                        {loading ? '...' : card.count}
                        {card.countSuffix && (
                          <span className="text-xs font-normal text-slate-500 ml-1">
                            {card.countSuffix}
                          </span>
                        )}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">{card.desc}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs font-semibold text-blue-600 group-hover:text-blue-700">
                    Open {card.title} →
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
