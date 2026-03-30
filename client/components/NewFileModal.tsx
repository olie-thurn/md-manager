"use client";

import { useEffect, useRef, useState } from "react";
import { createFile } from "../lib/api";
import { useToast } from "../hooks/useToast";

interface NewFileModalProps {
  /** Pre-filled parent folder path. Empty string means vault root. */
  parentPath: string;
  /** Which type to pre-select in the toggle. Defaults to "file". */
  initialType?: "file" | "folder";
  onSuccess: () => void;
  onCancel: () => void;
}

/** Validate a file/folder name: not empty, no invalid characters. */
function validateName(name: string): string | null {
  if (!name.trim()) return "Name cannot be empty.";
  if (name.includes("/") || name.includes("\\"))
    return "Name cannot contain / or \\.";
  if (name === "." || name === "..")
    return 'Name cannot be "." or "..".';
  return null;
}

/** Modal for creating a new file or folder inside a given parent path. */
export default function NewFileModal({
  parentPath,
  initialType = "file",
  onSuccess,
  onCancel,
}: NewFileModalProps): React.JSX.Element {
  const [name, setName] = useState<string>("");
  const [itemType, setItemType] = useState<"file" | "folder">(initialType);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  // Focus the input on open
  useEffect(() => {
    inputRef.current?.focus();
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

    // Append .md for files if not already present
    const finalName =
      itemType === "file" && !trimmed.endsWith(".md")
        ? `${trimmed}.md`
        : trimmed;

    const fullPath = parentPath ? `${parentPath}/${finalName}` : finalName;

    setIsLoading(true);
    setError(null);

    try {
      await createFile(fullPath, itemType);
      toast.success(`${itemType === "file" ? "File" : "Folder"} created: ${finalName}`);
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create item.";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  const displayParent = parentPath || "(vault root)";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-neutral-900/80"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-file-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-5 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
        <h2
          id="new-file-modal-title"
          className="text-sm font-semibold text-neutral-800 dark:text-neutral-200"
        >
          New {itemType === "file" ? "File" : "Folder"}
        </h2>
        <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
          Inside: <span className="font-medium text-neutral-600 dark:text-neutral-300">{displayParent}</span>
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-3">
          {/* File / Folder toggle */}
          <div className="flex gap-3">
            <label className="flex cursor-pointer items-center gap-1.5 text-sm dark:text-neutral-300">
              <input
                type="radio"
                name="item-type"
                value="file"
                checked={itemType === "file"}
                onChange={() => setItemType("file")}
                className="accent-neutral-700 dark:accent-neutral-300"
              />
              File
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 text-sm dark:text-neutral-300">
              <input
                type="radio"
                name="item-type"
                value="folder"
                checked={itemType === "folder"}
                onChange={() => setItemType("folder")}
                className="accent-neutral-700 dark:accent-neutral-300"
              />
              Folder
            </label>
          </div>

          {/* Name input */}
          <div>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder={itemType === "file" ? "filename.md" : "folder-name"}
              className="w-full rounded border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-300 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-neutral-400 dark:focus:ring-neutral-700"
              aria-label="Name"
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
              {isLoading ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
