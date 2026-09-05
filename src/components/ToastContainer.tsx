import React from 'react';
import { useStore } from '../context/StoreContext';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-16 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(t => {
        let icon = <Info className="w-4 h-4 text-sky-400" />;
        let border = 'border-stone-700';
        let bg = 'bg-stone-900/95';

        if (t.type === 'success') {
          icon = <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
          border = 'border-emerald-500/40';
        } else if (t.type === 'warning') {
          icon = <AlertTriangle className="w-4 h-4 text-amber-400" />;
          border = 'border-amber-500/40';
        } else if (t.type === 'error') {
          icon = <AlertCircle className="w-4 h-4 text-rose-400" />;
          border = 'border-rose-500/40';
        }

        return (
          <div
            key={t.id}
            className={`pointer-events-auto p-3 rounded-lg shadow-xl border ${border} ${bg} backdrop-blur text-stone-100 flex items-start gap-2.5 transition-all`}
          >
            <div className="mt-0.5">{icon}</div>
            <div className="flex-1 text-xs">
              <p className="font-bold text-white font-mono-code uppercase tracking-wider">{t.title}</p>
              <p className="text-stone-300 mt-0.5 leading-relaxed">{t.message}</p>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-stone-400 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
