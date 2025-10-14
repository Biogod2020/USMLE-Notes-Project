// src/hooks/useKnowledgeBase.ts
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

// [REFACTORED] Import Tauri's native APIs instead of relying on web APIs
import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile, readDir } from '@tauri-apps/plugin-fs';

import type { KnowledgeBase, FileSelection } from '../types';
import { normalizeTopic } from '../utils/normalization';

// [REFACTORED] We now store the string path, not a handle object
const LS_FILES_KEY = 'KE_selectedFiles';
const LS_DIR_PATH_KEY = 'KE_lastDirPath';

export function useKnowledgeBase() {
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase>({});
  const [fileSelections, setFileSelections] = useState<FileSelection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // [REFACTORED] State now holds the path string and directory name for display
  const [currentDirPath, setCurrentDirPath] = useState<string | null>(null);
  const [directoryName, setDirectoryName] = useState<string | null>(null);

  // Effect to load initial state from localStorage (remains the same)
  useEffect(() => {
    try {
      const savedFiles = localStorage.getItem(LS_FILES_KEY);
      if (savedFiles) {
        setFileSelections(JSON.parse(savedFiles));
      }
      const savedPath = localStorage.getItem(LS_DIR_PATH_KEY);
       if (savedPath) {
        setCurrentDirPath(savedPath);
        const dirName = savedPath.split(/[/\\]/).pop() ?? savedPath;
        setDirectoryName(dirName);
        // Optional: Auto-load on startup if path and files are found
        if (savedFiles) {
           loadFilesFromPath(savedPath, JSON.parse(savedFiles));
        }
       }
    } catch (e) {
      console.error("Failed to load state from localStorage", e);
      localStorage.removeItem(LS_FILES_KEY);
      localStorage.removeItem(LS_DIR_PATH_KEY);
    }
  }, []); // Note: Empty dependency array ensures this runs only once on mount

  // [REFACTORED] Main file processing logic, now accepts a path string
  const loadFilesFromPath = useCallback(async (
    dirPath: string,
    selectionsToLoad: FileSelection[]
  ): Promise<{ added: string[]; removed: string[] }> => {
    setIsLoading(true);
    setError(null);

    const oldSelectedFiles = fileSelections.filter(f => f.selected).map(f => f.name);
    const newSelectedFiles = selectionsToLoad.filter(f => f.selected).map(f => f.name);

    const filesToAdd = newSelectedFiles.filter(name => !oldSelectedFiles.includes(name));
    const filesToRemove = oldSelectedFiles.filter(name => !newSelectedFiles.includes(name));
    
    const newKnowledgeBase: KnowledgeBase = {};
    let loadedFileCount = 0;

    for (const file of selectionsToLoad) {
      if (!file.selected) continue;
      
      try {
        // [REFACTORED] Use Tauri's fs.readTextFile with a constructed path
        const filePath = `${dirPath}/${file.name}`.replace(/\/\//g, '/');
        const text = await readTextFile(filePath);
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
        console.error(`Error processing file ${file.name} via Tauri FS:`, e);
        setError(`Failed to load ${file.name}. It might be corrupted or inaccessible.`);
        toast.error(`Failed to load ${file.name}`);
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
    localStorage.setItem(LS_FILES_KEY, JSON.stringify(selectionsToLoad));
    setIsLoading(false);

    return { added: filesToAdd, removed: filesToRemove };
  }, [fileSelections]); // Depends on previous fileSelections to calculate diff

  // [REFACTORED] Replaced showDirectoryPicker with Tauri's native dialog
  const selectDirectory = useCallback(async () => {
    try {
      const selectedPath = await open({ directory: true, multiple: false });

      if (typeof selectedPath !== 'string') {
        console.log("Directory selection was cancelled.");
        return null;
      }
      
      const dirName = selectedPath.split(/[/\\]/).pop() ?? selectedPath;
      setDirectoryName(dirName);
      setCurrentDirPath(selectedPath);
      localStorage.setItem(LS_DIR_PATH_KEY, selectedPath);

      const savedSelectionsMap = new Map(fileSelections.map(f => [f.name, f.selected]));
      const newSelections: FileSelection[] = [];
      
      // [REFACTORED] Use Tauri's fs.readDir
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
      
      return await loadFilesFromPath(selectedPath, newSelections);

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
  }, [fileSelections, loadFilesFromPath]);

  const toggleFileSelection = useCallback(async (fileName: string) => {
    if (!currentDirPath) {
      setError("Please select a directory first.");
      toast.error("Please select a directory first.");
      return null;
    }

    const newSelections = fileSelections.map(f =>
      f.name === fileName ? { ...f, selected: !f.selected } : f
    );
    
    return await loadFilesFromPath(currentDirPath, newSelections);
  }, [fileSelections, currentDirPath, loadFilesFromPath]);

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