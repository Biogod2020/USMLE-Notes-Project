// src/components/GraphModal.tsx
import { useCallback, useLayoutEffect, type MouseEvent } from 'react';
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
  MarkerType,
  ConnectionLineType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { color as d3Color } from 'd3-color';
import { SmartBezierEdge } from '@tisoap/react-flow-smart-edge';

import type { KnowledgeBase } from '../types';
import CustomNode from './CustomNode';
import { getFamilyForType } from '../utils/semanticUtils';
import { getElkLayoutedElements } from '../utils/elkLayout';

const nodeTypes = { default: CustomNode };
const edgeTypes = { smart: SmartBezierEdge };

interface Props {
  isOpen: boolean;
  onClose: () => void;
  knowledgeBase: KnowledgeBase;
  centerNodeId: string | null;
  onNodeClick: (topicId: string) => void;
}

// Helper to adjust color brightness
const adjustColor = (cssVar: string, opacity: number = 1, darken: boolean = false): string => {
    const tempDiv = document.createElement('div');
    tempDiv.style.color = `var(${cssVar})`;
    document.body.appendChild(tempDiv);
    const rgbStr = getComputedStyle(tempDiv).color;
    document.body.removeChild(tempDiv);
    
    const c = d3Color(rgbStr);
    if (!c) return '#999';
    
    if (darken) c.brighter(-0.6);
    else c.brighter(0.3);
    
    c.opacity = opacity;
    return c.toString();
};

function GraphView({ knowledgeBase, centerNodeId, onNodeClick }: Omit<Props, 'isOpen' | 'onClose'>) {
  // CRITICAL FIX: Initialize useNodesState and useEdgesState with an empty array [].
  // This allows TypeScript to correctly infer the state type as Node[] and Edge[], not never[].
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { fitView } = useReactFlow();

  const runLayout = useCallback(async (currentNodes: Node[], currentEdges: Edge[]) => {
    const nodesWithDim = currentNodes.map(n => ({...n, width: 220, height: 80}));
    const { nodes: layoutedNodes } = await getElkLayoutedElements(nodesWithDim, currentEdges);
    setNodes(layoutedNodes);
    setEdges(currentEdges); 

    window.requestAnimationFrame(() => fitView({ padding: 0.2, duration: 400 }));
  }, [setNodes, setEdges, fitView]);

  useLayoutEffect(() => {
    if (!centerNodeId) return;

    const visibleNodeIds = new Set([centerNodeId]);
    knowledgeBase[centerNodeId]?.connections?.forEach(conn => visibleNodeIds.add(conn.to));
    Object.values(knowledgeBase).forEach(topic => {
        if (topic.id === centerNodeId) return;
        topic.connections?.forEach(conn => {
            if (conn.to === centerNodeId) visibleNodeIds.add(topic.id);
        });
    });

    const newNodes: Node[] = Array.from(visibleNodeIds)
      .filter(id => knowledgeBase[id] && !knowledgeBase[id]!.id.startsWith('zzz_'))
      .map(id => ({
        id,
        type: 'default',
        position: { x: 0, y: 0 },
        data: {
          title: knowledgeBase[id]!.title,
          type: knowledgeBase[id]!.primaryType,
          isCenter: id === centerNodeId,
        },
      }));

    const newEdges: Edge[] = [];
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const grayColor = isDark ? '#6b7280' : '#9ca3af';

    Array.from(visibleNodeIds).forEach(sourceId => {
        const topic = knowledgeBase[sourceId];
        if (!topic || topic.id.startsWith('zzz_')) return;

        topic.connections?.forEach(conn => {
            if (!visibleNodeIds.has(conn.to)) return;
            if (sourceId === conn.to) return;

            const targetId = conn.to;
            const family = getFamilyForType(conn.type);
            const baseColorVar = `--c-${family.color}-${isDark ? 'dark' : 'light'}`;
            
            let finalColor = grayColor;
            let strokeDasharray = '5, 5';
            let strokeWidth = 1.5;
            let zIndex = 1;
            const isConnectedToCenter = sourceId === centerNodeId || targetId === centerNodeId;

            if (isConnectedToCenter) {
                strokeDasharray = 'none';
                strokeWidth = 2.5;
                zIndex = 10;
                if (sourceId === centerNodeId) {
                    finalColor = adjustColor(baseColorVar, 1, false);
                } else {
                    finalColor = adjustColor(baseColorVar, 1, true);
                }
            }
            
            newEdges.push({
                id: `e-${sourceId}-${targetId}-${conn.type}`,
                source: sourceId,
                target: targetId,
                type: 'smart',
                label: conn.type.replace(/_/g, ' '),
                style: { stroke: finalColor, strokeWidth, strokeDasharray, opacity: 0.9 },
                markerEnd: { 
                    type: MarkerType.ArrowClosed, 
                    color: finalColor,
                    width: 20, height: 20,
                },
                zIndex,
            });
        });
    });

    runLayout(newNodes, newEdges);
  }, [centerNodeId, knowledgeBase, runLayout]);
  
  const handleNodeDoubleClick = useCallback((_: MouseEvent, node: Node) => {
     const nodeId = node.id;
     onNodeClick(nodeId);
  }, [onNodeClick]);
  
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={(_, node) => onNodeClick(node.id)}
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
  );
}

export function GraphModal({ isOpen, onClose, ...props }: Props) {
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  }
  
  useLayoutEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;

  return (
    <div className="modal" style={{ display: 'block' }} onClick={handleOverlayClick}>
      <div className="modal-content" style={{display: 'flex', flexDirection: 'column'}}>
        <div className="modal-header">
          <h2><span className="emoji">🕸️</span>Knowledge Graph</h2>
          <div style={{fontSize: '0.8em', color: 'var(--text-muted)', marginLeft: '1rem'}}>
            Solid = Direct connection to center. Dashed = Contextual connection.
          </div>
          <span className="close-btn" onClick={onClose}>&times;</span>
        </div>
        <div style={{flexGrow: 1, position: 'relative'}}>
            <ReactFlowProvider>
              <GraphView {...props} />
            </ReactFlowProvider>
        </div>
      </div>
    </div>
  );
}