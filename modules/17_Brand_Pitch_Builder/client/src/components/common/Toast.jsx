import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export function Toast({ message, type = 'success', onClose }) {
  if (!message) return null;

  const bgStyles = {
    success: 'bg-emerald-500 text-white',
    error: 'bg-rose-500 text-white',
    info: 'bg-brand-600 text-white',
    warning: 'bg-amber-500 text-white'
  };

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 flex-shrink-0" />,
    error: <AlertCircle className="w-5 h-5 flex-shrink-0" />,
    info: <Info className="w-5 h-5 flex-shrink-0" />,
    warning: <AlertCircle className="w-5 h-5 flex-shrink-0" />
  };

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl transition-all transform translate-y-0 ${bgStyles[type] || bgStyles.info}`}>
      {icons[type] || icons.info}
      <span className="text-sm font-medium">{message}</span>
      {onClose && (
        <button onClick={onClose} className="p-1 hover:opacity-80 rounded-md transition-opacity">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
