import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider, useNotification } from './context/NotificationContext';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import DashboardView from './components/dashboard/DashboardView';
import ContentLibraryView from './components/library/ContentLibraryView';
import RecommendationsView from './components/recommendations/RecommendationsView';
import SimilarityView from './components/similarity/SimilarityView';
import ContentPlannerView from './components/planner/ContentPlannerView';
import CSVImportView from './components/importer/CSVImportView';
import SettingsView from './components/settings/SettingsView';
import ScoreModal from './components/common/ScoreModal';
import AuthModal from './components/auth/AuthModal';
import { postsAPI, recommendationsAPI, plannerAPI, systemAPI } from './services/api';

function MainApp() {
  const { user, isAuthenticated, logout, demoLogin } = useAuth();
  const { notify } = useNotification();

  const [currentTab, setCurrentTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  
  // Library & System state
  const [postCount, setPostCount] = useState(50);
  const [dbStatus, setDbStatus] = useState({ mode: 'Demo Engine', isConnected: true, isMemoryFallback: true });
  const [isSeeding, setIsSeeding] = useState(false);

  // Score Modal state
  const [scoreModalOpen, setScoreModalOpen] = useState(false);
  const [activePostAnalysis, setActivePostAnalysis] = useState(null);

  // Fetch system health & counts
  const refreshSystemStatus = async () => {
    try {
      const res = await systemAPI.healthCheck();
      if (res.data) {
        setPostCount(res.data.libraryPostCount || 0);
        setDbStatus(res.data.database || {});
      }
    } catch (err) {
      console.warn('System health ping failed:', err.message);
    }
  };

  useEffect(() => {
    refreshSystemStatus();
  }, [currentTab]);

  // Handle opening Score Modal
  const handleOpenScoreModal = async (postId) => {
    try {
      const res = await recommendationsAPI.getPostDetail(postId);
      if (res.data?.success) {
        setActivePostAnalysis({
          post: res.data.post,
          ...res.data.analysis,
        });
        setScoreModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to get post score detail:', err);
      notify('Could not load score breakdown', 'error');
    }
  };

  // Handle adding to planner from ScoreModal
  const handleAddToPlanner = async (planData) => {
    const res = await plannerAPI.createItem(planData);
    if (res.data?.success) {
      notify('Scheduled to Content Planner!', 'success');
    }
    return res.data;
  };

  // Reload 50 synthetic records
  const handleSeedDemo = async () => {
    setIsSeeding(true);
    try {
      const res = await postsAPI.seedDemo(true);
      if (res.data?.success) {
        notify('50 Realistic Synthetic Instagram records reloaded!', 'success');
        refreshSystemStatus();
        // Force refresh current view by briefly switching or triggering refresh
        setCurrentTab(prev => prev);
      }
    } catch (err) {
      notify('Failed to reload demo records', 'error');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-charcoal-950 flex flex-col lg:flex-row text-slate-100">
      
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        user={user}
        onLogout={logout}
        onSeedDemo={handleSeedDemo}
        isSeeding={isSeeding}
        dbStatus={dbStatus}
        postCount={postCount}
        isOpen={mobileMenuOpen}
        setIsOpen={setMobileMenuOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        
        {/* Top Header */}
        <Header
          currentTab={currentTab}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          user={user}
          postCount={postCount}
          dbStatus={dbStatus}
        />

        {/* Guest Banner if not authenticated */}
        {!isAuthenticated && (
          <div className="mx-4 lg:mx-8 mt-4 p-3 rounded-2xl bg-charcoal-900 border border-lime-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-glow-subtle">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-lime-accent animate-ping" />
              <span className="text-slate-300">
                Viewing in <strong>Smart India Hackathon Guest Mode</strong> with 50 synthetic posts.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => demoLogin()}
                className="px-3 py-1 rounded-xl bg-lime-accent text-charcoal-950 font-bold text-xs shadow-glow-lime"
              >
                1-Click Demo Login
              </button>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-3 py-1 rounded-xl bg-charcoal-800 text-slate-200 text-xs font-semibold"
              >
                Sign In
              </button>
            </div>
          </div>
        )}

        {/* View Router */}
        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && (
            <DashboardView
              onNavigate={setCurrentTab}
              onOpenScoreModal={handleOpenScoreModal}
            />
          )}

          {currentTab === 'library' && (
            <ContentLibraryView
              onOpenScoreModal={handleOpenScoreModal}
              onNavigate={setCurrentTab}
            />
          )}

          {currentTab === 'recommendations' && (
            <RecommendationsView
              onOpenScoreModal={handleOpenScoreModal}
            />
          )}

          {currentTab === 'similarity' && (
            <SimilarityView
              onNavigate={setCurrentTab}
            />
          )}

          {currentTab === 'planner' && (
            <ContentPlannerView
              onNavigate={setCurrentTab}
            />
          )}

          {currentTab === 'importer' && (
            <CSVImportView
              onImportSuccess={refreshSystemStatus}
              onNavigate={setCurrentTab}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              dbStatus={dbStatus}
              postCount={postCount}
              onReloadDemo={handleSeedDemo}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="py-6 px-4 lg:px-8 border-t border-slate-800/80 text-center text-xs text-slate-500">
          <p>
            <strong>Content Recycler</strong> • AI-Powered Instagram Intelligence & Repurposing Platform • Smart India Hackathon
          </p>
        </footer>

      </div>

      {/* Global Score & Explainability Modal */}
      <ScoreModal
        postAnalysis={activePostAnalysis}
        isOpen={scoreModalOpen}
        onClose={() => setScoreModalOpen(false)}
        onAddToPlanner={handleAddToPlanner}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

    </div>
  );
}

export default function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </NotificationProvider>
  );
}
