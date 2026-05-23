import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Tractor,
  AlertTriangle,
  Activity,
  TrendingUp,
  Droplets,
  Clock,
  CheckCircle2,
  Bell,
  RefreshCw,
  UserRound,
} from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAdminAnalytics, useAdminGlobalLogs, useFarmData } from '../../context/FarmDataContext';

interface ActivityTrendDatum {
  day: string;
  fullDate: string;
  activityCount: number;
  movingAverage: number;
}

interface ActivityItemProps {
  type: 'feed' | 'alert' | 'health' | 'task';
  message: string;
  time: string;
  handlerName: string;
  status?: 'success' | 'warning' | 'error';
}

function formatDateLabel(dateKey: string) {
  const parsed = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateKey;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTimeAgo(timestamp: string) {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return 'Just now';

  const diffMinutes = Math.max(0, Math.floor((Date.now() - parsed.getTime()) / 60000));
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} min${diffMinutes === 1 ? '' : 's'} ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr${diffHours === 1 ? '' : 's'} ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

function buildTrendData(userActivityTrend: Record<string, number>): ActivityTrendDatum[] {
  return Object.entries(userActivityTrend)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, count], index, entries) => {
      const windowStart = Math.max(0, index - 2);
      const rollingWindow = entries.slice(windowStart, index + 1);
      const rollingTotal = rollingWindow.reduce((sum, [, value]) => sum + Number(value), 0);
      const movingAverage = rollingWindow.length > 0 ? rollingTotal / rollingWindow.length : 0;

      return {
        day: formatDateLabel(date),
        fullDate: date,
        activityCount: Number(count),
        movingAverage: Number(movingAverage.toFixed(1)),
      };
    });
}

function resolveActivityVisuals(action: string) {
  const normalized = (action || '').toLowerCase();

  if (normalized.includes('sale') || normalized.includes('sold')) {
    return { type: 'feed' as const, status: 'success' as const };
  }

  if (normalized.includes('mortality') || normalized.includes('suspicious') || normalized.includes('denied')) {
    return { type: 'alert' as const, status: 'warning' as const };
  }

  if (normalized.includes('medicine') || normalized.includes('health')) {
    return { type: 'health' as const, status: 'success' as const };
  }

  if (normalized.includes('feed')) {
    return { type: 'feed' as const, status: 'success' as const };
  }

  return { type: 'task' as const, status: 'success' as const };
}

interface StatCardProps {
  title: string;
  value: string | number;
  changeLabel: string;
  icon: React.ReactNode;
  sparkline?: number[];
}

function StatCard({ title, value, changeLabel, icon, sparkline }: StatCardProps) {
  const sparklinePeak = sparkline && sparkline.length > 0 ? Math.max(...sparkline, 1) : 1;

  return (
    <div className="bg-deep-slate border border-white/10 rounded-container p-5 hover:border-veridian-emerald/30 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="p-2.5 rounded-input bg-veridian-emerald/15">
          {icon}
        </div>
      </div>

      <p className="text-slate-caption text-xs font-medium uppercase tracking-wider mb-1">{title}</p>
      <p className="text-2xl font-semibold text-white mb-3">{value}</p>

      {sparkline ? (
        <div className="flex items-end gap-0.5 h-8">
          {sparkline.map((val, i) => (
            <div
              key={i}
              className="flex-1 bg-veridian-emerald/40 rounded-t"
              style={{ height: `${(val / sparklinePeak) * 100}%` }}
            />
          ))}
        </div>
      ) : null}

      <p className="text-slate-caption text-xs mt-2">{changeLabel}</p>
    </div>
  );
}

function ActivityItem({ type, message, time, handlerName, status = 'success' }: ActivityItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const icons = {
    feed: <Droplets className="w-4 h-4" />,
    alert: <AlertTriangle className="w-4 h-4" />,
    health: <Activity className="w-4 h-4" />,
    task: <CheckCircle2 className="w-4 h-4" />,
  };

  const statusColors = {
    success: 'text-veridian-emerald bg-veridian-emerald/15',
    warning: 'text-veridian-amber bg-veridian-amber/15',
    error: 'text-veridian-rose bg-veridian-rose/15',
  };

  return (
    <div 
      className="flex items-start gap-3 p-3 rounded-input hover:bg-white/5 transition-colors cursor-pointer"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className={`p-2 rounded-input ${statusColors[status]}`}>
        {icons[type]}
      </div>
      <div className="flex-1 min-w-0">
        {isExpanded && (
          <div className="mb-1 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-midnight-navy px-2.5 py-1 text-[11px] font-medium text-slate-200">
              <UserRound className="w-3 h-3 text-veridian-sky" />
              {handlerName}
            </span>
          </div>
        )}
        <p className="text-sm text-white">{message}</p>
        <p className="text-xs text-slate-caption flex items-center gap-1 mt-1">
          <Clock className="w-3 h-3" />
          {time}
        </p>
      </div>
    </div>
  );
}

function PerformanceChart({ data }: { data: ActivityTrendDatum[] }) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-deep-slate border border-white/20 rounded-input p-3 shadow-lg">
          <p className="text-sm font-semibold text-white mb-2">{payload[0].payload.day}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-deep-slate border border-white/10 rounded-container p-5">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-white">Audit Activity Trend</h3>
          <p className="text-xs text-slate-caption">Daily request audit volume over the last 7 days</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.5} />
          <XAxis
            dataKey="day"
            stroke="#64748B"
            tick={{ fill: '#64748B', fontSize: 12 }}
            axisLine={{ stroke: '#1E293B' }}
          />
          <YAxis
            yAxisId="left"
            stroke="#64748B"
            tick={{ fill: '#64748B', fontSize: 12 }}
            axisLine={{ stroke: '#1E293B' }}
            label={{ value: 'Audit Events', angle: -90, position: 'insideLeft', fill: '#64748B', fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
            formatter={(value) => <span className="text-xs text-slate-caption">{value}</span>}
          />
          <Bar
            yAxisId="left"
            dataKey="activityCount"
            fill="#10B981"
            name="Audit Events"
            radius={[6, 6, 0, 0]}
            maxBarSize={40}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="movingAverage"
            stroke="#38BDF8"
            strokeWidth={3}
            name="3-Day Average"
            dot={{ fill: '#38BDF8', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function CommandCenter() {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const { refreshFarmData } = useFarmData();
  const {
    data: analytics,
    error: analyticsError,
    isLoading: isAnalyticsLoading,
    isFetching: isAnalyticsRefreshing,
  } = useAdminAnalytics();
  const {
    data: recentLogs = [],
    error: recentLogsError,
    isLoading: isLogsLoading,
    isFetching: isLogsRefreshing,
  } = useAdminGlobalLogs(15);

  const safeAnalytics = analytics ?? {
    totalLivestock: 0,
    activeEventsCount: 0,
    revenueToDate: 0,
    userActivityTrend: {},
  };
  const isLoading = isAnalyticsLoading || isLogsLoading;
  const isRefreshing = isAnalyticsRefreshing || isLogsRefreshing;
  const loadError = analyticsError instanceof Error
    ? analyticsError.message
    : recentLogsError instanceof Error
      ? recentLogsError.message
      : '';

  useEffect(() => {
    const clockTimer = window.setInterval(() => setCurrentTime(new Date()), 60000);

    return () => {
      window.clearInterval(clockTimer);
    };
  }, []);

  const trendData = useMemo(
    () => buildTrendData(safeAnalytics.userActivityTrend),
    [safeAnalytics.userActivityTrend]
  );

  const sparkline = trendData.map((item) => item.activityCount);
  const todayActivityCount = trendData.length > 0 ? trendData[trendData.length - 1].activityCount : 0;

  const stats = [
    {
      title: 'Total Livestock',
      value: safeAnalytics.totalLivestock.toLocaleString(),
      changeLabel: 'SUM(currentCount) across all live batches',
      icon: <Tractor className="w-5 h-5 text-veridian-emerald" />,
      sparkline,
    },
    {
      title: 'Active Events',
      value: safeAnalytics.activeEventsCount.toLocaleString(),
      changeLabel: 'Recorded in the last 24 hours',
      icon: <AlertTriangle className="w-5 h-5 text-veridian-emerald" />,
      sparkline,
    },
    {
      title: 'Revenue To Date',
      value: formatCurrency(safeAnalytics.revenueToDate),
      changeLabel: 'Gross sales captured from recorded transactions',
      icon: <TrendingUp className="w-5 h-5 text-veridian-emerald" />,
      sparkline,
    },
    {
      title: 'Audit Entries Today',
      value: todayActivityCount.toLocaleString(),
      changeLabel: 'Handler and system activity logged today',
      icon: <Activity className="w-5 h-5 text-veridian-emerald" />,
      sparkline,
    },
  ];

  const activities = recentLogs.length > 0
    ? recentLogs.map((log) => {
      const visuals = resolveActivityVisuals(log.action);
      return {
        type: visuals.type,
        message: log.action,
        time: formatTimeAgo(log.timestamp),
        handlerName: log.fullName || log.username || 'Unknown Handler',
        status: visuals.status,
      };
    })
    : [
      {
        type: 'task' as const,
        message: 'No audit activity recorded yet.',
        time: 'Awaiting data',
        handlerName: 'System',
        status: 'warning' as const,
      },
    ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Command Center</h2>
          <p className="text-slate-caption text-sm">
            Real-time farm operations overview • {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void refreshFarmData()}
            className="inline-flex items-center gap-2 rounded-input border border-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/5 disabled:opacity-60"
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <div className="flex items-center gap-2 text-veridian-emerald text-sm">
            <span className="w-2 h-2 rounded-full bg-veridian-emerald animate-pulse" />
            {loadError ? 'Analytics degraded' : isLoading ? 'Syncing live data' : isRefreshing ? 'Refreshing now' : 'Real data live'}
          </div>
        </div>
      </div>

      {loadError ? (
        <div className="rounded-container border border-veridian-amber/30 bg-veridian-amber/10 p-4 text-sm text-veridian-amber">
          {loadError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PerformanceChart data={trendData} />
        </div>

        <div className="bg-deep-slate border border-white/10 rounded-container p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-veridian-emerald" />
              Recent Logs
            </h3>
            <span className="text-xs text-veridian-emerald font-medium">Global View</span>
          </div>

          <div className="space-y-1 max-h-80 overflow-auto">
            {activities.map((activity, index) => (
              <ActivityItem key={`${activity.handlerName}-${index}`} {...activity} />
            ))}
          </div>

          <p className="w-full mt-4 py-2 text-sm text-slate-caption">
            Global audit feed is cached for 5 minutes and refreshes on demand.
          </p>
        </div>
      </div>

      <div className="bg-deep-slate border border-white/10 rounded-container p-5">
        <h3 className="text-base font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Review Analytics', icon: TrendingUp, color: 'text-veridian-emerald', action: () => navigate('/admin/analytics') },
            { label: 'Health Check', icon: Activity, color: 'text-veridian-sky', action: () => navigate('/admin/livestock') },
            { label: 'View Reports', icon: Bell, color: 'text-veridian-amber', action: () => navigate('/admin/analytics') },
            { label: 'Manage Alerts', icon: AlertTriangle, color: 'text-veridian-rose', action: () => alert('Alert management module coming soon.') },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={item.action}
                className="flex items-center gap-3 p-4 rounded-input border border-white/10 hover:border-veridian-emerald/30 hover:bg-white/5 transition-all"
              >
                <Icon className={`w-5 h-5 ${item.color}`} />
                <span className="text-sm text-white">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
