"use client";

import { useState, useEffect } from "react";
import FileTree from "./FileTree";
import SearchBar from "./SearchBar";
import TagFilter from "./TagFilter";
import { useFileTree } from "../hooks/useFileTree";
import { ThemeToggle } from "./ThemeToggle";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

/**
 * Sidebar client component that owns shared state (activeTags, file tree data)
 * so both FileTree, SearchBar, and TagFilter can react to it.
 *
 * On mobile (<md): renders as a slide-in overlay controlled by isOpen/onClose.
 * On desktop (md+): always visible as the normal fixed side panel.
 */
export default function Sidebar({ isOpen = false, onClose = () => {} }: SidebarProps): React.JSX.Element {
  const { tree, isLoading, error, refresh } = useFileTree();
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());

  // Close sidebar on Escape key press
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  function handleToggleTag(tag: string): void {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  }

  const activeTagsArray = Array.from(activeTags);

  return (
    <>
      {/* Mobile backdrop — only visible when open on small screens */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm dark:bg-black/60 md:hidden"
          aria-hidden="true"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={[
          // Desktop: always visible, static layout
          "md:static md:flex md:translate-x-0 md:shadow-none",
          // Mobile: fixed overlay with slide transition
          "fixed inset-y-0 left-0 z-40 transition-transform duration-200 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
          // Shared sizing & styling — layered surface system
          "flex w-72 flex-shrink-0 flex-col",
          "border-r border-neutral-200/80 bg-neutral-50 dark:border-neutral-700/60 dark:bg-neutral-900",
          // Drop shadow on mobile overlay
          "shadow-xl md:shadow-none",
        ].join(" ")}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-shrink-0 items-center justify-between px-4 py-3.5 bg-white dark:bg-neutral-900 border-b border-neutral-200/80 dark:border-neutral-700/60">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-sm font-semibold tracking-tight text-neutral-800 dark:text-neutral-100">
              MD Manager
            </h1>
            <p className="text-[10px] font-medium tracking-wide text-neutral-400 uppercase dark:text-neutral-500">
              Your markdown vault
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* ── Search ─────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 bg-white dark:bg-neutral-900 border-b border-neutral-200/80 dark:border-neutral-700/60 px-3 py-2.5">
          <SearchBar activeTags={activeTagsArray} />
        </div>

        {/* ── File tree ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto py-3">
          <div className="mb-1.5 flex items-center justify-between px-3">
            <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest dark:text-neutral-500">
              Files
            </span>
          </div>
          <FileTree
            tree={tree}
            isLoading={isLoading}
            error={error}
            refresh={refresh}
            activeTags={activeTags}
          />
        </div>

        {/* ── Tag filter ─────────────────────────────────────────────── */}
        <TagFilter
          tree={tree}
          activeTags={activeTags}
          onToggleTag={handleToggleTag}
        />
      </aside>
    </>
  );
}
