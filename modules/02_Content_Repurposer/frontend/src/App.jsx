import React, { useState } from 'react';
import { Briefcase, Camera, MessageCircle, MonitorPlay, Loader2, Copy, CheckCircle2, RotateCcw, AlertCircle } from 'lucide-react';
import './index.css';

const PLATFORMS = [
  { id: 'linkedin', label: 'LinkedIn', icon: Briefcase },
  { id: 'instagram', label: 'Instagram', icon: Camera },
  { id: 'x', label: 'X (Twitter)', icon: MessageCircle },
  { id: 'youtube', label: 'YouTube', icon: MonitorPlay }
];

const TONES = ['Professional', 'Casual', 'Educational', 'Storytelling', 'Engaging'];

function App() {
  const [content, setContent] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState(
    PLATFORMS.reduce((acc, p) => ({ ...acc, [p.id]: true }), {})
  );
  const [tone, setTone] = useState('Professional');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [copiedStates, setCopiedStates] = useState({});

  const togglePlatform = (id) => {
    setSelectedPlatforms(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleGenerate = async () => {
    setError(null);
    setResults(null);
    setCopiedStates({});

    if (!content.trim()) {
      setError("Please enter some content to repurpose.");
      return;
    }

    const activePlatforms = Object.keys(selectedPlatforms).filter(k => selectedPlatforms[k]);
    if (activePlatforms.length === 0) {
      setError("Please select at least one platform.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          platforms: activePlatforms,
          tone: tone.toLowerCase()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "An error occurred while generating content.");
      }

      setResults(data);
    } catch (err) {
      setError(err.message || "Failed to connect to the backend server. Is it running?");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id, textToCopy) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedStates(prev => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setCopiedStates(prev => ({ ...prev, [id]: false }));
    }, 2000);
  };

  const handleClear = () => {
    setContent('');
    setResults(null);
    setError(null);
    setCopiedStates({});
  };

  const handleEditResult = (id, field, newValue) => {
    setResults(prev => {
      const updated = { ...prev };
      if (id === 'youtube') {
        updated.youtube = { ...updated.youtube, [field]: newValue };
      } else {
        updated[id] = newValue;
      }
      return updated;
    });
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Content Repurposer</h1>
        <p>Turn one idea into optimized content for every platform.</p>
      </header>

      <main>
        <div className="card">
          {error && (
            <div className="error-message">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <div className="textarea-container">
            <h3 className="section-title">Your Content</h3>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste your content or idea here..."
              disabled={loading}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h3 className="section-title">Select Platforms</h3>
            <div className="options-grid">
              {PLATFORMS.map(({ id, label, icon: Icon }) => (
                <div
                  key={id}
                  className={`checkbox-card ${selectedPlatforms[id] ? 'selected' : ''}`}
                  onClick={() => !loading && togglePlatform(id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedPlatforms[id]}
                    readOnly
                  />
                  <Icon className="icon" size={20} />
                  <span className="label-text">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h3 className="section-title">Writing Tone</h3>
            <select
              className="tone-select"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              disabled={loading}
            >
              {TONES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <button
            className="btn-primary"
            onClick={handleGenerate}
            disabled={loading || !content.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="spinner" size={24} />
                Generating Content...
              </>
            ) : (
              'Generate Content'
            )}
          </button>
        </div>

        {results && (
          <div className="results-section">
            <div className="results-header">
              <h2>Generated Content</h2>
              <button className="btn-secondary" onClick={handleClear}>
                <RotateCcw size={16} />
                Start Over
              </button>
            </div>

            {Object.keys(results).map(platform => {
              if (!results[platform]) return null;
              
              const platformInfo = PLATFORMS.find(p => p.id === platform);
              if (!platformInfo) return null;
              
              const Icon = platformInfo.icon;
              const isCopied = copiedStates[platform];
              
              // Handle YouTube object vs string for others
              const isYouTube = platform === 'youtube';
              let copyText = '';
              
              if (isYouTube) {
                const yt = results.youtube;
                copyText = `TITLE: ${yt.title}\n\nDESCRIPTION:\n${yt.description}\n\nTAGS: ${Array.isArray(yt.tags) ? yt.tags.join(', ') : yt.tags}\n\nOUTLINE:\n${Array.isArray(yt.outline) ? yt.outline.join('\n') : yt.outline}`;
              } else {
                copyText = results[platform];
              }

              return (
                <div key={platform} className="card result-card">
                  <div className="result-card-header">
                    <div className="result-platform-title">
                      <Icon size={24} style={{ color: 'var(--primary-color)' }} />
                      {platformInfo.label}
                    </div>
                    <button
                      className={`btn-secondary ${isCopied ? 'success' : ''}`}
                      onClick={() => handleCopy(platform, copyText)}
                    >
                      {isCopied ? (
                        <>
                          <CheckCircle2 size={16} /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={16} /> Copy
                        </>
                      )}
                    </button>
                  </div>

                  {isYouTube ? (
                    <div>
                      <div className="yt-section">
                        <div className="yt-label">Video Title</div>
                        <div
                          className="result-content-box"
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => handleEditResult('youtube', 'title', e.target.innerText)}
                        >
                          {results.youtube.title}
                        </div>
                      </div>
                      
                      <div className="yt-section">
                        <div className="yt-label">Description</div>
                        <div
                          className="result-content-box"
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => handleEditResult('youtube', 'description', e.target.innerText)}
                        >
                          {results.youtube.description}
                        </div>
                      </div>

                      <div className="yt-section">
                        <div className="yt-label">Suggested Tags</div>
                        <div
                          className="result-content-box"
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            const val = e.target.innerText.split(',').map(s => s.trim());
                            handleEditResult('youtube', 'tags', val);
                          }}
                        >
                          {Array.isArray(results.youtube.tags) ? results.youtube.tags.join(', ') : results.youtube.tags}
                        </div>
                      </div>
                      
                      <div className="yt-section">
                        <div className="yt-label">Video Outline</div>
                        <div
                          className="result-content-box"
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => handleEditResult('youtube', 'outline', e.target.innerText)}
                        >
                          {Array.isArray(results.youtube.outline) ? results.youtube.outline.join('\n') : results.youtube.outline}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div
                        className="result-content-box"
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => handleEditResult(platform, null, e.target.innerText)}
                      >
                        {results[platform]}
                      </div>
                      <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {results[platform].length} characters
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
