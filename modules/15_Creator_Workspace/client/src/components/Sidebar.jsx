import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Sparkles,
  TrendingUp,
  BookmarkCheck,
  Settings as SettingsIcon,
  Layers,
  X,
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose, ollamaStatus }) {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/studio', label: 'AI Studio', icon: Sparkles },
    { to: '/trends', label: 'Trend Radar', icon: TrendingUp },
    { to: '/saved', label: 'Saved Content', icon: BookmarkCheck },
    { to: '/settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} />}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Header / Brand */}
        <div className="sidebar-header">
          <div className="brand-logo-icon">
            <Layers size={22} />
          </div>
          <div className="brand-text" style={{ flex: 1 }}>
            <h1>CreatorSpace</h1>
            <span>AI Studio</span>
          </div>
          {isOpen && (
            <button
              onClick={onClose}
              className="btn-ghost"
              style={{ display: 'flex', padding: '4px', borderRadius: '6px' }}
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Navigation items */}
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'active' : ''}`
                }
                onClick={onClose}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* AI Engine Status Indicator in Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-status-card">
            <div className="status-dot online" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.8rem' }}>
                Google Gemini API
              </div>
              <div
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                gemini-3.5-flash-lite ● Active
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
