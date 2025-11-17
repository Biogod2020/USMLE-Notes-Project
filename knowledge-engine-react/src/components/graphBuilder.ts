import { MarkerType, type Edge, type Node } from '@xyflow/react';
import type { KnowledgeBase } from '../types';
import { getFamilyForType } from '../utils/semanticUtils';

interface BuildArgs {
  knowledgeBase: KnowledgeBase;
  centerNodeId: string;
  expandedNodeIds: Set<string>;
  activeEdgeFilters: Set<string>;
  adjustColor: (cssVar: string, opacity?: number, darken?: boolean) => string;
  theme: 'light' | 'dark';
}

interface BuildResult {
  nodes: Node[];
  edges: Edge[];
}

const CENTER_ONLY: BuildResult = { nodes: [], edges: [] };

export function buildGraphElements(args: BuildArgs): BuildResult {
  const { knowledgeBase, centerNodeId, expandedNodeIds, activeEdgeFilters, adjustColor, theme } = args;
  if (!centerNodeId || !knowledgeBase[centerNodeId]) {
    return CENTER_ONLY;
  }

  const focusIds = new Set(expandedNodeIds);
  focusIds.add(centerNodeId);

  const visibleNodeIds = new Set<string>();
  const topics = Object.values(knowledgeBase);

  const includeIncomingNeighbors = (targetId: string) => {
    topics.forEach(topic => {
      if (!topic || topic.id.startsWith('zzz_')) return;
      topic.connections?.forEach(conn => {
        if (conn.to === targetId) {
          visibleNodeIds.add(topic.id);
        }
      });
    });
  };

  focusIds.forEach(focusId => {
    const topic = knowledgeBase[focusId];
    if (!topic || topic.id.startsWith('zzz_')) return;
    visibleNodeIds.add(focusId);
    topic.connections?.forEach(conn => {
      if (!conn.to.startsWith('zzz_')) {
        visibleNodeIds.add(conn.to);
      }
    });
    includeIncomingNeighbors(focusId);
  });

  const isDark = theme === 'dark';
  const grayColor = isDark ? '#6b7280' : '#9ca3af';

  const edges: Edge[] = [];
  const edgeNodeIds = new Set<string>();

  Array.from(visibleNodeIds).forEach(sourceId => {
    const topic = knowledgeBase[sourceId];
    if (!topic || topic.id.startsWith('zzz_')) return;
    topic.connections?.forEach(conn => {
      const targetId = conn.to;
      if (!visibleNodeIds.has(targetId) || sourceId === targetId) return;

      const family = getFamilyForType(conn.type);
      if (activeEdgeFilters.size > 0 && !activeEdgeFilters.has(family.name)) {
        return;
      }

      const baseColorVar = `--c-${family.color}-${isDark ? 'dark' : 'light'}`;
      let finalColor = grayColor;
      let strokeDasharray = '5, 5';
      let strokeWidth = 1.5;
      let zIndex = 1;
      const isConnectedToFocus = focusIds.has(sourceId) || focusIds.has(targetId);

      if (isConnectedToFocus) {
        strokeDasharray = 'none';
        strokeWidth = 2.5;
        zIndex = 10;
        if (focusIds.has(sourceId)) {
          finalColor = adjustColor(baseColorVar, 1, false);
        } else {
          finalColor = adjustColor(baseColorVar, 1, true);
        }
      }

      edgeNodeIds.add(sourceId);
      edgeNodeIds.add(targetId);

      edges.push({
        id: `e-${sourceId}-${targetId}-${conn.type}`,
        source: sourceId,
        target: targetId,
        type: 'smart',
        label: conn.type.replace(/_/g, ' '),
        style: { stroke: finalColor, strokeWidth, strokeDasharray, opacity: 0.9 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: finalColor,
          width: 20,
          height: 20,
        },
        zIndex,
        data: { family: family.name },
      });
    });
  });

  const finalNodeIds = Array.from(visibleNodeIds).filter(id => edgeNodeIds.has(id) || focusIds.has(id));

  const nodes: Node[] = finalNodeIds
    .filter(id => knowledgeBase[id] && !knowledgeBase[id]!.id.startsWith('zzz_'))
    .map(id => ({
      id,
      type: 'default',
      position: { x: 0, y: 0 },
      data: {
        title: knowledgeBase[id]!.title,
        type: knowledgeBase[id]!.primaryType,
        isCenter: id === centerNodeId,
        isExpanded: expandedNodeIds.has(id),
      },
    }));

  return { nodes, edges };
}
