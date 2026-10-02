import React, { useState, useRef } from 'react';
import {
  FileText,
  Eye,
  Edit3,
  FileDown,
  History,
  Save,
  CheckCircle2,
  Share2,
  ChevronLeft,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { SubjectLinePicker } from './SubjectLinePicker';
import { AlignmentScoreCard } from './AlignmentScoreCard';
import { PricingPackagesEditor } from './PricingPackagesEditor';
import { SectionCard } from './SectionCard';
import { VersionHistoryModal } from './VersionHistoryModal';
import { ProposalPreview } from '../ProposalPreview';
import { ExportModal } from '../ExportModal';
import { api } from '../../services/api';

const STATUS_OPTIONS = ['Draft', 'Sent', 'Replied', 'Won', 'Lost'];

export function ProposalEditor({
  proposal,
  setProposal,
  creatorProfile,
  brandInfo,
  onBack,
  showToast
}) {
  const [viewMode, setViewMode] = useState('editor'); // 'editor' | 'preview'
  const [selectedSubject, setSelectedSubject] = useState(
    proposal?.subjectLines?.[0]?.text || ''
  );
  const [regeneratingSectionKey, setRegeneratingSectionKey] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const printRef = useRef(null);

  if (!proposal || !proposal.content) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <p className="text-slate-500">No active proposal loaded.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 text-xs font-bold text-white bg-brand-600 rounded-xl"
        >
          Return to Wizard
        </button>
      </div>
    );
  }

  const sections = proposal.content?.sections || {};

  // Update a single section's data
  const handleUpdateSection = (sectionKey, updatedData) => {
    const updatedContent = {
      ...proposal.content,
      sections: {
        ...proposal.content.sections,
        [sectionKey]: updatedData
      }
    };
    setProposal({
      ...proposal,
      content: updatedContent
    });
  };

  // Regenerate section with AI
  const handleRegenerateSection = async (sectionKey, modifier, customPrompt) => {
    setRegeneratingSectionKey(sectionKey);
    try {
      const currentContent = sections[sectionKey];
      const res = await api.regenerateSection({
        sectionKey,
        currentContent,
        modifier,
        customPrompt,
        profile: creatorProfile,
        brandInfo,
        tone: proposal.tone || 'professional'
      });

      if (res.data) {
        handleUpdateSection(sectionKey, res.data);
        showToast?.(`Refined ${sections[sectionKey]?.title || sectionKey} successfully!`, 'success');

        // Record a version if proposal has an id
        if (proposal.id) {
          api.addVersion(
            proposal.id,
            { ...proposal.content, sections: { ...sections, [sectionKey]: res.data } },
            `AI refined section: ${sections[sectionKey]?.title || sectionKey} (${modifier})`
          ).catch(e => console.error(e));
        }
      }
    } catch (err) {
      showToast?.(err.message || 'Failed to refine section', 'error');
    } finally {
      setRegeneratingSectionKey(null);
    }
  };

  // Save proposal changes to database
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        ...proposal,
        brandName: brandInfo?.brandName || proposal.brandName,
        creatorProfileId: creatorProfile?.id || proposal.creatorProfileId,
        content: proposal.content,
        subjectLines: proposal.subjectLines,
        alignmentScore: proposal.alignmentScore,
        recordVersion: true,
        changeNote: 'Saved manual revisions'
      };

      let saved;
      if (proposal.id) {
        saved = await api.updateProposal(proposal.id, payload);
      } else {
        saved = await api.saveProposal(payload);
      }

      if (saved.data) {
        setProposal(saved.data);
        showToast?.('Proposal saved to your library!', 'success');
      }
    } catch (err) {
      showToast?.(err.message || 'Failed to save proposal', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Status update
  const handleStatusChange = async (newStatus) => {
    const updated = { ...proposal, status: newStatus };
    setProposal(updated);
    if (proposal.id) {
      try {
        await api.updateProposal(proposal.id, { status: newStatus });
        showToast?.(`Status updated to "${newStatus}"`, 'info');
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-in fade-in duration-200">
      {/* Short Guidance Note Required by Spec */}
      <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-brand-500"></span>
        <span className="font-medium">Review the proposal and check all numbers and claims before sending.</span>
      </div>
      {/* Top Action Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Title and metadata */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Back to Configuration"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <input
              type="text"
              value={proposal.title || `${creatorProfile?.name} x ${brandInfo?.brandName} Proposal`}
              onChange={(e) => setProposal({ ...proposal, title: e.target.value })}
              className="text-base sm:text-lg font-bold text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 focus:border-brand-500 focus:outline-none"
            />
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span>{creatorProfile?.name}</span>
              <span>&bull;</span>
              <span>{brandInfo?.brandName}</span>
              <span>&bull;</span>
              <span className="capitalize">{proposal.tone || 'professional'} Tone</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          {/* Status selector */}
          <select
            value={proposal.status || 'Draft'}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            {STATUS_OPTIONS.map((st) => (
              <option key={st} value={st}>
                Status: {st}
              </option>
            ))}
          </select>

          {/* Mode Toggle (Editor vs Preview) */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('editor')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                viewMode === 'editor'
                  ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              Editor
            </button>
            <button
              type="button"
              id="pdf-view-btn"
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                viewMode === 'preview'
                  ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              PDF View
            </button>
          </div>

          {/* Version history button */}
          {proposal.id && (
            <button
              type="button"
              onClick={() => setIsHistoryOpen(true)}
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Version History & Revisions"
            >
              <History className="w-4 h-4" />
            </button>
          )}

          {/* Save button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5 text-brand-500" />
            <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
          </button>

          {/* Export button */}
          <button
            type="button"
            onClick={() => setIsExportOpen(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-all shadow-md shadow-brand-500/20"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Export & Send</span>
          </button>
        </div>
      </div>

      {/* Editor Mode vs Preview Mode */}
      {viewMode === 'preview' ? (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800 flex items-center justify-between text-xs text-brand-900 dark:text-brand-200">
            <span>Executive Presentation View: Clean, styled PDF format ready for brand presentation.</span>
            <button
              onClick={() => setIsExportOpen(true)}
              className="px-3 py-1 font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm"
            >
              Download PDF
            </button>
          </div>
          <ProposalPreview
            targetRef={printRef}
            proposal={proposal}
            creatorProfile={creatorProfile}
            brandInfo={brandInfo}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Email Subject Line Variants */}
          <SubjectLinePicker
            subjectLines={proposal.subjectLines}
            selectedSubject={selectedSubject}
            onSelectSubject={setSelectedSubject}
            showToast={showToast}
          />

          {/* Section B/Score: Alignment Score Card */}
          <AlignmentScoreCard
            alignmentScore={proposal.alignmentScore}
            alignmentSummary={proposal.content?.alignmentSummary}
            keyOverlapPoints={sections.alignmentAnalysis?.keyOverlapPoints}
          />

          {/* Section 1: Introduction */}
          {sections.introduction && (
            <SectionCard
              sectionKey="introduction"
              sectionNumber="1"
              sectionData={sections.introduction}
              onUpdateSection={handleUpdateSection}
              onRegenerateSection={handleRegenerateSection}
              isRegenerating={regeneratingSectionKey === 'introduction'}
            />
          )}

          {/* Section 2: Alignment Analysis */}
          {sections.alignmentAnalysis && (
            <SectionCard
              sectionKey="alignmentAnalysis"
              sectionNumber="2"
              sectionData={sections.alignmentAnalysis}
              onUpdateSection={handleUpdateSection}
              onRegenerateSection={handleRegenerateSection}
              isRegenerating={regeneratingSectionKey === 'alignmentAnalysis'}
            />
          )}

          {/* Section 3: Collaboration Concepts */}
          {sections.collaborationConcepts && (
            <SectionCard
              sectionKey="collaborationConcepts"
              sectionNumber="3"
              sectionData={sections.collaborationConcepts}
              onUpdateSection={handleUpdateSection}
              onRegenerateSection={handleRegenerateSection}
              isRegenerating={regeneratingSectionKey === 'collaborationConcepts'}
            />
          )}

          {/* Section 4: Deliverables & Timeline */}
          {sections.deliverablesTimeline && (
            <SectionCard
              sectionKey="deliverablesTimeline"
              sectionNumber="4"
              sectionData={sections.deliverablesTimeline}
              onUpdateSection={handleUpdateSection}
              onRegenerateSection={handleRegenerateSection}
              isRegenerating={regeneratingSectionKey === 'deliverablesTimeline'}
            />
          )}

          {/* Section 5: Pricing Packages Editor */}
          {sections.pricingPackages && (
            <PricingPackagesEditor
              pricingData={sections.pricingPackages}
              onUpdatePricing={(updatedPricing) => handleUpdateSection('pricingPackages', updatedPricing)}
            />
          )}

          {/* Section 6: KPIs & Measurable Results */}
          {sections.kpisAndResults && (
            <SectionCard
              sectionKey="kpisAndResults"
              sectionNumber="6"
              sectionData={sections.kpisAndResults}
              onUpdateSection={handleUpdateSection}
              onRegenerateSection={handleRegenerateSection}
              isRegenerating={regeneratingSectionKey === 'kpisAndResults'}
            />
          )}

          {/* Section 7: Past Work & Social Proof */}
          {sections.socialProof && (
            <SectionCard
              sectionKey="socialProof"
              sectionNumber="7"
              sectionData={sections.socialProof}
              onUpdateSection={handleUpdateSection}
              onRegenerateSection={handleRegenerateSection}
              isRegenerating={regeneratingSectionKey === 'socialProof'}
            />
          )}

          {/* Section 8: Call to Action */}
          {sections.callToAction && (
            <SectionCard
              sectionKey="callToAction"
              sectionNumber="8"
              sectionData={sections.callToAction}
              onUpdateSection={handleUpdateSection}
              onRegenerateSection={handleRegenerateSection}
              isRegenerating={regeneratingSectionKey === 'callToAction'}
            />
          )}
        </div>
      )}

      {/* Hidden printable target container so html2pdf can render even while in editor mode */}
      <div className="hidden">
        <ProposalPreview
          targetRef={printRef}
          proposal={proposal}
          creatorProfile={creatorProfile}
          brandInfo={brandInfo}
        />
      </div>

      {/* Version History Modal */}
      <VersionHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        proposalId={proposal.id}
        onRestoreVersion={(restoredContent) => {
          setProposal({ ...proposal, content: restoredContent });
        }}
        showToast={showToast}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        proposal={proposal}
        creatorProfile={creatorProfile}
        brandInfo={brandInfo}
        selectedSubject={selectedSubject}
        targetPrintRef={printRef}
        showToast={showToast}
      />
    </div>
  );
}
