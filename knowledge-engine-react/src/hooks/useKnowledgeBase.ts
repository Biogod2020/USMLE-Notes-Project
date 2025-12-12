// src/hooks/useKnowledgeBase.ts
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';

// [REFACTORED] Import Tauri's native APIs instead of relying on web APIs
import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile, readDir, writeTextFile } from '@tauri-apps/plugin-fs';

import type { KnowledgeBase, FileSelection, DataHealthSummary, Topic } from '../types';
import { normalizeTopic } from '../utils/normalization';
import { TopicSchema } from '../utils/schema';

// [REFACTORED] We now store the string path, not a handle object
const LS_FILES_KEY = 'KE_selectedFiles';
const LS_DIR_PATH_KEY = 'KE_lastDirPath';

type DirectoryContext =
  | { mode: 'tauri'; path: string }
  | { mode: 'fs-access'; handle: FileSystemDirectoryHandle };

const isTauriEnv = typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__);
const supportsFileSystemAccess = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

function getOverridePath(basePath: string, baseFileName: string): string {
  const overrideDir = `${basePath}/.overrides`;
  const nameWithoutExt = baseFileName.replace(/\.json$/i, '');
  return `${overrideDir}/${nameWithoutExt}.overrides.json`.replace(/\/{2,}/g, '/');
}

function deepMerge<T extends Record<string, any>>(base: T, override: Partial<T>): T {
  const result = { ...base };
  for (const key in override) {
    const overrideValue = override[key];
    if (overrideValue === undefined) continue;
    if (typeof overrideValue === 'object' && !Array.isArray(overrideValue) && overrideValue !== null) {
      result[key] = deepMerge(result[key] || {} as any, overrideValue);
    } else {
      result[key] = overrideValue as T[Extract<keyof T, string>];
    }
  }
  return result;
}

// Mobile detection helper
const isMobile = () => {
    if (typeof window === 'undefined') return false;
    // Simple User Agent check or Tauri's os type (if available via specific plugin)
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
};

export function useKnowledgeBase() {
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase>({});
  const [fileSelections, setFileSelections] = useState<FileSelection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataHealth, setDataHealth] = useState<DataHealthSummary | null>(null);
  const [overrides, setOverrides] = useState<KnowledgeBase>({});
  const [topicSources, setTopicSources] = useState<Record<string, string>>({});
  const fileCacheRef = useRef<Record<string, Record<string, unknown>>>({});
  const overrideFileCacheRef = useRef<Record<string, Record<string, unknown>>>({});
  const [overridesByFile, setOverridesByFile] = useState<Record<string, Record<string, Partial<Topic & { _deleted?: boolean }>>>>({});
  
  const [directoryContext, setDirectoryContext] = useState<DirectoryContext | null>(null);
  const [directoryName, setDirectoryName] = useState<string | null>(null);

  // [NEW] Default DB for Mobile
  useEffect(() => {
    const initMobile = async () => {
         if (!isMobile()) return; 
         
         const savedFiles = localStorage.getItem(LS_FILES_KEY);
         // If we have saved state, let the main useEffect handle it.
         // BUT if we don't have saved state, load the default DB.
         if (savedFiles) return;

         try {
             setIsLoading(true);
             const response = await fetch('/really_use/neuro_nearly_all.json');
             if (!response.ok) throw new Error('Failed to load default database');
             const data = await response.json();
             
             // Simulating a file selection
             const defaultFileName = 'neuro_nearly_all.json';
             // const context: DirectoryContext = { mode: 'tauri', path: '/public/really_use' }; // Pseudo path - unused
             
             // Process the single file
             const fileTopics: Record<string, Topic> = {};
             let invalidTopics = 0;
             const entries = Object.entries(data as Record<string, unknown>);
             
             for (const [idKey, rawTopic] of entries) {
                if (!rawTopic || typeof idKey !== 'string' || idKey.startsWith('zzz_')) continue;
                const normalized = normalizeTopic(idKey, rawTopic);
                if (normalized.id.startsWith('zzz_')) continue;
                
                const validation = TopicSchema.safeParse(normalized);
                if (validation.success) {
                    fileTopics[validation.data.id] = validation.data;
                } else {
                    invalidTopics++;
                }
             }

             setKnowledgeBase(fileTopics);
             setFileSelections([{ name: defaultFileName, selected: true }]);
             setDirectoryName('Default Database');
             // Do NOT save to localStorage to avoid persisting this "fake" state permanently 
             // unless we want to treat it as a real user selection.
             // For now, let's just show it.
             
             setDataHealth({
                 totalTopics: Object.keys(fileTopics).length,
                 selectedFiles: 1,
                 invalidFiles: 0,
                 invalidTopics,
                 fileErrors: {}
             });

         } catch (e) {
             console.error("Failed to load default DB", e);
             setError("Failed to load default database.");
         } finally {
             setIsLoading(false);
         }
    };
    initMobile();
  }, []);

  // Effect to load initial state from localStorage (remains the same)
  useEffect(() => {
    if (!isTauriEnv) return;
    try {
      const savedFiles = localStorage.getItem(LS_FILES_KEY);
      if (savedFiles) {
        setFileSelections(JSON.parse(savedFiles));
      }
      const savedPath = localStorage.getItem(LS_DIR_PATH_KEY);
      if (savedPath) {
        const dirName = savedPath.split(/[/\\]/).pop() ?? savedPath;
        setDirectoryName(dirName);
        const context: DirectoryContext = { mode: 'tauri', path: savedPath };
        setDirectoryContext(context);
        if (savedFiles) {
          loadFilesFromSource(context, JSON.parse(savedFiles));
        }
      }
    } catch (e) {
      console.error("Failed to load state from localStorage", e);
      localStorage.removeItem(LS_FILES_KEY);
      localStorage.removeItem(LS_DIR_PATH_KEY);
    }
  }, []); // Note: Empty dependency array ensures this runs only once on mount

  // [REFACTORED] Main file processing logic, now accepts a directory context
  const loadFilesFromSource = useCallback(async (
    context: DirectoryContext,
    selectionsToLoad: FileSelection[]
  ): Promise<{ added: string[]; removed: string[] }> => {
    setIsLoading(true);
    setError(null);

    const fileErrors: Record<string, string[]> = {};
    let invalidTopics = 0;
    const newTopicSources: Record<string, string> = {};
    const newFileCache: Record<string, Record<string, unknown>> = {};
    const newOverrideFileCache: Record<string, Record<string, unknown>> = {};
    const newOverridesByFile: Record<string, Record<string, Partial<Topic & { _deleted?: boolean }>>> = {};

    const oldSelectedFiles = fileSelections.filter(f => f.selected).map(f => f.name);
    const newSelectedFiles = selectionsToLoad.filter(f => f.selected).map(f => f.name);

    const filesToAdd = newSelectedFiles.filter(name => !oldSelectedFiles.includes(name));
    const filesToRemove = oldSelectedFiles.filter(name => !newSelectedFiles.includes(name));

    const baseTopicsByFile: Record<string, Record<string, Topic>> = {};
    const addFileError = (fileName: string, message: string) => {
      fileErrors[fileName] ??= [];
      fileErrors[fileName]!.push(message);
    };

    for (const file of selectionsToLoad) {
      if (!file.selected) continue;
      
      try {
        let text: string = '';
        if (context.mode === 'tauri') {
          const filePath = `${context.path}/${file.name}`.replace(/\/{2,}/g, '/');
          text = await readTextFile(filePath);
        } else {
          const fileHandle = await context.handle.getFileHandle(file.name);
          const fileData = await fileHandle.getFile();
          text = await fileData.text();
        }
        const jsonData = JSON.parse(text);
        newFileCache[file.name] = jsonData as Record<string, unknown>;

        const fileTopics: Record<string, Topic> = {};
        const entries = Object.entries(jsonData as Record<string, unknown>);
        for (const [idKey, rawTopic] of entries) {
          if (!rawTopic || typeof idKey !== 'string' || idKey.startsWith('zzz_')) continue;
          
          const normalized = normalizeTopic(idKey, rawTopic);
          if (normalized.id.startsWith('zzz_')) continue;

          const validation = TopicSchema.safeParse(normalized);
          if (!validation.success) {
            invalidTopics += 1;
            const issueSummary = validation.error.issues
              .map(issue => {
                const path = issue.path.join('.') || 'topic';
                return `${path}: ${issue.message}`;
              })
              .join('; ');
            addFileError(file.name, `Topic ${idKey}: ${issueSummary}`);
            continue;
          }

          fileTopics[validation.data.id] = validation.data;
          newTopicSources[validation.data.id] = file.name;
        }
        baseTopicsByFile[file.name] = fileTopics;
      } catch (e) {
        console.error(`Error processing file ${file.name}:`, e);
        const message = `Failed to load ${file.name}. It might be corrupted or inaccessible.`;
        setError(message);
        addFileError(file.name, typeof e === 'string' ? e : message);
        toast.error(message);
      }
    }

    // Load override files
    if (context.mode === 'tauri') {
      for (const file of selectionsToLoad) {
        if (!file.selected) continue;
        try {
          const overridePath = getOverridePath(context.path, file.name);
          const overrideText = await readTextFile(overridePath);
          const overrideData = JSON.parse(overrideText) as Record<string, Partial<Topic & { _deleted?: boolean }>>;
          newOverrideFileCache[file.name] = overrideData as Record<string, unknown>;
          newOverridesByFile[file.name] = overrideData;
        } catch (e) {
          // Override file not existing is fine, just skip
          if (typeof e === 'object' && e && 'message' in e && typeof e.message === 'string' && e.message.includes('No such file')) {
            continue;
          }
          console.warn(`Failed to load override file for ${file.name}:`, e);
        }
      }
    }

    // Merge base topics with overrides
    const newKnowledgeBase: KnowledgeBase = {};
    for (const [fileName, fileTopics] of Object.entries(baseTopicsByFile)) {
      const overrides = newOverridesByFile[fileName] ?? {};
      for (const [topicId, baseTopic] of Object.entries(fileTopics)) {
        const override = overrides[topicId];
        if (override?._deleted) {
          // Topic marked as deleted in override, skip it
          continue;
        }
        if (override) {
          // Merge override into base
          newKnowledgeBase[topicId] = deepMerge(baseTopic, override);
        } else {
          newKnowledgeBase[topicId] = baseTopic;
        }
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
    setFileSelections(selectionsToLoad);
    if (context.mode === 'tauri') {
      localStorage.setItem(LS_FILES_KEY, JSON.stringify(selectionsToLoad));
    }

    const health: DataHealthSummary = {
      totalTopics: Object.keys(newKnowledgeBase).length,
      selectedFiles: newSelectedFiles.length,
      invalidFiles: Object.keys(fileErrors).length,
      invalidTopics,
      fileErrors,
    };
    setDataHealth(health);
    fileCacheRef.current = newFileCache;
    overrideFileCacheRef.current = newOverrideFileCache;
    setTopicSources(newTopicSources);
    setOverridesByFile(newOverridesByFile);

    Object.entries(fileErrors).forEach(([fileName, messages]) => {
      toast.warning(`${fileName}: ${messages.length} issue${messages.length === 1 ? '' : 's'} detected`);
    });

    setIsLoading(false);

    return { added: filesToAdd, removed: filesToRemove };
  }, [fileSelections]); // Depends on previous fileSelections to calculate diff

  // [REFACTORED] Replaced showDirectoryPicker with Tauri's native dialog
  const selectDirectory = useCallback(async () => {
    try {
      if (isTauriEnv) {
        const selectedPath = await open({ directory: true, multiple: false });

        if (typeof selectedPath !== 'string') {
          console.log("Directory selection was cancelled.");
          return null;
        }

        const dirName = selectedPath.split(/[/\\]/).pop() ?? selectedPath;
        setDirectoryName(dirName);
        const context: DirectoryContext = { mode: 'tauri', path: selectedPath };
        setDirectoryContext(context);
        localStorage.setItem(LS_DIR_PATH_KEY, selectedPath);

        const savedSelectionsMap = new Map(fileSelections.map(f => [f.name, f.selected]));
        const newSelections: FileSelection[] = [];

        const entries = await readDir(selectedPath);
        for (const entry of entries) {
          if (entry.isFile && entry.name?.endsWith('.json')) {
            newSelections.push({
              name: entry.name,
              selected: savedSelectionsMap.get(entry.name) ?? false,
            });
          }
        }
        newSelections.sort((a, b) => a.name.localeCompare(b.name));

        return await loadFilesFromSource(context, newSelections);
      }

      if (!supportsFileSystemAccess) {
        const message = 'Directory selection requires the desktop app or a Chromium browser that supports the File System Access API.';
        setError(message);
        toast.error(message);
        return null;
      }

      const picker = await (window as any).showDirectoryPicker();
      const permission = await picker.requestPermission?.({ mode: 'read' });
      if (permission === 'denied') {
        const message = 'Please grant read access to the selected directory.';
        setError(message);
        toast.error(message);
        return null;
      }

      const savedSelectionsMap = new Map(fileSelections.map(f => [f.name, f.selected]));
      const newSelections: FileSelection[] = [];
      for await (const entry of (picker as FileSystemDirectoryHandle).values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.json')) {
          newSelections.push({
            name: entry.name,
            selected: savedSelectionsMap.get(entry.name) ?? false,
          });
        }
      }
      newSelections.sort((a, b) => a.name.localeCompare(b.name));

      const context: DirectoryContext = { mode: 'fs-access', handle: picker };
      setDirectoryContext(context);
      setDirectoryName(picker.name ?? 'Selected Directory');

      return await loadFilesFromSource(context, newSelections);

    } catch (err) {
      // [IMPROVED LOGGING]
      // This will print the detailed error from the native side to the console.
      console.error("Tauri API Error:", err); 

      // Display a more useful error message to the user.
      const errorMessage = typeof err === 'string' ? err : 'An unknown error occurred. Check the developer console for details.';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    }
  }, [fileSelections, loadFilesFromSource]);

  // [NEW] Single File Import (for Mobile/Fallback)
  const importFile = useCallback(async () => {
    try {
        if (!isTauriEnv) {
            toast.error("Import requires native app."); // Or implement pure web file picker
            return;
        }

        const selectedPath = await open({
             directory: false,
             multiple: false,
             filters: [{ name: 'JSON Database', extensions: ['json'] }]
        });

        if (typeof selectedPath !== 'string') return; // Cancelled

        const fileName = selectedPath.split(/[/\\]/).pop() ?? 'imported.json';
        const context: DirectoryContext = { mode: 'tauri', path: selectedPath.replace(fileName, '') }; 
        
        // We treat this as "Selecting a directory that happens to contain just this file" 
        // OR we just append this file to current selection? 
        // User requested "load from local DB".
        // Let's replace the current view with this file.
        
        setDirectoryName(fileName);
        setDirectoryContext(context);
        
        // Use existing logic
        await loadFilesFromSource(context, [{ name: fileName, selected: true }]);

    } catch (e) {
        console.error("Import failed", e);
        toast.error("Failed to import file");
    }
  }, [loadFilesFromSource]);

  const toggleFileSelection = useCallback(async (fileName: string) => {
    if (!directoryContext) {
      setError("Please select a directory first.");
      toast.error("Please select a directory first.");
      return null;
    }

    const newSelections = fileSelections.map(f =>
      f.name === fileName ? { ...f, selected: !f.selected } : f
    );
    
    return await loadFilesFromSource(directoryContext, newSelections);
  }, [fileSelections, directoryContext, loadFilesFromSource]);

  const mergedKnowledgeBase = useMemo(() => ({ ...knowledgeBase, ...overrides }), [knowledgeBase, overrides]);

  const persistTopic = useCallback(async (topic: Topic) => {
    if (!topic?.id) {
      throw new Error('Cannot persist a topic without an ID.');
    }
    const sourceFile = topicSources[topic.id];
    if (!sourceFile) {
      throw new Error('Unable to determine which file owns this topic.');
    }
    if (!directoryContext || directoryContext.mode !== 'tauri') {
      throw new Error('Saving to disk requires the desktop app.');
    }
    
    // Load current overrides for this file
    const currentOverrides = overrideFileCacheRef.current[sourceFile] ?? {};
    
    // Write the full topic to override (Phase 1: full topic, Phase 2: partial diff)
    currentOverrides[topic.id] = { ...topic } as Record<string, unknown>;
    
    const overridePath = getOverridePath(directoryContext.path, sourceFile);
    await writeTextFile(overridePath, JSON.stringify(currentOverrides, null, 2));
    
    // Update in-memory cache
    overrideFileCacheRef.current[sourceFile] = currentOverrides;
    setOverridesByFile(prev => ({
      ...prev,
      [sourceFile]: currentOverrides as Record<string, Partial<Topic & { _deleted?: boolean }>>
    }));
    
    // Update merged knowledge base
    setKnowledgeBase(prev => ({ ...prev, [topic.id]: topic }));
    setOverrides(prev => {
      if (!(topic.id in prev)) return prev;
      const { [topic.id]: _discarded, ...rest } = prev;
      return rest;
    });
  }, [topicSources, directoryContext]);

  const resetTopicOverride = useCallback(async (topicId: string) => {
    const sourceFile = topicSources[topicId];
    if (!sourceFile) {
      throw new Error('Unable to determine which file owns this topic.');
    }
    if (!directoryContext || directoryContext.mode !== 'tauri') {
      throw new Error('Resetting requires the desktop app.');
    }
    
    const currentOverrides = overrideFileCacheRef.current[sourceFile] ?? {};
    delete currentOverrides[topicId];
    
    const overridePath = getOverridePath(directoryContext.path, sourceFile);
    await writeTextFile(overridePath, JSON.stringify(currentOverrides, null, 2));
    
    overrideFileCacheRef.current[sourceFile] = currentOverrides;
    setOverridesByFile(prev => ({
      ...prev,
      [sourceFile]: currentOverrides as Record<string, Partial<Topic & { _deleted?: boolean }>>
    }));
    
    // Remove from in-memory overrides
    setOverrides(prev => {
      const next = { ...prev };
      delete next[topicId];
      return next;
    });
  }, [topicSources, directoryContext]);

  const hasOverride = useCallback((topicId: string): boolean => {
    const sourceFile = topicSources[topicId];
    if (!sourceFile) return false;
    return Boolean(overridesByFile[sourceFile]?.[topicId]);
  }, [topicSources, overridesByFile]);

  const getTopicSource = useCallback((topicId: string) => topicSources[topicId] ?? null, [topicSources]);
  const canPersistTopics = Boolean(directoryContext && directoryContext.mode === 'tauri');

  return {
    knowledgeBase: mergedKnowledgeBase,
    fileSelections,
    directoryName,
    isLoading,
    error,
    dataHealth,
    selectDirectory,
    toggleFileSelection,
    applyTopicOverride: (topic: Topic) => {
      setOverrides(prev => ({ ...prev, [topic.id]: topic }));
    },
    persistTopic,
    resetTopicOverride,
    hasOverride,
    canPersistTopics,
    getTopicSource,
    importFile, // Expose new function
    isMobile: isMobile(), // Expose mobile status
  };
}