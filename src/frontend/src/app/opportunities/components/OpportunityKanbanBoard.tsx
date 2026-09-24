'use client';

import React from 'react';
import { STAGES, Opportunity } from '../types';
import { OpportunityCard } from './OpportunityCard';
import { CompanySignalSummary } from '../hooks/useOpportunities';
import { formatMoney } from '@/lib/currency';

interface OpportunityKanbanBoardProps {
  opportunities: Opportunity[];
  dragOverStage: string | null;
  getOppSignalSummary: (opp: Opportunity) => CompanySignalSummary | undefined;
  onOpenDetail: (opp: Opportunity) => void;
  onAdvanceStage: (oppId: string) => void;
  onDragStart: (e: React.DragEvent, oppId: string) => void;
  onDragOver: (e: React.DragEvent, stageId: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, stageId: string) => void;
  onOpenCloseModal: (oppId: string, outcome: 'closed_won' | 'closed_lost') => void;
}

export const OpportunityKanbanBoard: React.FC<OpportunityKanbanBoardProps> = ({
  opportunities,
  dragOverStage,
  getOppSignalSummary,
  onOpenDetail,
  onAdvanceStage,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onOpenCloseModal,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start">
      {STAGES.map((stage) => {
        const stageOpps = opportunities.filter((o) => o.stage === stage.id);
        const stageTotal = stageOpps.reduce((sum, o) => sum + (Number(o.value) || 0), 0);
        const isDragTarget = dragOverStage === stage.id;

        return (
          <div
            key={stage.id}
            data-testid={`kanban-column-${stage.id}`}
            onDragOver={(e) => onDragOver(e, stage.id)}
            onDragLeave={onDragLeave}
            onDrop={(e) => onDrop(e, stage.id)}
            className={`flex flex-col rounded-2xl border transition-all duration-200 min-h-[600px] ${
              stage.color
            } ${isDragTarget ? 'ring-2 ring-indigo-500 bg-indigo-50/40' : ''}`}
          >
            {/* Column Header */}
            <div className={`p-3.5 rounded-t-2xl border-b flex items-center justify-between ${stage.headerBg}`}>
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
                <span>{stage.icon}</span>
                <span>{stage.label}</span>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/80 shadow-2xs">
                {stageOpps.length}
              </span>
            </div>

            {/* Column Metrics Bar */}
            <div className="px-3.5 py-2 text-[11px] font-semibold text-slate-500 border-b bg-white/40 flex justify-between">
              <span>Total Value</span>
              <span className="text-slate-800 font-bold">{formatMoney(stageTotal, 'USD')}</span>
            </div>

            {/* Cards List */}
            <div className="p-2.5 space-y-3 flex-1 overflow-y-auto max-h-[720px]">
              {stageOpps.map((opp) => (
                <OpportunityCard
                  key={opp.id}
                  opp={opp}
                  signalSummary={getOppSignalSummary(opp)}
                  onOpenDetail={onOpenDetail}
                  onAdvanceStage={onAdvanceStage}
                  onDragStart={onDragStart}
                  onOpenCloseModal={onOpenCloseModal}
                />
              ))}

              {stageOpps.length === 0 && (
                <div className="h-32 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 text-xs p-3 text-center">
                  <span>No deals in {stage.label}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">Drag opportunities here</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
