// src/utils/normalization.ts
import type { Topic } from '../types';

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

export function normalizeTopic(idKey: string, raw: any): Topic {
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
