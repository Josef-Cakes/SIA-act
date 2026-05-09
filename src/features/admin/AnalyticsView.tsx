import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, BarChart3, RefreshCw, Tractor, TrendingUp } from 'lucide-react';
import { Area, Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  useAdminAnalytics,
  useAdminGlobalLogs,
  useAdminInventorySummary,
  useBusinessTrends,
  useFarmData,
  useResourceEfficiency,
} from '../../context/FarmDataContext';

interface BusinessTrendPoint {
  date: string;
  totalRevenue: number;
  mortalityCount: number;
  currentStock: number;
}

interface ResourceEfficiencyPoint {
  date: string;
  feedConsumed: number;
  survivalRate: number;
  activePopulation: number;
}

const BUSINESS_RANGE_OPTIONS = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: 'all', label: 'All Time' },
];

const RESOURCE_RANGE_OPTIONS = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: 'ytd', label: 'Year-to-Date' },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatTimeAgo(timestamp: string) {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return 'Just now';

  const diffMinutes = Math.max(0, Math.floor((Date.now() - parsed.getTime()) / 60000));
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} min${diffMinutes === 1 ? '' : 's'} ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr${diffHours === 1 ? '' : 's'} ago`;

  return `${Math.floor(diffHours / 24)} days ago`;
}

function buildTrendData(trend: Record<string, number>) {
  return Object.entries(trend)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, count]) => ({
      date,
      label: new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      activityCount: Number(count),
    }));
}

function buildBusinessTrendData(points: BusinessTrendPoint[]) {
  return points.map((point) => ({
    ...point,
    label: new Date(`${point.date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));
}

function buildResourceEfficiencyData(points: ResourceEfficiencyPoint[]) {
  return points.map((point, index, entries) => {
    const previousPoint = index > 0 ? entries[index - 1] : null;
    const populationDelta = previousPoint ? point.activePopulation - previousPoint.activePopulation : 0;
    const efficiencyRatio = point.survivalRate > 0
      ? point.feedConsumed / point.survivalRate
      : 0;

    return {
      ...point,
      label: new Date(`${point.date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      populationDelta,
      efficiencyRatio,
    };
  });
}

export default function AnalyticsView() {
  const { refreshFarmData } = useFarmData();
  const {
    data: analytics,
    error: analyticsError,
    isLoading: isAnalyticsLoading,
    isFetching: isAnalyticsRefreshing,
  } = useAdminAnalytics();
  const {
    data: inventory,
    error: inventoryError,
    isLoading: isInventoryLoading,
    isFetching: isInventoryRefreshing,
  } = useAdminInventorySummary();
  const {
    data: logs = [],
    error: logsError,
    isLoading: isLogsLoading,
    isFetching: isLogsRefreshing,
  } = useAdminGlobalLogs(15);
  const [selectedBusinessRange, setSelectedBusinessRange] = useState('7d');
  const [selectedResourceRange, setSelectedResourceRange] = useState('7d');
  const [selectedLivestockId, setSelectedLivestockId] = useState<number | null>(null);
  const {
    data: businessTrends = [],
    error: businessTrendError,
    isLoading: isBusinessTrendLoading,
    isFetching: isBusinessTrendRefreshing,
  } = useBusinessTrends(selectedBusinessRange);
  const {
    data: resourceEfficiency = [],
    error: resourceEfficiencyError,
    isLoading: isResourceEfficiencyLoading,
    isFetching: isResourceEfficiencyRefreshing,
  } = useResourceEfficiency(selectedLivestockId, selectedResourceRange);
  const safeAnalytics = analytics ?? {
    totalLivestock: 0,
    activeEventsCount: 0,
    revenueToDate: 0,
    userActivityTrend: {},
  };
  const safeInventory = inventory ?? {
    totalLivestock: 0,
    totalSpecies: 0,
    totalActiveBatches: 0,
    speciesBreakdown: [],
  };
  const isLoading = isAnalyticsLoading || isInventoryLoading || isLogsLoading;
  const error = businessTrendError instanceof Error
    ? businessTrendError.message
    : analyticsError instanceof Error
      ? analyticsError.message
      : inventoryError instanceof Error
        ? inventoryError.message
        : logsError instanceof Error
          ? logsError.message
          : resourceEfficiencyError instanceof Error
            ? resourceEfficiencyError.message
          : '';
  const isChartRefreshing = isAnalyticsRefreshing
    || isInventoryRefreshing
    || isLogsRefreshing
    || isBusinessTrendRefreshing
    || isResourceEfficiencyRefreshing;

  useEffect(() => {
    if (safeInventory.speciesBreakdown.length === 0) {
      setSelectedLivestockId(null);
      return;
    }

    setSelectedLivestockId((current) => {
      if (current && safeInventory.speciesBreakdown.some((species) => species.id === current)) {
        return current;
      }
      return safeInventory.speciesBreakdown[0].id;
    });
  }, [safeInventory.speciesBreakdown]);

  const trendData = useMemo(
    () => buildTrendData(safeAnalytics.userActivityTrend),
    [safeAnalytics.userActivityTrend]
  );
  const businessTrendData = useMemo(
    () => buildBusinessTrendData(businessTrends),
    [businessTrends]
  );
  const resourceEfficiencyData = useMemo(
    () => buildResourceEfficiencyData(resourceEfficiency),
    [resourceEfficiency]
  );
  const hasBusinessData = businessTrendData.some((point) => point.totalRevenue > 0 || point.mortalityCount > 0);
  const hasResourceEfficiencyData = resourceEfficiencyData.some(
    (point) => point.feedConsumed > 0 || point.activePopulation > 0 || point.survivalRate > 0
  );
  const selectedLivestock = safeInventory.speciesBreakdown.find((species) => species.id === selectedLivestockId) || null;

  const cards = [
    {
      label: 'Total Livestock',
      value: safeInventory.totalLivestock.toLocaleString(),
      detail: 'Driven by /api/inventory/summary',
      icon: <Tractor className="w-5 h-5 text-veridian-emerald" />,
    },
    {
      label: 'Revenue To Date',
      value: formatCurrency(safeAnalytics.revenueToDate),
      detail: 'Updated from recorded sales',
      icon: <TrendingUp className="w-5 h-5 text-veridian-emerald" />,
    },
    {
      label: 'Active Events',
      value: safeAnalytics.activeEventsCount.toLocaleString(),
      detail: 'Last 24 hours',
      icon: <AlertTriangle className="w-5 h-5 text-veridian-emerald" />,
    },
    {
      label: 'Tracked Species',
      value: safeInventory.totalSpecies.toLocaleString(),
      detail: `${safeInventory.totalActiveBatches.toLocaleString()} active batches`,
      icon: <Activity className="w-5 h-5 text-veridian-emerald" />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Analytics</h2>
          <p className="text-sm text-slate-caption">Observer view of global livestock movement, revenue, and audited actions.</p>
        </div>
        <button
          type="button"
          onClick={() => void refreshFarmData()}
          className="inline-flex min-h-touch items-center gap-2 rounded-input border border-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/5 disabled:opacity-60"
          disabled={isChartRefreshing}
        >
          <RefreshCw className={`w-4 h-4 ${isChartRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-container border border-veridian-amber/30 bg-veridian-amber/10 p-4 text-sm text-veridian-amber">
          {error}
        </div>
      ) : null}

      <div className="rounded-container border border-white/10 bg-deep-slate p-5">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Livestock Performance &amp; Resource Efficiency</h3>
            <p className="mt-1 text-sm text-slate-caption">
              Feed usage, survival stability, and active population for {selectedLivestock?.type || 'your selected livestock'}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedLivestockId ?? ''}
              onChange={(event) => setSelectedLivestockId(event.target.value ? Number(event.target.value) : null)}
              className="min-h-touch rounded-input border border-white/10 bg-midnight-navy px-3 py-2 text-sm text-white outline-none transition-colors hover:border-veridian-emerald/30"
            >
              {safeInventory.speciesBreakdown.map((species) => (
                <option key={species.id} value={species.id} className="bg-deep-slate text-white">
                  {species.type}
                </option>
              ))}
            </select>

            <div className="flex flex-wrap items-center gap-2">
              {RESOURCE_RANGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedResourceRange(option.value)}
                  className={`min-h-touch rounded-input border px-3 py-2 text-xs font-medium transition-colors ${
                    selectedResourceRange === option.value
                      ? 'border-veridian-emerald/40 bg-veridian-emerald/15 text-veridian-emerald'
                      : 'border-white/10 text-slate-caption hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {hasResourceEfficiencyData ? (
          <ResponsiveContainer width="100%" height={420}>
            <ComposedChart data={resourceEfficiencyData} margin={{ top: 20, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="populationFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.5} />
              <XAxis dataKey="label" stroke="#64748B" tick={{ fill: '#64748B', fontSize: 12 }} />
              <YAxis
                yAxisId="feed"
                stroke="#10B981"
                tick={{ fill: '#64748B', fontSize: 12 }}
                label={{ value: 'Feed (kg)', angle: -90, position: 'insideLeft', fill: '#64748B', fontSize: 11 }}
              />
              <YAxis
                yAxisId="survival"
                orientation="right"
                stroke="#F43F5E"
                tick={{ fill: '#64748B', fontSize: 12 }}
                domain={[0, 100]}
                tickFormatter={(value) => `${Number(value).toFixed(0)}%`}
                label={{ value: 'Survival %', angle: 90, position: 'insideRight', fill: '#64748B', fontSize: 11 }}
              />
              <YAxis yAxisId="population" hide domain={[0, 'dataMax + 10']} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || payload.length === 0) {
                    return null;
                  }

                  const point = payload[0]?.payload;
                  const efficiencyRatio = Number(point?.efficiencyRatio || 0);

                  return (
                    <div className="rounded-input border border-white/15 bg-deep-slate p-4 shadow-lg">
                      <p className="text-sm font-semibold text-white">{label}</p>
                      <p className="mt-2 text-xs text-veridian-emerald">
                        Feed Consumed: {Number(point?.feedConsumed || 0).toLocaleString()} kg
                      </p>
                      <p className="mt-1 text-xs text-veridian-rose">
                        Survival Rate: {formatPercent(Number(point?.survivalRate || 0))}
                      </p>
                      <p className="mt-1 text-xs text-slate-200">
                        Active Population: {Number(point?.activePopulation || 0).toLocaleString()} head
                      </p>
                      <p className="mt-2 text-[11px] text-slate-caption">
                        Efficiency Ratio: {efficiencyRatio > 0
                          ? `${efficiencyRatio.toFixed(2)} kg feed per 1% survival`
                          : 'No ratio available yet'}
                      </p>
                    </div>
                  );
                }}
              />
              <Legend />
              <Area
                yAxisId="population"
                type="monotone"
                dataKey="activePopulation"
                name="Active Population"
                stroke="#059669"
                fill="url(#populationFill)"
                strokeWidth={2}
              />
              <Bar
                yAxisId="feed"
                dataKey="feedConsumed"
                name="Feed Consumed"
                fill="#10B981"
                radius={[8, 8, 0, 0]}
                maxBarSize={34}
              />
              <Line
                yAxisId="survival"
                type="monotone"
                dataKey="survivalRate"
                name="Survival Rate"
                stroke="#F43F5E"
                strokeWidth={4}
                dot={{ r: 4, fill: '#F43F5E' }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : isResourceEfficiencyLoading ? (
          <div className="rounded-input border border-dashed border-white/10 bg-midnight-navy/40 p-12 text-center">
            <p className="text-base font-medium text-white">Loading livestock efficiency</p>
            <p className="mt-2 text-sm text-slate-caption">
              Pulling feed usage and population performance for the selected livestock type.
            </p>
          </div>
        ) : (
          <div className="rounded-input border border-dashed border-white/10 bg-midnight-navy/40 p-12 text-center">
            <p className="text-base font-medium text-white">No resource efficiency data yet</p>
            <p className="mt-2 text-sm text-slate-caption">
              Once feeding logs and population activity are recorded, this hero chart will light up with real performance data.
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-container border border-white/10 bg-deep-slate p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="rounded-input bg-veridian-emerald/15 p-2.5">{card.icon}</div>
              <span className="text-xs text-slate-caption">{isLoading ? 'Syncing' : 'Live'}</span>
            </div>
            <p className="text-xs uppercase tracking-wider text-slate-caption">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{card.value}</p>
            <p className="mt-2 text-xs text-slate-caption">{card.detail}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-container border border-white/10 bg-deep-slate p-5">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-veridian-emerald" />
            <div>
              <h3 className="text-base font-semibold text-white">Daily Event Tracker</h3>
              <p className="text-xs text-slate-caption">Audited event volume across the last 7 days</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.5} />
              <XAxis dataKey="label" stroke="#64748B" tick={{ fill: '#64748B', fontSize: 12 }} />
              <YAxis stroke="#64748B" tick={{ fill: '#64748B', fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="activityCount" fill="#10B981" radius={[6, 6, 0, 0]} name="Audit Events" />
              <Line type="monotone" dataKey="activityCount" stroke="#38BDF8" strokeWidth={3} name="Trend" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-container border border-white/10 bg-deep-slate p-5">
          <h3 className="text-base font-semibold text-white">Recent Global Logs</h3>
          <p className="mb-4 text-xs text-slate-caption">Driven by /api/logs/all so sales and mortality reflect after refresh.</p>
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="rounded-input border border-white/10 bg-midnight-navy/50 p-3">
                <p className="text-sm text-white">{log.action}</p>
                <p className="mt-1 text-xs text-slate-caption">
                  {(log.fullName || log.username || 'System')} • {formatTimeAgo(log.timestamp)}
                </p>
              </div>
            ))}
            {logs.length === 0 ? (
              <div className="rounded-input border border-dashed border-white/10 p-4 text-sm text-slate-caption">
                No audit entries available yet.
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-container border border-white/10 bg-deep-slate p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-white">Livestock Health &amp; Revenue</h3>
            <p className="text-xs text-slate-caption">
              Daily revenue, mortality, and end-of-day stock from real sales, audit, and inventory data.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {BUSINESS_RANGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelectedBusinessRange(option.value)}
                className={`min-h-touch rounded-input border px-3 py-2 text-xs font-medium transition-colors ${
                  selectedBusinessRange === option.value
                    ? 'border-veridian-emerald/40 bg-veridian-emerald/15 text-veridian-emerald'
                    : 'border-white/10 text-slate-caption hover:bg-white/5 hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {hasBusinessData ? (
          <ResponsiveContainer width="100%" height={340}>
            <ComposedChart data={businessTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.5} />
              <XAxis dataKey="label" stroke="#64748B" tick={{ fill: '#64748B', fontSize: 12 }} />
              <YAxis
                yAxisId="revenue"
                stroke="#10B981"
                tick={{ fill: '#64748B', fontSize: 12 }}
                tickFormatter={(value) => `₱${Number(value).toLocaleString()}`}
              />
              <YAxis
                yAxisId="counts"
                orientation="right"
                stroke="#F43F5E"
                tick={{ fill: '#64748B', fontSize: 12 }}
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === 'Revenue') {
                    return [formatCurrency(Number(value)), name];
                  }
                  return [Number(value).toLocaleString(), name];
                }}
                labelFormatter={(value) => `Date: ${value}`}
              />
              <Legend />
              <Bar
                yAxisId="revenue"
                dataKey="totalRevenue"
                name="Revenue"
                fill="#10B981"
                radius={[6, 6, 0, 0]}
              />
              <Line
                yAxisId="counts"
                type="monotone"
                dataKey="mortalityCount"
                name="Mortality"
                stroke="#F43F5E"
                strokeWidth={3}
                dot={{ r: 4, fill: '#F43F5E' }}
                activeDot={{ r: 6 }}
              />
              <Line
                yAxisId="counts"
                type="monotone"
                dataKey="currentStock"
                name="Current Stock"
                stroke="#38BDF8"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : isBusinessTrendLoading ? (
          <div className="rounded-input border border-dashed border-white/10 bg-midnight-navy/40 p-10 text-center">
            <p className="text-base font-medium text-white">Loading chart data</p>
            <p className="mt-2 text-sm text-slate-caption">
              Pulling the latest revenue, mortality, and stock movement.
            </p>
          </div>
        ) : (
          <div className="rounded-input border border-dashed border-white/10 bg-midnight-navy/40 p-10 text-center">
            <p className="text-base font-medium text-white">No data yet</p>
            <p className="mt-2 text-sm text-slate-caption">
              This chart will populate once handlers start logging sales or mortality events.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
