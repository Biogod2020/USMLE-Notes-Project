import { describe, expect, test, vi } from 'vitest';
import { buildGraphElements } from '../graphBuilder';
import type { KnowledgeBase } from '../../types';

const baseKnowledge: KnowledgeBase = {
  center: {
    id: 'center',
    title: 'Center Node',
    primaryType: 'core',
    content: {},
    connections: [
      { type: 'is_a', to: 'child' },
      { type: 'associated_with', to: 'context' },
    ],
  },
  child: {
    id: 'child',
    title: 'Child Node',
    primaryType: 'detail',
    content: {},
    connections: [{ type: 'causes', to: 'leaf' }],
  },
  context: {
    id: 'context',
    title: 'Context Node',
    primaryType: 'detail',
    content: {},
    connections: [],
  },
  leaf: {
    id: 'leaf',
    title: 'Leaf Node',
    primaryType: 'detail',
    content: {},
    connections: [],
  },
  upstream: {
    id: 'upstream',
    title: 'Upstream Node',
    primaryType: 'detail',
    content: {},
    connections: [{ type: 'is_a', to: 'center' }],
  },
};

describe('buildGraphElements', () => {
  test('includes expanded nodes, inbound neighbors, and applies styles', () => {
    const adjustColor = vi.fn().mockReturnValue('#123456');
    const { nodes, edges } = buildGraphElements({
      knowledgeBase: baseKnowledge,
      centerNodeId: 'center',
      expandedNodeIds: new Set(['center', 'child']),
      activeEdgeFilters: new Set(),
      adjustColor,
      theme: 'light',
    });

    expect(nodes.map(node => node.id).sort()).toEqual(['center', 'child', 'context', 'leaf', 'upstream'].sort());

    const hierarchyEdge = edges.find(edge => edge.id.startsWith('e-center-child'));
    expect(hierarchyEdge).toBeDefined();
    expect(hierarchyEdge?.style?.strokeDasharray).toBe('none');

    const upstreamEdge = edges.find(edge => edge.id.startsWith('e-upstream-center'));
    expect(upstreamEdge).toBeDefined();

    const leafEdge = edges.find(edge => edge.id.startsWith('e-child-leaf'));
    expect(leafEdge).toBeDefined();
    expect(leafEdge?.style?.strokeDasharray).toBe('none');

    expect(adjustColor).toHaveBeenCalled();
  });

  test('applies edge filters and prunes disconnected nodes', () => {
    const adjustColor = vi.fn().mockReturnValue('#abcdef');
    const { nodes, edges } = buildGraphElements({
      knowledgeBase: baseKnowledge,
      centerNodeId: 'center',
      expandedNodeIds: new Set(['center', 'child']),
      activeEdgeFilters: new Set(['Hierarchy']),
      adjustColor,
      theme: 'light',
    });

    expect(edges).toHaveLength(2); // center->child and upstream->center
    expect(nodes.map(node => node.id).sort()).toEqual(['center', 'child', 'upstream'].sort());
  });
});
