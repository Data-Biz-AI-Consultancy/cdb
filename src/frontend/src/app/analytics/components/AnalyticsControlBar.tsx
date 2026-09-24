'use client';

interface AnalyticsControlBarProps {
  lookbackDays: number;
  selectedCategory: string;
  onLookbackChange: (days: number) => void;
  onCategoryChange: (category: string) => void;
}

export function AnalyticsControlBar({
  lookbackDays,
  selectedCategory,
  onLookbackChange,
  onCategoryChange,
}: AnalyticsControlBarProps) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
        <span>Lookback Window:</span>
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          {[
            { label: '30d', days: 30 },
            { label: '90d (Default)', days: 90 },
            { label: '180d', days: 180 },
            { label: '1 Year', days: 365 },
            { label: '2 Years', days: 730 },
          ].map((tf) => (
            <button
              key={tf.days}
              onClick={() => onLookbackChange(tf.days)}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer text-xs ${
                lookbackDays === tf.days
                  ? 'bg-white text-purple-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
        <span>Filter Category:</span>
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          {[
            { label: 'All Categories', value: 'all' },
            { label: 'Opportunities', value: 'opportunity' },
            { label: 'Risks', value: 'risk' },
            { label: 'Mixed', value: 'hybrid' },
          ].map((cat) => (
            <button
              key={cat.value}
              onClick={() => onCategoryChange(cat.value)}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer text-xs ${
                selectedCategory === cat.value
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
