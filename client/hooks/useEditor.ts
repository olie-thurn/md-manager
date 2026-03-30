"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveFile } from "@/lib/api";
import { useToast } from "@/hooks/useToast";

interface UseEditorResult {
  content: string;
  setContent: (content: string) => void;
  isDirty: boolean;
  isLoading: boolean;
  error: string | null;
  save: () => Promise<void>;
}

/**
 * Manages the state for the Markdown editor.
 *
 * @param initialContent - The initial file content loaded from disk.
 * @param filePath - The vault-relative path used for save operations.
 */
export function useEditor(
  initialContent: string,
  filePath: string,
): UseEditorResult {
  const [content, setContentState] = useState<string>(initialContent);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  // Tracks the last persisted version so isDirty can be derived accurately.
  const savedRef = useRef<string>(initialContent);

  // When a new file is loaded (initialContent or filePath changes), reset state.
  useEffect(() => {
    setContentState(initialContent);
    savedRef.current = initialContent;
    setError(null);
  }, [initialContent, filePath]);

  const setContent = useCallback((value: string) => {
    setContentState(value);
  }, []);

  const save = useCallback(async (): Promise<void> => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      await saveFile(filePath, content);
      savedRef.current = content;
      toast.success("File saved");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save file";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [filePath, content, isLoading, toast]);

  const isDirty = content !== savedRef.current;

  return { content, setContent, isDirty, isLoading, error, save };
}
