import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Panel,
  Node,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Globe, ExternalLink, Layers } from 'lucide-react';

interface GraphNode {
  id: string;
  url: string;
  title: string;
  depth: number;
  wordCount?: number;
  outgoingLinks?: number;
}

interface GraphLink {
  source: string;
  target: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  algorithm?: string;
}

// Custom node component
const CustomNode = ({ data, selected }: { data: any; selected: boolean }) => {
  const depthColors = [
    'from-purple-600 to-pink-500',
    'from-blue-500 to-cyan-400',
    'from-emerald-500 to-teal-400',
    'from-amber-500 to-orange-400',
    'from-rose-500 to-red-400',
  ];

  const colorClass = depthColors[data.depth % depthColors.length];
  const isRoot = data.depth === 0;
  const isHighlighted = data.highlighted;
  const isInPath = data.inPath;

  return (
    <div style={{ position: 'relative' }}>
      <Handle type="target" position={Position.Top} style={{ background: '#8b5cf6', width: 8, height: 8, border: '2px solid #fff' }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#8b5cf6', width: 8, height: 8, border: '2px solid #fff' }} />
      <Handle type="target" position={Position.Left} style={{ background: '#8b5cf6', width: 8, height: 8, border: '2px solid #fff' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#8b5cf6', width: 8, height: 8, border: '2px solid #fff' }} />

      <div
        className={`px-3.5 py-2.5 rounded-xl border-2 shadow-lg transition-all duration-300 ${
          isHighlighted || selected
            ? 'border-yellow-400 shadow-2xl scale-110 ring-4 ring-yellow-300/50'
            : isInPath
              ? 'border-blue-400 shadow-xl scale-105 ring-2 ring-blue-200/50'
              : isRoot
                ? 'border-purple-400 hover:shadow-xl hover:scale-105'
                : 'border-slate-200 hover:shadow-xl hover:scale-105'
        }`}
        style={{
          background: isHighlighted || selected
            ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
            : isInPath
              ? 'linear-gradient(135deg, #93c5fd, #60a5fa)'
              : isRoot
                ? 'linear-gradient(135deg, #7c3aed, #db2777)'
                : '#ffffff',
          minWidth: isRoot ? '180px' : '150px',
          opacity: data.dimmed ? 0.25 : 1,
        }}
      >
        <div className="flex items-start gap-2">
          <div className={`p-1.5 rounded-lg bg-gradient-to-br ${colorClass} ${isRoot ? 'bg-white/20' : 'bg-opacity-10'}`}>
            {isRoot ? (
              <Globe className={`w-4 h-4 ${isRoot || isHighlighted || isInPath ? 'text-white' : 'text-slate-700'}`} />
            ) : (
              <ExternalLink className={`w-3.5 h-3.5 ${isHighlighted || isInPath ? 'text-white' : 'text-slate-600'}`} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className={`font-bold text-xs truncate ${isRoot || isHighlighted || isInPath ? 'text-white' : 'text-slate-900'}`}>
              {data.title}
            </div>
            <div className={`text-[9px] truncate mt-0.5 ${isRoot || isHighlighted || isInPath ? 'text-white/70' : 'text-slate-400'}`}>
              {data.url}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                isRoot || isHighlighted || isInPath ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                D:{data.depth}
              </span>
              {data.childCount > 0 && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                  isRoot || isHighlighted || isInPath ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {data.childCount} →
                </span>
              )}
              {data.wordCount > 0 && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                  isRoot || isHighlighted || isInPath ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'
                }`}>
                  {data.wordCount}w
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const nodeTypes = { custom: CustomNode };

export default function CrawlGraph({ data }: { data: GraphData }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedLayout, setSelectedLayout] = useState<'hierarchical' | 'radial'>('hierarchical');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Build adjacency maps
  const adjacencyMap = useMemo(() => {
    const forward = new Map<string, Set<string>>();
    const reverse = new Map<string, Set<string>>();
    data.links.forEach(link => {
      if (!forward.has(link.source)) forward.set(link.source, new Set());
      if (!reverse.has(link.target)) reverse.set(link.target, new Set());
      forward.get(link.source)!.add(link.target);
      reverse.get(link.target)!.add(link.source);
    });
    return { forward, reverse };
  }, [data.links]);

  // BFS from root to find path
  const findPathFromRoot = useCallback((nodeId: string) => {
    const path = new Set<string>();
    const queue = [nodeId];
    const visited = new Set<string>();
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      path.add(current);
      const parents = adjacencyMap.reverse.get(current);
      if (parents) parents.forEach(p => { if (!visited.has(p)) queue.push(p); });
    }
    return path;
  }, [adjacencyMap]);

  const findDescendants = useCallback((nodeId: string) => {
    const desc = new Set<string>();
    const queue = [nodeId];
    const visited = new Set<string>();
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      desc.add(current);
      const children = adjacencyMap.forward.get(current);
      if (children) children.forEach(c => { if (!visited.has(c)) queue.push(c); });
    }
    return desc;
  }, [adjacencyMap]);

  // Layout calculation
  const calculateLayout = useCallback((layout: string) => {
    const depthMap = new Map<number, GraphNode[]>();
    data.nodes.forEach(node => {
      if (!depthMap.has(node.depth)) depthMap.set(node.depth, []);
      depthMap.get(node.depth)!.push(node);
    });

    const positions = new Map<string, { x: number; y: number }>();

    if (layout === 'hierarchical') {
      depthMap.forEach((nodes, depth) => {
        const spacing = 280;
        const totalWidth = (nodes.length - 1) * spacing;
        const startX = -totalWidth / 2;
        nodes.forEach((node, index) => {
          positions.set(node.id, { x: startX + index * spacing, y: depth * 200 });
        });
      });
    } else {
      depthMap.forEach((nodes, depth) => {
        const radius = depth === 0 ? 0 : 150 + depth * 180;
        const angleStep = (Math.PI * 2) / Math.max(nodes.length, 1);
        nodes.forEach((node, index) => {
          const angle = angleStep * index - Math.PI / 2;
          positions.set(node.id, { x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
        });
      });
    }

    return positions;
  }, [data]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id === selectedNodeId ? null : node.id);
  }, [selectedNodeId]);

  // Build flow nodes and edges
  useEffect(() => {
    if (!data?.nodes?.length) return;

    const positions = calculateLayout(selectedLayout);
    const childCountMap = new Map<string, number>();
    data.links.forEach(link => childCountMap.set(link.source, (childCountMap.get(link.source) || 0) + 1));

    let highlightedNodes = new Set<string>();
    let pathNodes = new Set<string>();

    if (selectedNodeId) {
      highlightedNodes.add(selectedNodeId);
      pathNodes = findPathFromRoot(selectedNodeId);
      const descendants = findDescendants(selectedNodeId);
      descendants.forEach(id => pathNodes.add(id));
    }

    const flowNodes: Node[] = data.nodes.map(node => {
      const pos = positions.get(node.id) || { x: 0, y: 0 };
      const isHighlighted = highlightedNodes.has(node.id);
      const isInPath = pathNodes.has(node.id) && !isHighlighted;
      const isDimmed = !!selectedNodeId && !highlightedNodes.has(node.id) && !pathNodes.has(node.id);

      return {
        id: node.id,
        type: 'custom',
        position: pos,
        data: {
          title: node.title,
          url: node.url,
          depth: node.depth,
          childCount: childCountMap.get(node.id) || 0,
          wordCount: node.wordCount || 0,
          highlighted: isHighlighted,
          inPath: isInPath,
          dimmed: isDimmed,
        },
      };
    });

    const highlightedEdges = new Set<string>();
    if (selectedNodeId) {
      data.links.forEach(link => {
        if (pathNodes.has(link.source) && pathNodes.has(link.target)) {
          highlightedEdges.add(`${link.source}-${link.target}`);
        }
      });
    }

    const flowEdges = data.links.map(link => {
      const key = `${link.source}-${link.target}`;
      const isHl = highlightedEdges.has(key);
      const isDimmed = !!selectedNodeId && !isHl;

      return {
        id: `edge-${key}`,
        source: link.source,
        target: link.target,
        type: 'smoothstep',
        animated: isHl,
        style: {
          stroke: isHl ? '#3b82f6' : '#8b5cf6',
          strokeWidth: isHl ? 3 : 1.5,
          opacity: isDimmed ? 0.15 : 1,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: isHl ? 24 : 18,
          height: isHl ? 24 : 18,
          color: isHl ? '#3b82f6' : '#8b5cf6',
        },
      };
    });

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [data, selectedLayout, selectedNodeId, setNodes, setEdges, calculateLayout, findPathFromRoot, findDescendants]);

  const stats = useMemo(() => {
    const maxDepth = data.nodes.length > 0 ? Math.max(...data.nodes.map(n => n.depth)) : 0;
    return {
      totalNodes: data.nodes.length,
      totalLinks: data.links.length,
      maxDepth,
    };
  }, [data]);

  const selectedNode = selectedNodeId ? data.nodes.find(n => n.id === selectedNodeId) : null;

  return (
    <div className="w-full h-[600px] rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        className="bg-slate-50"
      >
        <Background color="#e2e8f0" gap={24} size={1} />
        <Controls className="bg-white shadow-md rounded-lg border border-slate-200" />
        <MiniMap
          className="bg-white shadow-md rounded-lg border border-slate-200"
          nodeColor={(node) => {
            if (node.data.highlighted) return '#facc15';
            if (node.data.inPath) return '#60a5fa';
            const colors = ['#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
            return colors[(node.data.depth || 0) % colors.length];
          }}
        />

        {/* Stats Panel */}
        <Panel position="top-left">
          <div className="bg-white/95 backdrop-blur-sm shadow-lg rounded-xl border border-slate-200 p-4 max-w-[200px]">
            <h2 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-purple-600" />
              Graph Stats
            </h2>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Nodes</span>
                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold">{stats.totalNodes}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Edges</span>
                <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-bold">{stats.totalLinks}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Max Depth</span>
                <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">{stats.maxDepth}</span>
              </div>
              {data.algorithm && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Algorithm</span>
                  <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase">{data.algorithm}</span>
                </div>
              )}
            </div>

            {selectedNode && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Selected</div>
                <div className="text-[11px] font-bold text-slate-900 truncate">{selectedNode.title}</div>
                <button
                  onClick={() => setSelectedNodeId(null)}
                  className="mt-1.5 w-full px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold transition-colors"
                >
                  Clear Selection
                </button>
              </div>
            )}
          </div>
        </Panel>

        {/* Layout Switcher */}
        <Panel position="top-right">
          <div className="bg-white/95 backdrop-blur-sm shadow-lg rounded-xl border border-slate-200 p-3">
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Layers className="w-3 h-3 text-purple-500" /> Layout
            </div>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => setSelectedLayout('hierarchical')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                  selectedLayout === 'hierarchical'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Hierarchical
              </button>
              <button
                onClick={() => setSelectedLayout('radial')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                  selectedLayout === 'radial'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Radial
              </button>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
