"use client";

import { useEffect, useRef, useState } from "react";
import { renameFile } from "../lib/api";
import { useToast } from "../hooks/useToast";

interface RenameModalProps {
  /** Current full path of the item (e.g. "folder/note.md") */
  currentPath: string;
  /** Display name shown to the user (filename without extension for files) */
  currentName: string;
  itemType: "file" | "folder";
  onSuccess: (newPath: string) => void;
  onCancel: () => void;
}

/** Validate a new name: not empty, no slashes. */
function validateName(name: string): string | null {
  if (!name.trim()) return "Name cannot be empty.";
  if (name.includes("/") || name.includes("\\"))
    return "Name cannot contain / or \\.";
  if (name === "." || name === "..") return 'Name cannot be "." or "..".';
  return null;
}

/** Modal for renaming a file or folder. Pre-fills the current name (without .md for files). */
export default function RenameModal({
  currentPath,
  currentName,
  itemType,
  onSuccess,
  onCancel,
}: RenameModalProps): React.JSX.Element {
  // For files, strip .md suffix for the input but remember to re-add it
  const baseName =
    itemType === "file" && currentName.endsWith(".md")
      ? currentName.slice(0, -3)
      : currentName;

  const [name, setName] = useState<string>(baseName);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  // Focus and select the input on open
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const trimmed = name.trim();
    const validationError = validateName(trimmed);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Re-append .md for files if it was stripped
    const newName =
      itemType === "file" && !trimmed.endsWith(".md")
        ? `${trimmed}.md`
        : trimmed;

    // Nothing changed — just close
    if (newName === currentName) {
      onCancel();
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { newPath } = await renameFile(currentPath, newName);
      toast.success(`Renamed to ${newName}`);
      onSuccess(newPath);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to rename item.";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-neutral-900/80"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rename-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-5 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
        <h2
          id="rename-modal-title"
          className="text-sm font-semibold text-neutral-800 dark:text-neutral-200"
        >
          Rename {itemType === "file" ? "File" : "Folder"}
        </h2>
        <p className="mt-1 text-xs text-neutral-400 truncate dark:text-neutral-500">
          <span className="font-medium text-neutral-600 dark:text-neutral-300">{currentPath}</span>
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-3">
          <div>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="New name"
              className="w-full rounded border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-300 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-neutral-400 dark:focus:ring-neutral-700"
              aria-label="New name"
            />
            {itemType === "file" && !name.endsWith(".md") && name.trim() && (
              <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                .md will be appended automatically.
              </p>
            )}
          </div>

          {error && (
            <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              className="rounded px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-neutral-700"
              disabled={isLoading}
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded bg-neutral-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
              disabled={isLoading}
            >
              {isLoading ? "Renaming…" : "Rename"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
