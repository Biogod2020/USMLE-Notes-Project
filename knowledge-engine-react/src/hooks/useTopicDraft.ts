import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Topic } from '../types';

export interface TopicDraft extends Topic {}

export function useTopicDraft(topic: Topic | null) {
  const baseDraft = useMemo<TopicDraft | null>(() => (topic ? { ...topic, content: { ...topic.content } } : null), [topic]);
  const [draft, setDraft] = useState<TopicDraft | null>(baseDraft);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft(baseDraft);
    setDirty(false);
  }, [baseDraft]);

  const updateField = useCallback(<K extends keyof TopicDraft>(key: K, value: TopicDraft[K]) => {
    setDraft(prev => {
      if (!prev) return prev;
      const next = { ...prev, [key]: value } as TopicDraft;
      return next;
    });
    setDirty(true);
  }, []);

  const updateContentField = useCallback((field: string, value: string) => {
    setDraft(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        content: {
          ...prev.content,
          [field]: value,
        },
      };
    });
    setDirty(true);
  }, []);

  const pushTag = useCallback((tag: string) => {
    setDraft(prev => {
      if (!prev) return prev;
      const tags = new Set(prev.tags ?? []);
      tags.add(tag);
      return { ...prev, tags: Array.from(tags) };
    });
    setDirty(true);
  }, []);

  const removeTag = useCallback((tag: string) => {
    setDraft(prev => {
      if (!prev) return prev;
      const next = (prev.tags ?? []).filter(t => t !== tag);
      return { ...prev, tags: next };
    });
    setDirty(true);
  }, []);

  const pushClassificationSegment = useCallback((segment: string) => {
    setDraft(prev => {
      if (!prev) return prev;
      const next = [...(prev.classificationPath ?? []), segment];
      return { ...prev, classificationPath: next };
    });
    setDirty(true);
  }, []);

  const removeClassificationSegment = useCallback((segment: string) => {
    setDraft(prev => {
      if (!prev) return prev;
      const next = (prev.classificationPath ?? []).filter(s => s !== segment);
      return { ...prev, classificationPath: next };
    });
    setDirty(true);
  }, []);

  const resetDraft = useCallback(() => {
    setDraft(baseDraft);
    setDirty(false);
  }, [baseDraft]);

  const addConnection = useCallback(() => {
    setDraft(prev => {
      if (!prev) return prev;
      const next = [...(prev.connections ?? []), { type: '', to: '' }];
      return { ...prev, connections: next };
    });
    setDirty(true);
  }, []);

  const updateConnection = useCallback((index: number, patch: { type?: string; to?: string }) => {
    setDraft(prev => {
      if (!prev) return prev;
      const connections = [...(prev.connections ?? [])];
      connections[index] = { ...connections[index], ...patch };
      return { ...prev, connections };
    });
    setDirty(true);
  }, []);

  const removeConnection = useCallback((index: number) => {
    setDraft(prev => {
      if (!prev) return prev;
      const connections = [...(prev.connections ?? [])];
      connections.splice(index, 1);
      return { ...prev, connections };
    });
    setDirty(true);
  }, []);

  const addContentSection = useCallback((key: string) => {
    setDraft(prev => {
      if (!prev) return prev;
      if (!key || key in (prev.content ?? {})) return prev;
      return {
        ...prev,
        content: {
          ...prev.content,
          [key]: '',
        },
      };
    });
    setDirty(true);
  }, []);

  const removeContentSection = useCallback((key: string) => {
    setDraft(prev => {
      if (!prev) return prev;
      if (!prev.content || !(key in prev.content)) return prev;
      const { [key]: _removed, ...rest } = prev.content;
      return {
        ...prev,
        content: rest,
      };
    });
    setDirty(true);
  }, []);

  return {
    draft,
    dirty,
    setDraft,
    updateField,
    updateContentField,
    pushTag,
    removeTag,
    pushClassificationSegment,
    removeClassificationSegment,
    resetDraft,
    addConnection,
    updateConnection,
    removeConnection,
    addContentSection,
    removeContentSection,
  };
}
