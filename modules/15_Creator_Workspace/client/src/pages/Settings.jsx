import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Sparkles,
  Save,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

export default function Settings({
  preferences,
  onSavePreferences,
  addToast,
}) {
  const [formData, setFormData] = useState({
    defaultFormat: preferences?.defaultFormat || 'Instagram Reel',
    preferredTone: preferences?.preferredTone || 'Educational',
    preferredAudience: preferences?.preferredAudience || 'Content Creators',
  });

  const handleSave = (e) => {
    e.preventDefault();
    onSavePreferences(formData);
    addToast('Preferences saved successfully!', 'success');
  };

  return (
    <div className="settings-page" style={{ maxWidth: '880px' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
          Workspace Settings
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.94rem' }}>
          Configure Google Gemini AI parameters, audience defaults, and preferred content tones.
        </p>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        {/* Card: Google Gemini Engine Status */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.85rem' }}>
            <Sparkles size={20} color="var(--accent-cyan)" />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
              AI Generation Engine
            </h2>
          </div>

          <div
            style={{
              padding: '1.25rem',
              backgroundColor: 'var(--bg-input)',
              borderRadius: '10px',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span
                  style={{
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--accent-emerald)',
                    boxShadow: '0 0 8px rgba(16, 185, 129, 0.5)',
                  }}
                />
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Google Gemini 3.5 Flash Lite
                </span>
              </div>
              <span
                style={{
                  fontSize: '0.74rem',
                  padding: '0.2rem 0.65rem',
                  borderRadius: '999px',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  color: 'var(--accent-emerald)',
                  fontWeight: 600,
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                }}
              >
                ● Connected & Active
              </span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
              All social media content (Reels, Carousels, Captions, Stories) is generated directly via Google's high-speed multimodal Gemini models with automatic failover.
            </p>
          </div>

          {/* Security Note */}
          <div
            style={{
              padding: '1rem 1.25rem',
              backgroundColor: 'rgba(99, 102, 241, 0.05)',
              borderRadius: '10px',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
            }}
          >
            <ShieldCheck size={20} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--text-main)' }}>Secure API Key Management:</strong>
              <p style={{ marginTop: '0.2rem' }}>
                Your Gemini API key is stored securely in the backend environment file (<code style={{ color: '#a5b4fc', fontFamily: 'var(--font-mono)' }}>server/.env</code>).
                API keys are never exposed in browser network responses or client JavaScript bundles.
              </p>
              <a
                href="https://aistudio.google.com/"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  color: 'var(--accent-cyan)',
                  marginTop: '0.4rem',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                <span>Google AI Studio Key Management</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>

        {/* Card: Content Creation Preferences */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.85rem' }}>
            <SettingsIcon size={20} color="var(--accent-purple)" />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
              Content Preferences & Defaults
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Default Content Format</label>
              <select
                className="input-select"
                value={formData.defaultFormat}
                onChange={(e) => setFormData({ ...formData, defaultFormat: e.target.value })}
              >
                <option value="Instagram Reel">Instagram Reel</option>
                <option value="Carousel">Carousel</option>
                <option value="Caption">Caption</option>
                <option value="Story">Story</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Preferred Writing Tone</label>
              <select
                className="input-select"
                value={formData.preferredTone}
                onChange={(e) => setFormData({ ...formData, preferredTone: e.target.value })}
              >
                <option value="Educational">Educational</option>
                <option value="Conversational">Conversational</option>
                <option value="Professional">Professional</option>
                <option value="Creative">Creative</option>
                <option value="Friendly">Friendly</option>
                <option value="Humorous">Humorous</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Preferred Target Audience</label>
              <input
                type="text"
                className="input-text"
                value={formData.preferredAudience}
                onChange={(e) => setFormData({ ...formData, preferredAudience: e.target.value })}
                placeholder="e.g. Content Creators, Beginners..."
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ padding: '0.75rem 1.75rem', fontSize: '0.94rem' }}
          >
            <Save size={16} />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
}
