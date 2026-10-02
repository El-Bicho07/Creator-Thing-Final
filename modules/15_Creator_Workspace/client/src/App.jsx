import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Toast from './components/Toast';

import Dashboard from './pages/Dashboard';
import AiStudio from './pages/AiStudio';
import TrendRadar from './pages/TrendRadar';
import SavedContent from './pages/SavedContent';
import Settings from './pages/Settings';

import {
  getSavedContent,
  saveContentItem,
  deleteSavedItem,
  getBookmarkedTrendIds,
  toggleTrendBookmark,
  getUserPreferences,
  saveUserPreferences,
  getRecentActivity,
} from './services/storage';

import { checkBackendHealth } from './services/api';

export default function App() {
  const location = useLocation();

  // Local storage persisted state
  const [savedItems, setSavedItems] = useState(() => getSavedContent());
  const [bookmarkedIds, setBookmarkedIds] = useState(() => getBookmarkedTrendIds());
  const [preferences, setPreferences] = useState(() => getUserPreferences());
  const [recentActivity, setRecentActivity] = useState(() => getRecentActivity());

  // App UI state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Toast helper
  const addToast = useCallback((message, type = 'info') => {
    const id = `t_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Copy helper
  const handleCopyContent = useCallback((text) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(
      () => {
        addToast('Copied to clipboard!', 'success');
      },
      () => {
        addToast('Failed to copy to clipboard', 'error');
      }
    );
  }, [addToast]);

  useEffect(() => {
    checkBackendHealth();
  }, []);

  // Saved Content handlers
  const handleSaveContent = (item) => {
    const saved = saveContentItem(item);
    setSavedItems(getSavedContent());
    setRecentActivity(getRecentActivity());
    return saved;
  };

  const handleDeleteSaved = (id) => {
    const updated = deleteSavedItem(id);
    setSavedItems(updated);
    setRecentActivity(getRecentActivity());
  };

  // Bookmark handlers
  const handleToggleBookmark = (trendId) => {
    const updated = toggleTrendBookmark(trendId);
    setBookmarkedIds(updated);
  };

  // Preference handlers
  const handleSavePreferences = (newPrefs) => {
    const updated = saveUserPreferences(newPrefs);
    setPreferences(updated);
  };

  // Derive Page Title based on route
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/studio':
        return 'AI Studio';
      case '/trends':
        return 'Trend Radar';
      case '/saved':
        return 'Saved Content';
      case '/settings':
        return 'Settings';
      case '/':
      default:
        return 'Dashboard';
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Workspace Layout */}
      <div className="main-content-wrapper">
        <Header
          onMenuClick={() => setMobileMenuOpen(true)}
          pageTitle={getPageTitle()}
        />

        <main className="page-content">
          <Routes>
            <Route
              path="/"
              element={
                <Dashboard
                  savedItems={savedItems}
                  bookmarkedIds={bookmarkedIds}
                  recentActivity={recentActivity}
                  onDeleteSaved={handleDeleteSaved}
                  onCopyContent={handleCopyContent}
                  addToast={addToast}
                />
              }
            />
            <Route
              path="/studio"
              element={
                <AiStudio
                  preferences={preferences}
                  onSaveContent={handleSaveContent}
                  onCopyContent={handleCopyContent}
                  addToast={addToast}
                />
              }
            />
            <Route
              path="/trends"
              element={
                <TrendRadar
                  bookmarkedIds={bookmarkedIds}
                  onToggleBookmark={handleToggleBookmark}
                  addToast={addToast}
                />
              }
            />
            <Route
              path="/saved"
              element={
                <SavedContent
                  savedItems={savedItems}
                  onDeleteSaved={handleDeleteSaved}
                  onCopyContent={handleCopyContent}
                  addToast={addToast}
                />
              }
            />
            <Route
              path="/settings"
              element={
                <Settings
                  preferences={preferences}
                  onSavePreferences={handleSavePreferences}
                  addToast={addToast}
                />
              }
            />
          </Routes>
        </main>
      </div>

      {/* Global Toast Notification Container */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
