  // src/components/TopicView.tsx
import React from 'react';
import type { Topic } from '../types';
import RichHtml from './RichHtml';
import MermaidDiagram from './MermaidDiagram';

import { getEmoji } from '../constants';
import { GraphIcon } from './Icons';


interface Props {
  topic: Topic | null;
  onTopicSelect: (id: string) => void;
  onGraphViewClick: () => void;
  onOpenNav: () => void;
  onBreadcrumbClick: (path: string[]) => void;
  onEditTopic: (id: string) => void;
}

import { EmptyState } from './EmptyState';

export function TopicView({ topic, onTopicSelect, onGraphViewClick, onOpenNav, onBreadcrumbClick, onEditTopic }: Props) {
  if (!topic) {
    return (
        <EmptyState 
            icon="👋" 
            title="Welcome to Knowledge Engine" 
            description="Select a topic to start exploring, or import your notes."
            action={{ label: "Select Topic", onClick: onOpenNav }}
        />
    );
  }

  const { title, primaryType, tags, content, classificationPath } = topic;

  // Sections as variables for flexible placement
  const TakeawaySection = content.takeAway ? (
    <section className="takeaway-section">
      <h4>
        <span className="emoji">🎯</span>Key Takeaway
      </h4>
      <RichHtml html={String(content.takeAway)} onTopicSelect={onTopicSelect} />
    </section>
  ) : null;

  const MermaidSection = content.mermaid ? (
    <section className="mermaid-section" style={{ marginTop: '1.5rem' }}>
        <details>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1em', listStyle: 'none' }}>
                <h4 style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <span className="emoji">📊</span> Diagram
                    <span style={{ fontSize: '0.8em', opacity: 0.6, fontWeight: 'normal' }}>(Click to expand)</span>
                </h4>
            </summary>
            <div style={{ marginTop: '0.5rem' }}>
                <MermaidDiagram definition={String(content.mermaid)} />
            </div>
        </details>
    </section>
  ) : null;

  const isMobile = window.innerWidth <= 768; // Simple check or pass prop if available

  return (
    <div className={`topic-view-content type-${primaryType}`}>
      <header className="topic-header">
        <div className="topic-header-main">
          <div className="topic-icon">{getEmoji(primaryType)}</div>
          <div className="topic-header-info">
            {classificationPath && classificationPath.length > 0 && (
              <div className="breadcrumb">
                {classificationPath.map((item, index) => {
                  const pathSlice = classificationPath.slice(0, index + 1);
                  return (
                    <React.Fragment key={item}>
                      <button className="breadcrumb-item" onClick={() => onBreadcrumbClick(pathSlice)}>
                        {item}
                      </button>
                      {index < classificationPath.length - 1 && <span className="breadcrumb-separator">/</span>}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
            <h2 className="topic-title">{title}</h2>
            {tags?.length ? (
              <div className="tags-container">
                {tags.map(t => <span className="tag-item" key={t}>#{t}</span>)}
              </div>
            ) : null}
          </div>
        </div>
        <div className="topic-header-actions">
{/* Hide Edit on iOS temporarily */
          !/iPhone|iPad|iPod/i.test(navigator.userAgent) && (
            <button type="button" className="action-btn-edit" onClick={() => onEditTopic(topic.id)} aria-label="Edit Topic">
              <span className="emoji">✏️</span>Edit Topic
            </button>
          )}
          <button type="button" className="action-btn-graph" onClick={onGraphViewClick} aria-label="Graph View">
            <GraphIcon />
            Graph View
          </button>
        </div>
      </header>

      {/* Mobile Priority Content */}
      {isMobile && (
          <div className="mobile-priority-content">
              {TakeawaySection}
              {MermaidSection}
          </div>
      )}

      {content.definition && (
        <>
          <h4><span className="emoji">📖</span>Definition</h4>
          <RichHtml html={String(content.definition)} onTopicSelect={onTopicSelect} />
        </>
      )}

      {content.atAGlance && (
        <section className="at-a-glance">
          <h4><span className="emoji">⚡</span>At A Glance</h4>
          <RichHtml html={String(content.atAGlance)} onTopicSelect={onTopicSelect} />
        </section>
      )}
      
      {/* Desktop Content (if not mobile, render here) */}
      {!isMobile && TakeawaySection}
      {!isMobile && MermaidSection}

      {Object.entries(content)
        .filter(([k]) => !['definition', 'atAGlance', 'takeAway', 'mermaid'].includes(k))
        .map(([k, v]) => {
          if (!v) return null;

          const human = k
            .replace(/_/g, ' ')
            .replace(/([A-Z])/g, ' $1')
            .replace(/^\w/, c => c.toUpperCase());
          return (
            <section key={k} style={{ marginTop: '1.5rem' }}>
              <h4>{human}</h4>
              <RichHtml html={String(v)} onTopicSelect={onTopicSelect} />
            </section>
          );
        })}
    </div>
  );
}