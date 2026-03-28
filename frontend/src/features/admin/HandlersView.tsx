import { useMemo, useState } from 'react';
import { Activity, MapPinned, RefreshCw, Users } from 'lucide-react';
import {
  type HandlerActivityFilters,
  useAdminHandlers,
  useAdminInventorySummary,
  useFarmData,
  useHandlerActivityLogs,
} from '../../context/FarmDataContext';
import HandlerActivityModal from './HandlerActivityModal';

interface HandlerSummary {
  id: number;
  fullName: string | null;
  username: string;
  email: string;
  activeZone: string;
  activeBatchCount: number;
  totalLivestock: number;
}

const EMPTY_FILTERS: HandlerActivityFilters = {
  startDate: undefined,
  endDate: undefined,
  livestockId: null,
};

export default function HandlersView() {
  const { refreshFarmData } = useFarmData();
  const {
    data: handlers = [],
    error: handlersError,
    isLoading: isHandlersLoading,
    isFetching: isHandlersRefreshing,
  } = useAdminHandlers();
  const {
    data: inventorySummary,
    error: inventoryError,
  } = useAdminInventorySummary();
  const [selectedHandler, setSelectedHandler] = useState<HandlerSummary | null>(null);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [filters, setFilters] = useState<HandlerActivityFilters>(EMPTY_FILTERS);
  const [searchTerm, setSearchTerm] = useState('');

  const {
    data: logs = [],
    error: logsError,
    isLoading: isLogsLoading,
    isFetching: isLogsRefreshing,
  } = useHandlerActivityLogs(selectedHandler?.id ?? null, filters);

  const error = logsError instanceof Error
    ? logsError.message
    : handlersError instanceof Error
      ? handlersError.message
      : inventoryError instanceof Error
        ? inventoryError.message
        : '';
  const isRefreshing = isHandlersRefreshing || isLogsRefreshing;

  const species = useMemo(
    () => inventorySummary?.speciesBreakdown ?? [],
    [inventorySummary?.speciesBreakdown]
  );

  function handleOpenActivity(handler: HandlerSummary) {
    setSelectedHandler(handler);
    setFilters(EMPTY_FILTERS);
    setSearchTerm('');
    setIsActivityModalOpen(true);
  }

  function handleCloseActivity() {
    setIsActivityModalOpen(false);
  }

  return (
    <div className="space-y-6">
      <HandlerActivityModal
        isOpen={isActivityModalOpen}
        handler={selectedHandler}
        logs={logs}
        species={species}
        filters={filters}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onFilterChange={setFilters}
        onClose={handleCloseActivity}
        isLoading={isLogsLoading}
      />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Handlers</h2>
          <p className="text-sm text-slate-caption">Observe field teams, current assignments, and audited activity trails.</p>
        </div>
        <button
          type="button"
          onClick={() => void refreshFarmData()}
          className="inline-flex min-h-touch items-center gap-2 rounded-input border border-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/5 disabled:opacity-60"
          disabled={isRefreshing}
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-container border border-veridian-amber/30 bg-veridian-amber/10 p-4 text-sm text-veridian-amber">
          {error}
        </div>
      ) : null}

      <div className="bg-deep-slate border border-white/10 rounded-container p-5">
        <div className="mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-veridian-emerald" />
          <h3 className="text-base font-semibold text-white">Field Handlers</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-caption uppercase tracking-wide text-xs">
              <tr>
                <th className="pb-3 pr-4 font-medium">Handler</th>
                <th className="pb-3 pr-4 font-medium">Active Zone</th>
                <th className="pb-3 pr-4 font-medium">Batches</th>
                <th className="pb-3 pr-4 font-medium">Livestock</th>
                <th className="pb-3 text-right font-medium">Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {handlers.map((handler) => (
                <tr key={handler.id}>
                  <td className="py-4 pr-4 align-top">
                    <p className="font-medium text-white">{handler.fullName || handler.username}</p>
                    <p className="text-xs text-slate-caption">{handler.email}</p>
                  </td>
                  <td className="py-4 pr-4 align-top">
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-midnight-navy px-2.5 py-1 text-xs text-slate-200">
                      <MapPinned className="w-3 h-3 text-veridian-sky" />
                      {handler.activeZone}
                    </span>
                  </td>
                  <td className="py-4 pr-4 align-top text-white">{handler.activeBatchCount}</td>
                  <td className="py-4 pr-4 align-top text-white">{handler.totalLivestock.toLocaleString()}</td>
                  <td className="py-4 text-right align-top">
                    <button
                      type="button"
                      onClick={() => handleOpenActivity(handler)}
                      className="inline-flex min-h-touch items-center gap-2 rounded-input border border-white/10 px-3 py-2 text-xs text-white transition-colors hover:border-veridian-emerald/30 hover:bg-white/5"
                    >
                      <Activity className="w-4 h-4 text-veridian-emerald" />
                      View Activity
                    </button>
                  </td>
                </tr>
              ))}
              {!isHandlersLoading && handlers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-slate-caption">
                    No handlers found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
