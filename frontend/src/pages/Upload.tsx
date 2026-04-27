import { useMemo, useState } from 'react';
import axios from 'axios';
import { filesAPI } from '../api/client';
import { Link, useNavigate } from 'react-router-dom';
import {
  Binary, Upload as UploadIcon,
  Tag, Code, ChevronLeft, ArrowUpRight,
  Cpu, Shield, Check, Info, Loader2, User
} from 'lucide-react';

export default function Upload() {
  const navigate = useNavigate();

  // Core Form State (Dynamic)
  const [file, setFile] = useState<File | null>(null);
  const [ownerId, setOwnerId] = useState('');
  const [tagsCsv, setTagsCsv] = useState('');
  const [customJson, setCustomJson] = useState('{\n  "priority": "high",\n  "encrypted": true\n}');

  // UI System States
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<string>('Ready for ingestion');
  const [error, setError] = useState<string | null>(null);

  // Validation Logic
  const isJsonValid = useMemo(() => {
    try { JSON.parse(customJson); return true; } catch { return false; }
  }, [customJson]);

  const canSubmit = useMemo(() => !!file && !isUploading && isJsonValid, [file, isUploading, isJsonValid]);

  const onUpload = async () => {
  if (!file || !canSubmit) return;

  setError(null);
  setIsUploading(true);

  try {
    setUploadStep('Authenticating handshake...');

    // ✅ STEP 1: Get upload URL
    const uploadRes = await filesAPI.getUploadUrl(
      file.name,
      file.type || 'application/octet-stream'
    );

    const { uploadUrl, s3Key, bucket } = uploadRes.data.data;

    if (!uploadUrl) throw new Error('Failed to get upload URL');

    // ✅ STEP 2: Upload to S3
    setUploadStep('Streaming to S3...');

    await axios.put(uploadUrl, file, {
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
      },
      onUploadProgress: (p) => {
        const percent = Math.round((p.loaded * 100) / (p.total || 1));
        setUploadStep(`Uploading: ${percent}%`);
      },
    });

    // ✅ STEP 3: Create metadata
    setUploadStep('Finalizing Index...');

    const createRes = await filesAPI.create({
      s3_key: s3Key,
      bucket,
      name: file.name,
      size: file.size,
      mime_type: file.type || 'application/octet-stream',
      owner_id: ownerId.trim() || undefined,
      tags: tagsCsv.split(',').reduce((acc, t) => {
        const tag = t.trim();
        if (tag) acc[tag] = true;
        return acc;
      }, {} as Record<string, boolean>),
      custom: JSON.parse(customJson),
    });

    const fileId = createRes.data.data?.id;

    setUploadStep('Complete.');

    setTimeout(() => {
      navigate(fileId ? `/files/${fileId}` : '/search');
    }, 600);

  } catch (e: any) {
    console.error(e);
    setError(e?.error || e?.message || 'Upload failed');
    setIsUploading(false);
  }
};

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <nav className="h-16 border-b border-slate-200 bg-white sticky top-0 z-50">
       <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          
            <div className="flex items-center gap-3 font-bold text-lg tracking-tight">
              <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center shadow-lg shadow-slate-200">
                <Binary className="text-white" size={18} />
              </div>
              <span>Meta<span className="text-blue-600 font-extrabold">Index</span> Console</span>
            </div>
         

          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
              <User size={16} />
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
          <p className="text-slate-500 text-sm">Upload binary payloads directly to S3 with automated metadata indexing.</p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8">
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="p-8 space-y-8">
                <div
                  onDragOver={(e) => { e.preventDefault(); }}
                  onDragLeave={() => {}}
                  onDrop={(e) => { e.preventDefault(); setFile(e.dataTransfer.files[0]); }}
                  className={`relative border-2 border-dashed rounded-2xl p-10 transition-all group flex flex-col items-center justify-center text-center
                    ${file ? 'border-emerald-500 bg-emerald-50/20' : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50/50'}`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-300
                    ${file ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:scale-110'}`}>
                    {file ? <Check size={24} /> : <UploadIcon size={24} />}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{file ? file.name : 'Click or drag to upload payload'}</h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                    {file ? `${(file.size / 1024).toFixed(2)} KB` : 'Maximum Size: 500MB'}
                  </p>
                  <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>

                {/* Input Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                  <InputField label="Identity Key (Owner)" icon={<Shield size={14} />} value={ownerId} onChange={setOwnerId} placeholder="Optional UUID" />
                  <InputField label="Index Tags" icon={<Tag size={14} />} value={tagsCsv} onChange={setTagsCsv} placeholder="e.g. logs, prod, aws" />
                </div>

                {/* Custom Metadata Editor */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Code size={14} /> Custom JSON Metadata
                    </label>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isJsonValid ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
                      {isJsonValid ? 'Valid' : 'Invalid Syntax'}
                    </span>
                  </div>
                  <textarea
                    value={customJson}
                    onChange={(e) => setCustomJson(e.target.value)}
                    rows={5}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-mono text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all shadow-inner"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Actions */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                <Info size={14} /> Checkpoints
              </h4>
              <div className="space-y-4 mb-8">
                <StatusItem label="File Readiness" active={!!file} />
                <StatusItem label="JSON Validation" active={isJsonValid} />
                <StatusItem label="Network Protocol" active={true} />
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">System State</p>
                <div className="text-xs font-bold text-slate-700">
                  {isUploading ? (
                    <div className="flex items-center gap-2 text-blue-600">
                      <Loader2 size={12} className="animate-spin" />
                      {uploadStep}
                    </div>
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

// Reusable Input Component
const InputField = ({ label, icon, value, onChange, placeholder }: any) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{label}</label>
    <div className="relative group">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">{icon}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs font-bold outline-none focus:bg-white focus:border-blue-500 transition-all"
      />
    </div>
  </div>
);

// Checklist Item Component
const StatusItem = ({ label, active }: { label: string, active: boolean }) => (
  <div className="flex items-center justify-between">
    <span className={`text-xs font-bold ${active ? 'text-slate-700' : 'text-slate-400'}`}>{label}</span>
    <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-300'}`}>
      <Check size={12} strokeWidth={3} />
    </div>
  </div>
);