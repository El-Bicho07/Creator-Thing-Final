import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => {
        let icon = <Info size={18} color="var(--primary)" />;
        let typeClass = 'toast-info';

        if (toast.type === 'success') {
          icon = <CheckCircle2 size={18} color="var(--accent-emerald)" />;
          typeClass = 'toast-success';
        } else if (toast.type === 'error') {
          icon = <AlertCircle size={18} color="var(--accent-rose)" />;
          typeClass = 'toast-error';
        }

        return (
          <div key={toast.id} className={`toast ${typeClass}`}>
            {icon}
            <span style={{ flex: 1 }}>{toast.message}</span>
            <button
              onClick={() => onDismiss(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '2px',
              }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
