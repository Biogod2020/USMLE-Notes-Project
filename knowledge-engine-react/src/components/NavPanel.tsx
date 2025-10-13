// src/components/NavPanel.tsx
import React, { useMemo, useRef, type ChangeEvent, memo } from 'react';
import type { KnowledgeBase, Topic } from '../types';
import type { SearchResult } from '../App';

const TYPE_EMOJI: Record<string, string> = { disease: '🦠', structure: '🏛️', process: '⚙️', substance: '🧪', finding: '❗', concept: '💡', };
function emojiFor(type: string) { return TYPE_EMOJI[type] ?? '📄'; }

interface NavNodeData { children: Record<string, NavNodeData>; items: Topic[]; }

interface Props {
  knowledgeBase: KnowledgeBase;
  activeTopicId: string | null;
  onTopicSelect: (id: string) => void;
  searchTerm: string;
  onSearchChange: (s: string) => void;
  searchResults: SearchResult[] | null;
  onToggleTheme: () => void;
  onImportJSON: (event: ChangeEvent<HTMLInputElement>) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  navFilterPath: string[] | null;
  onClearNavFilter: () => void;
}

const Highlight = memo(({ text, highlight }: { text: string; highlight: string }) => {
    if (!highlight.trim()) return <>{text}</>;
    const regex = new RegExp(`(${highlight})`, 'gi');
    const parts = text.split(regex);
    return (
        <span>
            {parts.map((part, i) =>
                part.toLowerCase() === highlight.toLowerCase() ? <mark key={i}>{part}</mark> : <span key={i}>{part}</span>
            )}
        </span>
    );
});

function buildTree(kb: KnowledgeBase): { root: NavNodeData, unclassified: Topic[] } {
  const root: NavNodeData = { children: {}, items: [] };
  const unclassified: Topic[] = [];

  Object.values(kb)
    .filter(t => t && typeof t.id === 'string' && !t.id.startsWith('zzz_'))
    .sort((a, b) => a.title.localeCompare(b.title))
    .forEach(t => {
      if (t.classificationPath?.length) {
        let cur = root;
        for (const seg of t.classificationPath) {
          cur.children[seg] ??= { children: {}, items: [] };
          cur = cur.children[seg]!;
        }
        cur.items.push(t!);
      } else {
        unclassified.push(t!);
      }
    });
  return { root, unclassified };
}

function NavNode({ node, activeTopicId, onTopicSelect, openKeys }: {
  node: NavNodeData;
  activeTopicId: string | null;
  onTopicSelect: (id: string) => void;
  openKeys: Set<string>;
}) {
  return (
    <ul>
      {Object.entries(node.children).map(([seg, child]) => (
        <li key={seg}>
          <details open={openKeys.has(seg)}>
            <summary>{seg}</summary>
            <NavNode node={child} activeTopicId={activeTopicId} onTopicSelect={onTopicSelect} openKeys={openKeys} />
          </details>
        </li>
      ))}
      {node.items.map(item => (
        <li key={item.id}>
          <a
            href="#"
            className={`type-${item.primaryType} ${item.id === activeTopicId ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); onTopicSelect(item.id); }}
            aria-current={item.id === activeTopicId ? 'page' : undefined}
          >
            <span className="topic-title">
              <span className="emoji">{emojiFor(item.primaryType)}</span>
              <span>{item.title}</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

export function NavPanel({
  knowledgeBase,
  activeTopicId,
  onTopicSelect,
  searchTerm,
  onSearchChange,
  searchResults,
  onToggleTheme,
  onImportJSON,
  isCollapsed,
  onToggleCollapse,
  navFilterPath,
  onClearNavFilter,
}: Props) {
  const filteredTopics = useMemo(() => {
    if (!navFilterPath) return null;
    const pathStr = navFilterPath.join('/');
    return Object.values(knowledgeBase).filter(topic => 
        topic.classificationPath?.join('/').startsWith(pathStr)
    );
  }, [knowledgeBase, navFilterPath]);

  const { root: navTree, unclassified } = useMemo(() => {
    const kb = filteredTopics ? Object.fromEntries(filteredTopics.map(t => [t.id, t])) : knowledgeBase;
    return buildTree(kb);
  }, [knowledgeBase, filteredTopics]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const openKeys = useMemo(() => {
    const topic = activeTopicId ? knowledgeBase[activeTopicId] : null;
    return navFilterPath ? new Set(Object.keys(navTree.children)) : new Set(topic?.classificationPath ?? []);
  }, [activeTopicId, knowledgeBase, navFilterPath, navTree]);

  if (isCollapsed) {
    return (
      <div className="panel-header collapsed">
        <button className="collapse-btn" onClick={onToggleCollapse} title="Expand Panel">
          ›
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="panel-header">
        <h3 className="panel-title">Knowledge Engine</h3>
        <button className="collapse-btn" onClick={onToggleCollapse} title="Collapse Panel">
          ‹
        </button>
      </div>

      <div className="panel-content">
        <div className="nav-controls">
          <button type="button" className="control-btn" onClick={onToggleTheme} title="Toggle Theme">
            <span className="emoji">🎨</span>
          </button>
          <button type="button" className="control-btn import-btn" onClick={() => fileInputRef.current?.click()} title="Import JSON">
            <span className="emoji">📥</span>
          </button>
          <input ref={fileInputRef} type="file" accept=".json,application/json" multiple hidden onChange={onImportJSON} />
        </div>
        <input type="text" id="search-input" placeholder="🔍 Search (e.g., 'UC', 'fistula')..." value={searchTerm} onChange={(e) => onSearchChange(e.target.value)} />
      </div>

      <div id="nav-list">
          {searchResults ? (
            <ul style={{padding: '0 1.25rem'}}>
                <h3 className="panel-title" style={{padding: '0 0 .5rem 0'}}>Search Results</h3>
                {searchResults.length > 0 ? (
                searchResults.map(res => {
                    const score = res.score ?? 0;
                    const relevance = Math.max(0, Math.min(100, Math.round((1 - score) * 100)));
                    const it = res.item;
                    return (
                    <li key={it.id}>
                        <a href="#" className={`type-${it.primaryType} ${it.id === activeTopicId ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); onTopicSelect(it.id); }} >
                        <span className="topic-title">
                            <span className="emoji">{emojiFor(it.primaryType)}</span>
                            <Highlight text={it.title} highlight={searchTerm} />
                        </span>
                        <span className="relevance-score" title="Relevance">{relevance}%</span>
                        </a>
                    </li>
                    );
                })
                ) : (
                <li style={{color: 'var(--text-muted)', padding: '1rem'}}>No results.</li>
                )}
            </ul>
          ) : navFilterPath ? (
            <div style={{padding: '0 1.25rem'}}>
                <div className="filter-header">
                    <h3 className="panel-title">Filtered by</h3>
                    <button className="clear-filter-btn" onClick={onClearNavFilter}>Clear &times;</button>
                </div>
                <p className="filter-path">{navFilterPath.join(' / ')}</p>
                <NavNode node={navTree} activeTopicId={activeTopicId} onTopicSelect={onTopicSelect} openKeys={openKeys} />
            </div>
          ) : (
            <div style={{padding: '0 1.25rem'}}>
              <h3 className="panel-title" style={{padding: '0 0 .5rem 0'}}>Topics</h3>
              <NavNode node={navTree} activeTopicId={activeTopicId} onTopicSelect={onTopicSelect} openKeys={openKeys} />
              {unclassified.length > 0 && (
                <details open>
                    <summary>Unclassified</summary>
                    <ul>
                        {unclassified.map(item => (
                            <li key={item.id}>
                                <a href="#" className={`type-${item.primaryType} ${item.id === activeTopicId ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); onTopicSelect(item.id); }} aria-current={item.id === activeTopicId ? 'page' : undefined}>
                                    <span className="topic-title">
                                        <span className="emoji">{emojiFor(item.primaryType)}</span>
                                        <span>{item.title}</span>
                                    </span>
                                </a>
                            </li>
                        ))}
                    </ul>
                </details>
              )}
            </div>
          )}
      </div>
    </>
  );
}