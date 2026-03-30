"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getFile } from "@/lib/api";
import type { FileContent } from "@/lib/types";
import { Editor } from "@/components/Editor";
import { Preview } from "@/components/Preview";
import { EditorToggle } from "@/components/EditorToggle";
import { useEditor } from "@/hooks/useEditor";
import { useUnsavedChanges } from "@/lib/unsavedChangesContext";
import { useToast } from "@/hooks/useToast";
import UnsavedChangesDialog from "@/components/UnsavedChangesDialog";
import { useSidebar } from "@/lib/sidebarContext";

const LAST_OPENED_KEY = "md-manager:lastOpenedFile";

type EditorMode = "edit" | "preview";

function EditorWithState({
  fileContent,
  filePath,
}: {
  fileContent: FileContent;
  filePath: string;
}): React.JSX.Element {
  const { content, setContent, isDirty, isLoading: isSaving, error: saveError, save } =
    useEditor(fileContent.content, filePath);

  const [mode, setMode] = useState<EditorMode>("edit");

  const { setIsDirty, pendingNavigation, cancelNavigation } = useUnsavedChanges();
  const { openSidebar } = useSidebar();

  const fileName = filePath.split("/").pop() ?? filePath;

  // Sync isDirty into the shared context so FileTree/SearchBar can read it
  useEffect(() => {
    setIsDirty(isDirty);
  }, [isDirty, setIsDirty]);

  // Clear dirty flag in context when this component unmounts (file changed / navigated away)
  useEffect(() => {
    return () => {
      setIsDirty(false);
    };
  }, [setIsDirty]);

  // beforeunload: warn the browser when there are unsaved changes
  useEffect(() => {
    if (!isDirty) return;

    function handleBeforeUnload(e: BeforeUnloadEvent): void {
      e.preventDefault();
      // Modern browsers ignore the returned string but require returnValue to be set
      e.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);

  // Update document title to reflect dirty state and current file
  useEffect(() => {
    const base = `${fileName} — MD Manager`;
    document.title = isDirty ? `*${base}` : base;

    return () => {
      document.title = "MD Manager";
    };
  }, [fileName, isDirty]);

  // Stable save reference for keyboard shortcut handler
  const handleSave = useCallback((): void => {
    void save();
  }, [save]);

  // Global keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (!(e.metaKey || e.ctrlKey)) return;

      if (e.key === "s") {
        e.preventDefault();
        handleSave();
        return;
      }

      if (e.key === "p") {
        // Phase 6: focus search bar. For now just prevent the browser print dialog.
        e.preventDefault();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [handleSave]);

  // Handle "Save and Continue" from the UnsavedChangesDialog
  async function handleSaveAndContinue(): Promise<void> {
    await save();
    if (pendingNavigation) {
      pendingNavigation.onProceed();
      cancelNavigation();
    }
  }

  // Handle "Discard" from the UnsavedChangesDialog
  function handleDiscard(): void {
    if (pendingNavigation) {
      pendingNavigation.onProceed();
      cancelNavigation();
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-2 dark:border-neutral-700 dark:bg-neutral-900">
        {/* Left: hamburger (mobile only) + file name + dirty indicator */}
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            aria-label="Open sidebar"
            onClick={openSidebar}
            className="mr-1 rounded p-1 md:hidden dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            {/* Three-line hamburger icon */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="3" y="5" width="14" height="1.5" rx="0.75" fill="currentColor" />
              <rect x="3" y="9.25" width="14" height="1.5" rx="0.75" fill="currentColor" />
              <rect x="3" y="13.5" width="14" height="1.5" rx="0.75" fill="currentColor" />
            </svg>
          </button>
          <p className="truncate text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {fileName}
          </p>
          {isDirty && (
            <span
              className="h-2 w-2 flex-shrink-0 rounded-full bg-amber-400"
              title="Unsaved changes"
              aria-label="Unsaved changes"
            />
          )}
        </div>

        {/* Right: toggle + save button */}
        <div className="ml-4 flex items-center gap-2">
          <EditorToggle mode={mode} onToggle={setMode} />
          <button
            type="button"
            disabled={!isDirty || isSaving}
            onClick={() => void save()}
            className="rounded bg-neutral-800 px-3 py-1 text-xs text-white disabled:cursor-not-allowed disabled:opacity-40 hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {/* Save error banner */}
      {saveError && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {saveError}
        </div>
      )}

      {/* Content area: editor or preview */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {mode === "edit" ? (
          <Editor
            content={content}
            onChange={setContent}
            filePath={filePath}
            isDirty={isDirty}
            isSaving={isSaving}
            saveError={saveError}
            onSave={save}
          />
        ) : (
          <Preview content={content} />
        )}
      </div>

      {/* Unsaved changes confirmation dialog */}
      {pendingNavigation !== null && (
        <UnsavedChangesDialog
          onSaveAndContinue={() => void handleSaveAndContinue()}
          onDiscard={handleDiscard}
          onCancel={cancelNavigation}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}

export default function EditorPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();

  const [fileContent, setFileContent] = useState<FileContent | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { error: showErrorToast } = useToast();

  // Reconstruct path from slug segments
  const slugParam = params.slug;
  const slugSegments: string[] = Array.isArray(slugParam)
    ? slugParam
    : slugParam
      ? [slugParam]
      : [];

  // Redirect to home if slug is empty
  useEffect(() => {
    if (slugSegments.length === 0) {
      router.replace("/");
    }
  }, [slugSegments.length, router]);

  const filePath = slugSegments.map(decodeURIComponent).join("/");

  // Fetch file content whenever path changes
  useEffect(() => {
    if (!filePath) return;

    let cancelled = false;

    async function fetchFile(): Promise<void> {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getFile(filePath);
        if (!cancelled) {
          setFileContent(data);
          // Store the opened path in localStorage
          if (typeof window !== "undefined") {
            localStorage.setItem(LAST_OPENED_KEY, filePath);
          }
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Failed to load file";
          setError(message);
          showErrorToast(message);
          setFileContent(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void fetchFile();

    return () => {
      cancelled = true;
    };
  }, [filePath, showErrorToast]);

  if (slugSegments.length === 0) {
    return <div className="flex flex-1 items-center justify-center" />;
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-3 p-6">
        <div className="h-4 w-48 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
        <div className="h-3 w-full animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
        <div className="h-3 w-4/6 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          <p className="font-medium">Could not load file</p>
          <p className="mt-1 text-xs text-red-500 dark:text-red-500">{error}</p>
        </div>
        <p className="text-xs text-neutral-400 dark:text-neutral-500">{filePath}</p>
      </div>
    );
  }

  if (!fileContent) {
    return <div className="flex flex-1 items-center justify-center" />;
  }

  return <EditorWithState fileContent={fileContent} filePath={filePath} />;
}
