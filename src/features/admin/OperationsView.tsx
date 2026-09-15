import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardList, RefreshCw } from 'lucide-react';
import {
  acknowledgeOperationalAlert,
  getOperationalAlertsForManagement,
  getOperationalTasksForManagement,
  resolveOperationalAlert,
  updateOperationalTaskStatus,
} from '../dashboard/farmService';

interface Task {
  id: number;
  taskKey: string;
  title: string;
  description?: string | null;
  locationLabel?: string | null;
  status: string;
  priority: string;
  dueAt?: string | null;
  assignedUserId?: number | null;
  batchId?: number | null;
}

interface Alert {
  id: number;
  ruleCode: string;
  message: string;
  severity: string;
  status: string;
  dueAt?: string | null;
  acknowledgedAt?: string | null;
  batchId?: number | null;
}

function unwrap<T>(response: { success?: boolean; message?: string; data?: T }, fallback: string): T {
  if (!response?.success) throw new Error(response?.message || fallback);
  return response.data as T;
}

function formatDueAt(value?: string | null) {
  if (!value) return 'No due time';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function badgeClass(value: string) {
  const normalized = value.toUpperCase();
  if (normalized === 'CRITICAL' || normalized === 'BLOCKED') return 'bg-veridian-rose/15 text-veridian-rose';
  if (normalized === 'HIGH' || normalized === 'WARNING' || normalized === 'OPEN') return 'bg-veridian-amber/15 text-veridian-amber';
  if (normalized === 'COMPLETED' || normalized === 'RESOLVED') return 'bg-veridian-emerald/15 text-veridian-emerald';
  return 'bg-white/10 text-slate-300';
}

export default function OperationsView() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [actionKey, setActionKey] = useState('');

  const loadOperations = useCallback(async (silent = false) => {
    if (silent) setIsRefreshing(true); else setIsLoading(true);
    setError('');
    try {
      const [taskResponse, alertResponse] = await Promise.all([
        getOperationalTasksForManagement(),
        getOperationalAlertsForManagement(),
      ]);
      setTasks(unwrap<Task[]>(taskResponse, 'Unable to load operational tasks.'));
      setAlerts(unwrap<Alert[]>(alertResponse, 'Unable to load operational alerts.'));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load operations.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { void loadOperations(); }, [loadOperations]);

  const runAction = async (key: string, action: () => Promise<unknown>) => {
    setActionKey(key);
    setError('');
    try {
      await action();
      await loadOperations(true);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to update the record.');
    } finally {
      setActionKey('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Operations</h2>
          <p className="text-sm text-slate-caption">Review owned work and resolve exceptions instead of re-entering field logs.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadOperations(true)}
          disabled={isRefreshing || isLoading}
          className="inline-flex min-h-touch items-center gap-2 rounded-input border border-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/5 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error ? <div className="rounded-container border border-veridian-rose/30 bg-veridian-rose/10 p-4 text-sm text-veridian-rose">{error}</div> : null}
      {isLoading ? <div className="rounded-container border border-white/10 bg-deep-slate p-6 text-sm text-slate-caption">Loading operational work…</div> : null}

      {!isLoading ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <section className="rounded-container border border-white/10 bg-deep-slate p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-semibold text-white"><ClipboardList className="h-5 w-5 text-veridian-sky" /> Tasks</h3>
              <span className="text-xs text-slate-caption">{tasks.length} active/assigned</span>
            </div>
            <div className="space-y-3">
              {tasks.length === 0 ? <p className="text-sm text-slate-caption">No tasks are assigned yet.</p> : tasks.map((task) => (
                <article key={task.id} className="rounded-input border border-white/10 bg-midnight-navy/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{task.title}</p>
                      <p className="mt-1 text-xs text-slate-caption">{task.locationLabel || 'No location'} · {formatDueAt(task.dueAt)}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${badgeClass(task.priority)}`}>{task.priority}</span>
                  </div>
                  {task.description ? <p className="mt-2 text-sm text-slate-300">{task.description}</p> : null}
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${badgeClass(task.status)}`}>{task.status}</span>
                    <select
                      aria-label={`Update status for ${task.title}`}
                      value={task.status}
                      disabled={actionKey === `task-${task.id}`}
                      onChange={(event) => void runAction(`task-${task.id}`, () => updateOperationalTaskStatus(task.id, event.target.value))}
                      className="rounded-input border border-white/10 bg-deep-slate px-2 py-1 text-xs text-white"
                    >
                      <option value="PENDING">Pending</option>
                      <option value="IN_PROGRESS">In progress</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="BLOCKED">Blocked</option>
                    </select>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-container border border-white/10 bg-deep-slate p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-semibold text-white"><AlertTriangle className="h-5 w-5 text-veridian-amber" /> Exceptions</h3>
              <span className="text-xs text-slate-caption">{alerts.length} unresolved</span>
            </div>
            <div className="space-y-3">
              {alerts.length === 0 ? <p className="text-sm text-slate-caption">No unresolved exceptions.</p> : alerts.map((alert) => (
                <article key={alert.id} className="rounded-input border border-white/10 bg-midnight-navy/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{alert.message}</p>
                      <p className="mt-1 text-xs text-slate-caption">{alert.ruleCode} · {formatDueAt(alert.dueAt)}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${badgeClass(alert.severity)}`}>{alert.severity}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${badgeClass(alert.status)}`}>{alert.status}</span>
                    <div className="flex gap-2">
                      {alert.status === 'OPEN' ? (
                        <button type="button" disabled={actionKey === `ack-${alert.id}`} onClick={() => void runAction(`ack-${alert.id}`, () => acknowledgeOperationalAlert(alert.id))} className="rounded-input border border-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/5 disabled:opacity-60">Acknowledge</button>
                      ) : null}
                      {alert.status !== 'RESOLVED' ? (
                        <button type="button" disabled={actionKey === `resolve-${alert.id}`} onClick={() => { const note = window.prompt('Resolution note'); if (note?.trim()) void runAction(`resolve-${alert.id}`, () => resolveOperationalAlert(alert.id, note.trim())); }} className="inline-flex items-center gap-1 rounded-input bg-veridian-emerald px-3 py-1.5 text-xs font-medium text-midnight-navy hover:bg-veridian-emerald/90 disabled:opacity-60"><CheckCircle2 className="h-3.5 w-3.5" /> Resolve</button>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
