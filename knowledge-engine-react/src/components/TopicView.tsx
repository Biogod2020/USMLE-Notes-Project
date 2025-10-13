// src/components/TopicView.tsx
import React from 'react';
import type { Topic } from '../types';
import RichHtml from './RichHtml';

const EMOJI: Record<string, string> = {
  disease: '🦠', structure: '🏛️', process: '⚙️',
  substance: '🧪', finding: '❗', concept: '💡',
};

function iconFor(type: string) {
  return EMOJI[type] ?? '📄';
}

interface Props {
  topic: Topic | null;
  onTopicSelect: (id: string) => void;
  onGraphViewClick: () => void;
  onOpenNav: () => void;
  onBreadcrumbClick: (path: string[]) => void;
}

export function TopicView({ topic, onTopicSelect, onGraphViewClick, onOpenNav, onBreadcrumbClick }: Props) {
  if (!topic) {
    return (
        <div style={{ opacity: 0.8, padding: '2rem', textAlign: 'center' }}>
          <h2>Welcome!</h2>
          <p>
            <span className="desktop-only">Select a topic from the left panel to begin, or import your own knowledge base JSON file.</span>
            <span className="mobile-only">
                Tap the <button onClick={onOpenNav} className="inline-cta">☰ menu</button> to select a topic or import a file.
            </span>
          </p>
        </div>
    );
  }

  const { title, primaryType, tags, content, classificationPath } = topic;

  return (
    <>
      <header className="topic-header">
        <div className="topic-header-main">
          <div className="topic-icon">{iconFor(primaryType)}</div>
          <div>
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
            <h2 className={`type-${primaryType}`}>{title}</h2>
            {tags?.length ? (
              <div className="tags-container">
                {tags.map(t => <span className="tag-item" key={t}>#{t}</span>)}
              </div>
            ) : null}
          </div>
        </div>
        <div className="topic-header-actions">
          <button type="button" onClick={onGraphViewClick}><span className="emoji">🕸️</span>Graph View</button>
        </div>
      </header>

      {content.definition && (
        <>
          <h4><span className="emoji">📖</span>Definition</h4>
          <RichHtml html={String(content.definition)} onTopicSelect={onTopicSelect} />
        </>
      )}

      {content.atAGlance && (
        <section className="at-a-glance">
          <h4><span className="emoji">✨</span>At a Glance</h4>
          <RichHtml html={String(content.atAGlance)} onTopicSelect={onTopicSelect} />
        </section>
      )}
      
      {Object.entries(content)
        .filter(([k]) => !['definition', 'atAGlance', 'takeAway'].includes(k))
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

      {content.takeAway && (
        <section style={{ background: 'var(--bg-alt-color)', padding: '1rem', borderRadius: 'var(--radius-md)', marginTop: '2rem' }}>
          <h4><span className="emoji">🎯</span>Key Take Away</h4>
          <RichHtml html={String(content.takeAway)} onTopicSelect={onTopicSelect} />
        </section>
      )}
    </>
  );
}