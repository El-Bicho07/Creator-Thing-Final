import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Sparkles,
  Copy,
  BookmarkPlus,
  RefreshCw,
  AlertCircle,
  Video,
  Layers,
  FileText,
  Smartphone,
  Check,
  Zap,
  Award,
  TrendingUp,
  Bot,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  X,
  Lightbulb,
  ArrowRight,
} from 'lucide-react';
import { generateContent, evaluateContent, runAutonomousChain } from '../services/api';
import FormatBadge from '../components/FormatBadge';

export default function AiStudio({
  preferences,
  onSaveContent,
  onCopyContent,
  addToast,
}) {
  const location = useLocation();

  // State
  const [topic, setTopic] = useState('');
  const [format, setFormat] = useState('Instagram Reel');
  const [audience, setAudience] = useState('Content Creators');
  const [tone, setTone] = useState('Educational');

  // Generation state (Agent 2)
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState(null);
  const [errorState, setErrorState] = useState(null);
  const [hasSavedCurrent, setHasSavedCurrent] = useState(false);

  // Evaluation state (Agent 3: Content Critic)
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);
  const [evaluationError, setEvaluationError] = useState(null);

  // Autonomous Chain Pipeline State (Agent 1 ➔ Agent 2 ➔ Agent 3)
  const [isRunningChain, setIsRunningChain] = useState(false);
  const [chainStep, setChainStep] = useState(0); // 0: idle, 1: scout, 2: script, 3: evaluate

  // Initialize from preferences or location state (from Trend Radar or Dashboard)
  useEffect(() => {
    if (preferences) {
      if (preferences.defaultFormat) setFormat(preferences.defaultFormat);
      if (preferences.preferredAudience) setAudience(preferences.preferredAudience);
      if (preferences.preferredTone) setTone(preferences.preferredTone);
    }

    if (location.state?.preselectedFormat) {
      setFormat(location.state.preselectedFormat);
    }
    if (location.state?.preselectedTopic) {
      setTopic(location.state.preselectedTopic);
    }
  }, [location.state, preferences]);

  // Options
  const formatOptions = [
    { id: 'Instagram Reel', label: 'Instagram Reel', icon: Video, desc: 'Hook, 15-60s script, visual b-roll & caption' },
    { id: 'Carousel', label: 'Carousel', icon: Layers, desc: '5-8 slides with visual cues & actionable takeaways' },
    { id: 'Caption', label: 'Caption', icon: FileText, desc: 'Compelling opener, narrative copy & hashtags' },
    { id: 'Story', label: 'Story', icon: Smartphone, desc: 'Interactive 3-5 frame sequence with sticker triggers' },
  ];

  const audiencePresets = [
    'Content Creators',
    'Beginners',
    'Students',
    'Entrepreneurs',
    'Technology enthusiasts',
    'General audience',
  ];

  const tonePresets = [
    'Educational',
    'Conversational',
    'Professional',
    'Creative',
    'Friendly',
    'Humorous',
  ];

  // Handler for content generation (Agent 2)
  const handleGenerate = async () => {
    if (!topic.trim()) {
      setErrorState({
        title: 'Missing Topic',
        message: 'Please enter a topic or click one of the quick inspiration suggestions below.',
      });
      addToast('Please enter a topic or idea first!', 'error');
      return;
    }

    setIsGenerating(true);
    setErrorState(null);
    setHasSavedCurrent(false);
    setEvaluationResult(null);

    try {
      const responseData = await generateContent({
        topic: topic.trim(),
        format,
        audience,
        tone,
      });

      setGeneratedResult(responseData);
      addToast(`Generated ${format} successfully!`, 'success');
    } catch (err) {
      console.error('Generation Error:', err);
      setErrorState({
        title: err.code === 'MISSING_API_KEY'
          ? 'Gemini API Key Required'
          : 'Generation Failed',
        message: err.message,
      });
      addToast(err.message || 'Generation failed', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handler for Content Critic & Evaluation (Agent 3)
  const handleEvaluate = async () => {
    if (!generatedResult || !generatedResult.content) {
      addToast('Please generate content first before evaluating!', 'error');
      return;
    }

    setIsEvaluating(true);
    setEvaluationError(null);
    setShowEvaluationModal(true);

    try {
      const evalData = await evaluateContent({
        content: generatedResult.content,
        format: generatedResult.format,
        topic: generatedResult.topic,
        audience: generatedResult.audience,
        tone: generatedResult.tone,
      });

      setEvaluationResult(evalData.evaluation);
      addToast('Content Critic evaluation complete!', 'success');
    } catch (err) {
      console.error('Evaluation Error:', err);
      setEvaluationError(err.message || 'Failed to evaluate script.');
      addToast(err.message || 'Evaluation failed', 'error');
    } finally {
      setIsEvaluating(false);
    }
  };

  // Apply optimized hook directly to generated content
  const handleApplyOptimizedHook = (optimizedHook) => {
    if (!optimizedHook || !generatedResult) return;

    const updatedContent = `[OPTIMIZED HOOK (AGENT 3 CRITIC)]\n"${optimizedHook}"\n\n---\n\n${generatedResult.content}`;

    setGeneratedResult((prev) => ({
      ...prev,
      content: updatedContent,
    }));
    setHasSavedCurrent(false);
    setShowEvaluationModal(false);
    addToast('Optimized hook applied to your script!', 'success');
  };

  // Handler for 1-Click Autonomous Multi-Agent Chain Pipeline
  const handleRunAutonomousChain = async () => {
    setIsRunningChain(true);
    setIsGenerating(true);
    setErrorState(null);
    setHasSavedCurrent(false);
    setEvaluationResult(null);
    setChainStep(1); // Step 1: Agent 1 Trend Scout

    const t1 = setTimeout(() => setChainStep(2), 2500); // Visual step progress
    const t2 = setTimeout(() => setChainStep(3), 6000);

    try {
      const chainData = await runAutonomousChain({
        niche: topic.trim() || 'AI Tools & Productivity Growth',
        format,
        audience,
        tone,
      });

      clearTimeout(t1);
      clearTimeout(t2);

      if (chainData) {
        if (chainData.topic) setTopic(chainData.topic);

        setGeneratedResult({
          topic: chainData.topic,
          format: chainData.format,
          audience: chainData.audience,
          tone: chainData.tone,
          content: chainData.content,
          provider: 'gemini',
          model: chainData.model || 'gemini-3.5-flash-lite',
          agent: '3-Agent Autonomous Chain',
          timestamp: chainData.timestamp,
        });

        if (chainData.evaluation) {
          setEvaluationResult(chainData.evaluation);
        }

        addToast('Autonomous 3-Agent Chain completed successfully!', 'success');
      }
    } catch (err) {
      clearTimeout(t1);
      clearTimeout(t2);
      console.error('Autonomous Chain Error:', err);
      setErrorState({
        title: 'Autonomous Chain Failed',
        message: err.message,
      });
      addToast(err.message || 'Chain execution failed', 'error');
    } finally {
      setIsRunningChain(false);
      setIsGenerating(false);
      setChainStep(0);
    }
  };

  const handleSave = () => {
    if (!generatedResult) return;
    onSaveContent({
      topic: generatedResult.topic,
      format: generatedResult.format,
      audience: generatedResult.audience,
      tone: generatedResult.tone,
      content: generatedResult.content,
      provider: 'gemini',
      model: generatedResult.model || 'gemini-3.5-flash-lite',
    });
    setHasSavedCurrent(true);
    addToast('Content saved to your library!', 'success');
  };

  return (
    <div className="studio-page">
      {/* Studio Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
          AI Content Studio
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.94rem' }}>
          Autonomous 3-Agent Creator Pipeline: Scout trends, engineer platform-adapted copy, and rigorously evaluate retention with Google Gemini AI.
        </p>
      </div>

      {/* Multi-Agent Creator Pipeline Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.85rem 1.25rem',
          borderRadius: '12px',
          backgroundColor: 'rgba(17, 24, 39, 0.75)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '1.75rem',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
              color: '#fff',
            }}
          >
            <Bot size={16} />
          </div>
          <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-main)' }}>
            3-Agent Creator Pipeline
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Agent 1 Step */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.76rem',
              padding: '0.3rem 0.65rem',
              borderRadius: '999px',
              backgroundColor: isRunningChain && chainStep === 1
                ? 'rgba(6, 182, 212, 0.25)'
                : 'rgba(6, 182, 212, 0.1)',
              border: isRunningChain && chainStep === 1
                ? '1px solid var(--accent-cyan)'
                : '1px solid rgba(6, 182, 212, 0.25)',
              color: 'var(--accent-cyan)',
              fontWeight: isRunningChain && chainStep === 1 ? 700 : 500,
              boxShadow: isRunningChain && chainStep === 1 ? '0 0 12px rgba(6, 182, 212, 0.4)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            {isRunningChain && chainStep === 1 ? (
              <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <TrendingUp size={13} />
            )}
            <span>1. Trend Scout {isRunningChain && chainStep === 1 ? '(Scouting...)' : ''}</span>
          </div>

          <ChevronRight size={14} color="var(--text-dim)" />

          {/* Agent 2 Step */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.76rem',
              padding: '0.3rem 0.65rem',
              borderRadius: '999px',
              backgroundColor: isRunningChain && chainStep === 2
                ? 'rgba(99, 102, 241, 0.35)'
                : 'rgba(99, 102, 241, 0.2)',
              border: isRunningChain && chainStep === 2
                ? '1px solid #818cf8'
                : '1px solid rgba(99, 102, 241, 0.4)',
              color: '#c7d2fe',
              fontWeight: 700,
              boxShadow: isRunningChain && chainStep === 2 ? '0 0 12px rgba(99, 102, 241, 0.5)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            {isRunningChain && chainStep === 2 ? (
              <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Sparkles size={13} />
            )}
            <span>2. Script Builder {isRunningChain && chainStep === 2 ? '(Writing...)' : '(Active)'}</span>
          </div>

          <ChevronRight size={14} color="var(--text-dim)" />

          {/* Agent 3 Step */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.76rem',
              padding: '0.3rem 0.65rem',
              borderRadius: '999px',
              backgroundColor: isRunningChain && chainStep === 3
                ? 'rgba(16, 185, 129, 0.25)'
                : evaluationResult
                ? 'rgba(16, 185, 129, 0.15)'
                : 'rgba(255, 255, 255, 0.04)',
              border: isRunningChain && chainStep === 3
                ? '1px solid var(--accent-emerald)'
                : evaluationResult
                ? '1px solid rgba(16, 185, 129, 0.35)'
                : '1px solid var(--border-subtle)',
              color: evaluationResult || (isRunningChain && chainStep === 3)
                ? 'var(--accent-emerald)'
                : 'var(--text-dim)',
              fontWeight: evaluationResult || (isRunningChain && chainStep === 3) ? 700 : 500,
              boxShadow: isRunningChain && chainStep === 3 ? '0 0 12px rgba(16, 185, 129, 0.4)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            {isRunningChain && chainStep === 3 ? (
              <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Award size={13} />
            )}
            <span>
              3. Content Critic{' '}
              {isRunningChain && chainStep === 3
                ? '(Scoring...)'
                : evaluationResult
                ? `(${evaluationResult.overallScore}/100)`
                : ''}
            </span>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(340px, 460px) 1fr',
          gap: '1.75rem',
          alignItems: 'start',
        }}
        className="studio-grid"
      >
        {/* Controls Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Card: Configuration Inputs */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Topic Input */}
            <div className="form-group">
              <label className="form-label" htmlFor="topic-input">
                <span>Topic / Content Idea *</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Be as specific as you like</span>
              </label>
              <textarea
                id="topic-input"
                className="input-textarea"
                placeholder="e.g. 5 habits of top creators, or How to use AI tools for growth..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={3}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.45rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', alignSelf: 'center' }}>Try an example:</span>
                {[
                  '5 habits of top creators',
                  'How to automate content with AI',
                  '3 mistakes beginners make',
                ].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setTopic(s)}
                    style={{
                      fontSize: '0.72rem',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(99, 102, 241, 0.1)',
                      border: '1px solid rgba(99, 102, 241, 0.25)',
                      color: '#a5b4fc',
                      cursor: 'pointer',
                    }}
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Format Selector */}
            <div className="form-group">
              <label className="form-label">Content Format</label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.6rem',
                }}
              >
                {formatOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = format === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setFormat(opt.id)}
                      style={{
                        padding: '0.75rem 0.65rem',
                        borderRadius: '10px',
                        border: isSelected
                          ? '2px solid var(--primary)'
                          : '1px solid var(--border-subtle)',
                        backgroundColor: isSelected
                          ? 'var(--primary-light)'
                          : 'var(--bg-input)',
                        color: isSelected ? 'var(--text-main)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: '0.3rem',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <Icon size={16} color={isSelected ? 'var(--primary)' : 'var(--text-dim)'} />
                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{opt.label}</span>
                      </div>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          color: 'var(--text-dim)',
                          lineHeight: 1.25,
                        }}
                      >
                        {opt.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Audience */}
            <div className="form-group">
              <label className="form-label" htmlFor="audience-input">
                <span>Target Audience</span>
              </label>
              <input
                id="audience-input"
                type="text"
                className="input-text"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="e.g. Beginners, Entrepreneurs..."
                style={{ marginBottom: '0.5rem' }}
              />
              {/* Quick Pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {audiencePresets.map((aud) => (
                  <button
                    key={aud}
                    type="button"
                    onClick={() => setAudience(aud)}
                    style={{
                      fontSize: '0.74rem',
                      padding: '0.25rem 0.55rem',
                      borderRadius: '999px',
                      border: '1px solid',
                      borderColor: audience === aud ? 'var(--primary)' : 'var(--border-subtle)',
                      backgroundColor: audience === aud ? 'var(--primary-light)' : 'rgba(255,255,255,0.03)',
                      color: audience === aud ? '#a5b4fc' : 'var(--text-dim)',
                      cursor: 'pointer',
                    }}
                  >
                    {aud}
                  </button>
                ))}
              </div>
            </div>

            {/* Tone Selector */}
            <div className="form-group">
              <label className="form-label" htmlFor="tone-input">
                <span>Writing Tone</span>
              </label>
              <input
                id="tone-input"
                type="text"
                className="input-text"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="e.g. Educational, Friendly..."
                style={{ marginBottom: '0.5rem' }}
              />
              {/* Quick Pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {tonePresets.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTone(t)}
                    style={{
                      fontSize: '0.74rem',
                      padding: '0.25rem 0.55rem',
                      borderRadius: '999px',
                      border: '1px solid',
                      borderColor: tone === t ? 'var(--primary)' : 'var(--border-subtle)',
                      backgroundColor: tone === t ? 'var(--primary-light)' : 'rgba(255,255,255,0.03)',
                      color: tone === t ? '#a5b4fc' : 'var(--text-dim)',
                      cursor: 'pointer',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Engine Status Card */}
            <div
              style={{
                paddingTop: '0.75rem',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <label className="form-label">
                <span>AI Generation Engine</span>
              </label>

              <div
                style={{
                  padding: '0.85rem 1rem',
                  backgroundColor: 'rgba(99, 102, 241, 0.08)',
                  borderRadius: '10px',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(99, 102, 241, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-cyan)',
                    }}
                  >
                    <Sparkles size={17} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                      Google Gemini 3.5 Flash
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                      Ultra-fast cloud generation with auto-failover
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--accent-emerald)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    padding: '0.25rem 0.65rem',
                    borderRadius: '999px',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-emerald)' }} />
                  <span>Ready</span>
                </div>
              </div>
            </div>

            {/* Action Buttons: Single Format or 1-Click Chain */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.5rem' }}>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || isRunningChain}
                className="btn btn-secondary"
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  fontSize: '0.94rem',
                  justifyContent: 'center',
                }}
              >
                {isGenerating && !isRunningChain ? (
                  <>
                    <RefreshCw size={17} className="spin-animation" style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Generating {format}...</span>
                  </>
                ) : (
                  <>
                    <Zap size={17} />
                    <span>Generate Single Format (Agent 2)</span>
                  </>
                )}
              </button>

              <button
                onClick={handleRunAutonomousChain}
                disabled={isGenerating || isRunningChain}
                className="btn"
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  fontSize: '0.96rem',
                  background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
                  color: '#fff',
                  border: 'none',
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                  cursor: isGenerating || isRunningChain ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontWeight: 700,
                  borderRadius: '8px',
                }}
              >
                {isRunningChain ? (
                  <>
                    <RefreshCw size={17} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>
                      {chainStep === 1 && 'Agent 1: Scouting Trend...'}
                      {chainStep === 2 && 'Agent 2: Building Script...'}
                      {chainStep === 3 && 'Agent 3: Critiquing Retention...'}
                      {chainStep === 0 && 'Executing Autonomous Chain...'}
                    </span>
                  </>
                ) : (
                  <>
                    <Sparkles size={17} />
                    <span>⚡ Run 1-Click 3-Agent Chain (End-to-End)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Output Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Error Banner */}
          {errorState && (
            <div
              className="card"
              style={{
                borderColor: 'rgba(244, 63, 94, 0.4)',
                backgroundColor: 'rgba(244, 63, 94, 0.08)',
                padding: '1.25rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.85rem',
              }}
            >
              <AlertCircle size={20} color="var(--accent-rose)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h4 style={{ color: 'var(--accent-rose)', fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.2rem' }}>
                  {errorState.title}
                </h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', lineHeight: 1.5 }}>
                  {errorState.message}
                </p>
              </div>
            </div>
          )}

          {/* Loading State Skeleton */}
          {isGenerating && (
            <div className="card" style={{ padding: '2.5rem 2rem', textAlign: 'center' }}>
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(99, 102, 241, 0.15)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem',
                }}
              >
                <RefreshCw size={26} style={{ animation: 'spin 1.2s linear infinite' }} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Formulating Your {format}...
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: '440px', margin: '0 auto' }}>
                Synthesizing creative content with Google Gemini AI...
              </p>
            </div>
          )}

          {/* Generated Result Card */}
          {!isGenerating && generatedResult && (
            <div className="card" style={{ padding: '1.75rem', borderColor: 'rgba(99, 102, 241, 0.35)' }}>
              {/* Header Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: '1.25rem',
                  borderBottom: '1px solid var(--border-subtle)',
                  marginBottom: '1.25rem',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <FormatBadge format={generatedResult.format} />
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                      {generatedResult.topic}
                    </h3>
                    <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                      <span>Model: Google Gemini ({generatedResult.model})</span>
                      <span>•</span>
                      <span>Audience: {generatedResult.audience}</span>
                    </div>
                  </div>
                </div>

                {/* Result Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {/* Agent 3 Critic Evaluation Button */}
                  <button
                    onClick={handleEvaluate}
                    disabled={isEvaluating}
                    className="btn btn-secondary btn-sm"
                    style={{
                      backgroundColor: evaluationResult ? 'rgba(16, 185, 129, 0.12)' : 'rgba(99, 102, 241, 0.15)',
                      borderColor: evaluationResult ? 'rgba(16, 185, 129, 0.35)' : 'rgba(99, 102, 241, 0.4)',
                      color: evaluationResult ? 'var(--accent-emerald)' : '#a5b4fc',
                      fontWeight: 600,
                    }}
                    title="Evaluate script quality with Agent 3 (Content Critic)"
                  >
                    {isEvaluating ? (
                      <>
                        <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                        <span>Evaluating...</span>
                      </>
                    ) : evaluationResult ? (
                      <>
                        <ShieldCheck size={14} />
                        <span>Critic Score: {evaluationResult.overallScore}/100</span>
                      </>
                    ) : (
                      <>
                        <Award size={14} color="var(--accent-cyan)" />
                        <span>Evaluate Script (Agent 3)</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => onCopyContent(generatedResult.content)}
                    className="btn btn-secondary btn-sm"
                    title="Copy formatted content to clipboard"
                  >
                    <Copy size={14} />
                    <span>Copy</span>
                  </button>

                  <button
                    onClick={handleSave}
                    disabled={hasSavedCurrent}
                    className="btn btn-secondary btn-sm"
                    style={hasSavedCurrent ? { borderColor: 'var(--accent-emerald)', color: 'var(--accent-emerald)' } : {}}
                    title="Save to your Saved Content library"
                  >
                    {hasSavedCurrent ? <Check size={14} /> : <BookmarkPlus size={14} />}
                    <span>{hasSavedCurrent ? 'Saved' : 'Save'}</span>
                  </button>

                  <button
                    onClick={handleGenerate}
                    className="btn btn-ghost btn-sm"
                    title="Regenerate with current settings"
                  >
                    <RefreshCw size={14} />
                    <span>Generate Again</span>
                  </button>
                </div>
              </div>

              {/* Agent 3 Quick Critic Summary Banner (if evaluated) */}
              {evaluationResult && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1.15rem',
                    marginBottom: '1.25rem',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(16, 185, 129, 0.2)',
                        color: 'var(--accent-emerald)',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                      }}
                    >
                      {evaluationResult.grade || 'A'}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        Agent 3 Content Score: {evaluationResult.overallScore}/100 ({evaluationResult.grade || 'A'})
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        Hook: {evaluationResult.metrics?.hookStrength || 8}/10 • Retention: {evaluationResult.metrics?.retentionPacing || 8}/10 • CTA: {evaluationResult.metrics?.ctaPower || 8}/10
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowEvaluationModal(true)}
                    className="btn btn-ghost btn-sm"
                    style={{
                      color: 'var(--accent-emerald)',
                      borderColor: 'rgba(16, 185, 129, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <span>View Full Scorecard & Hook</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              )}

              {/* Formatted Content Body */}
              <div
                style={{
                  backgroundColor: 'var(--bg-input)',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  border: '1px solid var(--border-subtle)',
                  maxHeight: '650px',
                  overflowY: 'auto',
                }}
              >
                <pre
                  style={{
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.94rem',
                    lineHeight: 1.7,
                    color: 'var(--text-main)',
                  }}
                >
                  {generatedResult.content}
                </pre>
              </div>
            </div>
          )}

          {/* Evaluation Scorecard Modal (Agent 3) */}
          {showEvaluationModal && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(5px)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
              }}
            >
              <div
                className="card"
                style={{
                  width: '100%',
                  maxWidth: '680px',
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'rgba(99, 102, 241, 0.35)',
                  padding: '1.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem',
                  position: 'relative',
                  boxShadow: 'var(--shadow-lg)',
                }}
              >
                {/* Modal Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    paddingBottom: '1rem',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(99, 102, 241, 0.15)',
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Award size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                        Agent 3: Content Critic & Evaluator
                      </h3>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Deep algorithmic analysis of hook retention, pacing, and conversion impact.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowEvaluationModal(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '6px',
                    }}
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Loading State */}
                {isEvaluating && (
                  <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
                    <RefreshCw size={32} style={{ animation: 'spin 1.2s linear infinite', margin: '0 auto 1rem', color: 'var(--primary)' }} />
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                      Agent 3 is Evaluating Script Quality...
                    </h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      Analyzing hook psychology, audience retention curve, clarity score, and formulating optimized alternatives...
                    </p>
                  </div>
                )}

                {/* Error State */}
                {!isEvaluating && evaluationError && (
                  <div
                    style={{
                      padding: '1.25rem',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(244, 63, 94, 0.1)',
                      border: '1px solid rgba(244, 63, 94, 0.3)',
                    }}
                  >
                    <h4 style={{ color: 'var(--accent-rose)', margin: '0 0 0.35rem' }}>Evaluation Failed</h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', margin: '0 0 1rem' }}>
                      {evaluationError}
                    </p>
                    <button onClick={handleEvaluate} className="btn btn-secondary btn-sm">
                      Retry Evaluation
                    </button>
                  </div>
                )}

                {/* Scorecard Results */}
                {!isEvaluating && evaluationResult && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Top Score Box */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '120px 1fr',
                        gap: '1.25rem',
                        alignItems: 'center',
                        padding: '1.25rem',
                        borderRadius: '12px',
                        backgroundColor: 'rgba(99, 102, 241, 0.08)',
                        border: '1px solid rgba(99, 102, 241, 0.25)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '1rem',
                          borderRadius: '10px',
                          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(6, 182, 212, 0.2))',
                          border: '1px solid rgba(99, 102, 241, 0.35)',
                          textAlign: 'center',
                        }}
                      >
                        <span style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>
                          {evaluationResult.overallScore}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Out of 100
                        </span>
                        <span
                          style={{
                            marginTop: '0.35rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '999px',
                            backgroundColor: 'rgba(16, 185, 129, 0.2)',
                            color: 'var(--accent-emerald)',
                          }}
                        >
                          Grade: {evaluationResult.grade || 'A'}
                        </span>
                      </div>

                      <div>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                          Content Critic Verdict
                        </h4>
                        <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.55, margin: 0 }}>
                          {evaluationResult.verdict}
                        </p>
                      </div>
                    </div>

                    {/* 4 Core Metrics Sliders */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '1rem',
                        padding: '1rem',
                        borderRadius: '10px',
                        backgroundColor: 'var(--bg-input)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      {[
                        { label: 'Hook Strength', key: 'hookStrength', color: '#6366f1' },
                        { label: 'Retention & Pacing', key: 'retentionPacing', color: '#06b6d4' },
                        { label: 'CTA Power', key: 'ctaPower', color: '#10b981' },
                        { label: 'Clarity & Value', key: 'clarityValue', color: '#f59e0b' },
                      ].map((m) => {
                        const val = evaluationResult.metrics?.[m.key] || 8;
                        return (
                          <div key={m.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{m.label}</span>
                              <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>{val} / 10</span>
                            </div>
                            <div
                              style={{
                                width: '100%',
                                height: '6px',
                                borderRadius: '999px',
                                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: `${Math.min(val * 10, 100)}%`,
                                  height: '100%',
                                  borderRadius: '999px',
                                  backgroundColor: m.color,
                                  transition: 'width 0.4s ease',
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Strengths & Improvements */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      {/* Strengths */}
                      <div
                        style={{
                          padding: '1rem',
                          borderRadius: '10px',
                          backgroundColor: 'rgba(16, 185, 129, 0.05)',
                          border: '1px solid rgba(16, 185, 129, 0.2)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.65rem' }}>
                          <CheckCircle2 size={16} color="var(--accent-emerald)" />
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                            Key Strengths
                          </span>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '1.15rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          {(evaluationResult.strengths || []).map((s, idx) => (
                            <li key={idx} style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Improvements */}
                      <div
                        style={{
                          padding: '1rem',
                          borderRadius: '10px',
                          backgroundColor: 'rgba(245, 158, 11, 0.05)',
                          border: '1px solid rgba(245, 158, 11, 0.2)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.65rem' }}>
                          <Lightbulb size={16} color="var(--accent-amber)" />
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-amber)' }}>
                            Actionable Improvements
                          </span>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '1.15rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          {(evaluationResult.improvements || []).map((item, idx) => (
                            <li key={idx} style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* AI-Optimized Hook Alternative */}
                    {evaluationResult.optimizedHook && (
                      <div
                        style={{
                          padding: '1.15rem',
                          borderRadius: '12px',
                          backgroundColor: 'rgba(6, 182, 212, 0.08)',
                          border: '1px solid rgba(6, 182, 212, 0.3)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <Sparkles size={16} color="var(--accent-cyan)" />
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                              High-Retention Hook Alternative
                            </span>
                          </div>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                            Generated by Agent 3
                          </span>
                        </div>

                        <div
                          style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '8px',
                            backgroundColor: 'var(--bg-input)',
                            fontStyle: 'italic',
                            fontSize: '0.88rem',
                            color: 'var(--text-main)',
                            border: '1px solid var(--border-subtle)',
                            lineHeight: 1.5,
                          }}
                        >
                          "{evaluationResult.optimizedHook}"
                        </div>

                        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.2rem' }}>
                          <button
                            onClick={() => handleApplyOptimizedHook(evaluationResult.optimizedHook)}
                            className="btn btn-primary btn-sm"
                            style={{ flex: 1, justifyContent: 'center' }}
                          >
                            <Check size={14} />
                            <span>Apply Hook to Script</span>
                          </button>

                          <button
                            onClick={() => onCopyContent(evaluationResult.optimizedHook)}
                            className="btn btn-secondary btn-sm"
                          >
                            <Copy size={14} />
                            <span>Copy Hook</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empty Prompt Placeholder */}
          {!isGenerating && !generatedResult && !errorState && (
            <div className="card empty-state" style={{ minHeight: '380px' }}>
              <div className="empty-state-icon">
                <Sparkles size={26} />
              </div>
              <h3>Ready to Create</h3>
              <p>
                Enter your topic or idea on the left, pick your preferred format and tone, and click <strong>Generate Content</strong>.
              </p>
              <div
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  marginTop: '0.75rem',
                  fontSize: '0.8rem',
                  color: 'var(--text-dim)',
                }}
              >
                <span>💡 Tip: Check <strong>Trend Radar</strong> to grab trending topics with 1 click!</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 900px) {
          .studio-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
