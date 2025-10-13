// src/App.tsx
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import type { KnowledgeBase, Topic, Connection } from './types';
import { NavPanel } from './components/NavPanel';
import { TopicView } from './components/TopicView';
import { ConnectionsPanel } from './components/ConnectionsPanel';
import { GraphModal } from './components/GraphModal';
import { Popover } from './components/Popover';
import { useResizablePanels } from './hooks/useResizablePanels';
import Fuse, { type FuseResult } from 'fuse.js';

export type SearchResult = FuseResult<{
  id: string;
  title: string;
  acronym: string;
  primaryType: string;
  tags: string[];
  fullContent: string;
}>;
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

/** ---------- Normalization helpers (robust import) ---------- **/
function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}
function cleanStringsInObject(obj: any): any {
    if (typeof obj === 'string') {
        return obj.normalize('NFC').replace(/‚Äî/g, '—').replace(/‚Ä¶/g, '…');
    }
    if (Array.isArray(obj)) {
        return obj.map(cleanStringsInObject);
    }
    if (isRecord(obj)) {
        return Object.fromEntries(
            Object.entries(obj).map(([key, value]) => [key, cleanStringsInObject(value)])
        );
    }
    return obj;
}
function normalizeTopic(idKey: string, raw: any): Topic {
  const cleanedRaw = cleanStringsInObject(raw);
  const id = (cleanedRaw?.id ?? idKey)?.toString?.() ?? idKey;
  const title = (typeof cleanedRaw?.title === 'string' && cleanedRaw.title.trim()) || id;
  const primaryType = (typeof cleanedRaw?.primaryType === 'string' && cleanedRaw.primaryType) || 'concept';
  const classificationPath = Array.isArray(cleanedRaw?.classificationPath) ? cleanedRaw.classificationPath.filter((x: any) => typeof x === 'string' && x.trim()) : [];
  const tags = Array.isArray(cleanedRaw?.tags) ? cleanedRaw.tags.filter((x: any) => typeof x === 'string' && x.trim()) : [];
  const content = isRecord(cleanedRaw?.content) ? cleanedRaw.content : {};
  const connections = Array.isArray(cleanedRaw?.connections) ? cleanedRaw.connections : [];

  return {
    ...(isRecord(cleanedRaw) ? cleanedRaw : {}),
    id,
    title,
    primaryType,
    classificationPath,
    tags,
    content,
    connections,
  } as Topic;
}

const panelConfig = {
  nav: { initial: 320, min: 280 },
  connections: { initial: 350, min: 300 },
};
const collapsedWidth = '50px';

export default function App() {
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase>({});
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [isLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isGraphModalOpen, setIsGraphModalOpen] = useState(false);
  const [popoverData, setPopoverData] = useState<PopoverData | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isConnectionsOpen, setIsConnectionsOpen] = useState(false);

  const [navFilterPath, setNavFilterPath] = useState<string[] | null>(null);
  
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
    setActiveTopicId(id);
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

  const handleImportJSON = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const prevKBEmpty = Object.keys(knowledgeBase).length === 0;
    const updates: KnowledgeBase = { ...knowledgeBase };
    let newTopicsCount = 0, updatedTopicsCount = 0, fixedMissingIdCount = 0, skippedZzzCount = 0;

    for (const file of Array.from(files)) {
      try {
        const text = await file.text();
        const jsonData = JSON.parse(text);

        const entries: Array<[string, any]> = Array.isArray(jsonData)
          ? jsonData.map((t, idx) => [String((t && typeof t.id === 'string' && t.id) || `__idx_${idx}`), t])
          : Object.entries(jsonData as Record<string, unknown>);

        for (const [idKey, rawTopic] of entries) {
          if (!rawTopic || typeof idKey !== 'string' || idKey.startsWith('zzz_')) {
            if (idKey.startsWith('zzz_')) skippedZzzCount++;
            continue;
          }

          const normalized = normalizeTopic(idKey, rawTopic);
          if (!rawTopic.id) fixedMissingIdCount++;
          if (normalized.id.startsWith('zzz_')) {
            skippedZzzCount++;
            continue;
          }

          if (!updates[normalized.id]) newTopicsCount++;
          else updatedTopicsCount++;
          updates[normalized.id] = normalized;
        }
      } catch (e) {
        console.error('Failed to import or parse file:', file.name, e);
        alert(`Error importing file "${file.name}". Please check if it is a valid JSON.`);
      }
    }
    
    const finalUpdates: KnowledgeBase = {};
    const validIds = new Set(Object.keys(updates).filter(id => !id.startsWith('zzz_')));
    for (const id of validIds) {
        const topic = updates[id];
        if (topic.connections) {
            topic.connections = topic.connections.filter(c => validIds.has(c.to));
        }
        finalUpdates[id] = topic;
    }

    if (newTopicsCount > 0 || updatedTopicsCount > 0) {
      const firstTopicId = Object.values(finalUpdates)
        .filter((t) => !!t && typeof t.id === 'string' && !t.id.startsWith('zzz_'))
        .sort((a, b) => a.title.localeCompare(b.title))[0]?.id ?? null;
      setKnowledgeBase(finalUpdates);
      if (prevKBEmpty || !activeTopicId) setActiveTopicId(firstTopicId);
    }

    const parts = ['Import successful!', `- ${newTopicsCount} new topics added.`, `- ${updatedTopicsCount} topics updated.`];
    if (fixedMissingIdCount > 0) parts.push(`- ${fixedMissingIdCount} topics were missing "id" and were auto-fixed.`);
    if (skippedZzzCount > 0) parts.push(`- ${skippedZzzCount} topics skipped due to "zzz_" prefix.`);
    alert(parts.join('\n'));

    if (event.target) event.target.value = '';
  };

  if (isLoading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading…</div>;
  if (error) return <div style={{ padding: '2rem', color: 'red', textAlign: 'center' }}>Error: {error}</div>;

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
            onImportJSON={handleImportJSON}
            isCollapsed={isCollapsed.nav}
            onToggleCollapse={() => toggleCollapse('nav')}
            navFilterPath={navFilterPath}
            onClearNavFilter={() => setNavFilterPath(null)}
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
    </>
  );
}