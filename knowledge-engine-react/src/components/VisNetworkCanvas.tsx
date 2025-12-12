import { useEffect, useRef, useState } from 'react';
import { Network, DataSet, type Options, type Node as VisNode, type Edge as VisEdge } from 'vis-network/standalone';
import type { KnowledgeBase } from '../types';

import { getEmoji } from '../constants';

export interface VisNetworkCanvasProps {
  knowledgeBase: KnowledgeBase;
  centerNodeId: string | null;
  onNodeClick: (topicId: string) => void;
}

function buildVisData(knowledgeBase: KnowledgeBase, centerNodeId: string | null) {
  if (!centerNodeId || !knowledgeBase[centerNodeId]) {
    return { nodes: [], edges: [] };
  }

  const connectedNodes = new Set([centerNodeId]);
  knowledgeBase[centerNodeId]?.connections?.forEach(conn => connectedNodes.add(conn.to));
  Object.keys(knowledgeBase).forEach(id => {
    knowledgeBase[id]?.connections?.forEach(conn => {
      if (conn.to === centerNodeId) connectedNodes.add(id);
    });
  });

  const nodes: VisNode[] = Array.from(connectedNodes)
    .filter(id => knowledgeBase[id])
    .map(id => ({
      id,
      label: `${getEmoji(knowledgeBase[id].primaryType)} ${knowledgeBase[id].title}`,
      group: knowledgeBase[id].primaryType,
    }));

  const edges: VisEdge[] = Array.from(connectedNodes).flatMap(nodeId =>
    knowledgeBase[nodeId]?.connections
      ?.filter(c => connectedNodes.has(c.to))
      .map(c => ({
        from: nodeId,
        to: c.to,
        label: c.type.replace(/_/g, ' '),
        arrows: 'to',
      })) || [],
  );

  return { nodes, edges };
}

const TYPE_KEYS = ['disease', 'drug', 'anatomy', 'microbe', 'molecule', 'physiology', 'finding', 'concept'] as const;

function resolveGroupColors(theme: 'light' | 'dark') {
  if (typeof document === 'undefined') return {};
  const css = getComputedStyle(document.documentElement);
  // Use 'any' or less strict type to avoid complexity with tuple mapping
  const entries = TYPE_KEYS.map(type => {
    const bg = css.getPropertyValue(`--c-${type}-bg-${theme}`).trim() || '#ffffff';
    const border = css.getPropertyValue(`--c-${type}-${theme}`).trim() || '#333333';
    // Add highlight colors (slightly brighter)
    return [type, { 
        color: { background: bg, border },
        highlight: { background: border, border: bg }
    }] as const;
  });
  const defaultEntry = ['default', { 
      color: { background: '#ffffff', border: '#333333' },
      highlight: { background: '#cccccc', border: '#000000' }
  }] as const;
  
  return Object.fromEntries([...entries, defaultEntry]);
}

export function VisNetworkCanvas({ knowledgeBase, centerNodeId, onNodeClick }: VisNetworkCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const resizeCleanupRef = useRef<(() => void) | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof document === 'undefined') return 'light';
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!containerRef.current || !centerNodeId) return;

    let rafId: number | null = null;
    let cancelled = false;

    const initialise = () => {
      if (cancelled || !containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      if (width < 10 || height < 10) {
        rafId = window.requestAnimationFrame(initialise);
        return;
      }

      const { nodes, edges } = buildVisData(knowledgeBase, centerNodeId);
      const data = { nodes: new DataSet(nodes), edges: new DataSet(edges) };

      const options: Options = {
        nodes: {
          shape: 'box',
          borderWidth: 2,
          font: {
              size: 14,
              color: getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim() || '#1f2937',
              face: 'Inter, system-ui, sans-serif'
          },
          margin: { top: 12, right: 20, bottom: 12, left: 20 },
          shadow: true,
        },
        edges: {
          width: 2,
          smooth: { enabled: true, type: 'continuous', roundness: 0.5 },
          font: { size: 10, align: 'horizontal', color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#6b7280', strokeWidth: 0 },
          color: { inherit: 'from', opacity: 0.8 },
          arrows: { to: { enabled: true, scaleFactor: 0.8 } }
        },
        physics: {
          solver: 'forceAtlas2Based',
          forceAtlas2Based: { 
              gravitationalConstant: -200,
              springLength: 250,
              centralGravity: 0.005,
              damping: 0.4
          },
          stabilization: { iterations: 1000, fit: true },
          maxVelocity: 50,
          minVelocity: 0.1,
        },
        interaction: { hover: true },
        groups: resolveGroupColors(theme),
        autoResize: true,
      };

      networkRef.current?.destroy();
      networkRef.current = new Network(containerRef.current, data, options);
      networkRef.current.once('stabilized', () => networkRef.current?.fit({ animation: { duration: 400, easingFunction: 'easeInOutQuad' } }));
      networkRef.current.on('selectNode', params => {
        if (params.nodes.length > 0) {
          onNodeClick(params.nodes[0]);
        }
      });

      const supportsResizeObserver = 'ResizeObserver' in window;

      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      resizeCleanupRef.current?.();
      resizeCleanupRef.current = null;

      if (supportsResizeObserver) {
        resizeObserverRef.current = new ResizeObserver(() => {
          networkRef.current?.redraw();
          networkRef.current?.fit();
        });
        resizeObserverRef.current.observe(containerRef.current);
      } else {
        const handleResize = () => {
          networkRef.current?.redraw();
          networkRef.current?.fit();
        };
        window.addEventListener('resize', handleResize);
        resizeCleanupRef.current = () => window.removeEventListener('resize', handleResize);
      }

      window.requestAnimationFrame(() => {
        networkRef.current?.redraw();
        networkRef.current?.fit({ animation: false });
      });
    };

    initialise();

    return () => {
      cancelled = true;
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      resizeCleanupRef.current?.();
      resizeCleanupRef.current = null;
      networkRef.current?.destroy();
      networkRef.current = null;
    };
  }, [knowledgeBase, centerNodeId, onNodeClick, theme]);

  return <div className="vis-network-canvas" ref={containerRef} style={{ width: '100%', height: '100%', minHeight: '480px' }} />;
}
