import React, { useState, useEffect } from 'react';
import {
  Layers,
  Search,
  Plus,
  Copy,
  Trash2,
  ExternalLink,
  Target,
  DollarSign,
  TrendingUp,
  Award,
  Filter,
  Clock,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { api } from '../services/api';

const STATUS_TABS = ['all', 'Draft', 'Sent', 'Replied', 'Won', 'Lost'];

const STATUS_COLORS = {
  Draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  Sent: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  Replied: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  Won: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  Lost: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800'
};

export function ProposalLibrary({
  onSelectProposal,
  onCreateNew,
  showToast
}) {
  const [proposals, setProposals] = useState([]);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [propsRes, statsRes] = await Promise.all([
        api.getProposals({ search, status: selectedStatus }),
        api.getPipelineStats()
      ]);
      setProposals(propsRes.data || []);
      setStats(statsRes.data || null);
    } catch (err) {
      console.error(err);
      showToast?.(err.message || 'Failed to load proposals', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedStatus]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const handleDuplicate = async (id, e) => {
    e.stopPropagation();
    try {
      const res = await api.duplicateProposal(id);
      showToast?.('Proposal duplicated as draft!', 'success');
      loadData();
    } catch (err) {
      showToast?.(err.message || 'Failed to duplicate', 'error');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this proposal?')) return;
    try {
      await api.deleteProposal(id);
      showToast?.('Proposal deleted', 'info');
      loadData();
    } catch (err) {
      showToast?.(err.message || 'Failed to delete', 'error');
    }
  };

  const handleStatusChange = async (id, newStatus, e) => {
    e.stopPropagation();
    try {
      await api.updateProposal(id, { status: newStatus });
      showToast?.(`Updated status to ${newStatus}`, 'success');
      loadData();
    } catch (err) {
      showToast?.(err.message || 'Failed to update status', 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-brand-400" />
            <h2 className="text-xl font-bold">Proposal CRM & Partnership Pipeline</h2>
          </div>
          <p className="text-sm text-slate-300 mt-1">
            Track pitch outreach, monitor deal stages, and duplicate high-performing proposals for similar brands.
          </p>
        </div>

        <button
          onClick={onCreateNew}
          className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-all shadow-md shadow-brand-500/25 self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          Create New Pitch
        </button>
      </div>

      {/* Pipeline Analytics KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Pitches</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{stats.total}</div>
            <div className="text-xs text-slate-500">{stats.draft} Drafts &bull; {stats.sent + stats.replied} In Flight</div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Pipeline Value</span>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
              ${stats.totalPipelineValue?.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500">{stats.sent} Sent &bull; {stats.replied} Replied</div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Won Revenue</span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              ${stats.totalWonValue?.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500">{stats.won} Closed Brand Deals</div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Win Rate</span>
            <div className="text-2xl font-black text-brand-600 dark:text-brand-400">
              {stats.winRate}%
            </div>
            <div className="text-xs text-slate-500">Based on closed deals</div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search proposals by brand or title..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white shadow-sm"
          />
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedStatus(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                selectedStatus === tab
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Proposals Grid / List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          Loading proposals...
        </div>
      ) : proposals.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
          <Layers className="w-8 h-8 text-slate-400 mx-auto" />
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No proposals found</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {search || selectedStatus !== 'all'
              ? 'Try changing your search term or status filter.'
              : 'You haven\'t created any brand proposals yet. Generate your first personalized pitch in seconds!'}
          </p>
          <button
            onClick={onCreateNew}
            className="px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-md"
          >
            Create Proposal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {proposals.map((prop) => {
            const statusClass = STATUS_COLORS[prop.status] || STATUS_COLORS.Draft;
            const middlePrice = prop.content?.sections?.pricingPackages?.packages?.[1]?.price
              || prop.content?.sections?.pricingPackages?.packages?.[0]?.price;

            return (
              <div
                key={prop.id}
                onClick={() => onSelectProposal(prop)}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-brand-500/60 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group relative space-y-4"
              >
                <div>
                  {/* Top line: Brand & Status dropdown */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-brand-600 dark:text-brand-400">
                      {prop.brandName}
                    </span>

                    <select
                      value={prop.status || 'Draft'}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleStatusChange(prop.id, e.target.value, e)}
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusClass} focus:outline-none cursor-pointer`}
                    >
                      <option value="Draft">Draft</option>
                      <option value="Sent">Sent</option>
                      <option value="Replied">Replied</option>
                      <option value="Won">Won</option>
                      <option value="Lost">Lost</option>
                    </select>
                  </div>

                  {/* Title */}
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    {prop.title}
                  </h4>

                  {/* Pitch Hook preview */}
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-2 leading-relaxed">
                    {prop.content?.sections?.introduction?.text?.slice(0, 140)}...
                  </p>
                </div>

                {/* Bottom line: Deal Value, Synergy Score & Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {middlePrice && (
                      <span className="font-black text-slate-900 dark:text-white">
                        ${middlePrice.toLocaleString()}
                      </span>
                    )}
                    {prop.alignmentScore && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {prop.alignmentScore}% Match
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-slate-400">
                    <button
                      type="button"
                      onClick={(e) => handleDuplicate(prop.id, e)}
                      title="Duplicate Proposal"
                      className="p-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(prop.id, e)}
                      title="Delete Proposal"
                      className="p-1 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="p-1 group-hover:text-brand-600 dark:group-hover:text-brand-400">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
