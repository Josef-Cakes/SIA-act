import { AlertCircle, LogOut } from 'lucide-react';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function LogoutConfirmModal({
  isOpen,
  onCancel,
  onConfirm,
}: LogoutConfirmModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-sm">
      <div
        className="w-full max-w-md rounded-[28px] border border-white/10 bg-deep-slate p-6 shadow-[0_32px_80px_rgba(2,6,23,0.6)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-modal-title"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-600/15 text-rose-400">
          <AlertCircle className="h-8 w-8" />
        </div>

        <div className="mt-5 text-center">
          <h2 id="logout-modal-title" className="text-xl font-semibold text-white">
            Are you sure you want to log out?
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Any unsaved progress in your current action will be lost.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-[18px] border border-slate-500/60 px-4 py-3 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-500/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-[18px] bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-500"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
