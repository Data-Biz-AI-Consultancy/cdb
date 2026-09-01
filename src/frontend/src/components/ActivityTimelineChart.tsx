'use client';

import React, { useState, useMemo } from 'react';

export interface ActivityTimelineBucket {
  date: string; // YYYY-MM-DD
  total: number;
  by_type: Record<string, number>;
}

export interface ActivityTimelineChartProps {
  timeline: ActivityTimelineBucket[];
  totalActivities?: number;
  defaultExpanded?: boolean;
}

const TYPE_PALETTE: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  meeting: { label: 'Meeting', color: '#10b981', bg: 'bg-emerald-500', icon: '🤝' },
  linkedin_message: { label: 'LinkedIn', color: '#6366f1', bg: 'bg-indigo-500', icon: '🔗' },
  email: { label: 'Email', color: '#8b5cf6', bg: 'bg-violet-500', icon: '✉️' },
  call: { label: 'Call', color: '#0284c7', bg: 'bg-sky-600', icon: '📞' },
  note: { label: 'Note', color: '#f59e0b', bg: 'bg-amber-500', icon: '📝' },
  whatsapp: { label: 'WhatsApp', color: '#14b8a6', bg: 'bg-teal-500', icon: '💬' },
};

export default function ActivityTimelineChart({
  timeline = [],
  totalActivities,
  defaultExpanded = false,
}: ActivityTimelineChartProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [chartType, setChartType] = useState<'stacked_bar' | 'area'>('stacked_bar');
  const [timeRange, setTimeRange] = useState<'all' | '14d' | '30d'>('30d');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Filter timeline based on time range
  const filteredData = useMemo(() => {
    if (!timeline || timeline.length === 0) return [];
    if (timeRange === 'all') return timeline;

    const days = timeRange === '14d' ? 14 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    return timeline.filter((d) => d.date >= cutoffStr);
  }, [timeline, timeRange]);

  // Compute max value for scaling
  const maxVal = useMemo(() => {
    if (filteredData.length === 0) return 10;
    const peak = Math.max(...filteredData.map((d) => d.total || 0));
    return Math.max(peak + Math.ceil(peak * 0.15), 5);
  }, [filteredData]);

  // Chart layout dimensions
  const svgWidth = 800;
  const svgHeight = 260;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;
  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const typesList = Object.keys(TYPE_PALETTE);

  // Helper for Area Path calculations
  const areaPaths = useMemo(() => {
    if (filteredData.length < 2 || chartType !== 'area') return [];

    const n = filteredData.length;
    const stepX = chartWidth / (n - 1);

    // Calculate stacked values for each point
    // stackLevels: array of layers, each layer has points [{x, y0, y1}]
    const layers: { typeKey: string; color: string; path: string }[] = [];
    const prevY = new Array(n).fill(chartHeight);

    typesList.forEach((typeKey) => {
      const color = TYPE_PALETTE[typeKey].color;
      const currentPoints: { x: number; y: number }[] = [];
      const basePoints: { x: number; y: number }[] = [];

      filteredData.forEach((d, i) => {
        const x = paddingLeft + i * stepX;
        const val = d.by_type?.[typeKey] || 0;
        const heightVal = (val / maxVal) * chartHeight;
        const topY = Math.max(paddingTop, prevY[i] - heightVal);

        currentPoints.push({ x, y: topY });
        basePoints.push({ x, y: prevY[i] });

        prevY[i] = topY;
      });

      // Construct SVG path (forward on top line, backward on bottom line)
      if (currentPoints.length > 0) {
        let dStr = `M ${currentPoints[0].x} ${currentPoints[0].y}`;
        for (let i = 1; i < currentPoints.length; i++) {
          dStr += ` L ${currentPoints[i].x} ${currentPoints[i].y}`;
        }
        for (let i = basePoints.length - 1; i >= 0; i--) {
          dStr += ` L ${basePoints[i].x} ${basePoints[i].y}`;
        }
        dStr += ' Z';
        layers.push({ typeKey, color, path: dStr });
      }
    });

    return layers.reverse(); // Draw bottom-most layer first
  }, [filteredData, chartType, maxVal, chartWidth, chartHeight]);

  const activeHoveredBucket = hoveredIndex !== null && filteredData[hoveredIndex] ? filteredData[hoveredIndex] : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200">
      {/* Collapsible Header Banner */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid="timeline-chart-toggle"
        className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/75 transition select-none"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xl">
            📈
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">Activity Velocity & Time Evolution</h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-700">
                {timeline.length} active dates
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isExpanded
                ? 'Visualize customer engagement trends over time by channel and interaction type'
                : 'Click to expand historical timeline analytics (Stacked Bar & Area chart view)'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-indigo-600 hidden sm:inline">
            {isExpanded ? 'Hide Chart ▲' : 'Show Chart ▼'}
          </span>
          <div
            className={`w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          >
            ▼
          </div>
        </div>
      </div>

      {/* Expanded Chart Body */}
      {isExpanded && (
        <div className="p-5 border-t border-slate-100 space-y-4 bg-gradient-to-b from-white to-slate-50/50">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            {/* Chart Type Selector */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setChartType('stacked_bar')}
                data-testid="chart-type-bar"
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  chartType === 'stacked_bar'
                    ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>📊</span>
                <span>Stacked Bar Chart</span>
              </button>
              <button
                type="button"
                onClick={() => setChartType('area')}
                data-testid="chart-type-area"
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  chartType === 'area'
                    ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>📈</span>
                <span>Area Trend Chart</span>
              </button>
            </div>

            {/* Time Range Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Range:</span>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setTimeRange('14d')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                    timeRange === '14d' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  14 Days
                </button>
                <button
                  onClick={() => setTimeRange('30d')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                    timeRange === '30d' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  30 Days
                </button>
                <button
                  onClick={() => setTimeRange('all')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                    timeRange === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All History
                </button>
              </div>
            </div>
          </div>

          {/* Interactive SVG Chart View */}
          {filteredData.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <div className="text-3xl mb-2">📊</div>
              <p className="text-sm font-medium">No activity timestamp data available in this range</p>
            </div>
          ) : (
            <div className="relative w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-64 select-none"
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Horizontal Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                  const y = paddingTop + chartHeight * (1 - ratio);
                  const val = Math.round(maxVal * ratio);
                  return (
                    <g key={ratio}>
                      <line
                        x1={paddingLeft}
                        y1={y}
                        x2={svgWidth - paddingRight}
                        y2={y}
                        stroke="#e2e8f0"
                        strokeDasharray={ratio === 0 ? undefined : '3 3'}
                        strokeWidth="1"
                      />
                      <text
                        x={paddingLeft - 8}
                        y={y + 4}
                        textAnchor="end"
                        fontSize="10"
                        fill="#94a3b8"
                        className="font-mono"
                      >
                        {val}
                      </text>
                    </g>
                  );
                })}

                {/* AREA CHART MODE */}
                {chartType === 'area' && (
                  <>
                    <defs>
                      {typesList.map((typeKey) => (
                        <linearGradient key={typeKey} id={`grad-${typeKey}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={TYPE_PALETTE[typeKey].color} stopOpacity="0.85" />
                          <stop offset="100%" stopColor={TYPE_PALETTE[typeKey].color} stopOpacity="0.2" />
                        </linearGradient>
                      ))}
                    </defs>
                    {areaPaths.map((layer) => (
                      <path
                        key={layer.typeKey}
                        d={layer.path}
                        fill={`url(#grad-${layer.typeKey})`}
                        stroke={layer.color}
                        strokeWidth="1.5"
                        opacity="0.9"
                      />
                    ))}
                  </>
                )}

                {/* STACKED BAR CHART MODE */}
                {chartType === 'stacked_bar' &&
                  filteredData.map((d, i) => {
                    const stepWidth = chartWidth / filteredData.length;
                    const barWidth = Math.max(Math.min(stepWidth * 0.7, 36), 6);
                    const x = paddingLeft + i * stepWidth + (stepWidth - barWidth) / 2;

                    let currentBaseY = paddingTop + chartHeight;

                    return (
                      <g key={d.date}>
                        {typesList.map((typeKey) => {
                          const count = d.by_type?.[typeKey] || 0;
                          if (count <= 0) return null;

                          const segHeight = (count / maxVal) * chartHeight;
                          const segY = currentBaseY - segHeight;
                          currentBaseY = segY;

                          return (
                            <rect
                              key={typeKey}
                              x={x}
                              y={segY}
                              width={barWidth}
                              height={segHeight}
                              fill={TYPE_PALETTE[typeKey].color}
                              rx={1.5}
                              opacity={hoveredIndex === null || hoveredIndex === i ? 0.9 : 0.4}
                              className="transition-all duration-150 cursor-pointer"
                            />
                          );
                        })}
                      </g>
                    );
                  })}

                {/* Interactive Hover Hitboxes across all chart modes */}
                {filteredData.map((d, i) => {
                  const stepWidth = chartWidth / filteredData.length;
                  const x = paddingLeft + i * stepWidth;

                  return (
                    <g key={`hitbox-${d.date}`}>
                      <rect
                        x={x}
                        y={paddingTop}
                        width={stepWidth}
                        height={chartHeight}
                        fill="transparent"
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredIndex(i)}
                      />
                      {/* Vertical highlight cursor on hover */}
                      {hoveredIndex === i && (
                        <line
                          x1={x + stepWidth / 2}
                          y1={paddingTop}
                          x2={x + stepWidth / 2}
                          y2={paddingTop + chartHeight}
                          stroke="#6366f1"
                          strokeWidth="1.5"
                          strokeDasharray="2 2"
                        />
                      )}
                    </g>
                  );
                })}

                {/* X-Axis Date Labels (sample evenly) */}
                {filteredData.map((d, i) => {
                  const stepWidth = chartWidth / filteredData.length;
                  const x = paddingLeft + i * stepWidth + stepWidth / 2;
                  const interval = Math.max(1, Math.floor(filteredData.length / 8));
                  if (i % interval !== 0 && i !== filteredData.length - 1) return null;

                  const dateLabel = new Date(d.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <text
                      key={`label-${d.date}`}
                      x={x}
                      y={svgHeight - 12}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#64748b"
                      className="font-medium select-none"
                    >
                      {dateLabel}
                    </text>
                  );
                })}
              </svg>

              {/* Floating Tooltip card on hover */}
              {activeHoveredBucket && (
                <div
                  className="p-3 bg-slate-900/95 text-white rounded-xl shadow-xl text-xs space-y-1.5 border border-slate-700/80 backdrop-blur-md absolute top-2 right-4 z-10 min-w-48"
                  data-testid="chart-tooltip"
                >
                  <div className="flex justify-between items-center pb-1 border-b border-slate-700">
                    <span className="font-bold">
                      {new Date(activeHoveredBucket.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-200 font-mono font-bold">
                      {activeHoveredBucket.total} total
                    </span>
                  </div>

                  <div className="space-y-1 pt-1">
                    {typesList.map((typeKey) => {
                      const count = activeHoveredBucket.by_type?.[typeKey] || 0;
                      if (count <= 0) return null;
                      const cfg = TYPE_PALETTE[typeKey];
                      return (
                        <div key={typeKey} className="flex justify-between items-center">
                          <span className="flex items-center gap-1.5 text-slate-300">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                            <span>{cfg.label}</span>
                          </span>
                          <span className="font-bold text-white font-mono">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Interactive Legend Bar */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-3 border-t border-slate-100 text-xs">
            {typesList.map((typeKey) => {
              const cfg = TYPE_PALETTE[typeKey];
              return (
                <div key={typeKey} className="flex items-center gap-1.5 font-medium text-slate-700">
                  <span className="w-3 h-3 rounded-md" style={{ backgroundColor: cfg.color }} />
                  <span>
                    {cfg.icon} {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
