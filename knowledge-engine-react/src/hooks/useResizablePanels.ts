// src/hooks/useResizablePanels.ts
import { useState, useCallback, useRef, useEffect } from 'react';

type Panel = 'nav' | 'connections';

interface Config {
  nav: { initial: number; min: number };
  connections: { initial: number; min: number };
}

export function useResizablePanels(config: Config) {
  const [sizes, setSizes] = useState({
    nav: config.nav.initial,
    connections: config.connections.initial,
  });

  const [isCollapsed, setIsCollapsed] = useState({
    nav: false,
    connections: false,
  });

  const draggingPanel = useRef<Panel | null>(null);

  const toggleCollapse = useCallback((panel: Panel) => {
    setIsCollapsed(prev => ({ ...prev, [panel]: !prev[panel] }));
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingPanel.current) return;

    if (draggingPanel.current === 'nav') {
      const newWidth = e.clientX;
      setSizes(prev => ({
        ...prev,
        nav: Math.max(config.nav.min, newWidth),
      }));
    } else if (draggingPanel.current === 'connections') {
      const newWidth = window.innerWidth - e.clientX;
      setSizes(prev => ({
        ...prev,
        connections: Math.max(config.connections.min, newWidth),
      }));
    }
  }, [config]);

  const handleMouseUp = useCallback(() => {
    draggingPanel.current = null;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  }, [handleMouseMove]);

  const startDragging = useCallback((panel: Panel) => {
    draggingPanel.current = panel;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [handleMouseMove, handleMouseUp]);

  // Handle window resize to prevent overflow
  useEffect(() => {
    const handleResize = () => {
      setSizes(prev => ({
        nav: Math.min(prev.nav, window.innerWidth - prev.connections - config.connections.min),
        connections: Math.min(prev.connections, window.innerWidth - prev.nav - config.nav.min),
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [config]);


  return { sizes, startDragging, isCollapsed, toggleCollapse };
}
