import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Video,
  Layers,
  FileText,
  Smartphone,
  BookmarkCheck,
  TrendingUp,
  Clock,
  Copy,
  Trash2,
  ExternalLink,
  ArrowRight,
  Eye,
} from 'lucide-react';
import FormatBadge from '../components/FormatBadge';
import DeleteConfirmModal from '../components/DeleteConfirmModal';

export default function Dashboard({
  savedItems,
  bookmarkedIds,
  recentActivity,
  onDeleteSaved,
  onCopyContent,
  addToast,
}) {
  const navigate = useNavigate();
  const [itemToDelete, setItemToDelete] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);

  const quickActions = [
    {
      format: 'Instagram Reel',
      title: 'Generate a Reel',
      desc: 'Hooks, scene breakdown, b-roll visuals & viral caption',
      icon: Video,
      color: '#f43f5e',
      bgLight: 'rgba(244, 63, 94, 0.12)',
    },
    {
      format: 'Carousel',
      title: 'Create a Carousel',
      desc: 'Multi-slide sequence, hook title & value takeaways',
      icon: Layers,
      color: '#a855f7',
      bgLight: 'rgba(168, 85, 247, 0.12)',
    },
    {
      format: 'Caption',
      title: 'Write a Caption',
      desc: 'Engaging first line hook, body narrative & call to action',
      icon: FileText,
      color: '#06b6d4',
      bgLight: 'rgba(6, 182, 212, 0.12)',
    },
    {
      format: 'Story',
      title: 'Create a Story',
      desc: 'Interactive 3-5 frame sequence with polls & sticker ideas',
      icon: Smartphone,
      color: '#f59e0b',
      bgLight: 'rgba(245, 158, 11, 0.12)',
    },
  ];

  const handleQuickAction = (format) => {
    navigate('/studio', { state: { preselectedFormat: format } });
  };

  const handleOpenSaved = (item) => {
    setViewingItem(item);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      onDeleteSaved(itemToDelete.id);
      addToast('Item removed from your library', 'info');
      setItemToDelete(null);
      if (viewingItem?.id === itemToDelete.id) {
        setViewingItem(null);
      }
    }
  };

  return (
    <div className="dashboard-page">
      {/* Welcome Section */}
      <section
        className="card"
        style={{
          marginBottom: '2rem',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(24, 34, 52, 0.95) 100%)',
          borderColor: 'rgba(99, 102, 241, 0.25)',
          padding: '2rem 2.25rem',
        }}
      >
        <div style={{ maxWidth: '750px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.3rem 0.75rem',
              borderRadius: '999px',
              backgroundColor: 'rgba(99, 102, 241, 0.2)',
              color: '#a5b4fc',
              fontSize: '0.78rem',
              fontWeight: 600,
              marginBottom: '1rem',
            }}
          >
            <Sparkles size={14} />
            <span>AI Creator Workspace</span>
          </div>
          <h1
            style={{
              fontSize: '1.85rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              marginBottom: '0.6rem',
              color: '#ffffff',
            }}
          >
            Welcome to CreatorSpace AI
          </h1>
          <p
            style={{
              fontSize: '0.98rem',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              marginBottom: '1.25rem',
            }}
          >
            Transform concepts and trending topics into viral social media content.
            Generate format-ready Instagram Reels, educational Carousels, high-converting Captions, and interactive Stories with Google Gemini or private local Ollama AI.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/studio')}
              className="btn btn-primary"
              style={{ padding: '0.7rem 1.4rem' }}
            >
              <Sparkles size={16} />
              <span>Open AI Studio</span>
            </button>
            <button
              onClick={() => navigate('/trends')}
              className="btn btn-secondary"
              style={{ padding: '0.7rem 1.4rem' }}
            >
              <TrendingUp size={16} />
              <span>Explore Trends</span>
            </button>
          </div>
        </div>
      </section>

      {/* Workspace Overview Stats */}
      <section style={{ marginBottom: '2rem' }}>
        <h3
          style={{
            fontSize: '1rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-dim)',
            marginBottom: '1rem',
          }}
        >
          Workspace Overview
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '1.25rem',
          }}
        >
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <BookmarkCheck size={24} />
            </div>
            <div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, lineHeight: 1.1 }}>
                {savedItems.length}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Total Saved Content
              </div>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: 'rgba(6, 182, 212, 0.15)',
                color: 'var(--accent-cyan)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TrendingUp size={24} />
            </div>
            <div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, lineHeight: 1.1 }}>
                {bookmarkedIds.length}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Bookmarked Trends
              </div>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--accent-emerald)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock size={24} />
            </div>
            <div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, lineHeight: 1.1 }}>
                {recentActivity.length}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Recent Activities
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h3
          style={{
            fontSize: '1rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-dim)',
            marginBottom: '1rem',
          }}
        >
          Quick Actions
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1rem',
          }}
        >
          {quickActions.map((qa) => {
            const Icon = qa.icon;
            return (
              <div
                key={qa.format}
                className="card"
                onClick={() => handleQuickAction(qa.format)}
                style={{
                  cursor: 'pointer',
                  padding: '1.35rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      backgroundColor: qa.bgLight,
                      color: qa.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={20} />
                  </div>
                  <ArrowRight size={16} color="var(--text-dim)" />
                </div>
                <div>
                  <h4 style={{ fontSize: '1.02rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                    {qa.title}
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                    {qa.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent Activity / Content */}
      <section>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
          }}
        >
          <h3
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--text-dim)',
            }}
          >
            Recent Generated & Saved Content
          </h3>
          {savedItems.length > 0 && (
            <button
              onClick={() => navigate('/saved')}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '0.82rem' }}
            >
              <span>View All Saved</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>

        {savedItems.length === 0 ? (
          <div className="card empty-state">
            <div className="empty-state-icon">
              <Sparkles size={24} />
            </div>
            <h3>No content saved yet</h3>
            <p>
              Jump into the AI Studio to generate your first Instagram Reel, Carousel, or Caption, and save your favorite drafts here!
            </p>
            <button
              onClick={() => navigate('/studio')}
              className="btn btn-primary btn-sm"
              style={{ marginTop: '0.5rem' }}
            >
              <Sparkles size={14} />
              <span>Start Generating in AI Studio</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {savedItems.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="card"
                style={{
                  padding: '1.1rem 1.4rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '240px' }}>
                  <FormatBadge format={item.format} />
                  <div>
                    <h4
                      style={{
                        fontSize: '0.98rem',
                        fontWeight: 600,
                        color: 'var(--text-main)',
                        marginBottom: '0.2rem',
                      }}
                    >
                      {item.topic}
                    </h4>
                    <div style={{ display: 'flex', gap: '0.6rem', fontSize: '0.76rem', color: 'var(--text-dim)' }}>
                      <span>Audience: {item.audience}</span>
                      <span>•</span>
                      <span>Tone: {item.tone}</span>
                      <span>•</span>
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleOpenSaved(item)}
                    className="btn btn-secondary btn-sm"
                    title="View full generated content"
                  >
                    <Eye size={14} />
                    <span>View</span>
                  </button>
                  <button
                    onClick={() => onCopyContent(item.content)}
                    className="btn btn-secondary btn-sm"
                    title="Copy full text to clipboard"
                  >
                    <Copy size={14} />
                    <span>Copy</span>
                  </button>
                  <button
                    onClick={() => setItemToDelete(item)}
                    className="btn btn-ghost btn-sm"
                    title="Delete item"
                    style={{ color: 'var(--accent-rose)' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* View Full Content Modal */}
      {viewingItem && (
        <div className="modal-overlay" onClick={() => setViewingItem(null)}>
          <div
            className="modal-dialog modal-large"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FormatBadge format={viewingItem.format} />
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{viewingItem.topic}</h3>
              </div>
              <button onClick={() => setViewingItem(null)} className="btn-ghost" style={{ padding: '4px' }}>
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
                }}
              >
                <span>Audience: <strong>{viewingItem.audience}</strong></span>
                <span>Tone: <strong>{viewingItem.tone}</strong></span>
                <span>Provider: <strong>{viewingItem.provider} ({viewingItem.model || 'default'})</strong></span>
              </div>
              <pre
                style={{
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.92rem',
                  lineHeight: 1.6,
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
        title="Delete Content Draft"
        message={`Are you sure you want to delete "${itemToDelete?.topic}"? This saved draft will be permanently removed from your browser storage.`}
        onConfirm={confirmDelete}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
}
