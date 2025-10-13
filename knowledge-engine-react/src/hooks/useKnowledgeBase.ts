// src/hooks/useKnowledgeBase.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { KnowledgeBase, FileSelection } from '../types';
import { normalizeTopic } from '../utils/normalization';

const LS_FILES_KEY = 'KE_selectedFiles';

export function useKnowledgeBase() {
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase>({});
  const [fileSelections, setFileSelections] = useState<FileSelection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const dirHandleRef = useRef<FileSystemDirectoryHandle | null>(null);
  const [directoryName, setDirectoryName] = useState<string | null>(null);

  // Effect to load initial state from localStorage
  useEffect(() => {
    try {
      const savedFiles = localStorage.getItem(LS_FILES_KEY);
      if (savedFiles) {
        setFileSelections(JSON.parse(savedFiles));
      }
    } catch (e) {
      console.error("Failed to load file selections from localStorage", e);
      localStorage.removeItem(LS_FILES_KEY);
    }
  }, []);

  const processAndLoadFiles = useCallback(async (
    handle: FileSystemDirectoryHandle,
    selections: FileSelection[]
  ): Promise<{ summary: string; added: string[]; removed: string[]; totalTopics: number; totalFiles: number; }> => {
    setIsLoading(true);
    setError(null);

    const oldSelectedFiles = fileSelections.filter(f => f.selected).map(f => f.name);
    const newSelectedFiles = selections.filter(f => f.selected).map(f => f.name);

    const filesToAdd = newSelectedFiles.filter(name => !oldSelectedFiles.includes(name));
    const filesToRemove = oldSelectedFiles.filter(name => !newSelectedFiles.includes(name));
    
    const newKnowledgeBase: KnowledgeBase = {};
    let loadedFileCount = 0;

    for (const file of selections) {
      if (!file.selected) continue;
      
      try {
        const fileHandle = await handle.getFileHandle(file.name);
        const fileData = await fileHandle.getFile();
        const text = await fileData.text();
        const jsonData = JSON.parse(text);

        const entries = Object.entries(jsonData as Record<string, unknown>);
        for (const [idKey, rawTopic] of entries) {
          if (!rawTopic || typeof idKey !== 'string' || idKey.startsWith('zzz_')) continue;
          
          const normalized = normalizeTopic(idKey, rawTopic);
          if (!normalized.id.startsWith('zzz_')) {
            newKnowledgeBase[normalized.id] = normalized;
          }
        }
        loadedFileCount++;
      } catch (e) {
        console.error(`Error processing file ${file.name}:`, e);
        setError(`Failed to load ${file.name}. It might be corrupted.`);
      }
    }

    // Clean up connections
    const validIds = new Set(Object.keys(newKnowledgeBase));
    for (const id of validIds) {
        const topic = newKnowledgeBase[id];
        if (topic.connections) {
            topic.connections = topic.connections.filter(c => validIds.has(c.to));
        }
    }

    setKnowledgeBase(newKnowledgeBase);
    setFileSelections(selections);
    localStorage.setItem(LS_FILES_KEY, JSON.stringify(selections));
    setIsLoading(false);

    return {
      summary: `Loaded ${Object.keys(newKnowledgeBase).length} topics from ${loadedFileCount} files.`,
      added: filesToAdd,
      removed: filesToRemove,
      totalTopics: Object.keys(newKnowledgeBase).length,
      totalFiles: loadedFileCount,
    };
  }, [fileSelections]);

  const selectDirectory = useCallback(async () => {
    try {
      if (!('showDirectoryPicker' in window)) {
        
        toast.error('当前浏览器不支持目录选择（File System Access API，文件系统访问应用程序编程接口）。');
        return ;
      }
      const handle = await (window as Required<Window>).showDirectoryPicker!();
      dirHandleRef.current = handle;
      setDirectoryName(handle.name);

      const savedSelections = new Map(fileSelections.map(f => [f.name, f.selected]));
      const newSelections: FileSelection[] = [];

      for await (const entry of handle.values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.json')) {
          newSelections.push({
            name: entry.name,
            selected: savedSelections.get(entry.name) ?? false, // Default to false, but respect saved state
          });
        }
      }
      newSelections.sort((a, b) => a.name.localeCompare(b.name));
      
      return processAndLoadFiles(handle, newSelections);

    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.log("Directory selection was aborted by the user.");
      } else {
        console.error("Error selecting directory:", err);
        setError("Could not access the selected directory.");
      }
      return null;
    }
  }, [fileSelections, processAndLoadFiles]);

  const toggleFileSelection = useCallback(async (fileName: string) => {
    const handle = dirHandleRef.current;
    if (!handle) {
      setError("Please select a directory first.");
      return null;
    }

    const newSelections = fileSelections.map(f =>
      f.name === fileName ? { ...f, selected: !f.selected } : f
    );
    
    return processAndLoadFiles(handle, newSelections);
  }, [fileSelections, processAndLoadFiles]);

  return {
    knowledgeBase,
    fileSelections,
    directoryName,
    isLoading,
    error,
    selectDirectory,
    toggleFileSelection,
  };
}
