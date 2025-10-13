// src/components/ConnectionsPanel.tsx
import React, { useMemo, useState } from 'react';
import type { KnowledgeBase, Topic } from '../types';
import { getFamilyForType, SEMANTIC_FAMILIES } from '../utils/semanticUtils';

const fallbackLabel = (t: string) => (t || '').replace(/_/g, ' ');

interface Props {
  knowledgeBase: KnowledgeBase;
  activeTopic: Topic | null;
  onTopicSelect: (id: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function ConnectionsPanel({ knowledgeBase, activeTopic, onTopicSelect, isCollapsed, onToggleCollapse }: Props) {
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());

  const backlinks = useMemo(() => {
    if (!activeTopic) return [];
    const res: { from: string; type: string }[] = [];
    for (const t of Object.values(knowledgeBase)) {
      for (const c of t?.connections ?? []) {
        if (c?.to === activeTopic.id) res.push({ from: t.id, type: c.type });
      }
    }
    return res;
  }, [knowledgeBase, activeTopic]);
  
  const toggleFilter = (familyName: string) => {
    setActiveFilters(prev => {
        const newSet = new Set(prev);
        if (newSet.has(familyName)) {
            newSet.delete(familyName);
        } else {
            newSet.add(familyName);
        }
        return newSet;
    });
  };

  const outgoingConnections = useMemo(() => activeTopic?.connections?.filter(c => {
    if (activeFilters.size === 0) return true;
    const family = getFamilyForType(c.type);
    return activeFilters.has(family.name);
  }) ?? [], [activeTopic, activeFilters]);

  const incomingConnections = useMemo(() => backlinks.filter(b => {
    if (activeFilters.size === 0) return true;
    const family = getFamilyForType(b.type);
    return activeFilters.has(family.name);
  }), [backlinks, activeFilters]);

  if (isCollapsed) {
    return (
      <div className="panel-header collapsed">
        <button className="collapse-btn" onClick={onToggleCollapse} title="Expand Panel">‹</button>
      </div>
    );
  }

  if (!activeTopic) {
    return (
      <>
        <div className="panel-header">
          <h3 className="panel-title">Connections</h3>
          <button className="collapse-btn" onClick={onToggleCollapse} title="Collapse Panel">›</button>
        </div>
        <div className="panel-content">
            <p style={{color: 'var(--text-muted)'}}>Select a topic to see connections.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="panel-header">
        <h3 className="panel-title">Connections</h3>
        <button className="collapse-btn" onClick={onToggleCollapse} title="Collapse Panel">›</button>
      </div>
      <div className="panel-content">
        {/* Filter UI */}
        <div className="filter-pills">
            {Object.values(SEMANTIC_FAMILIES).filter(f => f.name !== 'Other').map(family => (
                <button 
                    key={family.name}
                    className={`filter-pill type-${family.color} ${activeFilters.has(family.name) ? 'active' : ''}`}
                    onClick={() => toggleFilter(family.name)}
                >
                    {family.name}
                </button>
            ))}
        </div>

        <div>
          <h4><span className="emoji">↗️</span>Outgoing</h4>
          <ul>
            {outgoingConnections.length > 0 ? (
              outgoingConnections.map((c, i) => {
                const target = knowledgeBase[c.to];
                if (!target) return null;
                const family = getFamilyForType(c.type);
                return (
                  <li key={`${c.to}-${i}`} className={`type-${family.color}-border`}>
                    <span className={`connection-label type-${family.color}`}>{fallbackLabel(c.type)} →</span>
                    <a href="#" className="internal-link" data-topic-id={target.id} onClick={(e) => { e.preventDefault(); onTopicSelect(target.id); }}>
                      {target.title}
                    </a>
                  </li>
                );
              })
            ) : (
              <li className="no-connections">No matching outgoing links.</li>
            )}
          </ul>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <h4><span className="emoji">↙️</span>Incoming</h4>
          <ul>
            {incomingConnections.length > 0 ? (
              incomingConnections.map((b, i) => {
                const source = knowledgeBase[b.from];
                if (!source) return null;
                const family = getFamilyForType(b.type);
                return (
                  <li key={`${b.from}-${i}`} className={`type-${family.color}-border`}>
                     <a href="#" className="internal-link" data-topic-id={source.id} onClick={(e) => { e.preventDefault(); onTopicSelect(source.id); }}>
                      {source.title}
                    </a>
                    {/* MODIFICATION: Improved readability */}
                    <span style={{ margin: '0 0.5ch' }}>→</span> 
                    <span className={`connection-label type-${family.color}`}>{fallbackLabel(b.type)}</span>
                  </li>
                );
              })
            ) : (
              <li className="no-connections">No matching incoming links.</li>
            )}
          </ul>
        </div>
      </div>
    </>
  );
}