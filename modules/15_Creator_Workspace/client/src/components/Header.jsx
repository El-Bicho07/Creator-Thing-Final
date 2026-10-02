import React from 'react';
import { Menu, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Header({ onMenuClick, pageTitle }) {
  return (
    <header className="top-header">
      <div className="header-left">
        <button
          className="mobile-menu-btn"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
        >
          <Menu size={22} />
        </button>
        <div className="header-title-block">
          <h2>{pageTitle || 'Dashboard'}</h2>
        </div>
      </div>

      <div className="header-right">
        <Link
          to="/settings"
          style={{ textDecoration: 'none' }}
          title="Click to view Gemini settings and preferences"
        >
          <div className="provider-pill">
            <Sparkles size={14} color="var(--accent-cyan)" />
            <span>
              Engine: <strong>Gemini 3.5 Flash</strong>
            </span>
          </div>
        </Link>

        <Link to="/studio" className="btn btn-primary btn-sm" style={{ gap: '0.4rem' }}>
          <Sparkles size={14} />
          <span>New Content</span>
        </Link>
      </div>
    </header>
  );
}
