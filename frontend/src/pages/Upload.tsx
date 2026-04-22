import { useMemo, useState } from 'react';
import axios from 'axios';
import { filesAPI } from '../api/client';
import { Link, useNavigate } from 'react-router-dom';

function parseTags(input: string): Record<string, boolean> {
  const tags = input
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const obj: Record<string, boolean> = {};
  for (const tag of tags) obj[tag] = true;
  return obj;
}

export default function Upload() {
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [ownerId, setOwnerId] = useState('');
  const [tagsCsv, setTagsCsv] = useState('');
  const [customJson, setCustomJson] = useState('{}');

  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => !!file && !isUploading, [file, isUploading]);

  async function onUpload() {
    if (!file) return;

    setError(null);
    setIsUploading(true);

    try {
      // 1) Ask backend for a presigned S3 PUT URL
      const uploadRes: any = await filesAPI.getUploadUrl(file.name, file.type || 'application/octet-stream');
      const { uploadUrl, s3Key, bucket } = uploadRes.data || {};

      if (!uploadUrl || !s3Key || !bucket) {
        throw new Error('Invalid upload-url response from backend.');
      }

      // 2) Upload file bytes directly to S3
      await axios.put(uploadUrl, file, {
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
        maxBodyLength: Infinity,
      });

      // 3) Create metadata record (this triggers DSA indexing in backend)
      let custom: Record<string, any> = {};
      try {
        custom = customJson.trim() ? JSON.parse(customJson) : {};
      } catch {
        throw new Error('Custom JSON is invalid.');
      }

      const createRes: any = await filesAPI.create({
        s3_key: s3Key,
        bucket,
        name: file.name,
        size: file.size,
        mime_type: file.type || 'application/octet-stream',
        owner_id: ownerId.trim() || undefined,
        tags: parseTags(tagsCsv),
        custom,
      });

      const createdId = createRes?.data?.id;
      if (createdId) {
        navigate(`/files/${createdId}`);
      } else {
        navigate('/search');
      }
    } catch (e: any) {
      setError(e?.error || e?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100">
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Upload to S3 + Index Metadata</h1>
            <p className="text-slate-500 mt-1">File is uploaded directly to S3 via presigned URL.</p>
          </div>
          <Link to="/dashboard" className="text-sm font-bold text-blue-600 hover:underline">
            Back to Dashboard
          </Link>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
              File
            </label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm"
            />
            {file && (
              <div className="mt-2 text-xs font-mono text-slate-500">
                Selected: <span className="text-slate-900">{file.name}</span> ({file.size} bytes)
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                Owner UUID (optional)
              </label>
              <input
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                Tags (comma-separated)
              </label>
              <input
                value={tagsCsv}
                onChange={(e) => setTagsCsv(e.target.value)}
                placeholder="finance, invoices, 2026"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
              Custom metadata JSON (optional)
            </label>
            <textarea
              value={customJson}
              onChange={(e) => setCustomJson(e.target.value)}
              rows={6}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono outline-none focus:border-blue-500"
            />
          </div>

          {error && (
            <div className="border border-red-200 bg-red-50 text-red-800 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={onUpload}
            disabled={!canSubmit}
            className="w-full py-4 rounded-2xl text-sm font-black tracking-widest uppercase transition-all border
              bg-slate-900 text-white border-slate-900 hover:bg-blue-600 hover:border-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? 'UPLOADING…' : 'UPLOAD & INDEX'}
          </button>
        </div>
      </div>
    </div>
  );
}

