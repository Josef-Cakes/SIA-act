import { useEffect } from 'react';

interface ToastMessageProps {
  type: 'success' | 'error';
  message: string;
  onClose: () => void;
}

export default function ToastMessage({ type, message, onClose }: ToastMessageProps) {
  useEffect(() => {
    const timeout = window.setTimeout(onClose, 3000);
    return () => window.clearTimeout(timeout);
  }, [onClose]);

  return (
    <div
      className={`fixed right-4 top-4 z-50 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
        type === 'success'
          ? 'border border-emerald-300 bg-emerald-50 text-emerald-800'
          : 'border border-rose-300 bg-rose-50 text-rose-800'
      }`}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );
}
