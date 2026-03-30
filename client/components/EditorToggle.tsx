"use client";

interface EditorToggleProps {
  mode: "edit" | "preview";
  onToggle: (mode: "edit" | "preview") => void;
}

/**
 * Two-state toggle button for switching between Edit and Preview modes.
 *
 * The active mode button is visually filled; the inactive one is outlined.
 */
export function EditorToggle({
  mode,
  onToggle,
}: EditorToggleProps): React.JSX.Element {
  return (
    <div className="flex rounded border border-neutral-200 overflow-hidden dark:border-neutral-700">
      <button
        type="button"
        onClick={() => onToggle("edit")}
        className={`px-3 py-1 text-xs font-medium transition-colors ${
          mode === "edit"
            ? "bg-neutral-800 text-white dark:bg-neutral-100 dark:text-neutral-900"
            : "bg-white text-neutral-600 hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800"
        }`}
        aria-pressed={mode === "edit"}
      >
        Edit
      </button>
      <button
        type="button"
        onClick={() => onToggle("preview")}
        className={`px-3 py-1 text-xs font-medium transition-colors border-l border-neutral-200 dark:border-neutral-700 ${
          mode === "preview"
            ? "bg-neutral-800 text-white dark:bg-neutral-100 dark:text-neutral-900"
            : "bg-white text-neutral-600 hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800"
        }`}
        aria-pressed={mode === "preview"}
      >
        Preview
      </button>
    </div>
  );
}
