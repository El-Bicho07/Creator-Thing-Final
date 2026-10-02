import React, { useState, useRef } from 'react';
import { 
  UploadCloud, FileSpreadsheet, Download, CheckCircle2, 
  AlertTriangle, XCircle, ArrowRight, RotateCw, Check, Sparkles, Shield 
} from 'lucide-react';
import { importAPI, postsAPI } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

export default function CSVImportView({ onImportSuccess, onNavigate }) {
  const { notify } = useNotification();
  const fileInputRef = useRef(null);

  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [committing, setCommitting] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = async (file) => {
    if (!file.name.endsWith('.csv')) {
      notify('Please select a valid .csv file', 'error');
      return;
    }
    setSelectedFile(file);
    setParsing(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await importAPI.previewCSV(formData);
      if (res.data?.success) {
        setParseResult(res.data.data);
        notify(res.data.message, 'success');
      }
    } catch (err) {
      console.error(err);
      notify(err.response?.data?.message || 'Failed to parse CSV file', 'error');
      setParseResult(null);
    } finally {
      setParsing(false);
    }
  };

  const handleCommit = async () => {
    if (!parseResult || !parseResult.allRows) return;
    setCommitting(true);

    try {
      const recordsToCommit = parseResult.allRows
        .filter(r => r.isValid)
        .map(r => r.record);

      const res = await importAPI.commitImport(recordsToCommit, skipDuplicates);
      if (res.data?.success) {
        notify(res.data.message, 'success');
        onImportSuccess();
        onNavigate('library');
      }
    } catch (err) {
      notify(err.response?.data?.message || 'Import failed', 'error');
    } finally {
      setCommitting(false);
    }
  };

  const handleLoadDemoDataset = async () => {
    setIsDemoLoading(true);
    try {
      const res = await postsAPI.seedDemo(true); // force reset to clean 50
      if (res.data?.success) {
        notify('50 Realistic Synthetic Instagram records loaded!', 'success');
        onImportSuccess();
        onNavigate('library');
      }
    } catch (err) {
      notify('Failed to load demo dataset', 'error');
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Intro Header */}
      <div className="p-6 rounded-3xl card-glass border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-lime-accent" />
            Historical Data Ingestion & Validator
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
            Upload your creator export CSV. The schema validates caption length, interactions (likes, comments, shares, saves), detects duplicates, and normalizes media types.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href={importAPI.getSampleCSVUrl()}
            download="sample_instagram_data.csv"
            className="px-3.5 py-2 rounded-xl bg-charcoal-800 hover:bg-charcoal-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-lime-accent" />
            Download Sample CSV
          </a>

          <button
            onClick={handleLoadDemoDataset}
            disabled={isDemoLoading}
            className="px-4 py-2 rounded-xl bg-lime-accent hover:bg-lime-bright text-charcoal-950 text-xs font-bold flex items-center gap-2 shadow-glow-lime transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isDemoLoading ? 'Seeding...' : 'Load 50 Demo Posts'}
          </button>
        </div>
      </div>

      {/* Upload Drag & Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`p-10 border-2 border-dashed rounded-3xl text-center cursor-pointer transition-all duration-200 ${
          dragActive
            ? 'border-lime-accent bg-lime-muted/30 shadow-glow-lime'
            : 'border-slate-800 hover:border-slate-700 bg-charcoal-900/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="max-w-md mx-auto space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-charcoal-850 border border-slate-800 flex items-center justify-center mx-auto text-lime-accent shadow-glow-subtle">
            <FileSpreadsheet className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-base font-bold text-white">
              {selectedFile ? selectedFile.name : 'Choose a CSV file or drag & drop here'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Supports standard column headers: caption, mediaType, postDate, reach, likes, saves, shares
            </p>
          </div>

          {parsing ? (
            <div className="flex items-center justify-center gap-2 text-xs text-lime-bright font-semibold">
              <RotateCw className="w-4 h-4 animate-spin" />
              Parsing & running duplicate validator...
            </div>
          ) : (
            <span className="inline-block px-3 py-1 rounded-full bg-charcoal-800 text-[11px] font-medium text-slate-300 border border-slate-700">
              Browse Files
            </span>
          )}
        </div>
      </div>

      {/* Parse Preview & Validation Summary */}
      {parseResult && (
        <div className="space-y-6">
          
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl card-glass border border-slate-800">
              <p className="text-[11px] uppercase font-bold text-slate-400">Total Parsed</p>
              <h4 className="text-2xl font-bold text-white mt-1">{parseResult.totalParsed}</h4>
            </div>

            <div className="p-4 rounded-2xl card-glass border border-lime-500/30">
              <p className="text-[11px] uppercase font-bold text-lime-bright flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Valid Records
              </p>
              <h4 className="text-2xl font-bold text-white mt-1">{parseResult.validCount}</h4>
            </div>

            <div className="p-4 rounded-2xl card-glass border border-amber-500/30">
              <p className="text-[11px] uppercase font-bold text-amber-300 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Duplicates
              </p>
              <h4 className="text-2xl font-bold text-white mt-1">{parseResult.duplicateCount}</h4>
            </div>

            <div className="p-4 rounded-2xl card-glass border border-rose-500/30">
              <p className="text-[11px] uppercase font-bold text-rose-300 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> Invalid / Errors
              </p>
              <h4 className="text-2xl font-bold text-white mt-1">{parseResult.errorCount}</h4>
            </div>
          </div>

          {/* Action Commit Bar */}
          <div className="p-5 rounded-2xl bg-charcoal-850 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={(e) => setSkipDuplicates(e.target.checked)}
                className="w-4 h-4 rounded text-lime-accent focus:ring-lime-accent bg-charcoal-900 border-slate-700"
              />
              <span>Automatically skip existing duplicates to prevent double-counting</span>
            </label>

            <button
              onClick={handleCommit}
              disabled={committing || parseResult.validCount === 0}
              className="py-2.5 px-6 rounded-xl bg-lime-accent hover:bg-lime-bright text-charcoal-950 font-bold text-sm flex items-center justify-center gap-2 shadow-glow-lime transition-all disabled:opacity-50"
            >
              {committing ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  Saving to Database...
                </>
              ) : (
                <>
                  Confirm Import ({parseResult.validCount} records)
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Validation Data Table Preview */}
          <div className="rounded-2xl card-glass border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800/80 bg-charcoal-900 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Sample Ingestion Preview (Top 25 rows)
              </h4>
              <span className="text-[11px] text-slate-400">
                Normalized and field-checked
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-charcoal-950/80 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Post ID</th>
                    <th className="py-3 px-4">Caption</th>
                    <th className="py-3 px-4">Format</th>
                    <th className="py-3 px-4 text-right">Reach</th>
                    <th className="py-3 px-4 text-right">Likes</th>
                    <th className="py-3 px-4 text-right">Saves</th>
                    <th className="py-3 px-4">Warnings/Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {parseResult.previewRows.slice(0, 25).map((row, idx) => (
                    <tr key={idx} className="hover:bg-charcoal-850/50 transition-colors">
                      <td className="py-3 px-4">
                        {row.isValid && !row.isDuplicate && (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                          </span>
                        )}
                        {row.isDuplicate && (
                          <span className="inline-flex items-center gap-1 text-amber-400 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5" /> Duplicate
                          </span>
                        )}
                        {!row.isValid && (
                          <span className="inline-flex items-center gap-1 text-rose-400 font-medium">
                            <XCircle className="w-3.5 h-3.5" /> Invalid
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
                        {row.record.originalId}
                      </td>
                      <td className="py-3 px-4 text-slate-200 max-w-xs truncate" title={row.record.caption}>
                        {row.record.caption}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-charcoal-800 text-slate-300 font-medium text-[10px]">
                          {row.record.mediaType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-200">
                        {row.record.reach?.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-200">
                        {row.record.likes?.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-lime-bright font-bold">
                        {row.record.saves?.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {row.warnings?.join(', ') || 'Ready for ingest'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
