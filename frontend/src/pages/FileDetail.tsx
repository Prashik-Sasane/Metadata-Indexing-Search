import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { filesAPI } from '../api/client';
import { useState } from 'react';
import {
  Binary, ChevronLeft, Cpu, ArrowUpRight, Tag, FileText,
  User, Trash2, Download, Plus, Box
} from 'lucide-react';

export default function FileDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';
  const [newTag, setNewTag] = useState('');

  const { data: fileResponse, isLoading } = useQuery({
    queryKey: ['file', id],
    queryFn: () => filesAPI.getById(id!),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => filesAPI.delete(id!),
    onSuccess: () => navigate('/search'),
  });

  const updateTagsMutation = useMutation({
    mutationFn: (tags: Record<string, boolean>) => filesAPI.updateTags(id!, tags),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['file', id] }),
  });

  const handleAddTag = () => {
    if (!newTag.trim() || !file) return;
    const updatedTags = { ...(file.tags || {}), [newTag.trim()]: true };
    updateTagsMutation.mutate(updatedTags);
    setNewTag('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!file) return;
    const updatedTags = { ...(file.tags || {}) };
    delete updatedTags[tagToRemove];
    updateTagsMutation.mutate(updatedTags);
  };

  const handleDelete = () => {
    if (confirm('Delete this file? This removes it from all DSA indexes.')) {
      deleteMutation.mutate();
    }
  };

  const handleDownload = async () => {
    try {
      const response = await filesAPI.getDownloadUrl(id!);
      const url = response.data?.data?.downloadUrl;
      if (url) {
        // If it's a relative URL (local), prefix with API base
        if (url.startsWith('/api/')) {
          window.open(`http://localhost:3000${url}`, '_blank');
        } else {
          window.open(url, '_blank');
        }
      }
    } catch {
      alert('Download failed');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans flex items-center justify-center">
        <p className="text-slate-400 font-medium">Loading file details...</p>
      </div>
    );
  }

  const file = fileResponse?.data?.data;
  if (!file) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 font-medium mb-2">File not found</p>
          <Link to="/dashboard" className="text-blue-600 text-sm hover:underline">← Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Nav */}
      <nav className="h-16 border-b border-slate-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3 font-bold text-lg tracking-tight">
            <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center shadow-lg shadow-slate-200">
              <Binary className="text-white" size={18} />
            </div>
            <span>Meta<span className="text-blue-600 font-extrabold">Index</span> Console</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
              <User size={16} />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-8 py-10">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors mb-4 uppercase tracking-widest">
            <ChevronLeft size={14} /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Cpu size={20} /></div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">{file.name}</h1>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Main Content */}
          <div className="lg:col-span-8 space-y-6">
            {/* Metadata Card */}
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="p-8">
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">File Metadata</h2>
                <div className="grid grid-cols-2 gap-6">
                  <MetaItem label="File ID" value={file.id} mono />
                  <MetaItem label="S3 Key" value={file.s3_key} mono />
                  <MetaItem label="Size" value={file.sizeFormatted || `${file.size} bytes`} />
                  <MetaItem label="MIME Type" value={file.mime_type || 'N/A'} />
                  <MetaItem label="Bucket" value={file.bucket} />
                  <MetaItem label="Created" value={new Date(file.created_at).toLocaleString()} />
                  <MetaItem label="Owner" value={file.owner_id || 'Not set'} />
                  <MetaItem label="Words Parsed" value={file.wordCount?.toLocaleString() || '0'} />
                </div>
              </div>
            </div>

            {/* Tags Card */}
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="p-8">
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <Tag size={12} className="text-blue-600" /> Tags (AVL Tree Indexed)
                </h2>
                <div className="flex flex-wrap gap-2 mb-6">
                  {file.tags && Object.keys(file.tags).length > 0 ? (
                    Object.keys(file.tags).map((tag: string) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-bold group"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="text-emerald-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 text-sm"
                        >
                          ×
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">No tags assigned</span>
                  )}
                </div>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Add a tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold outline-none focus:bg-white focus:border-blue-500 transition-all"
                  />
                  <button
                    onClick={handleAddTag}
                    disabled={!newTag.trim()}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>
              </div>
            </div>

            {/* Parsed Content */}
            {file.content && (
              <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="p-8">
                  <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <FileText size={12} className="text-purple-600" /> Parsed Content
                    {file.wordCount > 0 && (
                      <span className="text-purple-600 normal-case tracking-normal">({file.wordCount.toLocaleString()} words)</span>
                    )}
                    {searchQuery && (
                      <span className="text-amber-600 normal-case tracking-normal ml-2">— highlighting "{searchQuery}"</span>
                    )}
                  </h2>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs text-slate-600 max-h-96 overflow-y-auto leading-relaxed whitespace-pre-wrap font-mono">
                    {searchQuery ? (
                      <HighlightContent text={file.content} query={searchQuery} />
                    ) : (
                      file.content
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Custom Metadata */}
            {file.custom && Object.keys(file.custom).length > 0 && (
              <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="p-8">
                  <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <Box size={12} className="text-amber-600" /> Extracted Metadata
                  </h2>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 font-mono text-xs text-slate-600 overflow-x-auto">
                    <pre>{JSON.stringify(file.custom, null, 2)}</pre>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Actions */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={handleDownload}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl group hover:border-blue-200 hover:bg-white transition-all text-left"
                >
                  <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900 transition-colors flex items-center gap-2">
                    <Download size={14} /> Download from S3
                  </span>
                  <ArrowUpRight size={14} className="text-slate-300 group-hover:text-blue-600 transition-all" />
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center justify-between p-4 bg-red-50 border border-red-100 rounded-2xl group hover:border-red-200 transition-all text-left"
                >
                  <span className="text-xs font-bold text-red-600 flex items-center gap-2">
                    <Trash2 size={14} /> Delete File
                  </span>
                  <ArrowUpRight size={14} className="text-red-300 group-hover:text-red-600 transition-all" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function MetaItem({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
      <p className={`mt-1 text-sm ${mono ? 'font-mono text-xs text-slate-600' : 'font-semibold text-slate-900'} break-all`}>{value || '—'}</p>
    </div>
  );
}

/**
 * Highlights all occurrences of a search query within text content
 */
function HighlightContent({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;

  const parts: { text: string; highlighted: boolean }[] = [];
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let lastIndex = 0;

  let idx = lowerText.indexOf(lowerQuery);
  while (idx !== -1) {
    // Add text before match
    if (idx > lastIndex) {
      parts.push({ text: text.substring(lastIndex, idx), highlighted: false });
    }
    // Add matched text
    parts.push({ text: text.substring(idx, idx + query.length), highlighted: true });
    lastIndex = idx + query.length;
    idx = lowerText.indexOf(lowerQuery, lastIndex);
  }
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({ text: text.substring(lastIndex), highlighted: false });
  }

  return (
    <>
      {parts.map((part, i) =>
        part.highlighted ? (
          <span key={i} className="bg-amber-200 text-amber-900 font-bold rounded-sm px-0.5">
            {part.text}
          </span>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </>
  );
}
