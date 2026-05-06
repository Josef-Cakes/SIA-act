import { Loader2, X } from 'lucide-react';

export default function QuickActionModal({
  action,
  batches,
  formValues,
  onClose,
  onChange,
  onSubmit,
  isSubmitting,
}) {
  if (!action) {
    return null;
  }

  const { Icon } = action;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-midnight-navy/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-container border border-white/10 bg-deep-slate p-6 shadow-card animate-fade-in">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-input ${action.iconSurfaceClassName}`}>
              <Icon className={`h-6 w-6 ${action.iconClassName}`} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">{action.label}</h2>
              <p className="text-sm text-slate-caption">{action.description}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-input border border-white/10 p-2 text-slate-caption transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Close quick action modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-5">
          <div>
            <label htmlFor="quick-action-batch" className="veridian-label">Batch</label>
            <select
              id="quick-action-batch"
              name="batchId"
              className="veridian-input"
              value={formValues.batchId}
              onChange={onChange}
              disabled={isSubmitting}
              required
            >
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.name} • {batch.livestockType} • {batch.currentCount} heads
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="quick-action-quantity" className="veridian-label">Quantity</label>
            <input
              id="quick-action-quantity"
              name="quantity"
              type="number"
              min="1"
              step="1"
              className="veridian-input"
              value={formValues.quantity}
              onChange={onChange}
              disabled={isSubmitting}
              required
            />
          </div>

          <div>
            <label htmlFor="quick-action-remarks" className="veridian-label">Remarks</label>
            <textarea
              id="quick-action-remarks"
              name="remarks"
              rows={3}
              className="veridian-input resize-none"
              value={formValues.remarks}
              onChange={onChange}
              disabled={isSubmitting}
              placeholder={`Optional notes for ${action.label.toLowerCase()}.`}
            />
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="veridian-btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="veridian-btn-primary inline-flex items-center justify-center gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
              {isSubmitting ? 'Saving...' : `Submit ${action.label}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
