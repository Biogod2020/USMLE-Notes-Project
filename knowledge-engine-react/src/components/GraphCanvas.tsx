import { useCallback, useLayoutEffect, useRef, useState, type MouseEvent } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  useReactFlow,
  type Node,
  type Edge,
  ConnectionLineType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { color as d3Color } from 'd3-color';
import { SmartBezierEdge } from '@tisoap/react-flow-smart-edge';

import type { KnowledgeBase } from '../types';
import CustomNode from './CustomNode';
import { SEMANTIC_FAMILIES } from '../utils/semanticUtils';
import { getElkLayoutedElements } from '../utils/elkLayout';
import { buildGraphElements } from './graphBuilder';
import './graphModal.css';

const nodeTypes = { default: CustomNode };
const edgeTypes = { smart: SmartBezierEdge };

export interface GraphCanvasProps {
  knowledgeBase: KnowledgeBase;
  centerNodeId: string | null;
  onNodeClick: (topicId: string) => void;
}

function GraphCanvasView({ knowledgeBase, centerNodeId, onNodeClick }: GraphCanvasProps) {
  const colorCacheRef = useRef(new Map<string, string>());
  const layoutRequestRef = useRef(0);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(() => new Set());
  const [activeEdgeFilters, setActiveEdgeFilters] = useState<Set<string>>(() => new Set());

  useLayoutEffect(() => {
    if (centerNodeId) {
      setExpandedNodeIds(new Set([centerNodeId]));
    } else {
      setExpandedNodeIds(new Set());
    }
    setActiveEdgeFilters(new Set());
  }, [centerNodeId]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { fitView } = useReactFlow();

  const resolveCssVar = useCallback((cssVar: string): string => {
    if (typeof document === 'undefined') return '#999';
    const theme = document.documentElement.getAttribute('data-theme') ?? 'light';
    const cacheKey = `${theme}:${cssVar}`;
    const cache = colorCacheRef.current;
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey)!;
    }
    const raw = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
    const resolved = raw || '#999';
    cache.set(cacheKey, resolved);
    return resolved;
  }, []);

  const adjustColor = useCallback((cssVar: string, opacity: number = 1, darken: boolean = false): string => {
    const baseColor = resolveCssVar(cssVar);
    const c = d3Color(baseColor);
    if (!c) return '#999';
    if (darken) c.darker(0.6);
    else c.brighter(0.3);
    c.opacity = opacity;
    return c.toString();
  }, [resolveCssVar]);

  const runLayout = useCallback(async (currentNodes: Node[], currentEdges: Edge[]) => {
    const requestId = ++layoutRequestRef.current;
    const nodesWithDim = currentNodes.map(node => ({
      ...node,
      width: node.width ?? 220,
      height: node.height ?? 80,
    }));
    const { nodes: layoutedNodes } = await getElkLayoutedElements(nodesWithDim, currentEdges);
    if (layoutRequestRef.current !== requestId) return;
    setNodes(layoutedNodes);
    setEdges(currentEdges);

    window.requestAnimationFrame(() => {
      if (layoutRequestRef.current === requestId) {
        fitView({ padding: 0.2, duration: 400 });
      }
    });
  }, [setNodes, setEdges, fitView]);

  const toggleExpandedNode = useCallback((nodeId: string) => {
    setExpandedNodeIds(prev => {
      const next = new Set(prev);
      if (nodeId === centerNodeId) return next;
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, [centerNodeId]);

  useLayoutEffect(() => {
    if (!centerNodeId) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const { nodes: baseNodes, edges: newEdges } = buildGraphElements({
      knowledgeBase,
      centerNodeId,
      expandedNodeIds,
      activeEdgeFilters,
      adjustColor,
      theme,
    });

    const enrichedNodes = baseNodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        onActivate: () => onNodeClick(node.id),
        onToggleExpand: node.id !== centerNodeId ? () => toggleExpandedNode(node.id) : undefined,
      },
    }));

    runLayout(enrichedNodes, newEdges);
  }, [centerNodeId, knowledgeBase, expandedNodeIds, activeEdgeFilters, adjustColor, runLayout, onNodeClick, toggleExpandedNode]);

  const handleNodeDoubleClick = useCallback((_: MouseEvent, node: Node) => {
    toggleExpandedNode(node.id);
  }, [toggleExpandedNode]);

  const toggleFilter = useCallback((familyName: string) => {
    setActiveEdgeFilters(prev => {
      const next = new Set(prev);
      if (next.has(familyName)) {
        next.delete(familyName);
      } else {
        next.add(familyName);
      }
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => setActiveEdgeFilters(new Set()), []);
  const edgeCount = edges.length;

  return (
    <div className="graph-view">
      <div className="graph-toolbar">
        <div className="graph-toolbar__hint">Filter by relationship</div>
        <div className="graph-toolbar__filters">
          {Object.values(SEMANTIC_FAMILIES).filter(f => f.name !== 'Other').map(family => (
            <button
              key={family.name}
              type="button"
              className={`filter-pill type-${family.color} ${activeEdgeFilters.has(family.name) ? 'active' : ''}`}
              onClick={() => toggleFilter(family.name)}
              aria-pressed={activeEdgeFilters.has(family.name)}
            >
              {family.name}
            </button>
          ))}
          {activeEdgeFilters.size > 0 && (
            <button type="button" className="filter-pill clear" onClick={clearFilters}>Clear</button>
          )}
        </div>
      </div>

      <div className="graph-legend">
        <strong>Legend</strong>
        <div className="graph-legend__items">
          {Object.values(SEMANTIC_FAMILIES).map(family => (
            <span key={family.name} className="graph-legend__item">
              <span className={`legend-dot type-${family.color}`} />
              {family.name}
            </span>
          ))}
        </div>
      </div>

      {edgeCount === 0 && (
        <div className="graph-empty">
          <p>No connections match the current filters. Expand another node or clear filters.</p>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node: Node) => onNodeClick(node.id)}
        onNodeDoubleClick={handleNodeDoubleClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionLineType={ConnectionLineType.Bezier}
        fitView
        minZoom={0.1}
        className="bg-pattern"
        nodesConnectable={false}
        nodesDraggable={true}
      >
        <Controls showInteractive={false} />
        <Background gap={20} size={1} />
      </ReactFlow>
    </div>
  );
}

export default function GraphCanvas(props: GraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvasView {...props} />
    </ReactFlowProvider>
  );
}
