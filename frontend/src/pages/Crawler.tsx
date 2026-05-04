import { useState } from 'react';
import { Link } from 'react-router-dom';
import { crawlerAPI } from '../api/client';
import CrawlGraph from '../components/CrawlGraph';
import {
  Binary, Globe, Play, Loader2, ExternalLink, ChevronDown, ChevronRight,
  Layers, Clock, Hash, GitBranch, BarChart3, Trash2, Network, Search,
  ArrowRight, Zap
} from 'lucide-react';

interface CrawlNode {
  id: string;
  url: string;
  title: string;
  depth: number;
  wordCount: number;
  outgoingLinks: number;
  incomingLinks: number;
  contentPreview: string;
}

interface CrawlStats {
  totalPages: number;
  totalLinks: number;
  depth: number;
  duplicatesRemoved: number;
  crawlTime: number;
  averageLinksPerPage: string | number;
  algorithm: string;
  frontierSize?: number;
}

interface CrawlData {
  nodes: CrawlNode[];
  links: { source: string; target: string }[];
  algorithm: string;
  stats: CrawlStats;
}

export default function Crawler() {
  // --- Form state ---
  const [url, setUrl] = useState('');
  const [maxDepth, setMaxDepth] = useState(3);
  const [maxPages, setMaxPages] = useState(20);
  const [algorithm, setAlgorithm] = useState<'bfs' | 'dfs'>('bfs');

  // --- Crawl state ---
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlData, setCrawlData] = useState<CrawlData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // --- UI state ---
  const [activeTab, setActiveTab] = useState<'graph' | 'pages' | 'algorithm'>('graph');
  const [expandedNode, setExpandedNode] = useState<string | null>(null);

  const startCrawl = async () => {
    if (!url.trim() || isCrawling) return;
    setIsCrawling(true);
    setError(null);
    setCrawlData(null);

    try {
      const crawlUrl = crawlerAPI.getCrawlUrl();
      const response = await fetch(crawlUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, maxDepth, maxPages, algorithm }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (!reader) throw new Error('No response body');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'update' || data.type === 'complete') {
                setCrawlData(data.data);
              } else if (data.type === 'error') {
                setError(data.error);
              }
            } catch {}
          }
        }
      }
    } catch (e: any) {
      setError(e.message || 'Crawl failed');
    } finally {
      setIsCrawling(false);
    }
  };

  const clearResults = async () => {
    try {
      await crawlerAPI.clearResults();
      setCrawlData(null);
    } catch {}
  };

  const stats = crawlData?.stats;
  const nodes = crawlData?.nodes || [];

  // Group nodes by depth for algorithm view
  const nodesByDepth: Record<number, CrawlNode[]> = {};
  nodes.forEach(n => {
    if (!nodesByDepth[n.depth]) nodesByDepth[n.depth] = [];
    nodesByDepth[n.depth].push(n);
  });

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100">
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#f8fafc_1px,transparent_1px),linear-gradient(to_bottom,#f8fafc_1px,transparent_1px)] bg-size-[4rem_4rem] -z-10 opacity-70"></div>

      {/* Navigation */}
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
              <Link to="/upload" className="hover:text-slate-900 transition-colors">Upload</Link>
              <button className="text-slate-900 border-b-2 border-blue-600 pb-1">Crawler</button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 p-8 text-white shadow-2xl">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Globe size={16} className="text-purple-300" />
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-300">Web Crawler Engine</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-1">
              BFS / DFS Web Crawler
            </h1>
            <p className="text-purple-200/80 text-sm max-w-lg">
              Crawl websites using graph traversal algorithms. Pages are automatically indexed into the DSA engine for full-text search.
            </p>
          </div>
          <div className="absolute top-0 right-0 w-48 h-48 bg-purple-400 rounded-full blur-[100px] opacity-20"></div>
          <div className="absolute bottom-0 left-1/3 w-32 h-32 bg-blue-400 rounded-full blur-[80px] opacity-15"></div>
        </div>

        {/* Crawler Input */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
          <div className="space-y-4">
            {/* URL Input */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Source URL</label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Globe size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="url"
                    placeholder="https://example.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={isCrawling}
                    className="w-full pl-11 pr-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:outline-none transition-colors disabled:opacity-50"
                  />
                </div>
                <button
                  onClick={startCrawl}
                  disabled={isCrawling || !url.trim()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95 shadow-lg shadow-blue-200/50"
                >
                  {isCrawling ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                  {isCrawling ? 'Crawling...' : 'Start Crawl'}
                </button>
              </div>
            </div>

            {/* Options Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Max Depth */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Max Depth</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={maxDepth}
                    onChange={(e) => setMaxDepth(Math.max(1, Math.min(10, +e.target.value || 1)))}
                    disabled={isCrawling}
                    className="w-20 px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-mono font-bold text-center focus:border-blue-500 focus:outline-none disabled:opacity-50"
                  />
                  <span className="text-[10px] text-slate-400 font-bold">(1–10)</span>
                </div>
              </div>

              {/* Max Pages */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Max Pages</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={maxPages}
                    onChange={(e) => setMaxPages(Math.max(5, Math.min(100, +e.target.value || 20)))}
                    disabled={isCrawling}
                    className="w-20 px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-mono font-bold text-center focus:border-blue-500 focus:outline-none disabled:opacity-50"
                  />
                  <span className="text-[10px] text-slate-400 font-bold">(5–100)</span>
                </div>
              </div>

              {/* Algorithm Selector */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Algorithm</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAlgorithm('bfs')}
                    disabled={isCrawling}
                    className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                      algorithm === 'bfs'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200/50'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="font-black">BFS</div>
                    <div className="text-[9px] opacity-70 mt-0.5">Queue · Level-by-level</div>
                  </button>
                  <button
                    onClick={() => setAlgorithm('dfs')}
                    disabled={isCrawling}
                    className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                      algorithm === 'dfs'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-200/50'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="font-black">DFS</div>
                    <div className="text-[9px] opacity-70 mt-0.5">Stack · Depth-first</div>
                  </button>
                </div>
              </div>
            </div>

            {/* Algorithm info */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Algorithm Comparison</div>
              <div className="grid md:grid-cols-2 gap-3 text-[11px] text-slate-500">
                <div className={`p-3 rounded-lg border ${algorithm === 'bfs' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-slate-100'}`}>
                  <span className="font-black">BFS (Breadth-First):</span> Uses a Queue (FIFO). Explores all pages at depth 1, then depth 2, etc. Finds pages closest to the starting URL first.
                </div>
                <div className={`p-3 rounded-lg border ${algorithm === 'dfs' ? 'bg-purple-50 border-purple-200 text-purple-700' : 'border-slate-100'}`}>
                  <span className="font-black">DFS (Depth-First):</span> Uses a Stack (LIFO). Follows links deeply before backtracking. Finds deeply nested content quickly.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm font-medium">
            ⚠️ {error}
          </div>
        )}

        {/* Live Stats */}
        {stats && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {isCrawling && <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>}
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {isCrawling ? 'Crawling...' : 'Crawl Complete'} — {stats.algorithm.toUpperCase()}
                </span>
              </div>
              {!isCrawling && (
                <button
                  onClick={clearResults}
                  className="text-[10px] font-bold text-red-400 hover:text-red-600 flex items-center gap-1 transition-colors"
                >
                  <Trash2 size={10} /> Clear Results
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <StatCard label="Pages" value={stats.totalPages} icon={<Globe size={14} />} color="blue" />
              <StatCard label="Links" value={stats.totalLinks} icon={<Network size={14} />} color="purple" />
              <StatCard label="Max Depth" value={stats.depth} icon={<Layers size={14} />} color="indigo" />
              <StatCard label="Duplicates" value={stats.duplicatesRemoved} icon={<Hash size={14} />} color="amber" />
              <StatCard label="Time" value={`${stats.crawlTime}s`} icon={<Clock size={14} />} color="emerald" />
              <StatCard label="Avg Links" value={stats.averageLinksPerPage} icon={<BarChart3 size={14} />} color="rose" />
            </div>
          </div>
        )}

        {/* Results Tabs */}
        {nodes.length > 0 && (
          <div>
            <div className="flex items-center gap-1 mb-4 border-b border-slate-100 pb-0">
              {(['graph', 'pages', 'algorithm'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2.5 text-[11px] font-black uppercase tracking-wider transition-all border-b-2 -mb-px ${
                    activeTab === tab
                      ? 'text-blue-600 border-blue-600'
                      : 'text-slate-400 border-transparent hover:text-slate-600'
                  }`}
                >
                  {tab === 'graph' ? 'Graph Map' : tab === 'pages' ? 'Crawled Pages' : 'Traversal Order'}
                </button>
              ))}
            </div>

            {/* Graph Tab */}
            {activeTab === 'graph' && crawlData && (
              <CrawlGraph data={{
                nodes: crawlData.nodes.map(n => ({
                  id: n.id,
                  url: n.url,
                  title: n.title,
                  depth: n.depth,
                  wordCount: n.wordCount,
                  outgoingLinks: n.outgoingLinks,
                })),
                links: crawlData.links,
                algorithm: crawlData.algorithm,
              }} />
            )}

            {/* Pages Tab */}
            {activeTab === 'pages' && (
              <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-700">
                    {nodes.length} pages crawled
                  </span>
                  <Link to="/search" className="text-[10px] font-bold text-blue-600 flex items-center gap-1 hover:underline uppercase tracking-wider">
                    Search all <ArrowRight size={10} />
                  </Link>
                </div>
                <div className="divide-y divide-slate-50">
                  {nodes.map((node, i) => (
                    <div key={node.id} className="group">
                      <div
                        className="flex items-center justify-between px-5 py-3.5 hover:bg-blue-50/30 transition-all cursor-pointer"
                        onClick={() => setExpandedNode(expandedNode === node.id ? null : node.id)}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="relative shrink-0">
                            <div className="w-9 h-9 bg-gradient-to-br from-slate-100 to-slate-50 rounded-xl flex items-center justify-center text-slate-400 shadow-sm">
                              <Globe size={16} />
                            </div>
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">
                              <span className="text-[7px] font-black text-slate-400">{i + 1}</span>
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-sm text-slate-900 truncate">{node.title}</h4>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-[9px] font-mono text-slate-400 truncate max-w-[200px]">{node.url}</span>
                              <span className="w-1 h-1 bg-slate-200 rounded-full shrink-0"></span>
                              <span className="text-[9px] font-black text-blue-500">depth {node.depth}</span>
                              <span className="w-1 h-1 bg-slate-200 rounded-full shrink-0"></span>
                              <span className="text-[9px] font-black text-purple-500">{node.wordCount.toLocaleString()} words</span>
                              <span className="w-1 h-1 bg-slate-200 rounded-full shrink-0"></span>
                              <span className="text-[9px] font-black text-emerald-500">{node.outgoingLinks} links</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={node.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 text-slate-300 hover:text-blue-500 transition-colors"
                          >
                            <ExternalLink size={14} />
                          </a>
                          {expandedNode === node.id
                            ? <ChevronDown size={14} className="text-slate-400" />
                            : <ChevronRight size={14} className="text-slate-300" />
                          }
                        </div>
                      </div>
                      {expandedNode === node.id && node.contentPreview && (
                        <div className="px-5 pb-4 pl-[4.5rem]">
                          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs text-slate-500 leading-relaxed">
                            {node.contentPreview}...
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Algorithm Tab */}
            {activeTab === 'algorithm' && (
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
                <div>
                  <h3 className="text-sm font-black text-slate-700 mb-1">
                    {crawlData?.algorithm.toUpperCase()} Traversal Order
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {crawlData?.algorithm === 'bfs'
                      ? 'Pages discovered level by level (Queue — FIFO)'
                      : 'Pages discovered depth-first (Stack — LIFO)'}
                  </p>
                </div>

                {/* Traversal order pills */}
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                    Discovery Order
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {nodes.map((node, i) => {
                      try {
                        const pathname = new URL(node.url).pathname || '/';
                        return (
                          <span
                            key={node.id}
                            className="text-[10px] font-mono font-bold px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all cursor-default"
                          >
                            <span className="text-slate-300 mr-1">{i + 1}.</span>
                            {pathname.length > 30 ? pathname.substring(0, 30) + '...' : pathname}
                          </span>
                        );
                      } catch {
                        return null;
                      }
                    })}
                  </div>
                </div>

                {/* Depth levels */}
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                    By Depth Level
                  </div>
                  <div className="space-y-3">
                    {Object.entries(nodesByDepth).sort(([a], [b]) => +a - +b).map(([depth, depthNodes]) => (
                      <div key={depth}>
                        <div className="text-[10px] font-black text-slate-500 mb-1.5 flex items-center gap-2">
                          <Layers size={10} className="text-blue-500" />
                          Depth {depth}
                          <span className="text-slate-300">({depthNodes.length} pages)</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pl-5">
                          {depthNodes.map(node => {
                            try {
                              const pathname = new URL(node.url).pathname || '/';
                              return (
                                <span
                                  key={node.id}
                                  className="text-[10px] font-mono px-2 py-1 bg-blue-50 border border-blue-100 rounded-lg text-blue-600 font-bold"
                                >
                                  {pathname.length > 25 ? pathname.substring(0, 25) + '...' : pathname}
                                </span>
                              );
                            } catch {
                              return null;
                            }
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Algorithm characteristics */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                    {crawlData?.algorithm === 'bfs' ? 'BFS' : 'DFS'} Characteristics
                  </div>
                  <div className="text-[11px] text-slate-500 space-y-1">
                    {crawlData?.algorithm === 'bfs' ? (
                      <>
                        <div className="flex items-center gap-2"><Zap size={10} className="text-blue-500" /> Explores pages level by level (breadth-first)</div>
                        <div className="flex items-center gap-2"><Zap size={10} className="text-blue-500" /> Finds pages closest to root URL first</div>
                        <div className="flex items-center gap-2"><Zap size={10} className="text-blue-500" /> Guarantees shortest path to each page</div>
                        <div className="flex items-center gap-2"><Zap size={10} className="text-blue-500" /> Data structure: Queue (FIFO)</div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2"><GitBranch size={10} className="text-purple-500" /> Explores deep paths before backtracking</div>
                        <div className="flex items-center gap-2"><GitBranch size={10} className="text-purple-500" /> Quickly finds deeply nested content</div>
                        <div className="flex items-center gap-2"><GitBranch size={10} className="text-purple-500" /> More memory efficient for deep websites</div>
                        <div className="flex items-center gap-2"><GitBranch size={10} className="text-purple-500" /> Data structure: Stack (LIFO)</div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!isCrawling && !crawlData && !error && (
          <div className="py-16 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Network className="text-slate-300" size={32} />
            </div>
            <p className="text-slate-400 font-bold">Enter a URL and start crawling</p>
            <p className="text-slate-300 text-sm mt-1">Pages will be indexed and searchable from the Search page</p>
          </div>
        )}
      </main>
    </div>
  );
}

// --- Helper Components ---

const statColorMap: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-600',
  purple: 'bg-purple-50 text-purple-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  amber: 'bg-amber-50 text-amber-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  rose: 'bg-rose-50 text-rose-600',
};

function StatCard({ label, value, icon, color = 'blue' }: { label: string; value: string | number; icon: React.ReactNode; color?: string }) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${statColorMap[color] || statColorMap.blue}`}>
        {icon}
      </div>
      <div className="text-xl font-black text-slate-900 tracking-tight">{value}</div>
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{label}</div>
    </div>
  );
}
