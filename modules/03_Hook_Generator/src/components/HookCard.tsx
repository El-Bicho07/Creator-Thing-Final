'use client';

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { HookItem } from '@/types';

interface HookCardProps {
  hook: HookItem;
  index: number;
}

export const HookCard: React.FC<HookCardProps> = ({ hook, index }) => {
  const [copied, setCopied] = useState(false);
  const formattedNumber = String(index + 1).padStart(2, '0');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(hook.hook);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = hook.hook;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="glass-panel"
      id={`hook-card-${index + 1}`}
      style={{
        padding: '22px 24px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '16px',
        background: 'rgba(15, 20, 32, 0.65)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '14px',
      }}
    >
      {/* Header: Number, Style & Copy Button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
            }}
          >
            {formattedNumber}
          </span>
          <span
            style={{
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#a5b4fc',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {hook.style}
          </span>
        </div>

        <button
          type="button"
          id={`copy-btn-${index + 1}`}
          onClick={handleCopy}
          aria-label={`Copy hook ${formattedNumber}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            fontSize: '0.8rem',
            fontWeight: 500,
            color: copied ? '#34d399' : 'var(--text-secondary)',
            background: copied ? 'rgba(52, 211, 153, 0.1)' : 'rgba(255, 255, 255, 0.04)',
            border: copied
              ? '1px solid rgba(52, 211, 153, 0.3)'
              : '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          {copied ? (
            <>
              <Check size={14} color="#34d399" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Hook Text */}
      <p
        style={{
          fontSize: '1.05rem',
          lineHeight: 1.6,
          fontWeight: 450,
          color: '#f8fafc',
          margin: 0,
        }}
      >
        &ldquo;{hook.hook}&rdquo;
      </p>
    </div>
  );
};
