import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  archiveInventoryBatch,
  deleteAdminLivestockSpecies,
  updateInventoryBatchAssignment,
  updateInventorySpecies,
} from '../auth/authService';
import { Archive, PencilLine, RefreshCw, Save, Tractor, Trash2, Users } from 'lucide-react';
import { useAdminHandlers, useAdminInventorySummary, useFarmData, useLivestockBatches } from '../../context/FarmDataContext';

interface LivestockSummary {
  id: number;
  type: string;
  batchCount: number;
  totalCurrentCount: number;
}

interface AdminBatch {
  id: number;
  livestockId: number;
  livestockType: string;
  name: string;
  breed: string | null;
  initialCount: number;
  currentCount: number;
  arrivalDate: string | null;
  ageInDays: number;
  status: string | null;
  handlerId: number | null;
  handlerName: string | null;
  handlerUsername: string | null;
}

export default function LivestockView() {
  const { refreshFarmData, invalidateFarmData } = useFarmData();
  const {
    data: summary,
    error: summaryError,
    isLoading: isSummaryLoading,
    isFetching: isSummaryRefreshing,
  } = useAdminInventorySummary();
  const {
    data: handlers = [],
    error: handlersError,
  } = useAdminHandlers();
  const [selectedLivestockId, setSelectedLivestockId] = useState<number | null>(null);
  const [speciesDraft, setSpeciesDraft] = useState('');
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<number, string>>({});
  const [actionError, setActionError] = useState('');
  const {
    data: batches = [],
    isLoading: isBatchesLoading,
  } = useLivestockBatches(selectedLivestockId, 'admin');
  const archiveBatchMutation = useMutation({
    mutationFn: archiveInventoryBatch,
    onSuccess: async () => {
      await invalidateFarmData();
    },
  });
  const updateAssignmentMutation = useMutation({
    mutationFn: ({ batchId, handlerId }: { batchId: number; handlerId: number }) =>
      updateInventoryBatchAssignment(batchId, { handlerId }),
    onSuccess: async () => {
      await invalidateFarmData();
    },
  });
  const updateSpeciesMutation = useMutation({
    mutationFn: ({ livestockId, type }: { livestockId: number; type: string }) =>
      updateInventorySpecies(livestockId, { type }),
    onSuccess: async () => {
      await invalidateFarmData();
    },
  });
  const deleteSpeciesMutation = useMutation({
    mutationFn: deleteAdminLivestockSpecies,
    onSuccess: async () => {
      await invalidateFarmData();
    },
  });
  const isMutating = archiveBatchMutation.isPending
    || updateAssignmentMutation.isPending
    || updateSpeciesMutation.isPending
    || deleteSpeciesMutation.isPending;
  const safeSummary = summary ?? {
    totalLivestock: 0,
    totalSpecies: 0,
    totalActiveBatches: 0,
    speciesBreakdown: [],
  };
  const error = actionError
    || (summaryError instanceof Error ? summaryError.message : '')
    || (handlersError instanceof Error ? handlersError.message : '');
  const isLoading = isSummaryLoading;
  const isRefreshing = isSummaryRefreshing || isMutating;

  const selectedSpecies = useMemo(
    () => safeSummary.speciesBreakdown.find((item) => item.id === selectedLivestockId) || null,
    [selectedLivestockId, safeSummary.speciesBreakdown]
  );

  useEffect(() => {
    setSelectedLivestockId((currentId) => {
      if (currentId && safeSummary.speciesBreakdown.some((item) => item.id === currentId)) {
        return currentId;
      }
      return safeSummary.speciesBreakdown[0]?.id ?? null;
    });
  }, [safeSummary.speciesBreakdown]);

  useEffect(() => {
    const nextSpecies = safeSummary.speciesBreakdown.find((item) => item.id === selectedLivestockId);
    setSpeciesDraft(nextSpecies?.type || '');
  }, [selectedLivestockId, safeSummary.speciesBreakdown]);

  useEffect(() => {
    setAssignmentDrafts(
      Object.fromEntries(
        batches.map((batch: AdminBatch) => [batch.id, batch.handlerId ? String(batch.handlerId) : ''])
      )
    );
  }, [batches]);

  const handleArchiveBatch = async (batchId: number) => {
    try {
      const response = await archiveBatchMutation.mutateAsync(batchId);
      if (!response?.success) {
        throw new Error(response?.message || 'Unable to archive batch.');
      }
      setActionError('');
    } catch (actionError) {
      const message = actionError instanceof Error ? actionError.message : 'Unable to archive batch.';
      setActionError(message);
    }
  };

  const handleSaveAssignment = async (batchId: number) => {
    const handlerId = Number(assignmentDrafts[batchId] || '');
    if (!handlerId) {
      setActionError('Please select a handler before saving the assignment.');
      return;
    }

    try {
      const response = await updateAssignmentMutation.mutateAsync({ batchId, handlerId });
      if (!response?.success) {
        throw new Error(response?.message || 'Unable to update assignment.');
      }
      setActionError('');
    } catch (actionError) {
      const message = actionError instanceof Error ? actionError.message : 'Unable to update assignment.';
      setActionError(message);
    }
  };

  const handleSaveSpecies = async () => {
    if (!selectedSpecies) {
      return;
    }

    try {
      const response = await updateSpeciesMutation.mutateAsync({ livestockId: selectedSpecies.id, type: speciesDraft });
      if (!response?.success) {
        throw new Error(response?.message || 'Unable to update livestock species.');
      }
      setActionError('');
    } catch (actionError) {
      const message = actionError instanceof Error ? actionError.message : 'Unable to update livestock species.';
      setActionError(message);
    }
  };

  const handleDeleteSpecies = async () => {
    if (!selectedSpecies) {
      return;
    }

    const confirmed = window.confirm(`Delete ${selectedSpecies.type} and its associated batches?`);
    if (!confirmed) {
      return;
    }

    try {
      const response = await deleteSpeciesMutation.mutateAsync(selectedSpecies.id);
      if (!response?.success) {
        throw new Error(response?.message || 'Unable to delete livestock species.');
      }

      setSelectedLivestockId(null);
      setActionError('');
    } catch (actionError) {
      const message = actionError instanceof Error ? actionError.message : 'Unable to delete livestock species.';
      setActionError(message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Livestock</h2>
          <p className="text-sm text-slate-caption">Global inventory observation across all species and active field batches.</p>
        </div>
        <button
          type="button"
          onClick={() => void refreshFarmData()}
          className="inline-flex min-h-touch items-center gap-2 rounded-input border border-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/5 disabled:opacity-60"
          disabled={isRefreshing || isMutating}
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-container border border-white/10 bg-deep-slate p-5">
          <p className="text-xs uppercase tracking-wider text-slate-caption">Total Livestock</p>
          <p className="mt-2 text-3xl font-semibold text-white">{safeSummary.totalLivestock.toLocaleString()}</p>
        </div>
        <div className="rounded-container border border-white/10 bg-deep-slate p-5">
          <p className="text-xs uppercase tracking-wider text-slate-caption">Species</p>
          <p className="mt-2 text-3xl font-semibold text-white">{safeSummary.totalSpecies.toLocaleString()}</p>
        </div>
        <div className="rounded-container border border-white/10 bg-deep-slate p-5">
          <p className="text-xs uppercase tracking-wider text-slate-caption">Active Batches</p>
          <p className="mt-2 text-3xl font-semibold text-white">{safeSummary.totalActiveBatches.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[340px_1fr]">
        <div className="rounded-container border border-white/10 bg-deep-slate p-5">
          <div className="mb-4 flex items-center gap-2">
            <Tractor className="w-5 h-5 text-veridian-emerald" />
            <h3 className="text-base font-semibold text-white">Species Breakdown</h3>
          </div>

          <div className="space-y-3">
            {safeSummary.speciesBreakdown.map((species) => (
              <button
                key={species.id}
                type="button"
                onClick={() => setSelectedLivestockId(species.id)}
                className={`w-full rounded-input border p-4 text-left transition-colors ${
                  selectedLivestockId === species.id
                    ? 'border-veridian-emerald/40 bg-veridian-emerald/10'
                    : 'border-white/10 bg-midnight-navy/40 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-white">{species.type}</p>
                  <span className="text-xs text-veridian-emerald">{species.batchCount} batches</span>
                </div>
                <p className="mt-2 text-sm text-slate-caption">{species.totalCurrentCount.toLocaleString()} head live</p>
              </button>
            ))}

            {!isLoading && safeSummary.speciesBreakdown.length === 0 ? (
              <div className="rounded-input border border-dashed border-white/10 p-4 text-sm text-slate-caption">
                No livestock species have been created yet.
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-container border border-white/10 bg-deep-slate p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-white">{selectedSpecies?.type || 'Species Detail'}</h3>
              <p className="text-xs text-slate-caption">Observe active handler-managed batches and apply admin actions.</p>
            </div>
            {selectedSpecies ? (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex min-h-touch items-center gap-2 rounded-input border border-white/10 bg-midnight-navy/60 px-3 py-2">
                  <PencilLine className="w-4 h-4 text-veridian-sky" />
                  <input
                    value={speciesDraft}
                    onChange={(event) => setSpeciesDraft(event.target.value)}
                    className="w-32 bg-transparent text-sm text-white outline-none"
                    placeholder="Rename species"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void handleSaveSpecies()}
                  className="inline-flex min-h-touch items-center gap-2 rounded-input border border-white/10 px-3 py-2 text-sm text-white transition-colors hover:bg-white/5"
                >
                  <Save className="w-4 h-4 text-veridian-emerald" />
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteSpecies()}
                  className="inline-flex min-h-touch items-center gap-2 rounded-input border border-veridian-rose/30 px-3 py-2 text-sm text-veridian-rose transition-colors hover:bg-veridian-rose/10"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            {batches.map((batch) => (
              <div key={batch.id} className="rounded-input border border-white/10 bg-midnight-navy/50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{batch.name}</p>
                    <p className="mt-1 text-xs text-slate-caption">
                      {batch.livestockType} • {batch.currentCount.toLocaleString()} / {batch.initialCount.toLocaleString()} head • {batch.ageInDays} days old
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-deep-slate px-2.5 py-1 text-xs text-slate-200">
                    {batch.status || 'ACTIVE'}
                  </span>
                </div>

                <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex items-center gap-2 rounded-input border border-white/10 bg-deep-slate px-3 py-2">
                    <Users className="w-4 h-4 text-veridian-sky" />
                    <select
                      value={assignmentDrafts[batch.id] || ''}
                      onChange={(event) => setAssignmentDrafts((current) => ({ ...current, [batch.id]: event.target.value }))}
                      className="min-h-touch bg-transparent text-sm text-white outline-none"
                    >
                      <option value="" className="bg-deep-slate text-white">Select handler</option>
                      {handlers.map((handler) => (
                        <option key={handler.id} value={handler.id} className="bg-deep-slate text-white">
                          {handler.fullName || handler.username}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => void handleSaveAssignment(batch.id)}
                      disabled={isMutating}
                      className="inline-flex min-h-touch items-center gap-1 rounded-input border border-white/10 px-3 py-2 text-xs text-white transition-colors hover:bg-white/5"
                    >
                      <Save className="w-3.5 h-3.5 text-veridian-emerald" />
                      Save
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <p className="text-xs text-slate-caption">
                      Assigned to {batch.handlerName || batch.handlerUsername || 'No handler'}
                    </p>
                    <button
                      type="button"
                      onClick={() => void handleArchiveBatch(batch.id)}
                      disabled={batch.currentCount > 0}
                      className="inline-flex min-h-touch items-center gap-2 rounded-input border border-white/10 px-3 py-2 text-xs text-white transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Archive className="w-4 h-4 text-veridian-amber" />
                      Archive
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {selectedSpecies && !isBatchesLoading && batches.length === 0 ? (
              <div className="rounded-input border border-dashed border-white/10 p-4 text-sm text-slate-caption">
                No active batches remain for this species.
              </div>
            ) : null}
            {selectedSpecies && isBatchesLoading ? (
              <div className="rounded-input border border-dashed border-white/10 p-4 text-sm text-slate-caption">
                Loading live batch assignments...
              </div>
            ) : null}
            {!selectedSpecies ? (
              <div className="rounded-input border border-dashed border-white/10 p-4 text-sm text-slate-caption">
                Select a species to inspect the live handler-managed batches beneath it.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
