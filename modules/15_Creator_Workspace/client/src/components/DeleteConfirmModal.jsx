import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function DeleteConfirmModal({
  isOpen,
  title = 'Delete Content',
  message = 'Are you sure you want to delete this item? This action cannot be undone.',
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '440px' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(244, 63, 94, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-rose)',
              }}
            >
              <AlertTriangle size={18} />
            </div>
            <h3 style={{ fontSize: '1.05rem', margin: 0 }}>{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="btn-ghost"
            style={{ padding: '4px', borderRadius: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>
          <p>{message}</p>
        </div>

        <div className="modal-footer">
          <button onClick={onCancel} className="btn btn-secondary btn-sm">
            Cancel
          </button>
          <button onClick={onConfirm} className="btn btn-danger btn-sm">
            Delete Permanently
          </button>
        </div>
      </div>
    </div>
  );
}
