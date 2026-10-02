'use client';

import React, { useState } from 'react';
import { Copy, Check, RotateCw } from 'lucide-react';
import { HookItem, Platform, Tone } from '@/types';
import { HookCard } from './HookCard';

interface ResultsSectionProps {
  hooks: HookItem[];
  topic: string;
  platform: Platform;
  tone: Tone;
  onRegenerate: () => void;
  isRegenerating: boolean;
}

export const ResultsSection: React.FC<ResultsSectionProps> = ({
  hooks,
  topic,
  platform,
  tone,
  onRegenerate,
  isRegenerating,
}) => {
  const [copiedAll, setCopiedAll] = useState(false);

  const handleCopyAll = async () => {
    const formatted = hooks
      .map((h, i) => `${String(i + 1).padStart(2, '0')}. [${h.style.toUpperCase()}]\n"${h.hook}"`)
      .join('\n\n');

    const header = `=== HOOKS ===\nTopic: ${topic}\nPlatform: ${platform} | Tone: ${tone}\n\n`;
    const fullText = header + formatted;

    try {
      await navigator.clipboard.writeText(fullText);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2200);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = fullText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2200);
    }
  };

  return (
    <section
      id="results-section"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        marginTop: '40px',
      }}
    >
      {/* Top Bar: Clean Title & Action Buttons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <h2
          style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#ffffff',
            margin: 0,
            letterSpacing: '-0.01em',
          }}
        >
          Generated Hooks
        </h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            id="copy-all-button"
            onClick={handleCopyAll}
            className="btn-secondary"
            style={{
              padding: '8px 14px',
              fontSize: '0.85rem',
              color: copiedAll ? '#34d399' : 'var(--text-primary)',
              borderColor: copiedAll ? 'rgba(52, 211, 153, 0.4)' : 'var(--border-subtle)',
            }}
          >
            {copiedAll ? (
              <>
                <Check size={15} color="#34d399" />
                <span>Copied All</span>
              </>
            ) : (
              <>
                <Copy size={15} />
                <span>Copy All</span>
              </>
            )}
          </button>

          <button
            type="button"
            id="regenerate-button"
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="btn-secondary"
            style={{
              padding: '8px 14px',
              fontSize: '0.85rem',
            }}
          >
            <RotateCw size={15} className={isRegenerating ? 'animate-spin' : ''} />
            <span>{isRegenerating ? 'Regenerating...' : 'Regenerate'}</span>
          </button>
        </div>
      </div>

      {/* Grid of 10 Hook Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '16px',
        }}
        id="hooks-grid"
      >
        {hooks.map((hook, index) => (
          <HookCard key={`${hook.style}-${index}`} hook={hook} index={index} />
        ))}
      </div>
    </section>
  );
};
