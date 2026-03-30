"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { search } from "../lib/api";
import type { SearchResult } from "../lib/types";
import { useToast } from "./useToast";

interface UseSearchResult {
  results: SearchResult[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Debounced search hook. Calls the search API 300ms after the user stops typing.
 * Cancels in-flight requests when the query changes via AbortController.
 */
export function useSearch(
  query: string,
  activeTags: string[]
): UseSearchResult {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { error: showErrorToast } = useToast();

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastErrorToastAtRef = useRef<number>(0);

  const runSearch = useCallback(
    async (q: string, tags: string[]) => {
      // Abort any previous in-flight request
      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError(null);

      try {
        const data = await search(q, tags);
        if (!controller.signal.aborted) {
          setResults(data);
        }
      } catch (err: unknown) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Search failed");
          setResults([]);
          const now = Date.now();
          if (now - lastErrorToastAtRef.current > 4000) {
            showErrorToast("Search failed");
            lastErrorToastAtRef.current = now;
          }
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [showErrorToast]
  );

  useEffect(() => {
    // Clear any pending debounce timer
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }

    const hasQuery = query.trim().length > 0;
    const hasTags = activeTags.length > 0;

    if (!hasQuery && !hasTags) {
      // Abort any in-flight request and reset state
      if (abortRef.current) {
        abortRef.current.abort();
      }
      setResults([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    timerRef.current = setTimeout(() => {
      void runSearch(query, activeTags);
    }, 300);

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, [query, activeTags, runSearch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { results, isLoading, error };
}
