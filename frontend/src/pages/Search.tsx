import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchAPI } from '../api/client';
import {
  Search, FileText, Activity, Cpu, Binary,
  ChevronRight, Clock, Tag, BarChart3,
  GitBranch, Layers, Hash
} from 'lucide-react';
import { Link } from 'react-router-dom';

const SearchInterface = () => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [tagFilter, setTagFilter] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [debouncedTag, setDebouncedTag] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setDebouncedTag(tagFilter);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, tagFilter]);

  const searchParams: any = {};
  if (debouncedQuery) searchParams.prefix = debouncedQuery;
  if (debouncedTag) searchParams.tag = debouncedTag;

  const hasSearch = debouncedQuery.length > 0 || debouncedTag.length > 0;

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['search', debouncedQuery, debouncedTag],
    queryFn: () => searchAPI.search(searchParams),
    enabled: hasSearch,
    select: (response) => response.data,
  });

  const [showVisualization, setShowVisualization] = useState(false);

  useEffect(() => {
    if (searchResults?.dsaVisualization && hasSearch) {
      setShowVisualization(true);
    } else {
      setShowVisualization(false);
    }
  }, [searchResults, hasSearch]);

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
              <button className="text-slate-900 border-b-2 border-blue-600 pb-1">Search</button>
              <Link to="/upload" className="hover:text-slate-900 transition-colors">Upload</Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10 grid lg:grid-cols-12 gap-10">

        {/* LEFT: Search & Results */}
        <div className={`${showVisualization && searchResults?.dsaVisualization ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-8`}>

          {/* Unified Search Bar */}
          <div className={`group relative transition-all duration-500 ${isFocused ? 'translate-y-0.5' : ''}`}>
            <div className={`bg-white border-2 rounded-2xl p-2 transition-all shadow-sm ${isFocused ? 'border-blue-500 shadow-2xl shadow-blue-100/50' : 'border-slate-200'}`}>
              <div className="flex items-center">
                <div className="pl-4 pr-2 text-slate-400 group-hover:text-blue-500 transition-colors">
                  <Search size={22} />
                </div>
                <input
                  type="text"
                  className="w-full bg-transparent py-4 px-2 outline-none text-lg font-medium placeholder:text-slate-400"
                  placeholder="Search files by name, content..."
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {(query.length > 0 || tagFilter.length > 0) && (
                  <div className="hidden md:flex items-center gap-4 pr-2 border-l border-slate-100 ml-4">
                    <div className="text-right pl-4">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Strategy</div>
                      <div className="text-xs font-mono font-bold text-blue-600">
                        {query && tagFilter ? 'SA + AVL' : query ? `O(${query.length}·log n) SA` : 'AVL Tree'}
                      </div>
                    </div>
                    <button className="p-3 bg-slate-900 text-white rounded-xl hover:bg-blue-600 transition-all shadow-lg active:scale-95">
                      <ChevronRight size={20} />
                    </button>
                  </div>
                )}
              </div>

              {/* Inline Tag Filter */}
              <div className="flex items-center gap-2 border-t border-slate-100 mt-2 pt-2 px-4 pb-1">
                <Tag size={12} className="text-slate-300 shrink-0" />
                <input
                  type="text"
                  className="w-full bg-transparent py-1.5 outline-none text-xs font-bold placeholder:text-slate-300 text-slate-600"
                  placeholder="Filter by tag..."
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                />
                {tagFilter && (
                  <span className="text-[9px] font-mono text-emerald-600 font-bold whitespace-nowrap">AVL O(log N)</span>
                )}
              </div>
            </div>
          </div>

          {/* Results List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                {hasSearch ? 'Query Response' : 'Start Searching'}
              </h2>
              {searchResults?.performance && (
                <span className="text-[11px] font-medium text-slate-400 font-mono">
                  {searchResults.performance.indexLookups} found in {searchResults.performance.executionTime}
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
                  <div
                    key={file.id}
                    className="group bg-white border border-slate-100 rounded-2xl hover:border-blue-200 hover:shadow-xl hover:shadow-blue-50/50 transition-all overflow-hidden"
                  >
                    {/* File Header */}
                    <Link
                      to={`/files/${file.id}${debouncedQuery ? `?q=${encodeURIComponent(debouncedQuery)}` : ''}`}
                      className="flex items-center justify-between p-5 cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:rotate-6 transition-all duration-300 shrink-0">
                          <FileText size={24} />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {file.name}
                          </h3>
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <span className="text-[11px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded uppercase">
                              {file.sizeFormatted}
                            </span>
                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">
                              {file.mime_type || 'Unknown'}
                            </span>
                            {file.matchCount > 0 && (
                              <>
                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                <span className="text-[10px] font-black text-amber-600 uppercase tracking-tighter">
                                  {file.matchCount} match{file.matchCount !== 1 ? 'es' : ''}
                                </span>
                              </>
                            )}
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
                      <div className="text-right shrink-0">
                        <div className="text-[10px] text-slate-300 font-mono font-semibold flex items-center gap-1">
                          <Clock size={10} />
                          {new Date(file.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </Link>

                    {/* Match Snippets — VS Code style */}
                    {file.matchSnippets && file.matchSnippets.length > 0 && (
                      <div className="border-t border-slate-50 bg-slate-50/50">
                        {file.matchSnippets.map((group: any, gi: number) => (
                          <div key={gi}>
                            {/* Field Label */}
                            <div className="px-5 py-1.5 bg-slate-100/80 border-b border-slate-100">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                {group.fieldLabel}
                                <span className="text-slate-300 ml-2">
                                  {group.matches.length} match{group.matches.length !== 1 ? 'es' : ''}
                                </span>
                              </span>
                            </div>
                            {/* Individual matches */}
                            {group.matches.map((match: any, mi: number) => (
                              <div
                                key={mi}
                                className="px-5 py-1.5 flex items-start gap-3 border-b border-slate-100/50 hover:bg-blue-50/30 transition-colors"
                              >
                                {/* Line number */}
                                {match.lineNumber && (
                                  <span className="text-[10px] font-mono text-slate-300 w-8 text-right shrink-0 mt-0.5 select-none">
                                    {match.lineNumber}
                                  </span>
                                )}
                                {/* Match text with highlight */}
                                <code className="text-[11px] font-mono text-slate-600 leading-relaxed whitespace-pre-wrap break-all">
                                  <HighlightedText
                                    text={match.text}
                                    matchStart={match.matchStart}
                                    matchEnd={match.matchEnd}
                                  />
                                </code>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : hasSearch ? (
              <div className="text-center py-20">
                <Search className="mx-auto text-slate-300 mb-4" size={48} />
                <p className="text-slate-500 font-medium">No files found</p>
                <p className="text-slate-400 text-sm mt-2">Try a different search term</p>
              </div>
            ) : (
              <div className="text-center py-20">
                <Search className="mx-auto text-slate-300 mb-4" size={48} />
                <p className="text-slate-500 font-medium">Start typing to search files</p>
                <p className="text-slate-400 text-sm mt-2">Search by filename prefix or filter by tag</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: DSA Visualization Sidebar — only shows when actively searching */}
        {showVisualization && searchResults?.dsaVisualization && (
          <aside className="lg:col-span-4 space-y-6">

            {/* DSA Visualization Panel */}
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
                    {searchResults.dsaVisualization.searchType === 'substring' && '📐 Suffix Array + Trie'}
                    {searchResults.dsaVisualization.searchType === 'prefix' && '🌳 Trie Prefix Search'}
                    {searchResults.dsaVisualization.searchType === 'tag' && '🏷️ AVL Tree Tag Lookup'}
                    {searchResults.dsaVisualization.searchType === 'size_range' && '📊 B+ Tree Range Query'}
                    {searchResults.dsaVisualization.searchType === 'combined' && '🔗 Combined Index Search'}
                    {searchResults.dsaVisualization.searchType === 'topk_size' && '📦 Max-Heap Top-K'}
                    {searchResults.dsaVisualization.searchType === 'unknown' && '🔍 Standard Query'}
                  </div>
                </div>

                {/* DSA Operations */}
                <div className="space-y-3">
                  {(searchResults.dsaVisualization.suffixArrayComparisons > 0) && (
                    <DSAMetric
                      icon={<BarChart3 size={16} />}
                      label="Suffix Array Binary Search"
                      value={searchResults.dsaVisualization.suffixArrayComparisons}
                      complexity={`O(m·log n) where m=${debouncedQuery.length}`}
                      color="blue"
                    />
                  )}
                  {searchResults.dsaVisualization.trieVisited > 0 && (
                    <DSAMetric
                      icon={<GitBranch size={16} />}
                      label="Trie Prefix Nodes"
                      value={searchResults.dsaVisualization.trieVisited}
                      complexity={`O(L) where L=${debouncedQuery.length}`}
                      color="purple"
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
                    {searchResults.dsaVisualization.searchType === 'substring' &&
                      `Suffix Array binary search for "${debouncedQuery}" across filenames, content, and tags. ${searchResults.dsaVisualization.suffixArrayComparisons} comparisons in sorted suffix array + Trie prefix fallback.`}
                    {searchResults.dsaVisualization.searchType === 'prefix' &&
                      `Trie prefix search for "${debouncedQuery}". Visited ${searchResults.dsaVisualization.trieVisited} nodes.`}
                    {searchResults.dsaVisualization.searchType === 'tag' &&
                      `AVL Tree lookup for tag "${debouncedTag}". Made ${searchResults.dsaVisualization.avlComparisons} comparisons.`}
                    {searchResults.dsaVisualization.searchType === 'combined' &&
                      `Combined multiple DSA structures. Results intersected across indexes.`}
                    {searchResults.dsaVisualization.searchType === 'unknown' &&
                      `Standard query executed.`}
                  </p>
                </div>
              </div>

              <div className="absolute top-0 right-0 -mr-20 -mt-20 w-40 h-40 bg-blue-400 rounded-full blur-3xl opacity-20"></div>
            </div>
          </aside>
        )}
      </main>
    </div>
  );
};

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

/**
 * Renders text with a highlighted match portion — like VS Code search results
 */
function HighlightedText({ text, matchStart, matchEnd }: { text: string; matchStart: number; matchEnd: number }) {
  if (matchStart < 0 || matchEnd > text.length || matchStart >= matchEnd) {
    return <>{text}</>;
  }

  const before = text.substring(0, matchStart);
  const match = text.substring(matchStart, matchEnd);
  const after = text.substring(matchEnd);

  return (
    <>
      <span className="text-slate-400">{before}</span>
      <span className="bg-amber-200 text-amber-900 font-bold rounded-sm px-0.5">{match}</span>
      <span className="text-slate-400">{after}</span>
    </>
  );
}

export default SearchInterface;