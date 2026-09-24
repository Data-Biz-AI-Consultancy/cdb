'use client';

import { useAnalyticsMetrics } from './hooks/useAnalyticsMetrics';
import {
  AnalyticsHeader,
  AnalyticsControlBar,
  AnalyticsKpis,
  AnalyticsSignalBreakdownTable,
  AnalyticsDistributionGrid,
} from './components';

export default function AnalyticsPage() {
  const {
    metrics,
    loading,
    lookbackDays,
    selectedCategory,
    setSelectedCategory,
    handleLookbackChange,
  } = useAnalyticsMetrics();

  const filteredSignalBreakdown =
    metrics?.by_signal.filter((item) => {
      if (selectedCategory === 'all') return true;
      return item.category?.toLowerCase() === selectedCategory.toLowerCase();
    }) || [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <AnalyticsHeader />

      <AnalyticsControlBar
        lookbackDays={lookbackDays}
        selectedCategory={selectedCategory}
        onLookbackChange={handleLookbackChange}
        onCategoryChange={setSelectedCategory}
      />

      {loading && !metrics ? (
        <div className="p-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          Loading analytics metrics...
        </div>
      ) : !metrics ? (
        <div className="p-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          No metrics available.
        </div>
      ) : (
        <div className="space-y-8">
          <AnalyticsKpis metrics={metrics} />

          <AnalyticsSignalBreakdownTable
            lookbackDays={metrics.lookback_days}
            signals={filteredSignalBreakdown}
          />

          <AnalyticsDistributionGrid
            byCategory={metrics.by_category}
            bySeverity={metrics.by_severity}
          />
        </div>
      )}
    </div>
  );
}
