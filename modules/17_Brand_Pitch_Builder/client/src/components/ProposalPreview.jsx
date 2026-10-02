import React from 'react';
import {
  Sparkles,
  Target,
  DollarSign,
  Calendar,
  CheckCircle2,
  Award,
  ExternalLink,
  Mail,
  TrendingUp
} from 'lucide-react';

export function ProposalPreview({ proposal, creatorProfile, brandInfo, targetRef }) {
  if (!proposal || !proposal.content) {
    return <div className="p-8 text-center text-slate-400">No proposal content to preview.</div>;
  }

  const { content, subjectLines, alignmentScore } = proposal;
  const sections = content.sections || {};
  const intro = sections.introduction;
  const alignment = sections.alignmentAnalysis;
  const concepts = sections.collaborationConcepts?.concepts || [];
  const timeline = sections.deliverablesTimeline?.phases || [];
  const packages = sections.pricingPackages?.packages || [];
  const kpis = sections.kpisAndResults;
  const proof = sections.socialProof;
  const cta = sections.callToAction;

  return (
    <div
      ref={targetRef}
      id="printable-proposal"
      className="bg-white text-slate-900 max-w-4xl mx-auto p-8 sm:p-12 rounded-2xl shadow-xl border border-slate-200 space-y-10 font-sans print:p-0 print:border-none print:shadow-none"
    >
      {/* Executive Header Banner */}
      <div className="border-b-2 border-slate-900 pb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white">
              Official Partnership Proposal
            </span>
            <span className="text-xs font-semibold text-slate-500">
              Q{Math.floor(new Date().getMonth() / 3) + 1} {new Date().getFullYear()}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950">
            {creatorProfile?.name || 'Creator'} <span className="text-brand-600">&times;</span> {brandInfo?.brandName || 'Brand'}
          </h1>
          <p className="text-sm font-medium text-slate-600 mt-1">
            Tailored Collaboration Strategy & Multi-Channel Sponsorship Proposal
          </p>
        </div>

        {/* Creator Snapshot Card */}
        <div className="text-left sm:text-right text-xs text-slate-600 space-y-0.5 border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-200">
          <div className="font-bold text-slate-950 text-sm">{creatorProfile?.name}</div>
          <div>{creatorProfile?.niche}</div>
          <div className="font-semibold text-brand-600">{creatorProfile?.metrics?.totalReach || '150k+'} Total Reach &bull; {creatorProfile?.metrics?.avgEngagementRate || '4.8%'} Avg Engagement</div>
          <div className="text-slate-500">{creatorProfile?.contactInfo?.email || 'collabs@creator.com'}</div>
        </div>
      </div>

      {/* Alignment Index Bar */}
      <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-brand-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Audience & Brand Synergy Index
            </span>
          </div>
          <p className="text-xs text-slate-600 max-w-xl">
            {content.alignmentSummary || `Strong audience synergy matching ${creatorProfile?.name}'s demographic profile to ${brandInfo?.brandName}'s core consumer base.`}
          </p>
        </div>
        <div className="flex-shrink-0 flex items-baseline gap-1 px-4 py-2 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-2xl font-black text-brand-600">{alignmentScore || 94}%</span>
          <span className="text-xs font-semibold text-slate-500">Match</span>
        </div>
      </div>

      {/* Section 1: Executive Summary */}
      {intro && (
        <div className="space-y-3 page-break-inside-avoid">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-400 border-b border-slate-200 pb-1.5 flex items-center gap-2">
            <span className="text-brand-600">01</span> Executive Summary & Alignment
          </h2>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
            {intro.text}
          </p>
        </div>
      )}

      {/* Section 2: Audience Analysis */}
      {alignment && (
        <div className="space-y-3 page-break-inside-avoid">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-400 border-b border-slate-200 pb-1.5 flex items-center gap-2">
            <span className="text-brand-600">02</span> Demographic & Psychographic Overlap
          </h2>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
            {alignment.text}
          </p>
          {alignment.keyOverlapPoints && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {alignment.keyOverlapPoints.map((point, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Section 3: Collaboration Concepts (The 3 Ideas) */}
      {concepts.length > 0 && (
        <div className="space-y-4 page-break-inside-avoid">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-400 border-b border-slate-200 pb-1.5 flex items-center gap-2">
            <span className="text-brand-600">03</span> Tailored Creative Concepts
          </h2>
          <div className="space-y-3">
            {concepts.map((concept, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-950 text-sm">
                    Concept #{concept.conceptNumber || idx + 1}: {concept.title}
                  </span>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-white text-slate-800 border border-slate-200 shadow-sm">
                    {concept.format}
                  </span>
                </div>
                <div className="text-xs text-slate-700">
                  <span className="font-bold text-slate-900">Hook:</span> "{concept.hook}"
                </div>
                <div className="text-xs text-slate-700 leading-relaxed">
                  <span className="font-bold text-slate-900">Narrative Arc:</span> {concept.narrative}
                </div>
                <div className="text-xs text-slate-700">
                  <span className="font-bold text-slate-900">Call to Action:</span> {concept.callToAction}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 4: Production Timeline */}
      {timeline.length > 0 && (
        <div className="space-y-3 page-break-inside-avoid">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-400 border-b border-slate-200 pb-1.5 flex items-center gap-2">
            <span className="text-brand-600">04</span> Production & Delivery Roadmap
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {timeline.map((item, idx) => (
              <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-brand-600" />
                  {item.phase}
                </div>
                <div className="text-xs text-slate-600 leading-relaxed">
                  {item.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 5: Partnership Packages & Pricing */}
      {packages.length > 0 && (
        <div className="space-y-4 page-break-inside-avoid">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-400 border-b border-slate-200 pb-1.5 flex items-center gap-2">
            <span className="text-brand-600">05</span> Proposed Investment Packages
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {packages.map((pkg, idx) => (
              <div
                key={idx}
                className={`p-5 rounded-xl border flex flex-col justify-between ${
                  pkg.badge === 'Recommended' || idx === 1
                    ? 'border-brand-600 bg-brand-50/40 ring-1 ring-brand-600'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {pkg.tier}
                    </span>
                    {pkg.badge && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-brand-600 text-white">
                        {pkg.badge}
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-black text-slate-950 mb-2">
                    ${pkg.price?.toLocaleString()} <span className="text-xs font-normal text-slate-500">USD</span>
                  </div>
                  <p className="text-xs text-slate-600 mb-4 pb-3 border-b border-slate-200">
                    {pkg.idealFor}
                  </p>
                  <div className="space-y-1.5 text-xs text-slate-700">
                    {pkg.deliverables.map((d, dIdx) => (
                      <div key={dIdx} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                        <span>{d}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 6: KPIs & Measurable Impact */}
      {kpis && (
        <div className="space-y-3 page-break-inside-avoid">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-400 border-b border-slate-200 pb-1.5 flex items-center gap-2">
            <span className="text-brand-600">06</span> Projected KPIs & Deliverable Guarantees
          </h2>
          <p className="text-sm text-slate-700 leading-relaxed">
            {kpis.text}
          </p>
          {kpis.metrics && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {kpis.metrics.map((m, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">{m.label}</div>
                  <div className="font-black text-slate-900 text-sm mt-0.5">{m.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Section 7: Social Proof & Track Record */}
      {proof && (
        <div className="space-y-3 page-break-inside-avoid">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-400 border-b border-slate-200 pb-1.5 flex items-center gap-2">
            <span className="text-brand-600">07</span> Historical Track Record & Social Proof
          </h2>
          <p className="text-sm text-slate-700 leading-relaxed">
            {proof.text}
          </p>
          {proof.caseHighlights && (
            <div className="space-y-1.5 pt-1">
              {proof.caseHighlights.map((hl, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-center gap-2">
                  <Award className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>{hl}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Section 8: Call to Action */}
      {cta && (
        <div className="p-6 rounded-2xl bg-slate-900 text-white space-y-3 page-break-inside-avoid">
          <div className="text-xs font-bold uppercase tracking-wider text-brand-300">
            08 Next Steps & Scheduling
          </div>
          <h3 className="text-lg font-bold text-white">
            Let's Bring This Partnership to Life
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            {cta.text}
          </p>
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-white/10 text-xs">
            <div className="text-slate-300">
              <strong className="text-white">Suggested Discussion Slot:</strong> {cta.suggestedMeetingSlot || 'Available this Thursday/Friday'}
            </div>
            <div className="font-semibold text-brand-300">
              Direct Contact: {creatorProfile?.contactInfo?.email || 'collabs@creator.com'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
