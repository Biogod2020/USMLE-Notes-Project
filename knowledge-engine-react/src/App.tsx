// src/App.tsx
import { useEffect, useMemo, useState } from 'react';
import type { KnowledgeBase, Topic, ToastNotification } from './types'; // 确保 Topic 和 KnowledgeBase 都从 './types' 导入
import { NavPanel } from './components/NavPanel';
import { TopicView } from './components/TopicView';
import { ConnectionsPanel } from './components/ConnectionsPanel';
import { GraphModal } from './components/GraphModal';
import { Popover } from './components/Popover';
import { ToastContainer } from './components/Toast';
import { useResizablePanels } from './hooks/useResizablePanels';
import { useKnowledgeBase } from './hooks/useKnowledgeBase';
import Fuse, { type FuseResult } from 'fuse.js';

export type SearchResult = FuseResult<SearchItem>;

type SearchItem = {
  id: string;
  title: string;
  acronym: string;
  primaryType: string;
  tags: string[];
  fullContent: string;
};

interface PopoverData {
  content: { emoji: string; title: string; definition: string };
  x: number;
  y: number;
}
const TYPE_EMOJI: Record<string, string> = {
  disease: '🦠',
  structure: '🏛️',
  process: '⚙️',
  substance: '🧪',
  finding: '❗',
  concept: '💡',
};
const getEmoji = (type: string) => TYPE_EMOJI[type] || '📄';

function stripHtml(html: string) {
  const doc = new DOMParser().parseFromString(html ?? '', 'text/html');
  return doc?.body?.textContent ?? '';
}

function generateAcronym(title: string) {
  const words = (title ?? '').split(/\s+/).filter(Boolean);
  const caps = words
    .filter((w) => /^[A-Z]/.test(w))
    .map((w) => w[0])
    .join('');
  return (caps || words.map((w) => w[0]).join('')).toUpperCase();
}

const panelConfig = {
  nav: { initial: 320, min: 280 },
  connections: { initial: 350, min: 300 },
};
const collapsedWidth = '50px';

export default function App() {
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [isGraphModalOpen, setIsGraphModalOpen] = useState(false);
  const [popoverData, setPopoverData] = useState<PopoverData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isConnectionsOpen, setIsConnectionsOpen] = useState(false);
  const [navFilterPath, setNavFilterPath] = useState<string[] | null>(null);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const {
    knowledgeBase,
    fileSelections,
    directoryName,
    isLoading,
    error,
    selectDirectory,
    toggleFileSelection,
  } = useKnowledgeBase();

  const addToast = (message: string, type: ToastNotification['type'] = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };
  
  const handleSelectDirectory = async () => {
    const result = await selectDirectory();
    if (result) {
        // Initial load, don't show toast unless there's an error from the hook
    }
  };

  const handleToggleFile = async (fileName: string) => {
    const result = await toggleFileSelection(fileName);
    if(result) {
        if(result.added.length > 0) {
            addToast(`Added topics from: ${result.added.join(', ')}`, 'success');
        }
        if (result.removed.length > 0) {
            addToast(`Removed topics from: ${result.removed.join(', ')}`, 'info');
        }
    }
  };

  // Auto-select first topic on initial load
  useEffect(() => {
    if (!activeTopicId && Object.keys(knowledgeBase).length > 0) {
      const firstTopicId = Object.values(knowledgeBase)
        .filter((t) => !!t && typeof t.id === 'string' && !t.id.startsWith('zzz_'))
        .sort((a, b) => a.title.localeCompare(b.title))[0]?.id ?? null;
      setActiveTopicId(firstTopicId);
    }
  }, [knowledgeBase, activeTopicId]);

  const { sizes, startDragging, isCollapsed, toggleCollapse } = useResizablePanels(panelConfig);

  const fuse = useMemo(() => {
    const data: SearchItem[] = Object.values(knowledgeBase)
      .filter((t): t is Topic => !!t && typeof t.id === 'string' && !t.id.startsWith('zzz_'))
      .map((t) => ({
        id: t.id,
        title: t.title,
        acronym: generateAcronym(t.title),
        primaryType: t.primaryType,
        tags: t.tags ?? [],
        fullContent: Object.values(t.content ?? {}).map((v) => stripHtml(String(v ?? ''))).join(' '),
      }));

    return new Fuse<SearchItem>(data, {
      keys: [
        { name: 'title', weight: 1.0 },
        { name: 'acronym', weight: 0.9 },
        { name: 'tags', weight: 0.7 },
        { name: 'fullContent', weight: 0.2 },
      ],
      includeScore: true,
      threshold: 0.4,
      minMatchCharLength: 2,
      ignoreLocation: true,
    });
  }, [knowledgeBase]);

  const searchResults: SearchResult[] | null = useMemo(() => {
    if (!searchTerm.trim()) return null;
    return fuse.search(searchTerm.trim());
  }, [fuse, searchTerm]);

  useEffect(() => {
    const sys = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const t = localStorage.getItem('theme') ?? sys;
    document.documentElement.setAttribute('data-theme', t);
  }, []);

  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest('a[data-topic-id]');
      if (link instanceof HTMLAnchorElement) {
        const topicId = link.dataset.topicId;
        const topic = topicId ? knowledgeBase[topicId] : null;
        if (topic) {
          const rect = link.getBoundingClientRect();
          setPopoverData({
            content: {
              emoji: getEmoji(topic.primaryType),
              title: topic.title,
              definition: stripHtml(topic.content?.definition ?? 'No definition.'),
            },
            x: rect.left + window.scrollX,
            y: rect.top + window.scrollY,
          });
        }
      }
    };
    const handleMouseOut = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest('a[data-topic-id]');
      if (link) {
        setPopoverData(null);
      }
    };
    document.body.addEventListener('mouseover', handleMouseOver);
    document.body.addEventListener('mouseout', handleMouseOut);
    return () => {
      document.body.removeEventListener('mouseover', handleMouseOver);
      document.body.removeEventListener('mouseout', handleMouseOut);
    };
  }, [knowledgeBase]);

  const toggleTheme = () => {
    const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  };

  const handleTopicSelect = (id: string) => {
    if (activeTopicId !== id) {
      setActiveTopicId(id);
    }
    setNavFilterPath(null);
    setIsNavOpen(false);
    setIsConnectionsOpen(false);
  };
  
  const handleBreadcrumbClick = (path: string[]) => {
    setNavFilterPath(path);
    setSearchTerm('');
    if (window.innerWidth <= 1024) {
        setIsNavOpen(true);
    }
  };

  const handleGraphNodeClick = (id: string) => {
    setActiveTopicId(id);
    setIsGraphModalOpen(false);
  };
  
  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    if (term) {
        setNavFilterPath(null);
    }
  };

  const activeTopic = activeTopicId ? knowledgeBase[activeTopicId] ?? null : null;
  const closeAllDrawers = () => {
    setIsNavOpen(false);
    setIsConnectionsOpen(false);
  }

  return (
    <>
      <div className="container">
        <div
          className={`mobile-overlay ${isNavOpen || isConnectionsOpen ? 'visible' : ''}`}
          onClick={closeAllDrawers}
        />

        <aside
          className={`nav-panel ${isNavOpen ? 'open' : ''} ${isCollapsed.nav ? 'collapsed' : ''}`}
          style={{
            flexBasis: isCollapsed.nav ? collapsedWidth : `${sizes.nav}px`,
            minWidth: isCollapsed.nav ? collapsedWidth : `${panelConfig.nav.min}px`,
          }}
        >
          <NavPanel
            knowledgeBase={knowledgeBase}
            activeTopicId={activeTopicId}
            onTopicSelect={handleTopicSelect}
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            searchResults={searchResults}
            onToggleTheme={toggleTheme}
            isCollapsed={isCollapsed.nav}
            onToggleCollapse={() => toggleCollapse('nav')}
            navFilterPath={navFilterPath}
            onClearNavFilter={() => setNavFilterPath(null)}
            // New props for file management
            directoryName={directoryName}
            fileSelections={fileSelections}
            onSelectDirectory={handleSelectDirectory}
            onToggleFileSelection={handleToggleFile}
            isLoading={isLoading}
          />
        </aside>

        <div
            className={`resizer-handle ${isCollapsed.nav || isCollapsed.connections ? 'disabled' : ''}`}
            onMouseDown={() => startDragging('nav')}
        />

        <main className={`main-panel type-${activeTopic?.primaryType || 'default'}`}>
          <div className="mobile-header">
              <button className="mobile-header-btn" onClick={() => setIsNavOpen(true)}>☰</button>
              <span className="mobile-header-title">{activeTopic?.title || 'Knowledge Engine'}</span>
              <button className="mobile-header-btn" onClick={() => setIsConnectionsOpen(true)}>↔</button>
          </div>
          <div className="main-panel-content">
            {error && <div className="error-banner">{error}</div>}
            <TopicView
              topic={activeTopic}
              onTopicSelect={handleTopicSelect}
              onGraphViewClick={() => setIsGraphModalOpen(true)}
              onOpenNav={() => setIsNavOpen(true)}
              onBreadcrumbClick={handleBreadcrumbClick}
            />
          </div>
        </main>
        
        <div
            className={`resizer-handle ${isCollapsed.nav || isCollapsed.connections ? 'disabled' : ''}`}
            onMouseDown={() => startDragging('connections')}
        />

        <aside
          className={`connections-panel ${isConnectionsOpen ? 'open' : ''} ${isCollapsed.connections ? 'collapsed' : ''}`}
          style={{
            flexBasis: isCollapsed.connections ? collapsedWidth : `${sizes.connections}px`,
            minWidth: isCollapsed.connections ? collapsedWidth : `${panelConfig.connections.min}px`,
          }}
        >
          <ConnectionsPanel
            knowledgeBase={knowledgeBase}
            activeTopic={activeTopic}
            onTopicSelect={handleTopicSelect}
            isCollapsed={isCollapsed.connections}
            onToggleCollapse={() => toggleCollapse('connections')}
          />
        </aside>
      </div>

      <GraphModal
        isOpen={isGraphModalOpen}
        onClose={() => setIsGraphModalOpen(false)}
        knowledgeBase={knowledgeBase}
        centerNodeId={activeTopicId}
        onNodeClick={handleGraphNodeClick}
      />
      <Popover data={popoverData} />
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </>
  );
}