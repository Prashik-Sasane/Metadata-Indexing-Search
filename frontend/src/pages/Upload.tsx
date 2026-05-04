import { useMemo, useState } from 'react';
import { filesAPI } from '../api/client';
import { Link, useNavigate } from 'react-router-dom';
import {
  Binary, Upload as UploadIcon,
  Tag, ChevronLeft, ArrowUpRight,
  Cpu, Check, Info, Loader2,
  FileText, Sparkles
} from 'lucide-react';

export default function Upload() {
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [tagsCsv, setTagsCsv] = useState('');

  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<string>('Ready for ingestion');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const canSubmit = useMemo(() => !!file && !isUploading, [file, isUploading]);

  const onUpload = async () => {
    if (!file || !canSubmit) return;

    setError(null);
    setResult(null);
    setIsUploading(true);

    try {
      setUploadStep('Uploading & parsing content...');

      const response = await filesAPI.upload(file, tagsCsv);
      const data = response.data?.data;

      setResult(data);
      setUploadStep('Complete.');

      setTimeout(() => {
        if (data?.id) navigate(`/files/${data.id}`);
      }, 2500);
    } catch (e: any) {
      console.error(e);
      setError(e?.error || e?.message || 'Upload failed');
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100">
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#f8fafc_1px,transparent_1px),linear-gradient(to_bottom,#f8fafc_1px,transparent_1px)] bg-size-[4rem_4rem] -z-10 opacity-70"></div>

      {/* Navigation — same as Dashboard */}
      <nav className="border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3 font-bold text-lg tracking-tight">
            <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center shadow-lg shadow-slate-200">
              <Binary className="text-white" size={18} />
            </div>
            <span>Meta<span className="text-blue-600 font-extrabold">Index</span> Console</span>
          </Link>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-8 text-[11px] font-black uppercase tracking-widest text-slate-400">
              <Link to="/dashboard" className="hover:text-slate-900 transition-colors">Overview</Link>
              <Link to="/search" className="hover:text-slate-900 transition-colors">Search</Link>
              <button className="text-slate-900 border-b-2 border-blue-600 pb-1">Upload</button>
              <Link to="/crawler" className="hover:text-slate-900 transition-colors">Crawler</Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-8 py-10">
        <div className="mb-10">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors mb-4 uppercase tracking-widest">
            <ChevronLeft size={14} /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Cpu size={20} /></div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Data Ingestion</h1>
          </div>
          <p className="text-slate-500 text-sm">Upload files to S3, auto-parse content, and index metadata in DSA structures.</p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8">
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="p-8 space-y-8">
                {/* Drop Zone */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); setFile(e.dataTransfer.files[0]); setResult(null); }}
                  className={`relative border-2 border-dashed rounded-2xl p-10 transition-all group flex flex-col items-center justify-center text-center
                    ${file ? 'border-emerald-500 bg-emerald-50/20' : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50/50'}`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-300
                    ${file ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:scale-110'}`}>
                    {file ? <Check size={24} /> : <UploadIcon size={24} />}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{file ? file.name : 'Click or drag to upload payload'}</h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                    {file ? `${(file.size / 1024).toFixed(2)} KB • ${file.type || 'Unknown type'}` : 'Supports TXT, CSV, JSON, PDF, MD • Max 500MB'}
                  </p>
                  <input type="file" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); }} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>

                {/* Tags Input */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                    <Tag size={12} /> Index Tags
                  </label>
                  <input
                    value={tagsCsv}
                    onChange={(e) => setTagsCsv(e.target.value)}
                    placeholder="e.g. report, finance, 2024"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold outline-none focus:bg-white focus:border-blue-500 transition-all"
                  />
                </div>

                {/* Parsed Result Preview */}
                {result && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-emerald-100 flex items-center gap-2">
                      <Sparkles size={14} className="text-emerald-600" />
                      <span className="text-xs font-black text-emerald-700 uppercase tracking-wider">Parsed & Indexed</span>
                    </div>
                    <div className="p-5 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <ResultItem label="Words Parsed" value={result.wordCount?.toLocaleString() || '0'} />
                        <ResultItem label="Format" value={result.extractedMetadata?.format || '—'} />
                      </div>
                      {result.content && (
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <FileText size={10} /> Content Preview
                          </p>
                          <div className="bg-white rounded-xl p-3 text-xs text-slate-600 max-h-32 overflow-y-auto leading-relaxed whitespace-pre-wrap font-mono border border-slate-100">
                            {result.content}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                <Info size={14} /> Checkpoints
              </h4>
              <div className="space-y-4 mb-8">
                <StatusItem label="File Selected" active={!!file} />
                <StatusItem label="Tags Ready" active={true} />
                <StatusItem label="DSA Engine" active={true} />
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">System State</p>
                <div className="text-xs font-bold text-slate-700">
                  {isUploading ? (
                    <div className="flex items-center gap-2 text-blue-600">
                      <Loader2 size={12} className="animate-spin" />
                      {uploadStep}
                    </div>
                  ) : result ? (
                    <span className="text-emerald-600">✓ Upload Complete</span>
                  ) : (
                    <span className="text-slate-500 italic">Idle</span>
                  )}
                </div>
              </div>

              <button
                onClick={onUpload}
                disabled={!canSubmit}
                className={`w-full py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2
                    ${canSubmit ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
              >
                {isUploading ? 'Processing...' : 'Execute Upload'} <ArrowUpRight size={16} />
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex gap-3">
                <Info className="text-red-600 shrink-0" size={16} />
                <div className="text-xs font-bold text-red-800">{error}</div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

const StatusItem = ({ label, active }: { label: string, active: boolean }) => (
  <div className="flex items-center justify-between">
    <span className={`text-xs font-bold ${active ? 'text-slate-700' : 'text-slate-400'}`}>{label}</span>
    <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-300'}`}>
      <Check size={12} strokeWidth={3} />
    </div>
  </div>
);

const ResultItem = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-black">{label}</p>
    <p className="text-sm font-bold text-slate-700 mt-0.5">{value}</p>
  </div>
);