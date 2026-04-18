import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { searchAPI, filesAPI } from '../api/client';
import { 
  Binary, Activity, Database, Cpu, Zap, Layers, 
  HardDrive, Bell, ChevronRight, ArrowUpRight 
} from 'lucide-react';

// --- Animated Typewriter Component ---
const TypewriterLine = ({ text, delay = 0, speed = 30, className = "" }: { text: string; delay?: number; speed?: number; className?: string }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const startTimeout = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(startTimeout);
  }, [delay]);

  useEffect(() => {
    if (started && displayedText.length < text.length) {
      const charTimeout = setTimeout(() => {
        setDisplayedText(text.slice(0, displayedText.length + 1));
      }, speed);
      return () => clearTimeout(charTimeout);
    }
  }, [started, displayedText, text, speed]);

  return (
    <p className={className}>
      {displayedText}
      {started && displayedText.length < text.length && <span className="animate-pulse">|</span>}
    </p>
  );
};

// --- Terminal Component ---
const AnimatedTerminal = () => {
  return (
    <div className="relative">
      {/* Background Glow */}
      <div className="absolute -inset-6 bg-gradient-to-tr from-blue-100/50 to-purple-100/50 rounded-3xl blur-3xl opacity-60"></div>
      
      {/* Terminal Window */}
      <div className="relative bg-slate-900 rounded-2xl shadow-2xl p-4 border border-slate-800 min-h-[380px]">
        {/* Window Controls */}
        <div className="flex gap-1.5 mb-4 px-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-amber-500"></div>
          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
        </div>

        {/* Console Content */}
        <div className="font-mono text-sm p-4 space-y-3">
          <TypewriterLine className="text-blue-400" text="$ metaindex search --prefix 'prod'" delay={0} />
          <TypewriterLine className="text-slate-500 italic" text="// Loading Trie Nodes..." delay={1200} speed={10} />
          <TypewriterLine className="text-emerald-400" text="✓ Found 1,204 nodes matching prefix (1.1ms)" delay={2000} speed={5} />

          <div className="h-px bg-slate-800 my-4"></div>

          <TypewriterLine className="text-blue-400" text="$ metaindex filter --min-size '1GB' --type 'zip'" delay={3000} />
          <TypewriterLine className="text-slate-500 italic" text="// Range scanning B+ Tree leaves..." delay={4500} speed={10} />
          <TypewriterLine className="text-emerald-400" text="✓ Found 14 files in range (0.8ms)" delay={5500} speed={5} />

          <div className="h-px bg-slate-800 my-4"></div>

          <TypewriterLine className="text-blue-400" text="$ metaindex top_k --count 3 --metric 'access_frequency'" delay={6500} />
          <TypewriterLine className="text-emerald-400" text="✓ Fetched top files from Max-Heap (0.3ms)" delay={8000} speed={5} />
        </div>
      </div>
    </div>
  );
};

// --- Main Unified Dashboard ---
const UnifiedDashboard = () => {
  // Fetch real stats from API
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['search-stats'],
    queryFn: () => searchAPI.getStats(),
    refetchInterval: 10000, // Refresh every 10 seconds
    select: (response) => response.data,
  });

  const { data: filesData } = useQuery({
    queryKey: ['files-list'],
    queryFn: () => filesAPI.list({ limit: 1 }),
    select: (response) => response.data,
  });

  // Extract stats with fallbacks
  const dsaStats = statsData?.dsaIndexes || {};
  const dbStats = statsData?.database || {};
  const totalFiles = dbStats.totalFiles || 0;
  const totalSize = dbStats.totalSizeFormatted || '0 Bytes';

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100">
      {/* Shared Subtle Grid Background */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#f8fafc_1px,transparent_1px),linear-gradient(to_bottom,#f8fafc_1px,transparent_1px)] bg-[size:4rem_4rem] -z-10 opacity-70"></div>

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
              <Link to="/nodes" className="hover:text-slate-900 transition-colors">Nodes</Link>
              <Link to="/search" className="hover:text-slate-900 transition-colors">Search</Link>
            </div>
            <div className="h-8 w-px bg-slate-100 hidden md:block"></div>
            <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><Bell size={20}/></button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        
        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard 
            title="Indexed Files" 
            value={statsLoading ? '...' : totalFiles.toLocaleString()} 
            sub="O(1) Access" 
            icon={<Database className="text-blue-600"/>} 
          />
          <MetricCard 
            title="Total Size" 
            value={statsLoading ? '...' : totalSize} 
            sub="Across all buckets" 
            icon={<Zap className="text-amber-500"/>} 
          />
          <MetricCard 
            title="Trie Nodes" 
            value={statsLoading ? '...' : (dsaStats.trie?.nodeCount || 0).toLocaleString()} 
            sub="Prefix Index" 
            icon={<Layers className="text-purple-600"/>} 
          />
          <MetricCard 
            title="Search Operations" 
            value={statsLoading ? '...' : (dsaStats.operations?.totalSearches || 0).toLocaleString()} 
            sub="Total searches" 
            icon={<Cpu className="text-emerald-500"/>} 
          />
        </div>

        <div className="grid lg:grid-cols-12 gap-10">
          {/* LEFT: Terminal & Sub-stats (8 Cols) */}
          <div className="lg:col-span-8 space-y-10">
            {/* Integrated Animated Terminal */}
            <AnimatedTerminal />

            {/* Shard Status Sub-grid */}
            <div className="grid md:grid-cols-2 gap-6">
               <StatusCard title="Storage Shard A" detail="94% Efficiency" icon={<HardDrive className="text-blue-600"/>} />
               <StatusCard title="Query Shard B" detail="Operational" icon={<Activity className="text-purple-600"/>} />
            </div>
          </div>

          {/* RIGHT: Engine Specs Sidebar (4 Cols) */}
          <aside className="lg:col-span-4 space-y-6">
            {/* Integrity Card */}
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
              <div className="relative z-10">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-8 flex items-center gap-2">
                  <Activity size={14} className="text-blue-400" />
                  Structure Integrity
                </h3>
                <div className="space-y-7">
                  <StatProgress 
                    label="Trie Compaction" 
                    value={statsLoading ? '0%' : `${Math.min(100, Math.round((dsaStats.trie?.nodeCount || 0) / 100))}%`} 
                  />
                  <StatProgress 
                    label="B+ Tree Fill" 
                    value={statsLoading ? '0%' : `${Math.min(100, Math.round((dsaStats.bPlusTreeSize?.nodeCount || 0) / 50))}%`} 
                  />
                  <StatProgress 
                    label="Heap Balancing" 
                    value="100%" 
                    color="bg-emerald-500" 
                  />
                </div>
              </div>
              <div className="absolute top-0 right-0 -mr-20 -mt-20 w-56 h-56 bg-blue-600 rounded-full blur-[100px] opacity-20"></div>
            </div>

            {/* Actions Card */}
            <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Console Commands</h3>
              <div className="space-y-3">
                <ActionButton label="Re-index All Metadata" />
                <ActionButton label="Clear Heap Cache" />
                <button className="w-full py-4 mt-2 text-xs font-black text-blue-600 border border-blue-100 bg-blue-50/30 rounded-2xl hover:bg-blue-50 transition-colors">
                  OPEN CLI TERMINAL
                </button>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

// --- Helper Components ---

const MetricCard = ({ title, value, sub, icon }: { title: string; value: string; sub: string; icon: React.ReactNode }) => (
  <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm hover:border-blue-200 transition-all group">
    <div className="flex justify-between items-start mb-4">
      <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">{icon}</div>
      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Live</span>
    </div>
    <h4 className="text-3xl font-black text-slate-900 tracking-tighter">{value}</h4>
    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">{title} • <span className="text-blue-500">{sub}</span></p>
  </div>
);

const StatusCard = ({ title, detail, icon }: { title: string; detail: string; icon: React.ReactNode }) => (
  <div className="bg-slate-50 border border-slate-100 p-6 rounded-[2rem] flex items-center justify-between group cursor-pointer hover:bg-white hover:shadow-xl hover:shadow-blue-50/50 transition-all">
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">{icon}</div>
      <div>
        <h4 className="font-bold text-sm">{title}</h4>
        <p className="text-[10px] font-mono text-slate-400 uppercase font-black">{detail}</p>
      </div>
    </div>
    <ArrowUpRight size={18} className="text-slate-300 group-hover:text-blue-600 transition-colors" />
  </div>
);

const StatProgress = ({ label, value, color = "bg-blue-600" }: { label: string; value: string; color?: string }) => (
  <div className="space-y-2.5">
    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
      <span className="text-slate-500">{label}</span>
      <span className="text-white font-mono">{value}</span>
    </div>
    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden p-0.5">
      <div className={`h-full ${color} rounded-full`} style={{ width: value }}></div>
    </div>
  </div>
);

const ActionButton = ({ label }: { label: string }) => (
  <button className="w-full flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl group hover:border-blue-200 hover:bg-white transition-all text-left">
    <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900 transition-colors">{label}</span>
    <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
  </button>
);

export default UnifiedDashboard;