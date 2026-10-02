import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { MinimalPitchForm } from './components/MinimalPitchForm';
import { ProposalEditor } from './components/ProposalEditor/ProposalEditor';
import { ProposalLibrary } from './components/ProposalLibrary';
import { Toast } from './components/common/Toast';
import { api } from './services/api';

const EMPTY_FORM = {
  creatorName: '',
  socialLink: '',
  niche: '',
  brandName: '',
  brandWebsite: '',
  goal: 'Awareness',
  tone: 'professional',
  followerCount: '',
  rate: '',
  notes: ''
};

export function App() {
  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem('bpb_tab') || 'form';
  });

  const [formData, setFormData] = useState(EMPTY_FORM);

  const [activeProposal, setActiveProposal] = useState(() => {
    try {
      const saved = sessionStorage.getItem('bpb_proposal');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [aiStatus, setAiStatus] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    sessionStorage.setItem('bpb_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (activeProposal) {
      sessionStorage.setItem('bpb_proposal', JSON.stringify(activeProposal));
    }
  }, [activeProposal]);

  // Check AI backend status on load
  const checkStatus = async () => {
    try {
      const statusRes = await api.getAiStatus();
      setAiStatus(statusRes);
    } catch (err) {
      console.warn('Backend status check failed:', err.message);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  // Handle Proposal Generation
  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const profile = {
        name: formData.creatorName.trim(),
        socialLink: formData.socialLink.trim(),
        niche: formData.niche.trim(),
        metrics: {
          totalReach: formData.followerCount.trim() || null
        },
        rateCard: {
          basic: formData.rate ? parseFloat(formData.rate) : null
        },
        additionalDetails: formData.notes.trim() || null
      };

      const brandInfo = {
        brandName: formData.brandName.trim(),
        websiteUrl: formData.brandWebsite.trim() || null,
        goal: formData.goal
      };

      const res = await api.generateProposal({
        profile,
        brandInfo,
        tone: formData.tone || 'professional',
        format: 'deck'
      });

      if (res.data) {
        // Save proposal to database for Proposal Library
        const saved = await api.saveProposal({
          title: `${profile.name} x ${brandInfo.brandName} Collaboration Proposal`,
          brandName: brandInfo.brandName,
          brandInfo,
          creatorProfileId: '',
          status: 'Draft',
          tone: formData.tone || 'professional',
          content: res.data,
          subjectLines: res.data.subjectLines || [],
          alignmentScore: res.data.alignmentScore || 92
        });

        const finalProposal = saved.data || {
          title: `${profile.name} x ${brandInfo.brandName} Collaboration Proposal`,
          brandName: brandInfo.brandName,
          status: 'Draft',
          content: res.data,
          subjectLines: res.data.subjectLines || [],
          alignmentScore: res.data.alignmentScore || 92
        };

        setActiveProposal(finalProposal);
        setActiveTab('editor');

        if (res.warning) {
          showToast(res.warning, 'info');
        } else {
          showToast('Collaboration proposal generated successfully!', 'success');
        }
      }
    } catch (err) {
      console.error('Generation error:', err);
      showToast(err.message || 'Failed to generate proposal. Please try again.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Form View (3 Quick Inputs on One Screen) */}
        {activeTab === 'form' && (
          <MinimalPitchForm
            formData={formData}
            setFormData={setFormData}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            aiStatus={aiStatus}
          />
        )}

        {/* Editor View */}
        {activeTab === 'editor' && (
          <ProposalEditor
            proposal={activeProposal}
            setProposal={setActiveProposal}
            creatorProfile={{
              name: formData.creatorName || activeProposal?.content?.sections?.introduction?.title || 'Creator',
              niche: formData.niche,
              socialLink: formData.socialLink,
              metrics: {
                totalReach: formData.followerCount || null
              }
            }}
            brandInfo={{
              brandName: formData.brandName || activeProposal?.brandName || 'Brand',
              websiteUrl: formData.brandWebsite,
              goal: formData.goal
            }}
            onBack={() => setActiveTab('form')}
            showToast={showToast}
          />
        )}

        {/* Proposals Library CRM */}
        {activeTab === 'library' && (
          <ProposalLibrary
            onSelectProposal={(prop) => {
              setActiveProposal(prop);
              setActiveTab('editor');
            }}
            onCreateNew={() => {
              setActiveTab('form');
            }}
            showToast={showToast}
          />
        )}
      </main>

      {/* Global Toast */}
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />
    </div>
  );
}

export default App;
