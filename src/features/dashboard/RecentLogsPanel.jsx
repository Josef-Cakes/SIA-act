import { Clock3 } from 'lucide-react';
import { getActionConfig, getActionSummary } from './dashboardActionConfig';

function formatTimeAgo(timestamp) {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return 'Just now';
  }

  const diffMs = Date.now() - parsed.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} min${diffMinutes === 1 ? '' : 's'} ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

export default function RecentLogsPanel({ recentLogs }) {
  return (
    <section className="rounded-container border border-white/10 bg-deep-slate p-5 shadow-card">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Recent Logs</h2>
          <p className="text-sm text-slate-caption">Real-time action history from your latest batch updates.</p>
        </div>
      </div>

      {recentLogs.length === 0 ? (
        <div className="rounded-input border border-dashed border-white/10 bg-midnight-navy p-5 text-sm text-slate-caption">
          No quick actions logged yet. Submit one to see it appear here instantly.
        </div>
      ) : (
        <div className="space-y-3">
          {recentLogs.map((log) => {
            const action = getActionConfig(log.actionType);
            const { Icon } = action;

            return (
              <article
                key={log.id}
                className="rounded-input border border-white/10 bg-midnight-navy p-4 transition-colors hover:border-white/15"
              >
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-input ${action.iconSurfaceClassName}`}>
                    <Icon className={`h-5 w-5 ${action.iconClassName}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${action.iconSurfaceClassName} ${action.iconClassName}`}>
                        {action.label}
                      </span>
                      <span className="text-xs text-slate-caption">
                        Batch #{log.batchId}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-white">{getActionSummary(log)}</p>
                    {log.remarks ? (
                      <p className="mt-1 text-xs text-slate-caption">{log.remarks}</p>
                    ) : null}
                    <p className="mt-2 inline-flex items-center gap-1 text-xs text-slate-caption">
                      <Clock3 className="h-3.5 w-3.5" />
                      {formatTimeAgo(log.timestamp)}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
