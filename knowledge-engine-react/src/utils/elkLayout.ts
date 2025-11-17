// src/utils/elkLayout.ts
import ELK, { type ElkNode, type LayoutOptions, type ElkExtendedEdge } from 'elkjs/lib/elk.bundled.js';
// FIX: 导入路径从 'reactflow' 改为 '@xyflow/react'
import type { Node as ReactFlowNode, Edge as ReactFlowEdge } from '@xyflow/react';

const elk = new ELK();

const elkOptions: LayoutOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.layered.spacing.nodeNodeBetweenLayers': '260',
  'elk.layered.spacing.edgeNodeBetweenLayers': '90',
  'elk.spacing.nodeNode': '120',
  'elk.layered.thoroughness': '10',
  'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
  'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
  'elk.layered.nodePlacement.favorStraightEdges': 'true',
  'elk.layered.compaction.connectedComponents': 'true',
  'elk.separateConnectedComponents': 'true',
  'elk.edgeRouting': 'ORTHOGONAL',
};

export const getElkLayoutedElements = async (
  nodes: ReactFlowNode[],
  edges: ReactFlowEdge[],
): Promise<{ nodes: ReactFlowNode[], edges: ReactFlowEdge[] }> => {
  const elkNodes: ElkNode[] = [];
  const elkEdges: ElkExtendedEdge[] = []; 

  for (const node of nodes) {
    elkNodes.push({
      id: node.id,
      width: node.width ?? 200,
      height: node.height ?? 60,
    });
  }

  for (const edge of edges) {
    elkEdges.push({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    });
  }

  const graph: ElkNode = {
    id: 'root',
    layoutOptions: elkOptions,
    children: elkNodes,
    edges: elkEdges,
  };

  const layoutedGraph = await elk.layout(graph);

  const layoutedNodes = nodes.map(node => {
    const elkNode = layoutedGraph.children?.find(n => n.id === node.id);
    if (elkNode && typeof elkNode.x === 'number' && typeof elkNode.y === 'number') {
      return {
        ...node,
        position: { x: elkNode.x, y: elkNode.y },
      };
    }
    return node;
  });

  return { nodes: layoutedNodes, edges };
};