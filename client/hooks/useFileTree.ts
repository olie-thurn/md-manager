"use client";

import { useCallback, useEffect, useState } from "react";
import { getFileTree } from "../lib/api";
import type { FileNode } from "../lib/types";
import { useToast } from "./useToast";

export interface UseFileTreeResult {
  tree: FileNode[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

/** Fetches the vault file tree on mount and exposes a refresh function. */
export function useFileTree(): UseFileTreeResult {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { error: showErrorToast } = useToast();

  const fetchTree = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getFileTree();
      setTree(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load file tree";
      setError(message);
      showErrorToast(message);
    } finally {
      setIsLoading(false);
    }
  }, [showErrorToast]);

  useEffect(() => {
    void fetchTree();
  }, [fetchTree]);

  const refresh = useCallback((): void => {
    void fetchTree();
  }, [fetchTree]);

  return { tree, isLoading, error, refresh };
}
