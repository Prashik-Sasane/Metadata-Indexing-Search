import { useState, useEffect} from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchAPI } from '../api/client';
import { 
  Search, Database, Tag, FileText, 
  Activity, Cpu, Binary, ChevronRight, Share2, Clock,
  BarChart3, GitBranch, Layers, Hash
} from 'lucide-react';
import { Link } from 'react-router-dom';

const SearchInterface = () => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [searchParams, setSearchParams] = useState({
    prefix: '',
    tag: '',
    sizeMin: undefined,
    sizeMax: undefined,
    topK: undefined,
    sort: 'recent',
  });
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setSearchParams(prev => ({ ...prev, prefix: query }));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch search results
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['search', debouncedQuery, searchParams],
    queryFn: () => searchAPI.search(searchParams),
    enabled: debouncedQuery.length > 0,
    select: (response) => response.data, // Extract data from AxiosResponse
  });

  const [showVisualization, setShowVisualization] = useState(false);

  // Show visualization when search completes
  useEffect(() => {
    if (searchResults?.dsaVisualization && debouncedQuery.length > 0) {
      setShowVisualization(true);
    }
  }, [searchResults, debouncedQuery]);

  // Fetch suggestions for autocomplete
  const {  } = useQuery({
    queryKey: ['suggestions', query],
    queryFn: () => searchAPI.getSuggestions(query, 5),
    enabled: query.length > 2 && isFocused,
  });

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100">
      {/* --- Subtle Grid Background --- */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#f8fafc_1px,transparent_1px),linear-gradient(to_bottom,#f8fafc_1px,transparent_1px)] bg-size-[4rem_4rem] -z-10 opacity-70"></div>

      {/* --- Dashboard Header --- */}
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 font-bold text-lg tracking-tight">
            <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center shadow-lg shadow-slate-200">
              <Binary className="text-white" size={18} />
            </div>
            <span>Meta<span className="text-blue-600 font-extrabold">Index</span> Console</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-[11px] font-black border border-emerald-100 uppercase tracking-wider">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              Engine Online
            </div>
            <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
              <Share2 size={18}/>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 grid lg:grid-cols-12 gap-10">
        
        {/* --- LEFT: Search & Results (8 Cols) --- */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Main Search Bar */}
          <div className={`group relative transition-all duration-500 ${isFocused ? 'translate-y-0.5' : ''}`}>
            <div className={`flex items-center bg-white border-2 rounded-2xl p-2 transition-all shadow-sm ${isFocused ? 'border-blue-500 shadow-2xl shadow-blue-100/50' : 'border-slate-200'}`}>
              <div className="pl-4 pr-2 text-slate-400 group-hover:text-blue-500 transition-colors">
                <Search size={22} />
              </div>
              <input 
                type="text"
                className="w-full bg-transparent py-4 px-2 outline-none text-lg font-medium placeholder:text-slate-400"
                placeholder="Query file metadata..."
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              
              {/* Live Complexity Indicator */}
              <div className="hidden md:flex items-center gap-4 pr-2 border-l border-slate-100 ml-4">
                <div className="text-right pl-4">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Complexity</div>
                  <div className="text-xs font-mono font-bold text-blue-600">
                    {query.length > 0 ? `O(${query.length}) Trie` : 'O(1) Heap'}
                  </div>
                </div>
                <button className="p-3 bg-slate-900 text-white rounded-xl hover:bg-blue-600 transition-all shadow-lg active:scale-95">
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            <FilterPill label="Global Index" />
            <FilterPill label="B+ Range (>1GB)" active />
            <FilterPill label="Frequency (Heap)" icon={<Activity size={12}/>} />
            <FilterPill label="System Metadata" icon={<Tag size={12}/>} />
          </div>

          {/* Results List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                {debouncedQuery ? 'Query Response Nodes' : 'Recent Files'}
              </h2>
              {searchResults?.performance && (
                <span className="text-[11px] font-medium text-slate-400 font-mono">
                  Found in {searchResults.performance.executionTime}
                </span>
              )}
            </div>

            {isSearching ? (
              <div className="grid gap-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white border border-slate-100 p-5 rounded-2xl animate-pulse">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-slate-100 rounded w-48 mb-2"></div>
                        <div className="h-3 bg-slate-100 rounded w-24"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : searchResults?.data && searchResults.data.length > 0 ? (
              <div className="grid gap-3">
                {searchResults.data.map((file: any) => (
                  <Link
                    key={file.id}
                    to={`/files/${file.id}`}
                    className="group bg-white border border-slate-100 p-5 rounded-2xl hover:border-blue-200 hover:shadow-xl hover:shadow-blue-50/50 transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:rotate-6 transition-all duration-300">
                        <FileText size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {file.name}
                        </h3>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[11px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded uppercase">
                            {file.sizeFormatted}
                          </span>
                          <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                          <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">
                            {file.mime_type || 'Unknown'}
                          </span>
                          {file.tags && Object.keys(file.tags).length > 0 && (
                            <>
                              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">
                                {Object.keys(file.tags).slice(0, 2).join(', ')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-emerald-600 font-mono mb-1">
                        {file.bucket}
                      </div>
                      <div className="text-[10px] text-slate-300 font-mono font-semibold flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(file.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : debouncedQuery.length > 0 ? (
              <div className="text-center py-20">
                <Search className="mx-auto text-slate-300 mb-4" size={48} />
                <p className="text-slate-500 font-medium">No files found for "{debouncedQuery}"</p>
                <p className="text-slate-400 text-sm mt-2">Try a different search term</p>
              </div>
            ) : (
              <div className="text-center py-20">
                <Database className="mx-auto text-slate-300 mb-4" size={48} />
                <p className="text-slate-500 font-medium">Start typing to search files</p>
                <p className="text-slate-400 text-sm mt-2">Search by filename, prefix, or metadata</p>
              </div>
            )}
          </div>
        </div>

        {/* --- RIGHT: Diagnostics Sidebar (4 Cols) --- */}
        <aside className="lg:col-span-4 space-y-6">
          
          {/* DSA Visualization Panel - NEW */}
          {showVisualization && searchResults?.dsaVisualization && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-[2.5rem] p-6 relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 size={20} className="text-blue-600" />
                  <h3 className="text-sm font-black text-blue-900 uppercase tracking-wider">
                    DSA Search Visualization
                  </h3>
                </div>
                
                {/* Search Type Badge */}
                <div className="mb-4 px-4 py-2 bg-white rounded-xl border border-blue-100">
                  <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Search Strategy</div>
                  <div className="text-sm font-black text-blue-600 capitalize">
                    {searchResults.dsaVisualization.searchType === 'prefix' && '🌳 Trie Prefix Search'}
                    {searchResults.dsaVisualization.searchType === 'size_range' && '📊 B+ Tree Range Query'}
                    {searchResults.dsaVisualization.searchType === 'tag' && '🏷️  AVL Tree Tag Lookup'}
                    {searchResults.dsaVisualization.searchType === 'topk_size' && '📦 Max-Heap Top-K'}
                    {searchResults.dsaVisualization.searchType === 'unknown' && '🔍 Standard Query'}
                  </div>
                </div>

                {/* DSA Operations */}
                <div className="space-y-3">
                  {searchResults.dsaVisualization.trieVisited > 0 && (
                    <DSAMetric
                      icon={<GitBranch size={16} />}
                      label="Trie Nodes Visited"
                      value={searchResults.dsaVisualization.trieVisited}
                      complexity={`O(L) where L=${debouncedQuery.length}`}
                      color="blue"
                    />
                  )}
                  {searchResults.dsaVisualization.bPlusNodesVisited > 0 && (
                    <DSAMetric
                      icon={<Layers size={16} />}
                      label="B+ Tree Nodes"
                      value={searchResults.dsaVisualization.bPlusNodesVisited}
                      complexity="O(log N + K)"
                      color="purple"
                    />
                  )}
                  {searchResults.dsaVisualization.avlComparisons > 0 && (
                    <DSAMetric
                      icon={<Hash size={16} />}
                      label="AVL Comparisons"
                      value={searchResults.dsaVisualization.avlComparisons}
                      complexity="O(log N)"
                      color="emerald"
                    />
                  )}
                  {searchResults.dsaVisualization.heapOperations > 0 && (
                    <DSAMetric
                      icon={<Activity size={16} />}
                      label="Heap Operations"
                      value={searchResults.dsaVisualization.heapOperations}
                      complexity="O(K log N)"
                      color="orange"
                    />
                  )}
                </div>

                {/* Performance Summary */}
                <div className="mt-4 p-4 bg-white rounded-xl border border-blue-100">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Candidates</div>
                      <div className="text-lg font-black text-blue-600">
                        {searchResults.dsaVisualization.totalCandidates.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Time</div>
                      <div className="text-lg font-black text-emerald-600">
                        {searchResults.dsaVisualization.executionTime}ms
                      </div>
                    </div>
                  </div>
                </div>

                {/* Explanation */}
                <div className="mt-4 p-3 bg-blue-100/50 rounded-xl">
                  <p className="text-[11px] text-blue-800 leading-relaxed">
                    {searchResults.dsaVisualization.searchType === 'prefix' && 
                      `Searched Trie for prefix "${debouncedQuery}". Visited ${searchResults.dsaVisualization.trieVisited} nodes to find ${searchResults.dsaVisualization.totalCandidates} matching files.`}
                    {searchResults.dsaVisualization.searchType === 'size_range' && 
                      `Used B+ Tree for range query. Visited ${searchResults.dsaVisualization.bPlusNodesVisited} nodes to find files in size range.`}
                    {searchResults.dsaVisualization.searchType === 'tag' && 
                      `AVL Tree lookup for tag. Made ${searchResults.dsaVisualization.avlComparisons} comparisons to find matching files.`}
                  </p>
                </div>
              </div>
              
              {/* Background decoration */}
              <div className="absolute top-0 right-0 -mr-20 -mt-20 w-40 h-40 bg-blue-400 rounded-full blur-3xl opacity-20"></div>
            </div>
          )}
          
          {/* Node Health HUD */}
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
            <div className="relative z-10">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-8 flex items-center gap-2">
                <Activity size={14} className="text-blue-400" />
                Index Diagnostics
              </h3>
              <div className="space-y-7">
                <StatBar label="Trie Path Compaction" value="88%" />
                <StatBar label="B+ Tree Node Fill" value="62%" />
                <StatBar label="Max-Heap Balance" value="99%" color="bg-emerald-500" />
              </div>
              <div className="mt-10 pt-6 border-t border-slate-800">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-slate-400 font-medium">Synced Leaf Nodes</span>
                  <span className="font-mono font-bold text-blue-400">1.24M</span>
                </div>
              </div>
            </div>
            {/* Design Gradient */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-56 h-56 bg-blue-600 rounded-full blur-[100px] opacity-20"></div>
          </div>

          {/* Engine Specs HUD */}
          <div className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-8">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <Cpu size={14} className="text-blue-600" />
              Engine Config
            </h3>
            <div className="space-y-4">
              <SpecItem label="Index Scheme" value="Hybrid Trie-B+" />
              <SpecItem label="Concurrency" value="RW Lock-Free" />
              <SpecItem label="Cache Strategy" value="LRU Priority" />
            </div>
          </div>

          {/* CTA/Docs Box */}
          <div className="p-6 bg-linear-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-3xl group cursor-pointer hover:shadow-lg transition-all">
            <h4 className="font-bold text-blue-900 text-sm mb-2 flex items-center gap-2">
              Advanced DSA Docs <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform"/>
            </h4>
            <p className="text-xs text-blue-700/70 leading-relaxed font-medium">
              Explore how our <span className="text-blue-900 font-bold">AVL Tree</span> rebalancing handles write-heavy metadata spikes.
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
};

// --- Sub-components for Cleanliness ---

function FilterPill({ label, active = false, icon }: any) {
  return (
    <button className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-bold transition-all border whitespace-nowrap active:scale-95 ${
      active 
      ? 'bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-200' 
      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400 hover:text-blue-600'
    }`}>
      {icon && icon}
      {label}
    </button>
  );
}

function StatBar({ label, value, color = "bg-blue-500" }: any) {
  return (
    <div className="space-y-2.5">
      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
        <span className="text-slate-500">{label}</span>
        <span className="text-white">{value}</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden p-0.5">
        <div 
          className={`h-full ${color} rounded-full transition-all duration-1000`} 
          style={{ width: value }}
        ></div>
      </div>
    </div>
  );
}

function SpecItem({ label, value }: any) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-slate-200 last:border-0 group">
      <span className="text-xs text-slate-500 font-medium group-hover:text-slate-800 transition-colors">{label}</span>
      <span className="text-xs font-mono font-bold text-slate-900">{value}</span>
    </div>
  );
}

function DSAMetric({ icon, label, value, complexity, color }: any) {
  const colorClasses: any = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
  };

  return (
    <div className={`p-3 rounded-xl border ${colorClasses[color] || colorClasses.blue}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
        </div>
        <span className="text-lg font-black">{value}</span>
      </div>
      <div className="text-[9px] font-mono opacity-70">{complexity}</div>
    </div>
  );
}

export default SearchInterface;