'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Database, 
  FileSpreadsheet, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  UploadCloud, 
  ArrowRight,
  HelpCircle,
  Activity
} from 'lucide-react';
import { InstagramIcon } from '@/components/icons';
import { api } from '@/lib/api';
import { JobStatus } from '@/types';

interface IngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalysisStarted: (jobId: string) => void;
  activeJob: JobStatus | null;
}

export const IngestModal: React.FC<IngestModalProps> = ({
  isOpen,
  onClose,
  onAnalysisStarted,
  activeJob
}) => {
  const [activeSource, setActiveSource] = useState<'demo' | 'csv' | 'instagram'>('demo');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [instagramInfo, setInstagramInfo] = useState<{
    enabled: boolean;
    configured: boolean;
    status: string;
    description: string;
    todo: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.getInstagramStatus()
        .then(setInstagramInfo)
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleIngestDemo = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.ingestDemo();
      setSuccessMessage(`Loaded ${res.count} realistic creator comments!`);
      const analyzeRes = await api.startAnalysis(res.job_id);
      onAnalysisStarted(analyzeRes.job_id);
    } catch (err: any) {
      setError(err.message || 'Failed to ingest demo dataset');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCsvUpload = async () => {
    if (!csvFile) {
      setError('Please select a valid CSV file first.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.ingestCsv(csvFile);
      setSuccessMessage(`Uploaded ${res.count} comments from ${csvFile.name}!`);
      const analyzeRes = await api.startAnalysis(res.job_id);
      onAnalysisStarted(analyzeRes.job_id);
    } catch (err: any) {
      setError(err.message || 'Failed to parse and upload CSV');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#141E17] rounded-3xl border border-[#E2EDE5] dark:border-slate-800 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2EDE5] dark:border-slate-800 bg-[#F8FAF8] dark:bg-[#19271E]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#EAF6EE] text-[#28663D] flex items-center justify-center border border-[#CDE9D5]">
              <UploadCloud className="w-4 h-4 text-[#3B8253]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#152218] dark:text-white">
                Connect Audience Comment Data
              </h2>
              <p className="text-xs text-[#5C6F62] dark:text-[#8FA596]">
                Choose how you want to ingest Instagram comments
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#5C6F62] hover:text-[#152218] dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Source Switcher Tabs */}
        <div className="grid grid-cols-3 p-3 gap-2 border-b border-[#E2EDE5] dark:border-slate-800 bg-[#F8FAF8]/50 dark:bg-[#141E17]">
          <button
            onClick={() => { setActiveSource('demo'); setError(null); }}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition ${
              activeSource === 'demo'
                ? 'bg-[#3B8253] text-white shadow-xs'
                : 'text-[#5C6F62] hover:text-[#152218] hover:bg-white dark:hover:bg-[#19271E]'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>1. Demo Dataset</span>
          </button>

          <button
            onClick={() => { setActiveSource('csv'); setError(null); }}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition ${
              activeSource === 'csv'
                ? 'bg-[#3B8253] text-white shadow-xs'
                : 'text-[#5C6F62] hover:text-[#152218] hover:bg-white dark:hover:bg-[#19271E]'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>2. CSV Upload</span>
          </button>

          <button
            onClick={() => { setActiveSource('instagram'); setError(null); }}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition ${
              activeSource === 'instagram'
                ? 'bg-[#3B8253] text-white shadow-xs'
                : 'text-[#5C6F62] hover:text-[#152218] hover:bg-white dark:hover:bg-[#19271E]'
            }`}
          >
            <InstagramIcon className="w-4 h-4" />
            <span>3. Instagram API</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3.5 rounded-xl bg-[#EAF6EE] border border-[#CDE9D5] text-[#28663D] text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#3B8253]" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* TAB 1: DEMO DATASET */}
          {activeSource === 'demo' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-[#F4FAF5] dark:bg-[#19271E] border border-[#CDE9D5] dark:border-[#2D4C39] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#28663D] dark:text-[#93DBA6]">
                    Seeded Creator Account
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EAF6EE] text-[#28663D] border border-[#CDE9D5]">
                    300 Instagram Comments
                  </span>
                </div>
                <h3 className="text-sm font-bold text-[#152218] dark:text-white">
                  @DevWithArjun (18 Posts across Reels, Carousels & Images)
                </h3>
                <p className="text-xs text-[#5C6F62] dark:text-[#8FA596] leading-relaxed">
                  Realistically populated with English and Hinglish comments, requests (&ldquo;bhai part 2 kab aayega&rdquo;), questions, praise, confusion, friend @mentions, and spam promotions.
                </p>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#CDE9D5] dark:border-slate-800 text-center">
                  <div className="p-2 rounded-xl bg-white dark:bg-[#141E17] border border-[#E2EDE5] dark:border-slate-700">
                    <p className="text-[10px] text-[#5C6F62]">Formats</p>
                    <p className="text-xs font-bold text-[#152218] dark:text-white">Reels & Carousels</p>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-[#141E17] border border-[#E2EDE5] dark:border-slate-700">
                    <p className="text-[10px] text-[#5C6F62]">Signals</p>
                    <p className="text-xs font-bold text-[#28663D] dark:text-[#93DBA6]">Likes & Replies</p>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-[#141E17] border border-[#E2EDE5] dark:border-slate-700">
                    <p className="text-[10px] text-[#5C6F62]">Clusters</p>
                    <p className="text-xs font-bold text-[#3B8253] dark:text-[#6EC886]">18 Themes</p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleIngestDemo}
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-[#3B8253] hover:bg-[#2F6A44] text-white font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    <span>Loading & Running Engine...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Load Demo & Run Analysis</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 2: CSV UPLOAD */}
          {activeSource === 'csv' && (
            <div className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition cursor-pointer ${
                  csvFile
                    ? 'border-[#3B8253] bg-[#EAF6EE]/30'
                    : 'border-[#CDE9D5] hover:border-[#3B8253]'
                }`}
                onClick={() => document.getElementById('csv-file-input')?.click()}
              >
                <input
                  id="csv-file-input"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setCsvFile(e.target.files[0]);
                    }
                  }}
                />
                <FileSpreadsheet className="w-10 h-10 mx-auto text-[#3B8253] mb-2" />
                <p className="text-sm font-semibold text-[#152218] dark:text-white">
                  {csvFile ? csvFile.name : 'Click to select or drop CSV file'}
                </p>
                <p className="text-xs text-[#5C6F62] mt-1">
                  Required columns: <code className="text-[#28663D] dark:text-[#93DBA6]">comment_id, username, text, likes, timestamp</code>
                </p>
                {csvFile && (
                  <p className="text-[11px] text-[#28663D] font-medium mt-2">
                    ✓ File ready ({(csvFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-[#5C6F62] bg-[#F8FAF8] dark:bg-[#19271E] p-3 rounded-xl border border-[#E2EDE5] dark:border-slate-800">
                <span>Sample CSV available:</span>
                <span className="text-[#28663D] dark:text-[#93DBA6] font-semibold">
                  backend/data/sample_comments.csv
                </span>
              </div>

              <button
                onClick={handleCsvUpload}
                disabled={!csvFile || isLoading}
                className="w-full py-3 px-4 rounded-xl bg-[#3B8253] hover:bg-[#2F6A44] text-white font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    <span>Processing CSV File...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload & Run Engine</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 3: INSTAGRAM GRAPH API */}
          {activeSource === 'instagram' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-[#F4FAF5] dark:bg-[#19271E] border border-[#CDE9D5] dark:border-[#2D4C39] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <InstagramIcon className="w-5 h-5 text-[#3B8253]" />
                    <span className="text-sm font-bold text-[#152218] dark:text-white">
                      Official Meta Graph API Connector
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EAF6EE] text-[#28663D] border border-[#CDE9D5]">
                    Creator / Business Account
                  </span>
                </div>

                <p className="text-xs text-[#5C6F62] dark:text-[#8FA596] leading-relaxed">
                  Direct live synchronization from your own Instagram Creator or Business account via Meta Graph API v19.0.
                </p>

                <div className="space-y-1.5 text-xs text-[#5C6F62] dark:text-[#8FA596]">
                  <p className="font-semibold text-[#152218] dark:text-white">Prerequisites:</p>
                  <ul className="list-disc pl-4 space-y-1 text-[11px]">
                    <li>Meta Developer App with instagram_basic permissions</li>
                    <li>Instagram Business/Creator Account linked to a Facebook Page</li>
                    <li>Set INSTAGRAM_ACCESS_TOKEN in your .env configuration</li>
                  </ul>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white dark:bg-[#141E17] border border-[#E2EDE5] dark:border-slate-800 text-xs text-[#5C6F62] flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-[#3B8253] mt-0.5 shrink-0" />
                <span>
                  The app runs 100% autonomously in Demo Mode and CSV Upload mode without needing an active Meta API token.
                </span>
              </div>
            </div>
          )}

          {/* ACTIVE PIPELINE PROGRESS INDICATOR */}
          {activeJob && activeJob.status === 'processing' && (
            <div className="mt-6 pt-4 border-t border-[#E2EDE5] dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#152218] dark:text-white flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-[#3B8253] animate-spin" />
                  {activeJob.stage}
                </span>
                <span className="font-bold text-[#3B8253] dark:text-[#6EC886]">
                  {activeJob.progress}%
                </span>
              </div>
              <div className="w-full h-2 bg-[#EAF6EE] dark:bg-[#19271E] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#3B8253] transition-all duration-300 rounded-full"
                  style={{ width: `${activeJob.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
