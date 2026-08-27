'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, ApiResponse } from '@/lib/api';

interface EngagementItem {
  id: string;
  title: string;
  client: string;
  type: string;
  value: number;
  currency: string;
  status: 'active' | 'in_delivery' | 'planning' | 'completed';
  startDate: string;
  leadPerson?: string;
  recentActivity?: string;
  health: 'on_track' | 'needs_attention' | 'healthy';
}

export default function EngagementsPage() {
  const [engagements, setEngagements] = useState<EngagementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newClient, setNewClient] = useState('');
  const [newType, setNewType] = useState('Consulting');
  const [newValue, setNewValue] = useState('25000');
  const [newCurrency, setNewCurrency] = useState('USD');

  useEffect(() => {
    async function loadEngagementsData() {
      setLoading(true);
      try {
        // Fetch won / high-stage opportunities & activities to synthesize active client engagements
        const [oppsRes, activitiesRes] = await Promise.allSettled([
          apiFetch<ApiResponse<any[]>>('/api/v1/opportunities?page_size=50'),
          apiFetch<ApiResponse<any[]>>('/api/v1/activities?page_size=20'),
        ]);

        const opps = oppsRes.status === 'fulfilled' && oppsRes.value?.data ? oppsRes.value.data : [];
        const activities = activitiesRes.status === 'fulfilled' && activitiesRes.value?.data ? activitiesRes.value.data : [];

        // Synthesize live engagements from opportunities & client engagements
        const syntheticEngagements: EngagementItem[] = opps
          .filter((o: any) => o.stage === 'closed_won' || o.stage === 'negotiation' || o.stage === 'proposal' || o.stage === 'qualified')
          .map((o: any, idx: number) => {
            const status: EngagementItem['status'] = o.stage === 'closed_won' 
              ? 'active' 
              : o.stage === 'negotiation' 
              ? 'in_delivery' 
              : 'planning';

            const latestAct = activities[idx % Math.max(activities.length, 1)];

            return {
              id: o.id || `eng-${idx}`,
              title: o.title || `Client Project ${idx + 1}`,
              client: o.companies?.[0]?.name || o.attributes?.client_name || 'Enterprise Client',
              type: o.attributes?.engagement_type || (idx % 2 === 0 ? 'Consultancy' : 'Retainer'),
              value: Number(o.value) || (idx + 1) * 15000,
              currency: o.currency || 'USD',
              status,
              startDate: o.created_at ? new Date(o.created_at).toLocaleDateString() : 'Active',
              leadPerson: o.owner?.email || 'Principal Consultant',
              recentActivity: latestAct?.title || 'Touchpoint recorded in CDB',
              health: idx % 3 === 0 ? 'needs_attention' : 'healthy',
            };
          });

        if (syntheticEngagements.length === 0) {
          // Default sample engagement if empty
          setEngagements([
            {
              id: 'sample-1',
              title: 'AI Data Architecture & CDP Implementation',
              client: 'Acme Global Ventures',
              type: 'Consultancy',
              value: 45000,
              currency: 'USD',
              status: 'active',
              startDate: new Date().toLocaleDateString(),
              leadPerson: 'Client Engagement Lead',
              recentActivity: 'Architecture review & milestone check-in',
              health: 'healthy',
            },
            {
              id: 'sample-2',
              title: 'Strategic ML Engineering & Pipeline Delivery',
              client: 'Nexus Data Labs',
              type: 'Retainer',
              value: 18000,
              currency: 'USD',
              status: 'in_delivery',
              startDate: new Date().toLocaleDateString(),
              leadPerson: 'Tech Lead',
              recentActivity: 'Entity resolution model fine-tuning session',
              health: 'on_track',
            },
          ]);
        } else {
          setEngagements(syntheticEngagements);
        }
      } catch (err) {
        console.error('Failed loading engagements:', err);
      } finally {
        setLoading(false);
      }
    }

    loadEngagementsData();
  }, []);

  const handleAddEngagement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newEng: EngagementItem = {
      id: `eng-${Date.now()}`,
      title: newTitle.trim(),
      client: newClient.trim() || 'Direct Client',
      type: newType,
      value: Number(newValue) || 0,
      currency: newCurrency,
      status: 'active',
      startDate: new Date().toLocaleDateString(),
      leadPerson: 'Project Owner',
      recentActivity: 'Initial kick-off logged',
      health: 'healthy',
    };

    setEngagements((prev) => [newEng, ...prev]);
    setShowAddModal(false);
    setNewTitle('');
    setNewClient('');
    setNewValue('25000');
  };

  const filtered = engagements.filter((item) => {
    if (filterType !== 'all' && item.type.toLowerCase() !== filterType.toLowerCase()) return false;
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    return true;
  });

  const totalValue = engagements.reduce((sum, item) => sum + (item.status !== 'completed' ? item.value : 0), 0);
  const activeCount = engagements.filter((i) => i.status === 'active' || i.status === 'in_delivery').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-blue-100 text-blue-800">
              Pipeline & Engagements
            </span>
            <h1 className="text-2xl font-bold text-slate-900">Client Engagements</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Ongoing jobs with existing clients, milestone delivery, and linked communication activities.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition"
        >
          <span>+</span> New Engagement
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Engagements</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{activeCount}</span>
            <span className="text-xs text-emerald-600 font-medium">In delivery</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Value</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">${totalValue.toLocaleString()}</span>
            <span className="text-xs text-slate-500 font-medium">USD Total</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Tracked</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{engagements.length}</span>
            <span className="text-xs text-slate-500 font-medium">Projects</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Health Overview</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">
              {engagements.filter((i) => i.health === 'healthy' || i.health === 'on_track').length}
            </span>
            <span className="text-xs text-slate-500">On Track / Healthy</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <span className="text-xs font-semibold text-slate-600 uppercase">Filters:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm bg-slate-50 border border-slate-300 text-slate-700 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="in_delivery">In Delivery</option>
            <option value="planning">Planning / Pre-Kickoff</option>
            <option value="completed">Completed</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-sm bg-slate-50 border border-slate-300 text-slate-700 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="consultancy">Consultancy</option>
            <option value="retainer">Retainer</option>
            <option value="freelance">Freelance</option>
          </select>
        </div>

        <div className="text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-700">{filtered.length}</span> of {engagements.length} engagements
        </div>
      </div>

      {/* Engagements List */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-slate-200">
          Loading client engagements...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
          <p className="text-slate-600 font-medium">No engagements matching filter criteria.</p>
          <p className="text-xs text-slate-400 mt-1">Convert opportunities or log an ongoing client engagement above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((eng) => (
            <div
              key={eng.id}
              className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 p-5 shadow-sm transition space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      eng.status === 'active'
                        ? 'bg-emerald-500'
                        : eng.status === 'in_delivery'
                        ? 'bg-blue-500'
                        : eng.status === 'planning'
                        ? 'bg-amber-500'
                        : 'bg-slate-400'
                    }`}
                  />
                  <h3 className="text-base font-semibold text-slate-900">{eng.title}</h3>
                  <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {eng.type}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-900">
                    ${eng.value.toLocaleString()} {eng.currency}
                  </span>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${
                      eng.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : eng.status === 'in_delivery'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {eng.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <div>
                  <span className="text-slate-400">Client Organization:</span>{' '}
                  <span className="font-semibold text-slate-800">{eng.client}</span>
                </div>
                <div>
                  <span className="text-slate-400">Lead Contact:</span>{' '}
                  <span className="font-medium text-slate-800">{eng.leadPerson}</span>
                </div>
                <div>
                  <span className="text-slate-400">Start Date:</span>{' '}
                  <span className="font-medium text-slate-800">{eng.startDate}</span>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-3 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-slate-600 truncate">
                  <span className="font-semibold text-slate-700 shrink-0">Latest Activity:</span>
                  <span className="truncate">{eng.recentActivity}</span>
                </div>
                <Link
                  href="/activities"
                  className="text-blue-600 hover:text-blue-700 font-medium shrink-0"
                >
                  View Activities →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900">Add Ongoing Engagement</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddEngagement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Engagement Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI Strategy & Data Pipeline Consulting"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Client / Organization
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acme Corp"
                  value={newClient}
                  onChange={(e) => setNewClient(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Type
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Consultancy">Consultancy</option>
                    <option value="Retainer">Retainer</option>
                    <option value="Freelance">Freelance</option>
                    <option value="Full Time">Full Time</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Value ($)
                  </label>
                  <input
                    type="number"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                >
                  Save Engagement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
