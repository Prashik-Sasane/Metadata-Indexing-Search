import React, { useState, useEffect} from 'react';
import { Search, Zap, Database, Shield, ArrowRight, Code, Cpu, Server, Layers3, BarChart3, Binary, GitMerge } from 'lucide-react';
import { Link } from 'react-router-dom';



const LandingPage = () => {
  const [simulationQuery, setSimulationQuery] = useState('proj');
  
  // Fake Trie Simulation Data
  const trieMatches = [
    { name: 'project_v1_final.doc', type: 'DOCX' },
    { name: 'proj_alpha_manifest.json', type: 'JSON' },
    { name: 'production_logs_2024.zip', type: 'ZIP' },
  ].filter(file => file.name.startsWith(simulationQuery));

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100">
      {/* --- Patterned Background (Subtle Grid) --- */}
      <div className="absolute inset-0 bg-white bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:6rem_4rem] -z-10 opacity-60"></div>

      {/* --- Navigation --- */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-slate-100">
        <div className="flex items-center justify-between px-8 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Binary className="text-white" size={20} />
            </div>
            <span>Meta<span className="text-blue-600 font-semibold">Index</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#trie-sim" className="hover:text-blue-600 transition-colors">Trie Simulator</a>
            <a href="#architecture" className="hover:text-blue-600 transition-colors">Architecture</a>
            <a href="#use-cases" className="hover:text-blue-600 transition-colors">Use Cases</a>
            <a href="#docs" className="hover:text-blue-600 transition-colors">Documentation</a>
            <button className="bg-slate-900 text-white px-5 py-2.5 rounded-full hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 text-xs font-semibold tracking-wider">
              LAUNCH CONSOLE
            </button>
          </div>
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <header className="relative pt-24 pb-36 overflow-hidden">
        <div className="max-w-7xl mx-auto px-8 grid lg:grid-cols-12 gap-16 items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-6 border border-blue-100">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
              </span>
              CORE DSA ENGINE V2.1: B+ TREE OPTIMIZATIONS
            </div>
            <h1 className="text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 leading-[1.05]">
              Metadata Search. Optimized by <span className="text-blue-600">First Principles.</span>
            </h1>
            <p className="text-xl text-slate-600 mb-12 leading-relaxed max-w-2xl">
              Ditch slow linear scans. MetaIndex leverages custom Trie, B+ Tree, and Heap structures to index your file metadata, delivering range queries and instant prefix matching across millions of records.
            </p>
            <div className="flex flex-col sm:flex-row gap-5">
              <Link to="/dashboard" className="flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 hover:scale-[1.02] transition-all shadow-xl shadow-blue-200">
                Access Dashboard <ArrowRight size={20} />
              </Link>
              <button className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-50 transition-all">
                <Code size={20} /> Read Whitepaper
              </button>
            </div>
          </div>

          {/* Visual Graphic - Static Console */}
          <div className="lg:col-span-5 relative">
            <div className="absolute -inset-6 bg-gradient-to-tr from-blue-100/50 to-purple-100/50 rounded-3xl blur-3xl opacity-60"></div>
            <div className="relative bg-slate-900 rounded-2xl shadow-2xl p-4 border border-slate-800">
              <div className="flex gap-1.5 mb-4 px-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              </div>
              <div className="font-mono text-sm p-4 space-y-2.5 text-slate-300">
                <p className="text-blue-400">$ metaindex search --prefix "prod"</p>
                <p className="text-slate-500 italic">// Loading Trie Nodes...</p>
                <p className="text-emerald-400">✓ Found 1,204 nodes matching prefix (1.1ms)</p>
                <div className="h-px bg-slate-800 my-4"></div>
                <p className="text-blue-400">$ metaindex filter --min-size "1GB" --type "zip"</p>
                <p className="text-slate-500 italic">// Range scanning B+ Tree leaves...</p>
                <p className="text-emerald-400">✓ Found 14 files in range (0.8ms)</p>
                <p className="text-blue-400">$ metaindex top_k --count 3 --metric "access_frequency"</p>
                <p className="text-emerald-400">✓ Fetched top files from Max-Heap (0.3ms)</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* --- Live Trie Search Simulator --- */}
      <section id="trie-sim" className="py-24 max-w-7xl mx-auto px-8">
        <div className="grid md:grid-cols-12 gap-12 items-center bg-slate-50 p-12 rounded-3xl border border-slate-100">
          <div className="md:col-span-4">
            <h2 className="text-3xl font-bold mb-3">Live Trie Simulator</h2>
            <p className="text-slate-500 leading-relaxed mb-6">
              Experience the speed of prefix matching. Type a file prefix and watch the underlying Trie return instant matches, bypassing linear list iterations.
            </p>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                value={simulationQuery}
                onChange={(e) => setSimulationQuery(e.target.value)}
                placeholder="Type 'proj'..." 
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition"
              />
            </div>
          </div>
          <div className="md:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 h-[280px] overflow-hidden">
            <div className="font-mono text-xs text-slate-400 mb-3 uppercase tracking-wider border-b border-slate-100 pb-2">Matching Trie Leaf Nodes:</div>
            {trieMatches.length > 0 ? (
              <div className="space-y-2 overflow-y-auto h-[220px]">
                {trieMatches.map((file, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg hover:bg-blue-50 transition-colors">
                    <span className="font-medium text-slate-900">{file.name}</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase">{file.type}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 italic text-sm text-center pt-20">No matching leaves found for "{simulationQuery}"</p>
            )}
          </div>
        </div>
      </section>

      {/* --- Feature Deep-Dive --- */}
      <section id="features" className="py-24 max-w-7xl mx-auto px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold tracking-tight mb-4">Under the Hood: Our Custom DSAs</h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">We implement core data structures from scratch, optimizing node size and tree balancing specifically for metadata access patterns.</p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureDeepCard 
            icon={<Cpu className="text-blue-600" />}
            title="Optimized Trie"
            desc="Efficient character path compression. Perfect for large string file name indexing."
            spec="Time: O(L) - where L is query length."
          />
          <FeatureDeepCard 
            icon={<Layers3 className="text-purple-600" />}
            title="B+ Tree"
            desc="Maintains high-fanout, balanced structure for date/size range queries."
            spec="Time: O(Log M N) - M=Node order."
          />
          <FeatureDeepCard 
            icon={<Shield className="text-emerald-600" />}
            title="AVL Tree Tags"
            desc="Self-balancing binary search trees for fast categorical and tag lookups."
            spec="Guarantee: O(Log N) height."
          />
          <FeatureDeepCard 
            icon={<GitMerge className="text-orange-600" />}
            title="Max-Heap"
            desc="Priority queues for instant access to top files (e.g., most recent)."
            spec="Access: O(1) | Modify: O(Log N)."
          />
        </div>
      </section>

      {/* --- Architecture & Request Flow --- */}
      <section id="architecture" className="py-24 bg-slate-900 text-white rounded-[3rem] my-12 mx-8 overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-8 lg:px-16 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-6">
              <Server className="text-white" size={24} />
            </div>
            <h2 className="text-4xl font-extrabold tracking-tight mb-6">Pipeline Visualization</h2>
            <p className="text-lg text-slate-300 mb-10 leading-relaxed">
              When you submit a hybrid query (e.g., prefix + date range), MetaIndex doesn't just scan. It initiates concurrent lookups across the applicable indexes, then efficiently merges the resulting leaf nodes.
            </p>
            <div className="space-y-4 font-mono text-sm text-slate-400">
              <p>1. Query received <span className="text-white">Prefix: "log_"</span> AND <span className="text-white">Size:  1GB</span></p>
              <p>2. Concurrent Lookup: <span className="text-blue-400">Trie Engine</span> // <span className="text-purple-400">B+ Tree Engine</span></p>
              <p>3. Trie returns leaf IDs [1, 5, 8, 9]</p>
              <p>4. B+ Tree returns leaf IDs [2, 5, 9]</p>
              <p>5. Merger: Intersect results Final IDs: [5, 9]</p>
            </div>
          </div>
          <div className="p-8 bg-slate-800 rounded-2xl border border-slate-700 font-mono text-xs text-slate-500">
            {/* Pseudo Architecture Diagram */}
            <div className="text-center p-3 border border-slate-600 rounded-lg text-white font-bold mb-8">MetaIndex API Gateway</div>
            <div className="flex gap-4 justify-between items-start mb-8">
              <ArchNode label="Trie (Names)" time="1.1ms" />
              <ArchNode label="B+ Tree (Size)" time="0.9ms" />
              <ArchNode label="AVL (Tags)" time="0.8ms" />
            </div>
            <div className="text-center p-3 border border-slate-600 rounded-lg bg-slate-700/50 text-white">Results Merger & Heap Sorter</div>
          </div>
        </div>
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-blue-600 rounded-full blur-[150px] opacity-20"></div>
      </section>

      {/* --- Real-World Use Cases --- */}
      <section id="use-cases" className="py-24 max-w-7xl mx-auto px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold tracking-tight mb-4">Practical Scenarios</h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">See how custom indexing solves actual production problems.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-12">
          <UseCaseCard 
            title="Log Analysis Platform" 
            problem="Filtering million+ system logs for a specific error code prefix within a 5-minute window."
            solution="Trie instantly locates the error code prefix while the B+ Tree prunes all logs outside the requested timestamp range. O(Log N) speed."
          />
          <UseCaseCard 
            title="SaaS File Manager" 
            problem="Users need to search files instantly by name AND find their largest files first."
            solution="Trie powers the auto-complete search box. When sorting by 'Largest', the Max-Heap returns the top-K largest files instantly without sorting the entire dataset."
          />
        </div>
      </section>

      {/* --- CTA Footer --- */}
      <footer className="py-24 text-center bg-slate-50 border-t border-slate-100 px-8">
        <div className="max-w-3xl mx-auto">
          <Binary className="text-blue-200 mx-auto mb-6" size={48} strokeWidth={1} />
          <h2 className="text-4xl font-extrabold tracking-tight mb-6">Ready for high-performance indexing?</h2>
          <p className="text-lg text-slate-600 mb-12LEADING_RELAXED">Download the engine, explore the whitepaper, or launch the interactive console to test your own custom metadata schemes against our structures.</p>
          <div className="flex flex-col sm:flex-row gap-5 justify-center">
            <button className="flex items-center justify-center gap-2 bg-slate-900 text-white px-10 py-4 rounded-full font-bold text-lg hover:bg-slate-800 transition-all shadow-xl shadow-slate-100">
              Download Engine <ArrowRight size={20} />
            </button>
            <button className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-10 py-4 rounded-full font-bold text-lg hover:bg-slate-50 transition-all">
              <BarChart3 size={20} /> System Benchmarks
            </button>
          </div>
          <p className="mt-16 text-slate-400 text-sm">© 2024 MetaIndex Engine Project. All custom DSA implementations.</p>
        </div>
      </footer>
    </div>
  );
};

// Reusable Components
function FeatureDeepCard({ icon, title, desc, spec }: any) {
  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-50/50 transition-all group relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-0 bg-blue-600 group-hover:h-full transition-all duration-300"></div>
      <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-slate-500 text-sm leading-relaxed mb-6">{desc}</p>
      <p className="font-mono text-xs text-slate-400 bg-slate-50 p-2.5 rounded-lg border border-slate-100">{spec}</p>
    </div>
  );
}

function ArchNode({ label, time }: any) {
  return (
    <div className="flex-1 text-center p-3 border border-slate-700 rounded-lg group hover:border-blue-500 transition-colors">
      <div className="font-bold text-white text-[11px] mb-1">{label}</div>
      <div className="text-blue-400 text-[10px] group-hover:text-blue-300">{time}</div>
    </div>
  );
}

function UseCaseCard({ title, problem, solution }: any) {
  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-100 hover:border-blue-100 transition shadow-sm hover:shadow-lg">
      <h3 className="text-xl font-bold mb-6 text-slate-900">{title}</h3>
      <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
        <p><strong className="text-red-700 font-semibold uppercase text-xs tracking-wider">Problem:</strong> {problem}</p>
        <p><strong className="text-emerald-700 font-semibold uppercase text-xs tracking-wider">Solution:</strong> {solution}</p>
      </div>
    </div>
  );
}

export default LandingPage;
