'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { Platform, Tone } from '@/types';

interface HookFormProps {
  topic: string;
  setTopic: (val: string) => void;
  audience: string;
  setAudience: (val: string) => void;
  platform: Platform;
  setPlatform: (val: Platform) => void;
  tone: Tone;
  setTone: (val: Tone) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}

const PLATFORMS: Platform[] = [
  'Instagram',
  'YouTube',
  'LinkedIn',
  'X/Twitter',
  'TikTok',
];

const TONES: Tone[] = [
  'Bold',
  'Professional',
  'Funny',
  'Educational',
  'Emotional',
];

export const HookForm: React.FC<HookFormProps> = ({
  topic,
  setTopic,
  audience,
  setAudience,
  platform,
  setPlatform,
  tone,
  setTone,
  onSubmit,
  isLoading,
}) => {
  return (
    <form
      onSubmit={onSubmit}
      className="glass-panel"
      id="hook-generator-form"
      style={{
        padding: '32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        background: 'rgba(15, 20, 32, 0.65)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
      }}
    >
      {/* Topic Input */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label
          htmlFor="topic-input"
          style={{
            fontSize: '0.9rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
          }}
        >
          Topic
        </label>
        <textarea
          id="topic-input"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter your topic or core message..."
          className="input-field"
          style={{ height: '90px', fontSize: '0.95rem' }}
          required
          disabled={isLoading}
        />
      </div>

      {/* Target Audience Input */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label
          htmlFor="audience-input"
          style={{
            fontSize: '0.9rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
          }}
        >
          Target Audience
        </label>
        <input
          id="audience-input"
          type="text"
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          placeholder="e.g. Founders, students, creators"
          className="input-field"
          disabled={isLoading}
        />
      </div>

      {/* Platform & Tone Selectors */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
        }}
      >
        {/* Platform Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label
            style={{
              fontSize: '0.9rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
            }}
          >
            Platform
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {PLATFORMS.map((item) => {
              const isSelected = platform === item;
              return (
                <button
                  key={item}
                  type="button"
                  id={`platform-btn-${item.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  onClick={() => setPlatform(item)}
                  disabled={isLoading}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: isSelected ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: isSelected
                      ? '1px solid var(--accent-primary)'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                    background: isSelected
                      ? 'rgba(99, 102, 241, 0.2)'
                      : 'rgba(255, 255, 255, 0.03)',
                    color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                  }}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tone Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label
            style={{
              fontSize: '0.9rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
            }}
          >
            Tone
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {TONES.map((item) => {
              const isSelected = tone === item;
              return (
                <button
                  key={item}
                  type="button"
                  id={`tone-btn-${item.toLowerCase()}`}
                  onClick={() => setTone(item)}
                  disabled={isLoading}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: isSelected ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: isSelected
                      ? '1px solid var(--accent-primary)'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                    background: isSelected
                      ? 'rgba(99, 102, 241, 0.2)'
                      : 'rgba(255, 255, 255, 0.03)',
                    color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                  }}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Generate CTA Button */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
        <button
          type="submit"
          id="generate-hooks-button"
          disabled={isLoading || !topic.trim()}
          className="btn-primary"
          style={{
            width: '100%',
            maxWidth: '320px',
            padding: '14px 28px',
            fontSize: '1rem',
          }}
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <span>Generate 10 Hooks</span>
          )}
        </button>
      </div>
    </form>
  );
};
