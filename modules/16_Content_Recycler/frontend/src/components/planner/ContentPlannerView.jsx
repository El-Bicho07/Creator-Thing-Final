import React, { useState, useEffect } from 'react';
import { 
  CalendarCheck, Clock, CheckCircle2, FileText, 
  Trash2, Plus, ArrowRight, RotateCw, Edit3, Sparkles, LayoutGrid, List 
} from 'lucide-react';
import { RecommendationBadge, MediaTypeBadge } from '../common/Badge';
import { plannerAPI } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

export default function ContentPlannerView({ onNavigate }) {
  const { notify } = useNotification();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'list'
  const [editingItem, setEditingItem] = useState(null);

  const fetchPlanItems = async () => {
    setLoading(true);
    try {
      const res = await plannerAPI.getItems();
      if (res.data?.success) {
        setItems(res.data.planItems || []);
      }
    } catch (err) {
      console.error(err);
      notify('Failed to load planner items', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlanItems();
  }, []);

  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await plannerAPI.updateItem(id, { status: newStatus });
      if (res.data?.success) {
        setItems(prev => prev.map(item => item._id === id ? { ...item, status: newStatus } : item));
        notify(`Moved to ${newStatus}`, 'info');
      }
    } catch (err) {
      notify('Failed to update status', 'error');
    }
  };

  const handleDeleteItem = async (id) => {
    try {
      await plannerAPI.deleteItem(id);
      setItems(prev => prev.filter(item => item._id !== id));
      notify('Item removed from planner', 'info');
    } catch (err) {
      notify('Failed to remove item', 'error');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    try {
      const res = await plannerAPI.updateItem(editingItem._id, {
        plannedDate: editingItem.plannedDate,
        targetFormat: editingItem.targetFormat,
        notes: editingItem.notes,
        hookRevision: editingItem.hookRevision,
      });
      if (res.data?.success) {
        setItems(prev => prev.map(i => i._id === editingItem._id ? editingItem : i));
        notify('Plan details saved!', 'success');
        setEditingItem(null);
      }
    } catch (err) {
      notify('Failed to save changes', 'error');
    }
  };

  const handleClearPlanner = async () => {
    if (!window.confirm('Clear all scheduled items from content planner?')) return;
    try {
      await plannerAPI.clearAll();
      setItems([]);
      notify('Content planner cleared', 'info');
    } catch (err) {
      notify('Failed to clear planner', 'error');
    }
  };

  const columns = [
    { id: 'draft', title: 'Ideation / Draft', color: 'border-slate-700 bg-charcoal-900/50' },
    { id: 'planned', title: 'Scheduled for Production', color: 'border-lime-500/30 bg-charcoal-900/50' },
    { id: 'published', title: 'Recycled & Published', color: 'border-emerald-500/30 bg-charcoal-900/50' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Planner Header Controls */}
      <div className="p-5 rounded-3xl card-glass border border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-lime-accent" />
            Recycling Production Pipeline
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Organize repurposed Instagram assets, assign target release dates, and track production readiness.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center p-1 rounded-xl bg-charcoal-800 border border-slate-700 text-xs">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'kanban' ? 'bg-lime-accent text-charcoal-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Kanban Board View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-lime-accent text-charcoal-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => onNavigate('recommendations')}
            className="px-3.5 py-2 rounded-xl bg-lime-accent hover:bg-lime-bright text-charcoal-950 font-bold text-xs flex items-center gap-1.5 shadow-glow-lime transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Recycled Post
          </button>

          {items.length > 0 && (
            <button
              onClick={handleClearPlanner}
              className="p-2 rounded-xl text-slate-500 hover:text-rose-400 bg-charcoal-800 border border-slate-700 transition-colors"
              title="Clear all scheduled items"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Body View */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-3">
          <RotateCw className="w-8 h-8 text-lime-accent animate-spin" />
          <p className="text-xs text-slate-400">Loading production pipeline...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center rounded-3xl card-glass border border-slate-800/80 space-y-4 max-w-md mx-auto my-8">
          <CalendarCheck className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">Your Planner is Empty</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Jump to Recommendations or the Thematic Bundler to send high-opportunity recycling assets into your queue.
          </p>
          <button
            onClick={() => onNavigate('recommendations')}
            className="px-4 py-2 rounded-xl bg-lime-accent text-charcoal-950 font-bold text-xs inline-flex items-center gap-2 shadow-glow-lime"
          >
            <Sparkles className="w-4 h-4" />
            Discover Recommendations
          </button>
        </div>
      ) : viewMode === 'kanban' ? (
        /* KANBAN BOARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {columns.map((col) => {
            const colItems = items.filter(i => (i.status || 'planned') === col.id);

            return (
              <div
                key={col.id}
                className={`p-4 rounded-3xl border flex flex-col min-h-[500px] ${col.color}`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      {col.title}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-charcoal-800 text-slate-400 font-mono">
                      {colItems.length}
                    </span>
                  </div>
                </div>

                {/* Cards List */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colItems.map((item) => (
                    <div
                      key={item._id}
                      className="p-4 rounded-2xl bg-charcoal-850/90 border border-slate-800 hover:border-slate-700 transition-all space-y-3 group"
                    >
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-1 text-xs">
                        <RecommendationBadge type={item.recommendationType || 'REPURPOSE'} size="sm" />
                        <span className="text-[10px] font-mono font-bold text-lime-bright bg-lime-muted px-2 py-0.5 rounded border border-lime-500/20">
                          {item.targetFormat || 'REEL'}
                        </span>
                      </div>

                      {/* Caption Snapshot */}
                      <p className="text-xs text-slate-200 line-clamp-3 italic">
                        "{item.postSnapshot?.caption || 'Original caption unavailable'}"
                      </p>

                      {/* Planned Date */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-lime-accent" />
                          {new Date(item.plannedDate).toLocaleDateString()}
                        </span>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditingItem(item)}
                            className="p-1 text-slate-400 hover:text-white"
                            title="Edit notes & format"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item._id)}
                            className="p-1 text-slate-400 hover:text-rose-400"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Move to next stage button */}
                      <div className="flex items-center gap-1.5 pt-1">
                        {col.id !== 'draft' && (
                          <button
                            onClick={() => handleStatusChange(item._id, col.id === 'published' ? 'planned' : 'draft')}
                            className="text-[10px] px-2 py-1 rounded bg-charcoal-800 hover:bg-charcoal-700 text-slate-400 hover:text-slate-200"
                          >
                            &larr; Back
                          </button>
                        )}
                        {col.id !== 'published' && (
                          <button
                            onClick={() => handleStatusChange(item._id, col.id === 'draft' ? 'planned' : 'published')}
                            className="text-[10px] px-2 py-1 rounded bg-charcoal-800 hover:bg-lime-accent hover:text-charcoal-950 font-bold text-slate-300 transition-colors ml-auto"
                          >
                            {col.id === 'draft' ? 'Schedule \u2192' : 'Mark Published \u2713'}
                          </button>
                        )}
                      </div>

                    </div>
                  ))}
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="rounded-3xl card-glass border border-slate-800 overflow-hidden divide-y divide-slate-800/80">
          {items.map((item) => (
            <div key={item._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-charcoal-850/40">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs">
                  <RecommendationBadge type={item.recommendationType} size="sm" />
                  <span className="text-[10px] font-mono text-lime-bright bg-lime-muted px-2 py-0.5 rounded">
                    Format: {item.targetFormat}
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    Due: {new Date(item.plannedDate).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-slate-200 line-clamp-1 italic">
                  "{item.postSnapshot?.caption}"
                </p>
                {item.notes && (
                  <p className="text-[11px] text-slate-400 line-clamp-1">
                    Notes: {item.notes}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <select
                  value={item.status || 'planned'}
                  onChange={(e) => handleStatusChange(item._id, e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl bg-charcoal-800 border border-slate-700 text-xs text-slate-200"
                >
                  <option value="draft">Draft</option>
                  <option value="planned">Planned</option>
                  <option value="published">Published</option>
                </select>

                <button
                  onClick={() => setEditingItem(item)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-charcoal-800"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteItem(item._id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 bg-charcoal-800"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-charcoal-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Edit Production Item</h3>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Target Format</label>
              <select
                value={editingItem.targetFormat}
                onChange={(e) => setEditingItem({ ...editingItem, targetFormat: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-charcoal-800 border border-slate-700 text-xs text-white"
              >
                <option value="REEL">Reel (Short-form video)</option>
                <option value="CAROUSEL">Carousel (Multi-slide breakdown)</option>
                <option value="IMAGE">Single Infographic Image</option>
                <option value="STORY_SERIES">Interactive Story Series</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Planned Date</label>
              <input
                type="date"
                value={new Date(editingItem.plannedDate).toISOString().split('T')[0]}
                onChange={(e) => setEditingItem({ ...editingItem, plannedDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-charcoal-800 border border-slate-700 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Production Notes / Script Outline</label>
              <textarea
                rows="3"
                value={editingItem.notes || ''}
                onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-charcoal-800 border border-slate-700 text-xs text-white resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingItem(null)}
                className="px-3.5 py-2 rounded-xl bg-charcoal-800 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded-xl bg-lime-accent text-charcoal-950 font-bold text-xs shadow-glow-lime"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
