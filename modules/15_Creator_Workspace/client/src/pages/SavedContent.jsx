import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookmarkCheck,
  Search,
  Copy,
  Trash2,
  Eye,
  Calendar,
  Sparkles,
  Bot,
  Filter,
} from 'lucide-react';
import FormatBadge from '../components/FormatBadge';
import DeleteConfirmModal from '../components/DeleteConfirmModal';

export default function SavedContent({
  savedItems,
  onDeleteSaved,
  onCopyContent,
  addToast,
}) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [formatFilter, setFormatFilter] = useState('All');
  const [viewingItem, setViewingItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);

  const formats = ['All', 'Instagram Reel', 'Carousel', 'Caption', 'Story'];

  // Filtering
  const filteredList = savedItems.filter((item) => {
    const matchesFormat =
      formatFilter === 'All' || item.format === formatFilter;

    const matchesSearch =
      item.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.audience.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tone.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFormat && matchesSearch;
  });

  const confirmDelete = () => {
    if (itemToDelete) {
      onDeleteSaved(itemToDelete.id);
      addToast(`Deleted "${itemToDelete.topic}"`, 'info');
      setItemToDelete(null);
      if (viewingItem?.id === itemToDelete.id) {
        setViewingItem(null);
      }
    }
  };

  return (
    <div className="saved-page">
      {/* Title Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
          Saved Content Library
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.94rem' }}>
          Organize, review, copy, and manage your AI-generated drafts. Persisted in local browser storage.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          marginBottom: '1.75rem',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          {/* Format Tabs */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              flexWrap: 'wrap',
            }}
          >
            <Filter size={15} color="var(--text-dim)" style={{ marginRight: '4px' }} />
            {formats.map((fmt) => (
              <button
                key={fmt}
                onClick={() => setFormatFilter(fmt)}
                style={{
                  padding: '0.35rem 0.85rem',
                  borderRadius: '999px',
                  border: '1px solid',
                  borderColor: formatFilter === fmt ? 'var(--primary)' : 'var(--border-subtle)',
                  backgroundColor: formatFilter === fmt ? 'var(--primary-light)' : 'var(--bg-input)',
                  color: formatFilter === fmt ? '#a5b4fc' : 'var(--text-muted)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {fmt}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative', minWidth: '280px', flex: '1 1 280px', maxWidth: '400px' }}>
            <Search
              size={16}
              color="var(--text-dim)"
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
              }}
            />
            <input
              type="text"
              className="input-text"
              placeholder="Search saved drafts by topic or keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2.4rem' }}
            />
          </div>
        </div>
      </div>

      {/* Content List */}
      {filteredList.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">
            <BookmarkCheck size={26} />
          </div>
          <h3>
            {savedItems.length === 0
              ? 'No saved content in your library'
              : 'No matching content found'}
          </h3>
          <p>
            {savedItems.length === 0
              ? 'When you generate content in AI Studio, click "Save" to keep your scripts, carousels, and captions here.'
              : 'Try clearing your search query or switching to "All" formats.'}
          </p>
          {savedItems.length === 0 ? (
            <button
              onClick={() => navigate('/studio')}
              className="btn btn-primary btn-sm"
              style={{ marginTop: '0.75rem' }}
            >
              <Sparkles size={14} />
              <span>Go to AI Studio</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setSearchTerm('');
                setFormatFilter('All');
              }}
              className="btn btn-secondary btn-sm"
              style={{ marginTop: '0.75rem' }}
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {filteredList.map((item) => (
            <div
              key={item.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '1.5rem',
                gap: '1.25rem',
              }}
            >
              <div>
                {/* Card Header: Format badge and date */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.85rem',
                  }}
                >
                  <FormatBadge format={item.format} />
                  <span
                    style={{
                      fontSize: '0.74rem',
                      color: 'var(--text-dim)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    <Calendar size={12} />
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  </span>
                </div>

                {/* Title */}
                <h3
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: 700,
                    lineHeight: 1.35,
                    marginBottom: '0.6rem',
                    color: 'var(--text-main)',
                  }}
                >
                  {item.topic}
                </h3>

                {/* Metadata Pills */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.4rem',
                    marginBottom: '1rem',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.72rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      color: 'var(--text-muted)',
                    }}
                  >
                    Audience: <strong>{item.audience}</strong>
                  </span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      color: 'var(--text-muted)',
                    }}
                  >
                    Tone: <strong>{item.tone}</strong>
                  </span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      backgroundColor: 'rgba(99, 102, 241, 0.08)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      color: '#a5b4fc',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    <Bot size={11} />
                    <span>{item.provider}</span>
                  </span>
                </div>

                {/* Content Preview Snippet */}
                <div
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    padding: '0.85rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.82rem',
                    color: 'var(--text-muted)',
                    lineHeight: 1.5,
                    maxHeight: '100px',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <pre
                    style={{
                      fontFamily: 'var(--font-sans)',
                      whiteSpace: 'pre-wrap',
                      margin: 0,
                    }}
                  >
                    {item.content}
                  </pre>
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '35px',
                      background: 'linear-gradient(transparent, var(--bg-input))',
                    }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '0.85rem',
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                <button
                  onClick={() => setViewingItem(item)}
                  className="btn btn-secondary btn-sm"
                  title="View full generated content"
                >
                  <Eye size={14} />
                  <span>View Full</span>
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <button
                    onClick={() => onCopyContent(item.content)}
                    className="btn btn-secondary btn-sm"
                    title="Copy content to clipboard"
                  >
                    <Copy size={14} />
                    <span>Copy</span>
                  </button>

                  <button
                    onClick={() => setItemToDelete(item)}
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--accent-rose)' }}
                    title="Delete item permanently"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full Content View Modal */}
      {viewingItem && (
        <div className="modal-overlay" onClick={() => setViewingItem(null)}>
          <div
            className="modal-dialog modal-large"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FormatBadge format={viewingItem.format} />
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>{viewingItem.topic}</h3>
              </div>
              <button
                onClick={() => setViewingItem(null)}
                className="btn-ghost"
                style={{ padding: '4px' }}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div
                style={{
                  display: 'flex',
                  gap: '1rem',
                  fontSize: '0.8rem',
                  color: 'var(--text-dim)',
                  marginBottom: '1rem',
                  paddingBottom: '0.75rem',
                  borderBottom: '1px solid var(--border-subtle)',
                  flexWrap: 'wrap',
                }}
              >
                <span>Audience: <strong>{viewingItem.audience}</strong></span>
                <span>Tone: <strong>{viewingItem.tone}</strong></span>
                <span>Provider: <strong>{viewingItem.provider} ({viewingItem.model || 'default'})</strong></span>
                <span>Saved: <strong>{new Date(viewingItem.createdAt).toLocaleString()}</strong></span>
              </div>

              <pre
                style={{
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.92rem',
                  lineHeight: 1.65,
                  color: 'var(--text-main)',
                  backgroundColor: 'var(--bg-input)',
                  padding: '1.25rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {viewingItem.content}
              </pre>
            </div>

            <div className="modal-footer">
              <button
                onClick={() => onCopyContent(viewingItem.content)}
                className="btn btn-secondary btn-sm"
              >
                <Copy size={14} />
                <span>Copy Full Text</span>
              </button>
              <button
                onClick={() => setViewingItem(null)}
                className="btn btn-primary btn-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(itemToDelete)}
        title="Delete Saved Content"
        message={`Are you sure you want to delete "${itemToDelete?.topic}"? This action permanently removes this draft from your saved collection.`}
        onConfirm={confirmDelete}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
}
