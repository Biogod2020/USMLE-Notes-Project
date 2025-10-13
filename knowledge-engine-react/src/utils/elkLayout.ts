// src/utils/elkLayout.ts
import ELK, { type ElkNode, type LayoutOptions, type ElkExtendedEdge } from 'elkjs/lib/elk.bundled.js';
// FIX: 导入路径从 'reactflow' 改为 '@xyflow/react'
import type { Node as ReactFlowNode, Edge as ReactFlowEdge } from '@xyflow/react';

const elk = new ELK();

const elkOptions: LayoutOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.layered.spacing.nodeNodeBetweenLayers': '250',
  'elk.spacing.nodeNode': '80',
  'elk.separateConnectedComponents': 'true',
  'elk.edgeRouting': 'SPLINES',
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
      width: 200,
      height: 60,
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
    if (elkNode?.x && elkNode?.y) {
      node.position = { x: elkNode.x, y: elkNode.y };
    }
    return node;
  });

  return { nodes: layoutedNodes, edges };
};