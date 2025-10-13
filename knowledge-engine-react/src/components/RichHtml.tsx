// src/components/RichHtml.tsx
import React, { useMemo } from 'react';
import type { MouseEvent } from 'react';
import DOMPurify from 'dompurify';

interface Props {
  html: string;
  onTopicSelect: (id: string) => void;
}

/** MODIFICATION: Add class="internal-link" to match original styling and semantics */
function linkify(raw: string): string {
  return raw.replace(/\[\[([a-zA-Z0-9_\-]+)(?:\|(.+?))?\]\]/g, (_m, id, txt) => {
    const text = (txt ?? id).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<a href="#" class="internal-link" data-topic-id="${id}">${text}</a>`;
  });
}

export default function RichHtml({ html, onTopicSelect }: Props) {
  const safe = useMemo(() => {
    const withLinks = linkify(html ?? '');
    return DOMPurify.sanitize(withLinks, { USE_PROFILES: { html: true } });
  }, [html]);

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    const a = (e.target as HTMLElement).closest('a[data-topic-id]') as HTMLAnchorElement | null;
    if (a) {
      e.preventDefault();
      const id = a.dataset.topicId!;
      onTopicSelect(id);
    }
  };

  return <div onClick={handleClick} dangerouslySetInnerHTML={{ __html: safe }} />;
}