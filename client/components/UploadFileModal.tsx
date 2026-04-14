"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { uploadFile } from "../lib/api";
import type { FileNode } from "../lib/types";
import { useToast } from "../hooks/useToast";

interface UploadFileModalProps {
  tree: FileNode[];
  onSuccess: (path: string) => void;
  onCancel: () => void;
}

function flattenFolders(
  nodes: FileNode[],
  depth = 0
): { label: string; value: string }[] {
  const result: { label: string; value: string }[] = [];

  for (const node of nodes) {
    if (node.type === "folder") {
      result.push({
        label: `${"\u00a0\u00a0".repeat(depth)}${node.name}`,
        value: node.path,
      });
      if (node.children && node.children.length > 0) {
        result.push(...flattenFolders(node.children, depth + 1));
      }
    }
  }

  return result;
}

function validateName(name: string): string | null {
  if (!name.trim()) return "Name cannot be empty.";
  if (name.includes("/") || name.includes("\\")) {
    return "Name cannot contain / or \\.";
  }
  return null;
}

export default function UploadFileModal({
  tree,
  onSuccess,
  onCancel,
}: UploadFileModalProps): React.JSX.Element {
  const [file, setFile] = useState<File | null>(null);
  const [nameInput, setNameInput] = useState<string>("");
  const [destination, setDestination] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const dropZoneRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const folderOptions = flattenFolders(tree);

  useEffect(() => {
    dropZoneRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  function applySelectedFile(nextFile: File | null): void {
    if (!nextFile) return;

    if (!nextFile.name.endsWith(".md")) {
      setFile(null);
      setNameInput("");
      setError("Only .md files can be uploaded");
      return;
    }

    setFile(nextFile);
    setNameInput(nextFile.name.replace(/\.md$/, ""));
    setError(null);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    setIsDragging(false);
    applySelectedFile(e.dataTransfer.files[0] ?? null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    applySelectedFile(e.target.files?.[0] ?? null);
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();

    if (!file) {
      setError("Please choose a file to upload.");
      return;
    }

    const trimmedName = nameInput.trim();
    const validationError = validateName(trimmedName);
    if (validationError) {
      setError(validationError);
      return;
    }

    const finalFilename = trimmedName.endsWith(".md")
      ? trimmedName
      : `${trimmedName}.md`;

    setIsLoading(true);
    setError(null);

    try {
      const { path } = await uploadFile(file, destination, finalFilename);
      toast.success(`Uploaded: ${path}`);
      onSuccess(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-neutral-900/80"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-file-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-5 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
        <h2
          id="upload-file-modal-title"
          className="text-sm font-semibold text-neutral-800 dark:text-neutral-200"
        >
          Upload Markdown File
        </h2>

        <div
          ref={dropZoneRef}
          tabIndex={0}
          className={`mt-4 ${
            !file
              ? `flex flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed border-neutral-300 px-4 py-8 text-center dark:border-neutral-600 ${
                  isDragging
                    ? "border-indigo-400 bg-indigo-50 dark:border-indigo-600 dark:bg-indigo-500/10"
                    : ""
                }`
              : ""
          }`}
          onDragOver={(e) => e.preventDefault()}
          onDragEnter={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          {!file ? (
            <>
              <svg
                className="h-8 w-8 text-neutral-500 dark:text-neutral-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 16V4" />
                <path d="m7 9 5-5 5 5" />
                <path d="M20 16.5v2a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-2" />
              </svg>
              <p className="text-sm text-neutral-700 dark:text-neutral-200">
                Drag &amp; drop a .md file here
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".md"
                className="sr-only"
                onChange={handleFileChange}
              />
              <button
                type="button"
                className="rounded bg-neutral-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                Browse files
              </button>
            </>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
              <p className="rounded border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
                Selected: <span className="font-medium">{file.name}</span>
              </p>

              <div>
                <label
                  htmlFor="upload-name"
                  className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300"
                >
                  Save as
                </label>
                <input
                  id="upload-name"
                  type="text"
                  value={nameInput}
                  onChange={(e) => {
                    setNameInput(e.target.value);
                    setError(null);
                  }}
                  className="w-full rounded border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-300 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-neutral-400 dark:focus:ring-neutral-700"
                />
                <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                  .md will be used
                </p>
              </div>

              <div>
                <label
                  htmlFor="upload-destination"
                  className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300"
                >
                  Destination
                </label>
                <select
                  id="upload-destination"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full rounded border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-300 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:border-neutral-400 dark:focus:ring-neutral-700"
                >
                  <option value="">(vault root)</option>
                  {folderOptions.map((folder) => (
                    <option key={folder.value} value={folder.value}>
                      {folder.label}
                    </option>
                  ))}
                </select>
              </div>

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
                  {isLoading ? "Uploading…" : "Upload"}
                </button>
              </div>
            </form>
          )}
        </div>

        {!file && (
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              className="rounded px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-neutral-700"
              disabled={isLoading}
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>
        )}

        {error && (
          <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    </div>,
    document.body
  );
}
