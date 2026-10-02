'use client';

import React, { useState } from 'react';
import { HookForm } from '@/components/HookForm';
import { ResultsSection } from '@/components/ResultsSection';
import { Platform, Tone, HookItem } from '@/types';
import { AlertCircle, X } from 'lucide-react';

export default function HomePage() {
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('');
  const [platform, setPlatform] = useState<Platform>('LinkedIn');
  const [tone, setTone] = useState<Tone>('Bold');

  const [hooks, setHooks] = useState<HookItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGenerate = async (e?: React.FormEvent, isRegen = false) => {
    if (e) {
      e.preventDefault();
    }

    if (!topic.trim()) {
      setErrorMessage('Please enter a topic to generate hooks.');
      return;
    }

    if (isRegen) {
      setIsRegenerating(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage(null);

    try {
      const response = await fetch('/api/generate-hooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: topic.trim(),
          audience: audience.trim() || undefined,
          platform,
          tone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate hooks. Please try again.');
      }

      if (!data.hooks || !Array.isArray(data.hooks) || data.hooks.length === 0) {
        throw new Error('Received invalid hooks data from server. Please try again.');
      }

      setHooks(data.hooks);

      if (!isRegen) {
        setTimeout(() => {
          const resultsEl = document.getElementById('results-section');
          if (resultsEl) {
            resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 150);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'An unexpected network error occurred. Please verify your connection.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
      setIsRegenerating(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <main
        className="container"
        style={{
          flex: 1,
          maxWidth: '760px',
          paddingTop: '60px',
          paddingBottom: '80px',
        }}
      >
        {/* Clean Page Title */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <h1
            id="main-heading"
            style={{
              fontSize: '2.5rem',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: '#ffffff',
              margin: 0,
            }}
          >
            Hook Generator
          </h1>
        </div>

        {/* Error Notification Banner */}
        {errorMessage && (
          <div
            role="alert"
            id="error-banner"
            style={{
              marginBottom: '24px',
              padding: '14px 18px',
              borderRadius: '12px',
              background: 'var(--error-bg)',
              border: '1px solid var(--error-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle size={18} color="var(--error)" style={{ flexShrink: 0 }} />
              <p style={{ fontSize: '0.9rem', color: '#fca5a5', margin: 0 }}>
                {errorMessage}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              aria-label="Dismiss error"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fca5a5',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Inputs */}
        <HookForm
          topic={topic}
          setTopic={setTopic}
          audience={audience}
          setAudience={setAudience}
          platform={platform}
          setPlatform={setPlatform}
          tone={tone}
          setTone={setTone}
          onSubmit={(e) => handleGenerate(e, false)}
          isLoading={isLoading}
        />

        {/* Results */}
        {hooks.length > 0 && (
          <ResultsSection
            hooks={hooks}
            topic={topic}
            platform={platform}
            tone={tone}
            onRegenerate={() => handleGenerate(undefined, true)}
            isRegenerating={isRegenerating}
          />
        )}
      </main>
    </div>
  );
}
