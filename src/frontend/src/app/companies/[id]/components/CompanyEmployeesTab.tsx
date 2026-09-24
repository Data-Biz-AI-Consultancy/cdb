import React from 'react';
import Link from 'next/link';
import { SEGMENT_META, TEMPERATURE_META } from '../types';

interface CompanyEmployeesTabProps {
  employees: any[];
  processedEmployees: any[];
  employeeSubFilter: 'all' | 'current' | 'alumni';
  setEmployeeSubFilter: (filter: 'all' | 'current' | 'alumni') => void;
  employeeSortBy: 'warmth' | 'interaction' | 'name' | 'tenure';
  setEmployeeSortBy: (sort: 'warmth' | 'interaction' | 'name' | 'tenure') => void;
  latestInteractionByPerson: Record<string, any>;
  onLinkContact: () => void;
  onUnlinkContact: (personId: string) => void;
}

export const CompanyEmployeesTab: React.FC<CompanyEmployeesTabProps> = ({
  employees,
  processedEmployees,
  employeeSubFilter,
  setEmployeeSubFilter,
  employeeSortBy,
  setEmployeeSortBy,
  latestInteractionByPerson,
  onLinkContact,
  onUnlinkContact,
}) => {
  const currentEmployeesCount = employees.filter((e) => e.is_current).length;
  const alumniCount = employees.filter((e) => !e.is_current).length;

  return (
    <div className="space-y-4">
      {/* Controls Bar: Sub-filters & Sort dropdown */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1">Filter:</span>
          <button
            onClick={() => setEmployeeSubFilter('all')}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
              employeeSubFilter === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Contacts ({employees.length})
          </button>
          <button
            onClick={() => setEmployeeSubFilter('current')}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
              employeeSubFilter === 'current'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            Current Staff ({currentEmployeesCount})
          </button>
          <button
            onClick={() => setEmployeeSubFilter('alumni')}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
              employeeSubFilter === 'alumni'
                ? 'bg-amber-700 text-white shadow-sm'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            Alumni / Past ({alumniCount})
          </button>
        </div>

        {/* Sort & Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">Sort by:</label>
            <select
              value={employeeSortBy}
              onChange={(e) => setEmployeeSortBy(e.target.value as any)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
            >
              <option value="warmth">🔥 Warmth (Hot → Cold)</option>
              <option value="interaction">⏱️ Latest Interaction (Newest)</option>
              <option value="name">🔤 Name (A-Z)</option>
              <option value="tenure">📅 Tenure / Start Date</option>
            </select>
          </div>

          <button
            onClick={onLinkContact}
            className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition"
          >
            + Link Person
          </button>
        </div>
      </div>

      {/* Employees List */}
      {processedEmployees.length === 0 ? (
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-3 shadow-sm">
          <p className="text-sm text-slate-500">No contacts match the selected filter.</p>
          <button
            onClick={onLinkContact}
            className="px-3.5 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm"
          >
            + Link First Person
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {processedEmployees.map((emp) => {
            const empName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Unnamed Contact';
            const empInitials = `${emp.first_name?.[0] || ''}${emp.last_name?.[0] || ''}`.toUpperCase() || 'P';
            const rawSegment = emp.attributes?.segment || 'general_network';
            const segInfo = SEGMENT_META[rawSegment] || SEGMENT_META.general_network;
            const rawTemp = emp.attributes?.temperature || emp.attributes?.engagement_temperature;
            const tempInfo = rawTemp ? TEMPERATURE_META[rawTemp.toLowerCase()] : null;
            const lastAct = latestInteractionByPerson[emp.person_id];

            return (
              <div
                key={emp.relationship_id}
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-slate-300 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center text-sm font-bold shadow shrink-0">
                        {empInitials}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/persons/${emp.person_id}`}
                            className="font-bold text-slate-900 hover:text-blue-600 transition text-base"
                          >
                            {empName}
                          </Link>
                          {emp.is_current ? (
                            <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                              Current
                            </span>
                          ) : (
                            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                              Alumni
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-medium text-slate-700 mt-0.5">
                          {emp.title || 'Role not specified'}
                        </div>
                      </div>
                    </div>

                    {/* Unlink Action */}
                    <button
                      onClick={() => onUnlinkContact(emp.person_id)}
                      title="Unlink contact from company"
                      className="text-slate-400 hover:text-red-600 text-xs p-1 rounded transition"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Badges: Segment & Warmth */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${segInfo.bg}`}>
                      {segInfo.label}
                    </span>

                    {tempInfo && (
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${tempInfo.bg} ${tempInfo.text} inline-flex items-center gap-1`}
                      >
                        <span>{tempInfo.icon}</span>
                        <span>{tempInfo.label}</span>
                      </span>
                    )}
                  </div>

                  {/* Contact Info & Location */}
                  <div className="text-xs text-slate-600 mt-3 space-y-1">
                    {emp.primary_email && (
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-700">
                        <span>✉️</span>
                        <a href={`mailto:${emp.primary_email}`} className="hover:underline text-blue-600">
                          {emp.primary_email}
                        </a>
                      </div>
                    )}
                    {(emp.city || emp.country) && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <span>📍</span>
                        <span>{[emp.city, emp.country].filter(Boolean).join(', ')}</span>
                      </div>
                    )}
                    {emp.linkedin_url && (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span>💼</span>
                        <a
                          href={emp.linkedin_url.startsWith('http') ? emp.linkedin_url : `https://${emp.linkedin_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sky-700 hover:underline"
                        >
                          LinkedIn Profile ↗
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer: Dates & Last Interaction */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                  <div>
                    {emp.started_at ? (
                      <span>
                        Tenure: {emp.started_at} {emp.ended_at ? `to ${emp.ended_at}` : '→ Present'}
                      </span>
                    ) : (
                      <span>Tenure dates not set</span>
                    )}
                  </div>

                  {lastAct ? (
                    <div className="inline-flex items-center gap-1 text-slate-700 font-medium bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                      <span>⏱️ Last touch:</span>
                      <span>{new Date(lastAct.occurred_at).toLocaleDateString()}</span>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">No logged interaction</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CompanyEmployeesTab;
