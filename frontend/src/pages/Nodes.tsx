import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchAPI } from '../api/client';
import { Layers, Binary, Network, Share2, Activity } from 'lucide-react';

const NodesPage = () => {
  // Fetch real DSA statistics
  const { data: statsData, isLoading } = useQuery({
    queryKey: ['dsa-stats'],
    queryFn: () => searchAPI.getStats(),
    refetchInterval: 5000, // Refresh every 5 seconds
    select: (response) => response.data,
  });

  const dsaStats = statsData?.dsaIndexes || {};
  const totalNodes = 
    (dsaStats.trie?.nodeCount || 0) + 
    (dsaStats.bPlusTreeSize?.nodeCount || 0) + 
    (dsaStats.avlTreeTags?.nodeCount || 0);

  return (
    <div className="min-h-screen bg-white">
      {/* Container matches Dashboard and Search Interface padding/margin */}
      <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        
        {/* Header - Fixed alignment to match Dashboard title style */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-2">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900">DSA Structure Explorer</h2>
            <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-wider">
              Inspecting <span className="text-blue-600 font-bold">{isLoading ? '...' : totalNodes.toLocaleString()}</span> active leaf nodes
            </p>
          </div>
          <button className="flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 active:scale-95 w-full md:w-auto">
            Rebalance Clusters <Share2 size={14}/>
          </button>
        </div>

        {/* Node Grid - Matches Dashboard MetricCard spacing */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <NodeStructureCard 
            title="Trie (String Names)" 
            icon={<Binary size={24} />}
            nodes={isLoading ? '...' : (dsaStats.trie?.nodeCount || 0).toLocaleString()}
            depth={`${dsaStats.trie?.height || 0} Levels`}
            load={isLoading ? '0%' : `${Math.min(100, Math.round((dsaStats.trie?.nodeCount || 0) / 100))}%`}
            color="text-blue-600"
          />
          <NodeStructureCard 
            title="B+ Tree (Metadata)" 
            icon={<Layers size={24} />}
            nodes={isLoading ? '...' : (dsaStats.bPlusTreeSize?.nodeCount || 0).toLocaleString()}
            depth={`${dsaStats.bPlusTreeSize?.height || 0} Levels`}
            load={isLoading ? '0%' : `${Math.min(100, Math.round((dsaStats.bPlusTreeSize?.nodeCount || 0) / 50))}%`}
            color="text-purple-600"
          />
          <NodeStructureCard 
            title="AVL Tree (Tags)" 
            icon={<Network size={24} />}
            nodes={isLoading ? '...' : (dsaStats.avlTreeTags?.nodeCount || 0).toLocaleString()}
            depth={`${dsaStats.avlTreeTags?.height || 0} Levels`}
            load={isLoading ? '0%' : '0%'}
            color="text-emerald-600"
          />
        </div>

        {/* DSA Structure Details Table */}
        <div className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm">
          <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="font-bold text-slate-900">DSA Structure Details</h3>
              <p className="text-[10px] text-slate-400 font-medium uppercase mt-1">Real-time performance metrics per structure</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-tighter">
              <Activity size={14} className="text-emerald-500 animate-pulse" />
              <span className="text-emerald-600">Live Updates</span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                <tr>
                  <th className="px-8 py-5">Structure</th>
                  <th className="px-8 py-5">Type</th>
                  <th className="px-8 py-5">Nodes</th>
                  <th className="px-8 py-5">Operations</th>
                  <th className="px-8 py-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                <DSARow 
                  name="Trie" 
                  type="Prefix Search"
                  nodes={dsaStats.trie?.nodeCount || 0}
                  operations={dsaStats.operations?.totalSearches || 0}
                  status="Active"
                  complexity="O(L)"
                />
                <DSARow 
                  name="B+ Tree (Size)" 
                  type="Range Query"
                  nodes={dsaStats.bPlusTreeSize?.nodeCount || 0}
                  operations={dsaStats.operations?.totalInserts || 0}
                  status="Active"
                  complexity="O(log N)"
                />
                <DSARow 
                  name="AVL Tree (Tags)" 
                  type="Equality Lookup"
                  nodes={dsaStats.avlTreeTags?.nodeCount || 0}
                  operations={dsaStats.operations?.totalInserts || 0}
                  status="Active"
                  complexity="O(log N)"
                />
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

// --- Sub-components ---

interface NodeStructureCardProps {
  title: string;
  icon: React.ReactNode;
  nodes: string;
  depth: string;
  load: string;
  color: string;
}

const NodeStructureCard = ({ title, icon, nodes, depth, load, color }: NodeStructureCardProps) => (
  <div className="bg-white border border-slate-100 p-8 rounded-[2.5rem] hover:border-blue-200 hover:shadow-xl hover:shadow-blue-50/50 transition-all group cursor-default">
    <div className={`w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm ${color}`}>
      {icon}
    </div>
    <h3 className="font-black text-slate-900 text-lg mb-6 tracking-tight">{title}</h3>
    <div className="space-y-4">
      <div className="flex justify-between items-center text-[11px] border-b border-slate-50 pb-3">
        <span className="text-slate-400 font-bold uppercase tracking-wider">Total Nodes</span>
        <span className="font-mono font-bold text-slate-900">{nodes}</span>
      </div>
      <div className="flex justify-between items-center text-[11px] border-b border-slate-50 pb-3">
        <span className="text-slate-400 font-bold uppercase tracking-wider">Max Depth</span>
        <span className="font-mono font-bold text-slate-900">{depth}</span>
      </div>
      <div className="flex justify-between items-center text-[11px]">
        <span className="text-slate-400 font-bold uppercase tracking-wider">Mem Load</span>
        <span className="font-mono font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{load}</span>
      </div>
    </div>
  </div>
);

interface DSARowProps {
  name: string;
  type: string;
  nodes: number;
  operations: number;
  status: string;
  complexity: string;
}

const DSARow = ({ name, type, nodes, operations, status, complexity }: DSARowProps) => (
  <tr className="hover:bg-slate-50/50 transition-colors group">
    <td className="px-8 py-6 font-mono text-xs font-bold text-slate-900">{name}</td>
    <td className="px-8 py-6 text-xs font-semibold text-slate-500">{type}</td>
    <td className="px-8 py-6 text-xs font-mono font-bold text-blue-600">{nodes.toLocaleString()}</td>
    <td className="px-8 py-6 text-xs font-mono font-bold text-purple-600">{operations.toLocaleString()}</td>
    <td className="px-8 py-6 text-right">
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter bg-emerald-50 text-emerald-600 border border-emerald-100">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        {status}
      </div>
      <div className="text-[9px] text-slate-400 font-mono mt-1">{complexity}</div>
    </td>
  </tr>
);

export default NodesPage;