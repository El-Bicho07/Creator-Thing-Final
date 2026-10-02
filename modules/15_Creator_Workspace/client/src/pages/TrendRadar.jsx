import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Search,
  Bookmark,
  BookmarkCheck,
  Sparkles,
  ArrowRight,
  Info,
  Tag,
  Filter,
  Bot,
  Zap,
  RefreshCw,
  Flame,
  Radio,
  Compass,
} from 'lucide-react';
import { SAMPLE_TRENDS, TREND_CATEGORIES } from '../data/sampleTrends';
import { scoutTrends } from '../services/api';

export default function TrendRadar({
  bookmarkedIds,
  onToggleBookmark,
  addToast,
}) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'bookmarked'

  // Agent 1: Trend Scout State
  const [scoutNiche, setScoutNiche] = useState('AI Tools & Productivity');
  const [scoutPlatform, setScoutPlatform] = useState('Instagram Reels');
  const [isScouting, setIsScouting] = useState(false);
  const [scoutedTrends, setScoutedTrends] = useState([]);
  const [scoutError, setScoutError] = useState(null);

  // Agent 1 Handler
  const handleScout = async () => {
    if (!scoutNiche.trim()) {
      addToast('Please enter a niche or topic to scout!', 'error');
      return;
    }

    setIsScouting(true);
    setScoutError(null);

    try {
      const data = await scoutTrends({
        niche: scoutNiche.trim(),
        platform: scoutPlatform,
        audience: 'Creators, Founders & Professionals',
      });

      if (data && data.trends) {
        setScoutedTrends(data.trends);
        addToast(`Agent 1 scouted ${data.trends.length} fresh trends for "${scoutNiche}"!`, 'success');
      }
    } catch (err) {
      console.error('Trend Scout Error:', err);
      setScoutError(err.message || 'Failed to scout trends');
      addToast(err.message || 'Trend scouting failed', 'error');
    } finally {
      setIsScouting(false);
    }
  };

  // Filtering
  const filteredTrends = SAMPLE_TRENDS.filter((trend) => {
    const matchesCategory =
      selectedCategory === 'All' || trend.category === selectedCategory;

    const matchesSearch =
      trend.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trend.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trend.suggestedAngle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trend.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesBookmarkTab =
      activeTab === 'all' || bookmarkedIds.includes(trend.id);

    return matchesCategory && matchesSearch && matchesBookmarkTab;
  });

  const handleCreateFromTrend = (trend) => {
    navigate('/studio', {
      state: {
        preselectedTopic: `${trend.title}: ${trend.suggestedAngle}`,
        preselectedFormat: trend.recommendedFormat || 'Instagram Reel',
      },
    });
    addToast(`Loaded trend "${trend.title}" into AI Studio!`, 'info');
  };

  const handleToggle = (trend) => {
    const isNowBookmarked = !bookmarkedIds.includes(trend.id);
    onToggleBookmark(trend.id);
    addToast(
      isNowBookmarked ? `Bookmarked "${trend.title}"` : `Removed bookmark`,
      'info'
    );
  };

  return (
    <div className="trends-page">
      {/* Page Title & Explanation */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
            Trend Radar
          </h1>
          <span
            style={{
              padding: '0.2rem 0.6rem',
              borderRadius: '999px',
              backgroundColor: 'rgba(6, 182, 212, 0.12)',
              border: '1px solid rgba(6, 182, 212, 0.25)',
              color: 'var(--accent-cyan)',
              fontSize: '0.72rem',
              fontWeight: 600,
            }}
          >
            Curated Industry Dataset
          </span>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.94rem' }}>
          Explore curated content angles and high-performing narratives. Bookmark compelling concepts or click <strong>Create Content From Trend</strong> to load them straight into the AI Studio.
        </p>
      </div>

      {/* Agent 1: Real-Time AI Trend Scout Card */}
      <div
        className="card"
        style={{
          marginBottom: '2rem',
          padding: '1.5rem',
          borderColor: 'rgba(6, 182, 212, 0.35)',
          background: 'linear-gradient(135deg, rgba(14, 22, 38, 0.95), rgba(17, 24, 39, 0.95))',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {/* Card Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: 'rgba(6, 182, 212, 0.15)',
                color: 'var(--accent-cyan)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bot size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  Agent 1: Real-Time Trend Scout
                </h3>
                <span
                  style={{
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                    backgroundColor: 'rgba(99, 102, 241, 0.2)',
                    color: '#c7d2fe',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                  }}
                >
                  Gemini 3.5 AI
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Autonomously detect breakout hooks, viral velocity angles, and format opportunities tailored to your niche.
              </p>
            </div>
          </div>
        </div>

        {/* Input Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 200px auto',
              gap: '0.75rem',
              alignItems: 'center',
            }}
            className="scout-controls-grid"
          >
            <div>
              <input
                type="text"
                className="input-text"
                placeholder="Enter niche or topic (e.g. AI Tools, SaaS, Fitness, Personal Finance)..."
                value={scoutNiche}
                onChange={(e) => setScoutNiche(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleScout();
                }}
              />
            </div>

            <div>
              <select
                className="input-text"
                value={scoutPlatform}
                onChange={(e) => setScoutPlatform(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                <option value="Instagram Reels">Instagram Reels</option>
                <option value="TikTok">TikTok</option>
                <option value="YouTube Shorts">YouTube Shorts</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Carousels">Carousels</option>
              </select>
            </div>

            <button
              onClick={handleScout}
              disabled={isScouting}
              className="btn btn-primary"
              style={{
                padding: '0.75rem 1.25rem',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              {isScouting ? (
                <>
                  <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Scouting...</span>
                </>
              ) : (
                <>
                  <Zap size={16} />
                  <span>Scout Trends (Agent 1)</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Niche Suggestion Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>Try niche:</span>
            {[
              'AI Tools & Automation',
              'Creator Economy',
              'Personal Finance',
              'Software Dev & Tech',
              'Fitness & Biohacking',
              'E-Commerce & Dropshipping',
            ].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setScoutNiche(preset)}
                style={{
                  fontSize: '0.74rem',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '6px',
                  backgroundColor: scoutNiche === preset ? 'rgba(6, 182, 212, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                  border: scoutNiche === preset ? '1px solid rgba(6, 182, 212, 0.4)' : '1px solid var(--border-subtle)',
                  color: scoutNiche === preset ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                + {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Loading Radar */}
        {isScouting && (
          <div
            style={{
              padding: '2.5rem 1.5rem',
              textAlign: 'center',
              marginTop: '1.25rem',
              borderRadius: '10px',
              backgroundColor: 'rgba(6, 182, 212, 0.05)',
              border: '1px solid rgba(6, 182, 212, 0.15)',
            }}
          >
            <Compass size={28} style={{ animation: 'spin 2s linear infinite', color: 'var(--accent-cyan)', margin: '0 auto 0.75rem' }} />
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
              Agent 1 is Scouting Real-Time Trends for "{scoutNiche}"...
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              Querying Google Gemini 3.5 Flash for emerging hooks, viral velocity scores, and format-specific angles.
            </p>
          </div>
        )}

        {/* Scouted Trends Results */}
        {!isScouting && scoutedTrends.length > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
                paddingBottom: '0.5rem',
                borderBottom: '1px solid rgba(6, 182, 212, 0.2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Flame size={18} color="var(--accent-amber)" />
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Live Intelligence: {scoutedTrends.length} Emerging Trends Detected
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                Targeting: {scoutPlatform}
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '1rem',
              }}
            >
              {scoutedTrends.map((t, idx) => {
                const isBookmarked = bookmarkedIds.includes(t.id);
                return (
                  <div
                    key={t.id || idx}
                    style={{
                      padding: '1.25rem',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(14, 22, 38, 0.85)',
                      border: '1px solid rgba(6, 182, 212, 0.3)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '1rem',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '999px',
                            backgroundColor: 'rgba(245, 158, 11, 0.15)',
                            color: 'var(--accent-amber)',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                          }}
                        >
                          {t.momentum || '🔥 Viral Velocity'}
                        </span>

                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: 'var(--accent-cyan)',
                          }}
                        >
                          Score: {t.viralScore || 95}/100
                        </span>
                      </div>

                      <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.4rem', lineHeight: 1.35 }}>
                        {t.title}
                      </h4>

                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.45, marginBottom: '0.75rem' }}>
                        {t.description}
                      </p>

                      {/* Suggested Creative Angle */}
                      <div
                        style={{
                          padding: '0.75rem',
                          borderRadius: '8px',
                          backgroundColor: 'rgba(99, 102, 241, 0.08)',
                          border: '1px solid rgba(99, 102, 241, 0.2)',
                          fontSize: '0.78rem',
                          color: '#c7d2fe',
                          lineHeight: 1.4,
                        }}
                      >
                        <strong style={{ color: 'var(--accent-cyan)' }}>Creative Angle: </strong>
                        {t.suggestedAngle}
                      </div>

                      {/* Tags */}
                      {t.tags && t.tags.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.65rem' }}>
                          {t.tags.map((tag, tIdx) => (
                            <span
                              key={tIdx}
                              style={{
                                fontSize: '0.68rem',
                                padding: '0.15rem 0.45rem',
                                borderRadius: '4px',
                                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                                color: 'var(--text-dim)',
                              }}
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                      <button
                        onClick={() => handleCreateFromTrend(t)}
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1, justifyContent: 'center' }}
                      >
                        <span>Create in AI Studio (Agent 2)</span>
                        <ArrowRight size={13} />
                      </button>

                      <button
                        onClick={() => handleToggle(t)}
                        className="btn btn-secondary btn-sm"
                        title={isBookmarked ? 'Remove bookmark' : 'Bookmark this trend'}
                        style={isBookmarked ? { borderColor: 'var(--accent-amber)', color: 'var(--accent-amber)' } : {}}
                      >
                        {isBookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Transparency Note */}
      <div
        className="card"
        style={{
          marginBottom: '1.75rem',
          padding: '0.9rem 1.25rem',
          backgroundColor: 'rgba(99, 102, 241, 0.05)',
          borderColor: 'rgba(99, 102, 241, 0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.84rem',
          color: 'var(--text-muted)',
        }}
      >
        <Info size={18} color="var(--primary)" style={{ flexShrink: 0 }} />
        <span>
          <strong>Notice:</strong> This radar currently surfaces a vetted, regularly updated sample dataset of high-velocity creator trends and viral storytelling angles.
        </span>
      </div>

      {/* Tabs & Search Controls */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          marginBottom: '1.75rem',
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
          {/* Main Tab Toggle */}
          <div
            style={{
              display: 'flex',
              backgroundColor: 'var(--bg-input)',
              padding: '4px',
              borderRadius: '10px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <button
              onClick={() => setActiveTab('all')}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === 'all' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'all' ? 'white' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.84rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              All Trends ({SAMPLE_TRENDS.length})
            </button>
            <button
              onClick={() => setActiveTab('bookmarked')}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === 'bookmarked' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'bookmarked' ? 'white' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.84rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <BookmarkCheck size={14} />
              <span>Bookmarked ({bookmarkedIds.length})</span>
            </button>
          </div>

          {/* Search Box */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '340px',
            }}
          >
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
              placeholder="Search trends, tags, keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2.4rem' }}
            />
          </div>
        </div>

        {/* Category Pills */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            overflowX: 'auto',
            paddingBottom: '0.25rem',
          }}
        >
          <Filter size={15} color="var(--text-dim)" style={{ flexShrink: 0 }} />
          {TREND_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '0.35rem 0.85rem',
                borderRadius: '999px',
                border: '1px solid',
                borderColor: selectedCategory === cat ? 'var(--primary)' : 'var(--border-subtle)',
                backgroundColor: selectedCategory === cat ? 'var(--primary-light)' : 'var(--bg-input)',
                color: selectedCategory === cat ? '#a5b4fc' : 'var(--text-muted)',
                fontSize: '0.8rem',
                fontWeight: 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Trend Grid */}
      {filteredTrends.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">
            <TrendingUp size={24} />
          </div>
          <h3>No trends matched your filter</h3>
          <p>
            {activeTab === 'bookmarked'
              ? 'You have not bookmarked any trends yet. Switch to "All Trends" and click the bookmark icon on any trend card.'
              : 'Try searching with different keywords or reset the category filter.'}
          </p>
          {(searchTerm || selectedCategory !== 'All' || activeTab !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('All');
                setActiveTab('all');
              }}
              className="btn btn-secondary btn-sm"
              style={{ marginTop: '0.5rem' }}
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {filteredTrends.map((trend) => {
            const isBookmarked = bookmarkedIds.includes(trend.id);
            return (
              <div
                key={trend.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '1.5rem',
                  gap: '1.25rem',
                  position: 'relative',
                }}
              >
                <div>
                  {/* Top Bar: Category & Bookmark */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        color: 'var(--primary)',
                        backgroundColor: 'var(--primary-light)',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '6px',
                      }}
                    >
                      {trend.category}
                    </span>

                    <button
                      onClick={() => handleToggle(trend)}
                      className="btn-ghost"
                      style={{
                        padding: '6px',
                        borderRadius: '8px',
                        color: isBookmarked ? 'var(--accent-amber)' : 'var(--text-dim)',
                      }}
                      title={isBookmarked ? 'Remove bookmark' : 'Bookmark trend'}
                    >
                      {isBookmarked ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
                    </button>
                  </div>

                  {/* Title & Velocity */}
                  <h3
                    style={{
                      fontSize: '1.15rem',
                      fontWeight: 700,
                      lineHeight: 1.35,
                      marginBottom: '0.5rem',
                      color: 'var(--text-main)',
                    }}
                  >
                    {trend.title}
                  </h3>

                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-dim)',
                      marginBottom: '0.85rem',
                    }}
                  >
                    {trend.popularity}
                  </div>

                  {/* Description */}
                  <p
                    style={{
                      fontSize: '0.88rem',
                      color: 'var(--text-muted)',
                      lineHeight: 1.55,
                      marginBottom: '1rem',
                    }}
                  >
                    {trend.description}
                  </p>

                  {/* Suggested Angle Callout */}
                  <div
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '0.85rem 1rem',
                      marginBottom: '1rem',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: '#a5b4fc',
                        marginBottom: '0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <Sparkles size={12} />
                      <span>Suggested Content Angle</span>
                    </div>
                    <p style={{ fontSize: '0.84rem', color: 'var(--text-main)', lineHeight: 1.45 }}>
                      "{trend.suggestedAngle}"
                    </p>
                  </div>

                  {/* Tags */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {trend.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: '0.72rem',
                          color: 'var(--text-dim)',
                          backgroundColor: 'rgba(255, 255, 255, 0.03)',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                      >
                        <Tag size={10} />
                        <span>#{tag}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Action */}
                <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                  <button
                    onClick={() => handleCreateFromTrend(trend)}
                    className="btn btn-secondary"
                    style={{ width: '100%', justifyContent: 'space-between', fontSize: '0.86rem' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Sparkles size={15} color="var(--primary)" />
                      <strong>Create Content From Trend</strong>
                    </span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
