import { Search, Skull, UtensilsCrossed, X, BadgeDollarSign, Activity, Pill } from 'lucide-react';
import type { HandlerActivityFilters, HandlerActivityLog, LivestockSummary } from '../../context/FarmDataContext';

interface HandlerOption {
  id: number;
  fullName: string | null;
  username: string;
}

interface HandlerActivityModalProps {
  isOpen: boolean;
  handler: HandlerOption | null;
  logs: HandlerActivityLog[];
  species: LivestockSummary[];
  filters: HandlerActivityFilters;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onFilterChange: (filters: HandlerActivityFilters) => void;
  onClose: () => void;
  isLoading: boolean;
}

function formatTimelineTimestamp(timestamp: string) {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return timestamp;

  const time = parsed.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const date = parsed.toLocaleDateString([], { month: 'long', day: 'numeric' });
  return `${time} - ${date}`;
}

function resolveLogPresentation(actionType: string) {
  const normalized = (actionType || '').toUpperCase();

  if (normalized === 'FEEDING') {
    return {
      icon: UtensilsCrossed,
      iconClassName: 'text-emerald-400',
      surfaceClassName: 'bg-emerald-500/15',
      label: 'Feeding',
    };
  }

  if (normalized === 'MORTALITY') {
    return {
      icon: Skull,
      iconClassName: 'text-rose-400',
      surfaceClassName: 'bg-rose-500/15',
      label: 'Mortality',
    };
  }

  if (normalized === 'SALE') {
    return {
      icon: BadgeDollarSign,
      iconClassName: 'text-sky-400',
      surfaceClassName: 'bg-sky-500/15',
      label: 'Sales',
    };
  }

  if (normalized === 'MEDICINE') {
    return {
      icon: Pill,
      iconClassName: 'text-violet-400',
      surfaceClassName: 'bg-violet-500/15',
      label: 'Medicine',
    };
  }

  return {
    icon: Activity,
    iconClassName: 'text-slate-300',
    surfaceClassName: 'bg-white/10',
    label: 'General',
  };
}

export default function HandlerActivityModal({
  isOpen,
  handler,
  logs,
  species,
  filters,
  searchTerm,
  onSearchChange,
  onFilterChange,
  onClose,
  isLoading,
}: HandlerActivityModalProps) {
  if (!isOpen || !handler) {
    return null;
  }

  const filteredLogs = logs.filter((log) => {
    if (!searchTerm.trim()) {
      return true;
    }

    const haystack = `${log.batchName || ''} ${log.action || ''}`.toLowerCase();
    return haystack.includes(searchTerm.trim().toLowerCase());
  });

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
      <div
        className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-deep-slate shadow-[0_32px_80px_rgba(2,6,23,0.6)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="handler-activity-modal-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div>
            <h2 id="handler-activity-modal-title" className="text-xl font-semibold text-white">
              {handler.fullName || handler.username} Activity
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              {filteredLogs.length.toLocaleString()} logs in the current view
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-[18px] border border-white/10 p-2 text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Close handler activity modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-white/10 px-6 py-4">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search by batch name"
                className="min-h-touch w-full rounded-[18px] border border-white/10 bg-midnight-navy pl-10 pr-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-veridian-emerald/40"
              />
            </label>

            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(event) => onFilterChange({ ...filters, startDate: event.target.value || undefined })}
              className="min-h-touch rounded-[18px] border border-white/10 bg-midnight-navy px-4 py-3 text-sm text-white outline-none transition-colors focus:border-veridian-emerald/40"
            />

            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(event) => onFilterChange({ ...filters, endDate: event.target.value || undefined })}
              className="min-h-touch rounded-[18px] border border-white/10 bg-midnight-navy px-4 py-3 text-sm text-white outline-none transition-colors focus:border-veridian-emerald/40"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onFilterChange({ ...filters, livestockId: null })}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                !filters.livestockId
                  ? 'border-veridian-emerald/40 bg-veridian-emerald/15 text-veridian-emerald'
                  : 'border-white/10 text-slate-300 hover:bg-white/5'
              }`}
            >
              All Livestock
            </button>
            {species.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onFilterChange({ ...filters, livestockId: item.id })}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  filters.livestockId === item.id
                    ? 'border-veridian-emerald/40 bg-veridian-emerald/15 text-veridian-emerald'
                    : 'border-white/10 text-slate-300 hover:bg-white/5'
                }`}
              >
                {item.type}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isLoading ? (
            <div className="rounded-[18px] border border-dashed border-white/10 bg-midnight-navy/40 p-8 text-center text-sm text-slate-300">
              Loading handler activity...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-white/10 bg-midnight-navy/40 p-8 text-center text-sm text-slate-300">
              No handler activity matched the selected filters.
            </div>
          ) : (
            <div className="relative pl-5">
              <div className="absolute bottom-0 left-2 top-1 w-px bg-white/10" />
              <div className="space-y-4">
                {filteredLogs.map((log) => {
                  const presentation = resolveLogPresentation(log.actionType);
                  const Icon = presentation.icon;

                  return (
                    <div key={log.id} className="relative rounded-[22px] border border-white/10 bg-midnight-navy/50 p-4">
                      <div className="absolute left-[-18px] top-5 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-deep-slate">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-full ${presentation.surfaceClassName}`}>
                          <Icon className={`h-4 w-4 ${presentation.iconClassName}`} />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{presentation.label}</p>
                          <p className="mt-1 text-sm text-slate-200">{log.action}</p>
                          <p className="mt-2 text-xs text-slate-400">
                            Target: {log.batchName ? `Batch: ${log.batchName}` : 'No batch attached'}
                            {log.livestockType ? ` • ${log.livestockType}` : ''}
                          </p>
                        </div>
                        <p className="text-xs text-slate-400">{formatTimelineTimestamp(log.timestamp)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
