import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { searchAPI, filesAPI } from '../api/client';
import {
  Binary, Activity, Database, Cpu, Layers, BarChart3,
  HardDrive, ChevronRight, ArrowUpRight, FileText, Clock,
  Upload, Search, Box, TrendingUp, Hash, GitBranch
} from 'lucide-react';

// --- Main Dashboard ---
const UnifiedDashboard = () => {
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['search-stats'],
    queryFn: () => searchAPI.getStats(),
    refetchInterval: 10000,
    select: (response) => response.data?.data,
  });

  const { data: filesData } = useQuery({
    queryKey: ['files-list'],
    queryFn: () => filesAPI.list({ limit: 5 }),
    refetchInterval: 10000,
    select: (response) => response.data,
  });

  const dsaStats = statsData?.dsaIndexes || {};
  const dbStats = statsData?.database || {};
  const totalFiles = dbStats.totalFiles || 0;
  const totalSize = dbStats.totalSizeFormatted || '0 Bytes';
  const recentFiles = filesData?.data || [];
  const totalSearches = dsaStats.operations?.totalSearches || 0;
  const suffixChars = dsaStats.suffixArray?.totalChars || 0;
  const triePaths = dsaStats.trie?.totalPaths || 0;

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100">
      {/* Subtle Grid Background */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#f8fafc_1px,transparent_1px),linear-gradient(to_bottom,#f8fafc_1px,transparent_1px)] bg-size-[4rem_4rem] -z-10 opacity-70"></div>

      {/* Navigation */}
      <nav className="border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 font-bold text-lg tracking-tight">
            <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center shadow-lg shadow-slate-200">
              <Binary className="text-white" size={18} />
            </div>
            <span>Meta<span className="text-blue-600 font-extrabold">Index</span> Console</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-8 text-[11px] font-black uppercase tracking-widest text-slate-400">
              <button className="text-slate-900 border-b-2 border-blue-600 pb-1">Overview</button>
              <Link to="/search" className="hover:text-slate-900 transition-colors">Search</Link>
              <Link to="/upload" className="hover:text-slate-900 transition-colors">Upload</Link>
              <Link to="/crawler" className="hover:text-slate-900 transition-colors">Crawler</Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-8 md:p-10 text-white shadow-2xl">
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">System Active</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
                DSA-Powered Index Engine
              </h1>
              <p className="text-slate-400 text-sm max-w-md">
                Real-time file metadata indexing with custom data structures — Suffix Array, Trie, B+ Tree, AVL Tree, HashMap & Heap.
              </p>
            </div>
            <div className="flex gap-3">
              <Link to="/upload" className="px-6 py-3 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/30 flex items-center gap-2 active:scale-95">
                <Upload size={14} /> Upload File
              </Link>
              <Link to="/search" className="px-6 py-3 bg-white/10 text-white rounded-xl text-xs font-bold hover:bg-white/20 transition-all backdrop-blur-sm flex items-center gap-2 border border-white/10 active:scale-95">
                <Search size={14} /> Search
              </Link>
            </div>
          </div>
          {/* Decorative gradient orbs */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-[120px] opacity-20"></div>
          <div className="absolute bottom-0 left-1/4 w-48 h-48 bg-purple-500 rounded-full blur-[100px] opacity-15"></div>
        </div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Files Indexed"
            value={statsLoading ? '—' : totalFiles.toLocaleString()}
            sub="HashMap O(1)"
            icon={<Database size={18} />}
            color="blue"
          />
          <MetricCard
            title="Storage"
            value={statsLoading ? '—' : totalSize}
            sub="B+ Tree range"
            icon={<HardDrive size={18} />}
            color="amber"
          />
          <MetricCard
            title="Searches"
            value={statsLoading ? '—' : totalSearches.toLocaleString()}
            sub="Suffix Array"
            icon={<TrendingUp size={18} />}
            color="emerald"
          />
          <MetricCard
            title="Index Size"
            value={statsLoading ? '—' : `${(suffixChars / 1024).toFixed(1)}K`}
            sub="chars indexed"
            icon={<BarChart3 size={18} />}
            color="purple"
          />
        </div>

        <div className="grid lg:grid-cols-12 gap-6">

          {/* LEFT: Recent Files (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Recent Files</h3>
                  <p className="text-[10px] font-mono text-slate-400 uppercase font-black mt-0.5">
                    {totalFiles} files across all DSA indexes
                  </p>
                </div>
                <Link to="/search" className="text-[10px] font-bold text-blue-600 flex items-center gap-1 hover:underline uppercase tracking-wider">
                  View all <ArrowUpRight size={10} />
                </Link>
              </div>

              {recentFiles.length > 0 ? (
                <div className="divide-y divide-slate-50">
                  {recentFiles.map((file: any, i: number) => (
                    <Link
                      key={file.id}
                      to={`/files/${file.id}`}
                      className="flex items-center justify-between px-6 py-4 hover:bg-blue-50/30 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:from-blue-600 group-hover:to-blue-500 group-hover:text-white transition-all duration-300 shadow-sm">
                            <FileText size={18} />
                          </div>
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">
                            <span className="text-[7px] font-black text-slate-400">{i + 1}</span>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">{file.name}</h4>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{file.sizeFormatted}</span>
                            <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                            <span className="text-[9px] font-black text-blue-600 uppercase tracking-tight">{file.mime_type?.split('/')[1] || 'file'}</span>
                            {file.wordCount > 0 && (
                              <>
                                <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                                <span className="text-[9px] font-black text-purple-500">{file.wordCount.toLocaleString()} words</span>
                              </>
                            )}
                            {file.tags && Object.keys(file.tags).length > 0 && (
                              <>
                                <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                                {Object.keys(file.tags).slice(0, 2).map(tag => (
                                  <span key={tag} className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">{tag}</span>
                                ))}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-[9px] text-slate-300 font-mono flex items-center gap-1">
                            <Clock size={8} />
                            {new Date(file.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <ChevronRight size={14} className="text-slate-200 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileText className="text-slate-300" size={32} />
                  </div>
                  <p className="text-slate-400 font-bold">No files indexed yet</p>
                  <p className="text-slate-300 text-sm mt-1">Upload a file to get started</p>
                  <Link to="/upload" className="inline-flex items-center gap-2 mt-5 px-6 py-3 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
                    <Upload size={14} /> Upload First File
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: DSA Health Sidebar (4 Cols) */}
          <aside className="lg:col-span-4 space-y-5">
            {/* DSA Structure Health */}
            <div className="bg-slate-900 rounded-3xl p-7 text-white relative overflow-hidden shadow-2xl">
              <div className="relative z-10">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-6 flex items-center gap-2">
                  <Activity size={12} className="text-blue-400" />
                  DSA Engine Health
                </h3>
                <div className="space-y-4">
                  <DSAStatItem
                    label="HashMap"
                    value={`${dsaStats.fileStore?.size || 0}`}
                    unit="entries"
                    icon={<Box size={11} />}
                    color="blue"
                    pct={Math.min(100, (dsaStats.fileStore?.size || 0) * 10)}
                  />
                  <DSAStatItem
                    label="Suffix Array"
                    value={suffixChars > 1000 ? `${(suffixChars / 1000).toFixed(1)}K` : `${suffixChars}`}
                    unit="chars"
                    icon={<BarChart3 size={11} />}
                    color="purple"
                    pct={Math.min(100, suffixChars / 100)}
                  />
                  <DSAStatItem
                    label="Trie"
                    value={`${triePaths}`}
                    unit="paths"
                    icon={<GitBranch size={11} />}
                    color="cyan"
                    pct={Math.min(100, triePaths * 5)}
                  />
                  <DSAStatItem
                    label="B+ Tree"
                    value={`${dsaStats.bPlusTreeSize?.nodeCount || 0}`}
                    unit="nodes"
                    icon={<Layers size={11} />}
                    color="amber"
                    pct={Math.min(100, (dsaStats.bPlusTreeSize?.nodeCount || 0) * 10)}
                  />
                  <DSAStatItem
                    label="AVL Tree"
                    value={`${dsaStats.avlTreeTags?.nodeCount || 0}`}
                    unit="tags"
                    icon={<Hash size={11} />}
                    color="emerald"
                    pct={Math.min(100, (dsaStats.avlTreeTags?.nodeCount || 0) * 15)}
                  />
                  <DSAStatItem
                    label="Max-Heap"
                    value={`${dsaStats.heaps?.maxHeapSize || 0}`}
                    unit="entries"
                    icon={<TrendingUp size={11} />}
                    color="rose"
                    pct={Math.min(100, (dsaStats.heaps?.maxHeapSize || 0) * 10)}
                  />
                </div>
              </div>
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-40 h-40 bg-blue-600 rounded-full blur-[80px] opacity-20"></div>
              <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-32 h-32 bg-purple-600 rounded-full blur-[60px] opacity-15"></div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Link to="/upload" className="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-blue-50 to-blue-50/30 border border-blue-100 rounded-2xl group hover:from-blue-100 hover:to-blue-50 transition-all">
                  <span className="text-xs font-bold text-slate-700 group-hover:text-blue-700 transition-colors flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                      <Upload size={12} />
                    </div>
                    Upload File
                  </span>
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </Link>
                <Link to="/search" className="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-purple-50 to-purple-50/30 border border-purple-100 rounded-2xl group hover:from-purple-100 hover:to-purple-50 transition-all">
                  <span className="text-xs font-bold text-slate-700 group-hover:text-purple-700 transition-colors flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-purple-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                      <Search size={12} />
                    </div>
                    Search Metadata
                  </span>
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                </Link>
              </div>
            </div>

            {/* Complexity Cheatsheet */}
            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-1.5">
                <Cpu size={10} className="text-blue-500" />
                Time Complexities
              </h3>
              <div className="space-y-2">
                {[
                  { op: 'Substring', ds: 'Suffix Array', tc: 'O(m·log n)' },
                  { op: 'Prefix', ds: 'Trie', tc: 'O(L)' },
                  { op: 'Lookup', ds: 'HashMap', tc: 'O(1)' },
                  { op: 'Range', ds: 'B+ Tree', tc: 'O(log N+K)' },
                  { op: 'Tag Find', ds: 'AVL Tree', tc: 'O(log N)' },
                  { op: 'Top-K', ds: 'Max-Heap', tc: 'O(K log N)' },
                ].map(row => (
                  <div key={row.op} className="flex items-center justify-between py-1.5 text-[10px]">
                    <span className="font-bold text-slate-500">{row.op}</span>
                    <span className="font-mono font-black text-slate-700">{row.tc}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

// --- Helper Components ---

const colorMap: Record<string, { bg: string; text: string; border: string; bar: string }> = {
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-600',    border: 'border-blue-100',    bar: 'bg-blue-500' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-100',   bar: 'bg-amber-500' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', bar: 'bg-emerald-500' },
  purple:  { bg: 'bg-purple-50',  text: 'text-purple-600',  border: 'border-purple-100',  bar: 'bg-purple-500' },
};

const MetricCard = ({ title, value, sub, icon, color = 'blue' }: { title: string; value: string; sub: string; icon: React.ReactNode; color?: string }) => {
  const c = colorMap[color] || colorMap.blue;
  return (
    <div className={`bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-lg hover:shadow-${color}-50/50 hover:${c.border} transition-all group`}>
      <div className="flex justify-between items-start mb-3">
        <div className={`p-2.5 ${c.bg} rounded-xl ${c.text} group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
        <span className="flex items-center gap-1.5 text-[9px] font-black text-emerald-500 uppercase tracking-wider">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
          Live
        </span>
      </div>
      <h4 className="text-2xl font-black text-slate-900 tracking-tight">{value}</h4>
      <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">
        {title} <span className={`${c.text} font-mono`}>• {sub}</span>
      </p>
    </div>
  );
};

const dsaColorMap: Record<string, string> = {
  blue: 'bg-blue-400',
  purple: 'bg-purple-400',
  cyan: 'bg-cyan-400',
  amber: 'bg-amber-400',
  emerald: 'bg-emerald-400',
  rose: 'bg-rose-400',
};

const DSAStatItem = ({ label, value, unit, icon, color = 'blue', pct = 0 }: {
  label: string; value: string; unit: string; icon: React.ReactNode; color?: string; pct?: number
}) => (
  <div>
    <div className="flex items-center justify-between mb-1.5">
      <div className="flex items-center gap-2">
        <span className={`text-${color}-400`}>{icon}</span>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-[11px] font-mono font-bold text-white">
        {value} <span className="text-slate-500 text-[9px]">{unit}</span>
      </span>
    </div>
    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full ${dsaColorMap[color] || 'bg-blue-400'} transition-all duration-1000`}
        style={{ width: `${Math.max(3, Math.min(100, pct))}%` }}
      ></div>
    </div>
  </div>
);

export default UnifiedDashboard;
