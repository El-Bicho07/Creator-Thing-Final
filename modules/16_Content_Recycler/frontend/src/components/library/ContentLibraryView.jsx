import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, ArrowUpDown, RotateCw, Plus, 
  Trash2, FileSpreadsheet, Sparkles, FolderGit2 
} from 'lucide-react';
import PostCard from './PostCard';
import { postsAPI } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

export default function ContentLibraryView({ onOpenScoreModal, onNavigate }) {
  const { notify } = useNotification();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [mediaType, setMediaType] = useState('ALL');
  const [sortBy, setSortBy] = useState('postDate');
  const [order, setOrder] = useState('desc');

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await postsAPI.getPosts({
        mediaType,
        search,
        sortBy,
        order,
      });
      if (res.data?.success) {
        setPosts(res.data.posts || []);
      }
    } catch (err) {
      console.error('Failed to fetch posts:', err);
      notify('Failed to load library posts', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchPosts();
    }, 250);
    return () => clearTimeout(debounceTimer);
  }, [search, mediaType, sortBy, order]);

  const handleDeletePost = async (id) => {
    if (!window.confirm('Are you sure you want to remove this post from your library?')) return;
    try {
      await postsAPI.deletePost(id);
      notify('Post removed from library', 'info');
      setPosts(prev => prev.filter(p => (p.originalId || p._id) !== id));
    } catch (err) {
      notify('Failed to delete post', 'error');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Delete all posts from library? This cannot be undone.')) return;
    try {
      await postsAPI.clearAll();
      notify('Library cleared', 'info');
      setPosts([]);
    } catch (err) {
      notify('Failed to clear library', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Control Bar */}
      <div className="p-4 sm:p-5 rounded-2xl card-glass border border-slate-800/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by caption, keyword, or #hashtag..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-charcoal-800 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-lime-accent"
          />
        </div>

        {/* Filters and Sorting */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Media Type Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-charcoal-800 border border-slate-700 text-xs">
            {['ALL', 'CAROUSEL', 'REEL', 'IMAGE'].map((type) => (
              <button
                key={type}
                onClick={() => setMediaType(type)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  mediaType === type
                    ? 'bg-lime-accent text-charcoal-950 font-bold shadow-glow-subtle'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Sort Selection */}
          <div className="flex items-center gap-2">
            <select
              value={`${sortBy}-${order}`}
              onChange={(e) => {
                const [sb, ord] = e.target.value.split('-');
                setSortBy(sb);
                setOrder(ord);
              }}
              className="px-3 py-2 rounded-xl bg-charcoal-800 border border-slate-700 text-xs text-slate-200 font-medium focus:outline-none focus:border-lime-accent"
            >
              <option value="postDate-desc">Newest First</option>
              <option value="postDate-asc">Oldest First</option>
              <option value="reach-desc">Highest Reach</option>
              <option value="saves-desc">Most Saves (Evergreen)</option>
              <option value="calculatedER-desc">Highest ER</option>
            </select>
          </div>

          {/* Clear / Reseed Action */}
          <button
            onClick={handleClearAll}
            title="Clear all posts"
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 bg-charcoal-800 border border-slate-700 hover:border-rose-500/40 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>Showing <strong className="text-white">{posts.length}</strong> indexed posts</span>
        <span>Click <strong>Recycle</strong> on any post for algorithmic breakdown</span>
      </div>

      {/* Posts Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-3">
          <RotateCw className="w-8 h-8 text-lime-accent animate-spin" />
          <p className="text-xs text-slate-400">Loading historical library records...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="p-12 text-center rounded-3xl card-glass border border-slate-800/80 space-y-4 max-w-md mx-auto my-8">
          <FolderGit2 className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No posts match your filters</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Try adjusting your search criteria, or upload your historical Instagram CSV export.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => onNavigate('importer')}
              className="px-4 py-2 rounded-xl bg-lime-accent text-charcoal-950 font-bold text-xs flex items-center gap-2 shadow-glow-lime"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Upload CSV
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {posts.map((post) => (
            <PostCard
              key={post.originalId || post._id}
              post={post}
              onAnalyze={onOpenScoreModal}
              onDelete={handleDeletePost}
            />
          ))}
        </div>
      )}

    </div>
  );
}
