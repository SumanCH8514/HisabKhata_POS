import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info
};

const THEMES = {
  success: {
    container: 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-100',
    icon: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-900/60',
    progress: 'bg-emerald-500 dark:bg-emerald-400'
  },
  error: {
    container: 'bg-rose-50 dark:bg-rose-950/80 border-rose-200 dark:border-rose-800/80 text-rose-900 dark:text-rose-100',
    icon: 'text-rose-600 dark:text-rose-400 bg-rose-100/80 dark:bg-rose-900/60',
    progress: 'bg-rose-500 dark:bg-rose-400'
  },
  warning: {
    container: 'bg-amber-50 dark:bg-amber-950/80 border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-100',
    icon: 'text-amber-600 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-900/60',
    progress: 'bg-amber-500 dark:bg-amber-400'
  },
  info: {
    container: 'bg-slate-50 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100',
    icon: 'text-blue-600 dark:text-blue-400 bg-blue-100/80 dark:bg-blue-900/60',
    progress: 'bg-blue-500 dark:bg-blue-400'
  }
};

export function ToastItem({ toast, onDismiss }) {
  const { id, message, type = 'info', title, duration = 4000, action } = toast;
  const [isPaused, setIsPaused] = useState(false);
  const [remaining, setRemaining] = useState(duration);

  const theme = THEMES[type] || THEMES.info;
  const IconComponent = ICONS[type] || Info;

  useEffect(() => {
    if (!duration || duration <= 0) return;
    if (isPaused) return;

    const interval = 50;
    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= interval) {
          clearInterval(timer);
          onDismiss(id);
          return 0;
        }
        return prev - interval;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [id, duration, isPaused, onDismiss]);

  const progressPercent = duration > 0 ? (remaining / duration) * 100 : 0;

  return (
    <div
      role="alert"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`pointer-events-auto relative overflow-hidden rounded-xl border p-3.5 shadow-lg backdrop-blur-md transition-all duration-300 transform translate-y-0 opacity-100 flex items-start gap-3 w-full ${theme.container}`}
    >
      <div className={`flex-shrink-0 p-1.5 rounded-lg ${theme.icon}`}>
        <IconComponent className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0 pr-1">
        {title && (
          <h4 className="text-xs font-bold uppercase tracking-wider mb-0.5 opacity-90">
            {title}
          </h4>
        )}
        <p className="text-sm font-medium leading-relaxed break-words whitespace-pre-line">
          {message}
        </p>

        {action && (
          <div className="mt-2">
            <button
              onClick={() => {
                action.onClick?.();
                onDismiss(id);
              }}
              className="text-xs font-semibold underline hover:opacity-80 transition"
            >
              {action.label}
            </button>
          </div>
        )}
      </div>

      <button
        onClick={() => onDismiss(id)}
        className="flex-shrink-0 -mr-1 -mt-1 p-1 rounded-md opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition"
        title="Dismiss"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>

      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/5 dark:bg-white/5 overflow-hidden">
          <div
            className={`h-full transition-all duration-75 ease-linear ${theme.progress}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-4 left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:right-4 z-[9999] pointer-events-none flex flex-col gap-2.5 w-[calc(100vw-2rem)] sm:w-auto sm:max-w-md"
    >
      {toasts.map((item) => (
        <ToastItem key={item.id} toast={item} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

export default ToastContainer;
