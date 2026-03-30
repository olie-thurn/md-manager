"use client";

import type { FileNode } from "../lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Recursively collect all unique tags from a file tree.
 * Returns a map of tag -> count (number of files with that tag).
 */
function collectTags(nodes: FileNode[]): Map<string, number> {
  const counts = new Map<string, number>();

  function traverse(node: FileNode): void {
    if (node.type === "file" && node.metadata?.tags) {
      for (const tag of node.metadata.tags) {
        if (typeof tag === "string" && tag.trim() !== "") {
          counts.set(tag, (counts.get(tag) ?? 0) + 1);
        }
      }
    }
    if (node.children) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  for (const node of nodes) {
    traverse(node);
  }

  return counts;
}

// ---------------------------------------------------------------------------
// TagFilter
// ---------------------------------------------------------------------------

interface TagFilterProps {
  /** The full file tree, used to derive unique tags and their counts. */
  tree: FileNode[];
  /** Set of currently active tag filters. */
  activeTags: Set<string>;
  /** Called when a tag is toggled. */
  onToggleTag: (tag: string) => void;
}

/**
 * Displays all unique tags from the vault as clickable filter pills.
 * Hidden entirely when no files have tags.
 */
export default function TagFilter({
  tree,
  activeTags,
  onToggleTag,
}: TagFilterProps): React.JSX.Element | null {
  const tagCounts = collectTags(tree);

  if (tagCounts.size === 0) {
    return null;
  }

  // Sort tags alphabetically
  const sortedTags = Array.from(tagCounts.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  const hasActiveTags = activeTags.size > 0;

  return (
    <div className="flex-shrink-0 border-t border-neutral-200/80 bg-white px-3 py-3 dark:border-neutral-700/60 dark:bg-neutral-900">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest dark:text-neutral-500">
          Tags
        </span>
        {hasActiveTags && (
          <button
            type="button"
            onClick={() => {
              for (const tag of activeTags) {
                onToggleTag(tag);
              }
            }}
            className="text-[10px] font-medium text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
            title="Clear all tag filters"
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {sortedTags.map(([tag, count]) => {
          const isActive = activeTags.has(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onToggleTag(tag)}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                isActive
                  ? "bg-indigo-600 text-white shadow-sm hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
              }`}
              title={isActive ? `Remove filter: ${tag}` : `Filter by: ${tag}`}
            >
              <span>{tag}</span>
              <span
                className={`rounded-full px-1 text-[10px] font-semibold leading-none py-0.5 ${
                  isActive
                    ? "bg-indigo-500/40 text-indigo-100 dark:bg-indigo-400/30"
                    : "bg-neutral-200 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
