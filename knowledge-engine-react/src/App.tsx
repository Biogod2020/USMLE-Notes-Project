// src/App.tsx
import { Toaster } from 'sonner';
import { useEffect, useMemo, useState } from 'react';
import type { Topic, ToastNotification } from './types'; // 确保 Topic 和 KnowledgeBase 都从 './types' 导入
import { NavPanel } from './components/NavPanel';
import { TopicView } from './components/TopicView';
import { ConnectionsPanel } from './components/ConnectionsPanel';
import { GraphModal } from './components/GraphModal';
import { TopicEditor } from './components/TopicEditor';
import { Popover } from './components/Popover';
import { ToastContainer } from './components/Toast';
import { useResizablePanels } from './hooks/useResizablePanels';
import { useKnowledgeBase } from './hooks/useKnowledgeBase';
import { Document } from 'flexsearch';

export type SearchResult = {
  item: SearchItem;
  score: number;
  matches?: any[];
};

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
import { getEmoji } from './constants';

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
  const [editorTopicId, setEditorTopicId] = useState<string | null>(null);

  const {
    knowledgeBase,
    fileSelections,
    directoryName,
    isLoading,
    error: kbError,
    dataHealth,
    selectDirectory,
    toggleFileSelection,
    applyTopicOverride,
    persistTopic,
    resetTopicOverride,
    hasOverride,
    canPersistTopics,
    getTopicSource,
    importFile,
  } = useKnowledgeBase();

  // Rename error to kbError to avoid conflict with potential local error state if needed
  const error = kbError; 

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
        // Initial load
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

  const searchIndex = useMemo(() => {
    const index = new Document({
      document: {
        id: 'id',
        index: [
          { field: 'title', tokenize: 'full', resolution: 9 }, // 'full' allows matching parts of words
          { field: 'acronym', tokenize: 'strict', resolution: 9 },
          { field: 'tags', tokenize: 'forward', resolution: 5 },
          { field: 'fullContent', tokenize: 'forward', resolution: 1 }, // 'forward' is faster than full for long text
        ],
      },
      cache: true,
      worker: false, // Ensure synchronous execution
    });

    Object.values(knowledgeBase)
      .filter((t): t is Topic => !!t && typeof t.id === 'string' && !t.id.startsWith('zzz_'))
      .forEach((t) => {
        index.add({
          id: t.id,
          title: t.title,
          acronym: generateAcronym(t.title),
          primaryType: t.primaryType,
          tags: t.tags ?? [],
          fullContent: Object.values(t.content ?? {}).map((v) => stripHtml(String(v ?? ''))).join(' '),
        });
      });

    return index;
  }, [knowledgeBase]);

  const searchResults: SearchResult[] | null = useMemo(() => {
    if (!searchTerm.trim()) return null;
    
    // Search all fields. FlexSearch with Document returns structured results grouped by field.
    // We apply fuzzy tolerance and limit.
    const results = searchIndex.search(searchTerm.trim(), {
      limit: 100, // Get more candidates for ranking
      suggest: true, // Enable suggestions for "fuzzy-like" behavior
    });

    // Weighted Scoring System
    // We will accumulate scores for each item based on which field matched and its position (rank) in that field's results.
    const scores = new Map<string, number>();
    const fieldWeights: Record<string, number> = {
        title: 10,       // Highest priority
        acronym: 8,      // High priority
        tags: 5,         // Medium priority
        fullContent: 1   // Low priority, but provides context
    };

    (results as any[]).forEach((fieldResult) => {
        const fieldName = fieldResult.field as string;
        if (!fieldName) return;
        const weight = fieldWeights[fieldName] ?? 1;
        const matches = fieldResult.result; // Array of IDs ordered by score (internal FlexSearch rank)
        
        matches.forEach((id: string | number, index: number) => {
            const strId = String(id);
            // Rank Decay: First result gets full weight, subsequent results get slightly less.
            // Score = Weight * (1 / (1 + index * 0.1)) -> Simple decay
            // Or simple linear subtraction? Let's use multiplicative decay.
            const rankScore = weight * (1 - (index / matches.length) * 0.5); 
            
            const currentScore = scores.get(strId) ?? 0;
            scores.set(strId, currentScore + rankScore);
        });
    });

    // Convert to SearchResult array and sort by Score Descending
    const mergedResults: SearchResult[] = [];
    
    // Sort IDs by score
    const sortedIds = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);

    // Top 20 results
    const topResults = sortedIds.slice(0, 20);
    const maxScore = topResults[0]?.[1] ?? 1; // Avoid divide by zero

    topResults.forEach(([id, score]) => {
         const topic = knowledgeBase[id];
         if (topic) {
             mergedResults.push({
                 item: {
                     id: topic.id,
                     title: topic.title,
                     acronym: generateAcronym(topic.title),
                     primaryType: topic.primaryType,
                     tags: topic.tags ?? [],
                     fullContent: '', 
                 },
                 score: score / maxScore, // Normalize to 0-1 (1 is best)
             });
         }
    });

    return mergedResults;
  }, [searchIndex, searchTerm, knowledgeBase]);

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

  const openEditorFor = (id: string) => {
    setEditorTopicId(id);
  };

  const closeEditor = () => setEditorTopicId(null);

  const handleTopicSelect = (id: string) => {
    if (!knowledgeBase[id]) {
        addToast(`Concept "${id}" is currently empty (waiting for supplement).`, 'info');
        return;
    }
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

  const getTopic = (id: string | null): Topic | null => {
    if (!id) return null;
    return knowledgeBase[id] ?? null;
  };

  const activeTopic = getTopic(activeTopicId);
  const editorTopic = getTopic(editorTopicId);
  const editorTopicSource = editorTopic?.id ? getTopicSource(editorTopic.id) : null;
  const closeAllDrawers = () => {
    setIsNavOpen(false);
    setIsConnectionsOpen(false);
  }

  const handleEditorSaveDraft = (nextTopic: Topic) => {
    applyTopicOverride(nextTopic);
    setEditorTopicId(nextTopic.id);
    addToast('Draft saved locally. Persist to disk when ready.', 'success');
  };

  const handleEditorPersist = async (nextTopic: Topic) => {
    applyTopicOverride(nextTopic);
    setEditorTopicId(nextTopic.id);
    try {
      await persistTopic(nextTopic);
      const source = getTopicSource(nextTopic.id) ?? 'unknown';
      addToast(`Saved to override file (${source})`, 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save topic to disk.';
      addToast(message, 'error');
      throw err;
    }
  };

  const handleResetOverride = async () => {
    if (!editorTopicId) return;
    try {
      await resetTopicOverride(editorTopicId);
      addToast('Reset to original version', 'success');
      setEditorTopicId(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reset';
      addToast(message, 'error');
    }
  };

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
            dataHealth={dataHealth}
            onImportFile={importFile}
            // isMobile state currently used for conditional logic inside hook or potentially passed here
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
              onEditTopic={openEditorFor}
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
      <Toaster richColors /> 
      <TopicEditor
        topic={editorTopic}
        isOpen={Boolean(editorTopicId)}
        onClose={closeEditor}
        onSave={handleEditorSaveDraft}
        onPersist={canPersistTopics ? handleEditorPersist : undefined}
        onResetOverride={canPersistTopics && editorTopicId && hasOverride(editorTopicId) ? handleResetOverride : undefined}
        canPersist={canPersistTopics}
        hasOverride={editorTopicId ? hasOverride(editorTopicId) : false}
        sourceFile={editorTopicSource}
      />
    </>
  );
}