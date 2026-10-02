import React, { useState } from 'react';
import {
  X,
  FileDown,
  Copy,
  Mail,
  Check,
  Printer,
  Sparkles,
  ExternalLink,
  Loader2
} from 'lucide-react';

export function ExportModal({
  isOpen,
  onClose,
  proposal,
  creatorProfile,
  brandInfo,
  selectedSubject,
  targetPrintRef,
  showToast
}) {
  const [copiedType, setCopiedType] = useState(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  if (!isOpen || !proposal) return null;

  const content = proposal.content || {};
  const sections = content.sections || {};
  const subject = selectedSubject || proposal.subjectLines?.[0]?.text || `Partnership Proposal: ${creatorProfile?.name} x ${brandInfo?.brandName}`;

  // Build clean plain-text email version
  const generateEmailPlainText = () => {
    const creatorName = creatorProfile?.name || 'Creator';
    const brandName = brandInfo?.brandName || 'Team';
    const introText = sections.introduction?.text || '';
    const concepts = sections.collaborationConcepts?.concepts || [];
    const packages = sections.pricingPackages?.packages || [];
    const kpis = sections.kpisAndResults?.text || '';
    const cta = sections.callToAction?.text || '';
    const reach = creatorProfile?.metrics?.totalReach || '150k+';
    const engagement = creatorProfile?.metrics?.avgEngagementRate || '4.8%';

    return `Subject: ${subject}

Hi ${brandName} Partnerships Team,

${introText}

---
WHY THIS PARTNERSHIP WORKS:
• Creator Reach: ${reach} highly engaged followers
• Average Engagement: ${engagement} (above industry benchmarks)
• Core Demographic: ${creatorProfile?.demographics?.ageSplit || 'Tier-1 purchasing demographic'}

---
INITIAL CONTENT CONCEPTS TAILORED FOR ${brandName.toUpperCase()}:
${concepts.map((c, i) => `${i + 1}. ${c.title} (${c.format})\n   Hook: "${c.hook}"\n   Concept: ${c.narrative}`).join('\n\n')}

---
PROPOSED PARTNERSHIP TIERS:
${packages.map(p => `• ${p.tier} ($${p.price} USD): ${p.deliverables.join(', ')}`).join('\n')}

---
NEXT STEPS:
${cta}

Best regards,

${creatorName}
${creatorProfile?.niche || ''}
${creatorProfile?.contactInfo?.email || ''}
${creatorProfile?.contactInfo?.mediaKitUrl ? `Media Kit: ${creatorProfile.contactInfo.mediaKitUrl}` : ''}
`;
  };

  const handleCopyEmailText = () => {
    const text = generateEmailPlainText();
    navigator.clipboard.writeText(text);
    setCopiedType('email');
    showToast?.('Full email pitch copied to clipboard!', 'success');
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleCopySubject = () => {
    navigator.clipboard.writeText(subject);
    setCopiedType('subject');
    showToast?.('Subject line copied!', 'success');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleDownloadPdf = async () => {
    setExportingPdf(true);
    try {
      // Dynamic import of html2pdf.js if available
      const html2pdf = (await import('html2pdf.js')).default;
      const element = document.getElementById('printable-proposal') || targetPrintRef?.current;

      if (!element) {
        window.print();
        setExportingPdf(false);
        return;
      }

      const opt = {
        margin: [10, 10, 10, 10],
        filename: `${(creatorProfile?.name || 'Creator').replace(/\s+/g, '_')}_x_${(brandInfo?.brandName || 'Brand').replace(/\s+/g, '_')}_Proposal.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();
      showToast?.('Branded PDF downloaded successfully!', 'success');
    } catch (err) {
      console.warn('html2pdf error, triggering system print fallback:', err);
      window.print();
    } finally {
      setExportingPdf(false);
    }
  };

  const handleOpenMailto = () => {
    const emailBody = encodeURIComponent(generateEmailPlainText().replace(`Subject: ${subject}\n\n`, ''));
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${emailBody}`;
    window.open(mailtoUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <FileDown className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Export & Send Collaboration Proposal
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Active Subject Line Banner */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Selected Subject Line
              </span>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                "{subject}"
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopySubject}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 bg-white dark:bg-slate-800 hover:bg-brand-50 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
            >
              {copiedType === 'subject' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy</span>
            </button>
          </div>

          {/* Export Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Branded PDF Download */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/50 transition-all space-y-3 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-2">
                  <FileDown className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Branded PDF Presentation
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Export high-resolution executive proposal deck with clean styling, alignment metrics, and package cards.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={exportingPdf}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-all shadow-md shadow-brand-500/20 disabled:opacity-50"
                >
                  {exportingPdf ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating PDF...
                    </>
                  ) : (
                    <>
                      <FileDown className="w-4 h-4" />
                      Download Branded PDF
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print / Save via Browser
                </button>
              </div>
            </div>

            {/* Email Plain Text Copy */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/50 transition-all space-y-3 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2">
                  <Mail className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Email-Ready Plain Text
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Cleanly formatted for Gmail, Outlook, or LinkedIn outreach with bulleted deliverables and contact signature.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleCopyEmailText}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl transition-all shadow-md"
                >
                  {copiedType === 'email' ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      Copied to Clipboard!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Email Pitch
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleOpenMailto}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open in Default Mail Client
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
