import React, { useState, useEffect } from 'react';
import { History, X, RotateCcw, Clock, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';

export function VersionHistoryModal({
  isOpen,
  onClose,
  proposalId,
  onRestoreVersion,
  showToast
}) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && proposalId) {
      setLoading(true);
      api.getVersions(proposalId)
        .then(res => setVersions(res.data || []))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, proposalId]);

  if (!isOpen) return null;

  const handleRestore = (ver) => {
    onRestoreVersion(ver.content);
    showToast?.(`Restored Version #${ver.versionNumber}`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Proposal Version History
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-6 max-h-[420px] overflow-y-auto space-y-3">
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading version snapshots...</div>
          ) : versions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No previous version snapshots found.</div>
          ) : (
            versions.map((ver, idx) => (
              <div
                key={ver.id || idx}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300">
                      v{ver.versionNumber}
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {ver.changeNote || 'Proposal Update'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(ver.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRestore(ver)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 bg-white dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-brand-950/60 border border-brand-200 dark:border-brand-800 rounded-lg transition-colors shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restore
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
