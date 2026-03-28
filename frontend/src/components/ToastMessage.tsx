import { useEffect } from 'react';
import { CheckCircle, AlertTriangle, X } from 'lucide-react';

interface ToastMessageProps {
  type: 'success' | 'error';
  message: string;
  onClose: () => void;
}

export default function ToastMessage({ type, message, onClose }: ToastMessageProps) {
  useEffect(() => {
    const timeout = window.setTimeout(onClose, 4000);
    return () => window.clearTimeout(timeout);
  }, [onClose]);

  const isSuccess = type === 'success';

  return (
    <div
      className={`fixed right-4 top-4 z-50 flex items-center gap-3 rounded-container px-4 py-3 text-sm font-medium shadow-card animate-slide-in ${
        isSuccess
          ? 'border border-veridian-emerald/30 bg-veridian-emerald/15 text-veridian-emerald'
          : 'border border-veridian-rose/30 bg-veridian-rose/15 text-veridian-rose'
      }`}
      role="status"
      aria-live="polite"
    >
      {isSuccess ? (
        <CheckCircle className="h-5 w-5 flex-shrink-0" />
      ) : (
        <AlertTriangle className="h-5 w-5 flex-shrink-0" />
      )}
      <span>{message}</span>
      <button
        onClick={onClose}
        className="ml-2 p-1 rounded hover:bg-white/10 transition-colors"
        aria-label="Close notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
