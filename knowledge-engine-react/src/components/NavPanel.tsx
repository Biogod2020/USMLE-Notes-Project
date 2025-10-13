// src/components/NavPanel.tsx
import { useMemo, memo } from 'react';
import type { KnowledgeBase, Topic, FileSelection } from '../types';
import type { SearchResult } from '../App';
import { getIcon, ThemeIcon, PanelCollapseIcon } from './Icons';

interface NavNodeData { children: Record<string, NavNodeData>; items: Topic[]; }

interface Props {
  knowledgeBase: KnowledgeBase;
  activeTopicId: string | null;
  onTopicSelect: (id: string) => void;
  searchTerm: string;
  onSearchChange: (s: string) => void;
  searchResults: SearchResult[] | null;
  onToggleTheme: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  navFilterPath: string[] | null;
  onClearNavFilter: () => void;
  directoryName: string | null;
  fileSelections: FileSelection[];
  onSelectDirectory: () => void;
  onToggleFileSelection: (fileName: string) => void;
  isLoading: boolean;
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

const NavNode = memo(({ node, activeTopicId, onTopicSelect, openKeys }: {
  node: NavNodeData;
  activeTopicId: string | null;
  onTopicSelect: (id: string) => void;
  openKeys: Set<string>;
}) => {
  return (
    <ul>
      {Object.entries(node.children).sort((a,b) => a[0].localeCompare(b[0])).map(([seg, child]) => (
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
            className={`${item.id === activeTopicId ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); onTopicSelect(item.id); }}
            aria-current={item.id === activeTopicId ? 'page' : undefined}
          >
            <span className="topic-title">
              <span className={`emoji type-${item.primaryType}`}>{getIcon(item.primaryType)}</span>
              <span>{item.title}</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
});

export function NavPanel({
  knowledgeBase, activeTopicId, onTopicSelect, searchTerm, onSearchChange,
  searchResults, onToggleTheme, isCollapsed, onToggleCollapse, navFilterPath,
  onClearNavFilter, directoryName, fileSelections, onSelectDirectory,
  onToggleFileSelection, isLoading
}: Props) {
  const { root: navTree, unclassified } = useMemo(() => buildTree(knowledgeBase), [knowledgeBase]);
  const openKeys = useMemo(() => {
    const topic = activeTopicId ? knowledgeBase[activeTopicId] : null;
    return navFilterPath ? new Set(Object.keys(navTree.children)) : new Set(topic?.classificationPath ?? []);
  }, [activeTopicId, knowledgeBase, navFilterPath, navTree]);
  
  const loadedFilesCount = fileSelections.filter(f => f.selected).length;
  const totalTopicsCount = Object.keys(knowledgeBase).length;

  if (isCollapsed) {
    return (
      <div className="panel-header collapsed">
        <button className="collapse-btn" onClick={onToggleCollapse} title="Expand Panel">
          <PanelCollapseIcon isLeft={false} />
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="panel-header">
        <h3 className="panel-title">Knowledge Engine</h3>
        <button className="collapse-btn" onClick={onToggleCollapse} title="Collapse Panel">
            <PanelCollapseIcon isLeft={true} />
        </button>
      </div>

      <div className="panel-content">
        <div className="nav-controls">
          <button type="button" className="control-btn" onClick={onToggleTheme} title="Toggle Theme">
            <ThemeIcon /> Theme
          </button>
        </div>
        
        <div className="file-manager">
            <button className="control-btn import-btn" onClick={onSelectDirectory} disabled={isLoading}>
                {directoryName ? `📂 ${directoryName}`: '📂 Select Directory'}
            </button>
            {fileSelections.length > 0 && (
                <ul className="file-selection-list">
                    {fileSelections.map(file => (
                        <li key={file.name}>
                            <label>
                                <input 
                                    type="checkbox" 
                                    checked={file.selected} 
                                    onChange={() => onToggleFileSelection(file.name)}
                                    disabled={isLoading}
                                />
                                <span>{file.name}</span>
                            </label>
                        </li>
                    ))}
                </ul>
            )}
        </div>

        <input type="text" id="search-input" placeholder="🔍 Search..." value={searchTerm} onChange={(e) => onSearchChange(e.target.value)} />
      </div>

      <div id="nav-list">
          {searchResults ? (
            <div className="search-results-list">
                <h3 className="panel-title-sub">Search Results</h3>
                <ul>
                    {searchResults.length > 0 ? (
                    searchResults.map(res => (
                        <li key={res.item.id}>
                            <a href="#" className={`${res.item.id === activeTopicId ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); onTopicSelect(res.item.id); }} >
                            <span className="topic-title">
                                <span className={`emoji type-${res.item.primaryType}`}>{getIcon(res.item.primaryType)}</span>
                                <Highlight text={res.item.title} highlight={searchTerm} />
                            </span>
                            <span className="relevance-score" title="Relevance">{Math.round((1 - (res.score ?? 0)) * 100)}%</span>
                            </a>
                        </li>
                    ))
                    ) : ( <li className="no-results">No results found.</li> )}
                </ul>
            </div>
          ) : (
            <div className="nav-tree-container">
              {navFilterPath ? (
                <>
                    <div className="filter-header">
                        <h3 className="panel-title-sub">Filtered by</h3>
                        <button className="clear-filter-btn" onClick={onClearNavFilter}>Clear &times;</button>
                    </div>
                    <p className="filter-path">{navFilterPath.join(' / ')}</p>
                </>
              ) : <h3 className="panel-title-sub">Topics</h3> }

              <NavNode node={navTree} activeTopicId={activeTopicId} onTopicSelect={onTopicSelect} openKeys={openKeys} />
              
              {unclassified.length > 0 && !navFilterPath && (
                <details open>
                    <summary>Unclassified</summary>
                    <ul>
                        {unclassified.map(item => (
                            <li key={item.id}>
                                <a href="#" className={`${item.id === activeTopicId ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); onTopicSelect(item.id); }} aria-current={item.id === activeTopicId ? 'page' : undefined}>
                                    <span className="topic-title">
                                        <span className={`emoji type-${item.primaryType}`}>{getIcon(item.primaryType)}</span>
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
      <div className="status-bar">
        {isLoading ? 'Loading...' : `${totalTopicsCount} topics from ${loadedFilesCount} files.`}
      </div>
    </>
  );
}