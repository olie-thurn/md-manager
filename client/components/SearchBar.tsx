"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { SearchResult } from "../lib/types";
import { useSearch } from "../hooks/useSearch";
import { useUnsavedChanges } from "../lib/unsavedChangesContext";

// ---------------------------------------------------------------------------
// SnippetHighlight
// ---------------------------------------------------------------------------

interface SnippetHighlightProps {
  snippet: string;
  query: string;
}

/** Renders a text snippet with the query substring highlighted. */
function SnippetHighlight({
  snippet,
  query,
}: SnippetHighlightProps): React.JSX.Element {
  if (!query.trim()) {
    return <span>{snippet}</span>;
  }

  const lowerSnippet = snippet.toLowerCase();
  const lowerQuery = query.toLowerCase().trim();
  const matchIndex = lowerSnippet.indexOf(lowerQuery);

  if (matchIndex === -1) {
    return <span>{snippet}</span>;
  }

  const before = snippet.slice(0, matchIndex);
  const match = snippet.slice(matchIndex, matchIndex + lowerQuery.length);
  const after = snippet.slice(matchIndex + lowerQuery.length);

  return (
    <span>
      {before}
      <mark className="rounded bg-amber-100 px-0.5 text-amber-800 not-italic dark:bg-amber-400/20 dark:text-amber-300">
        {match}
      </mark>
      {after}
    </span>
  );
}

// ---------------------------------------------------------------------------
// SearchBar
// ---------------------------------------------------------------------------

interface SearchBarProps {
  /** Active tag filters passed in from parent (Phase 6 TagFilter integration). */
  activeTags?: string[];
}

/** Debounced search input with a results dropdown. */
export default function SearchBar({
  activeTags = [],
}: SearchBarProps): React.JSX.Element {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const router = useRouter();
  const { requestNavigation } = useUnsavedChanges();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { results, isLoading, error } = useSearch(query, activeTags);

  const hasQuery = query.trim().length > 0;
  const showDropdown = isOpen && hasQuery;

  // Open the dropdown whenever a query is typed
  useEffect(() => {
    if (hasQuery) {
      setIsOpen(true);
      setActiveIndex(-1);
    } else {
      setIsOpen(false);
    }
  }, [hasQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent): void {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function navigateTo(result: SearchResult): void {
    const href = `/editor/${encodeURIComponent(result.path)}`;
    requestNavigation(href, () => {
      router.push(href);
      setQuery("");
      setIsOpen(false);
      setActiveIndex(-1);
    });
    // Always clear the UI state immediately so it doesn't linger
    setQuery("");
    setIsOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === "Escape") {
      setQuery("");
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (!showDropdown) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target =
        activeIndex >= 0 && activeIndex < results.length
          ? results[activeIndex]
          : results[0];
      if (target) {
        navigateTo(target);
      }
    }
  }

  // Get folder path from full file path (everything before the last slash)
  function getFolderPath(path: string): string {
    const lastSlash = path.lastIndexOf("/");
    return lastSlash > 0 ? path.slice(0, lastSlash) : "";
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Input */}
      <div className="relative flex items-center">
        {/* Magnifying glass icon */}
        <svg
          className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-neutral-400 dark:text-neutral-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
          />
        </svg>

        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (hasQuery) setIsOpen(true);
          }}
          placeholder="Search files…"
          className="w-full rounded-md border border-neutral-200 bg-neutral-50 py-1.5 pl-8 pr-3 text-xs text-neutral-700 placeholder-neutral-400 outline-none transition-all focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100 dark:border-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-200 dark:placeholder-neutral-500 dark:focus:border-indigo-500/50 dark:focus:bg-neutral-800 dark:focus:ring-indigo-500/10"
          aria-label="Search files"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          role="combobox"
        />

        {/* Loading spinner */}
        {isLoading && (
          <div className="absolute right-2.5" aria-label="Searching…">
            <svg
              className="h-3 w-3 animate-spin text-neutral-400 dark:text-neutral-500"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          role="listbox"
          aria-label="Search results"
          className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-72 overflow-y-auto rounded-lg border border-neutral-200/80 bg-white shadow-xl shadow-neutral-200/40 dark:border-neutral-700/60 dark:bg-neutral-850 dark:shadow-black/30"
          style={{ background: "var(--sb-dropdown-bg, white)" }}
        >
          {error && (
            <p className="px-3 py-2 text-xs text-red-500 dark:text-red-400">{error}</p>
          )}

          {!error && !isLoading && results.length === 0 && (
            <p className="px-3 py-2.5 text-xs text-neutral-400 dark:text-neutral-500">
              No results found
            </p>
          )}

          {results.map((result, index) => {
            const folderPath = getFolderPath(result.path);
            const isHighlighted = index === activeIndex;
            return (
              <button
                key={result.path}
                role="option"
                aria-selected={isHighlighted}
                onClick={() => navigateTo(result)}
                className={`flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition-colors ${
                  isHighlighted
                    ? "bg-indigo-50 dark:bg-indigo-500/10"
                    : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                }`}
              >
                <span className={`truncate text-xs font-semibold ${isHighlighted ? "text-indigo-700 dark:text-indigo-300" : "text-neutral-800 dark:text-neutral-200"}`}>
                  {result.name}
                </span>
                {folderPath && (
                  <span className="truncate text-[10px] text-neutral-400 dark:text-neutral-500">
                    {folderPath}
                  </span>
                )}
                {result.snippet && (
                  <span className="mt-0.5 truncate text-xs text-neutral-500 italic dark:text-neutral-400">
                    <SnippetHighlight
                      snippet={result.snippet}
                      query={query}
                    />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
