"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { deleteFile } from "../lib/api";
import type { FileNode } from "../lib/types";
import ContextMenu from "./ContextMenu";
import ConfirmDialog from "./ConfirmDialog";
import NewFileModal from "./NewFileModal";
import RenameModal from "./RenameModal";
import UploadFileModal from "./UploadFileModal";
import { useUnsavedChanges } from "../lib/unsavedChangesContext";
import { useToast } from "../hooks/useToast";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ContextMenuState {
  node: FileNode;
  x: number;
  y: number;
}

type ModalState =
  | { kind: "none" }
  | { kind: "newFile"; parentPath: string; initialType: "file" | "folder" }
  | { kind: "rename"; node: FileNode }
  | { kind: "confirmDelete"; node: FileNode };

// ---------------------------------------------------------------------------
// SVG Icon primitives
// ---------------------------------------------------------------------------

/** Chevron right (collapsed folder indicator) */
function IconChevronRight({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/** Chevron down (expanded folder indicator) */
function IconChevronDown({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/** Folder icon (open state) */
function IconFolderOpen({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M2 4.75A2.75 2.75 0 0 1 4.75 2h3.586a1 1 0 0 1 .707.293l1.414 1.414H15.25A2.75 2.75 0 0 1 18 6.457V7h-2V6.457a.75.75 0 0 0-.75-.75H9.75a1 1 0 0 1-.707-.293L7.629 4H4.75A.75.75 0 0 0 4 4.75V7H2V4.75Z"
        clipRule="evenodd"
      />
      <path d="M2 7h16v8.25A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25V7Z" />
    </svg>
  );
}

/** Folder icon (closed state) */
function IconFolderClosed({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M2 6a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6Z" />
    </svg>
  );
}

/** Document / file icon */
function IconDocument({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M4 4a2 2 0 0 1 2-2h4.586A2 2 0 0 1 12 2.586L15.414 6A2 2 0 0 1 16 7.414V16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4Zm2 6a1 1 0 0 1 1-1h6a1 1 0 1 1 0 2H7a1 1 0 0 1-1-1Zm1 3a1 1 0 1 0 0 2h4a1 1 0 1 0 0-2H7Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/** Plus icon for creating files */
function IconPlus({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Sort FileNode[] with folders before files, both alphabetically. */
function sortNodes(nodes: FileNode[]): FileNode[] {
  return [...nodes].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "folder" ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}

/**
 * Returns true if a file node matches all active tags.
 * Always returns true when activeTags is empty (no filter applied).
 */
function fileMatchesTags(node: FileNode, activeTags: Set<string>): boolean {
  if (activeTags.size === 0) return true;
  const fileTags = new Set(node.metadata?.tags ?? []);
  for (const tag of activeTags) {
    if (!fileTags.has(tag)) return false;
  }
  return true;
}

/**
 * Recursively filter a list of FileNodes by active tags.
 * - Files are included only if they have all active tags.
 * - Folders are included if they contain at least one matching descendant.
 * Returns null if no children survive (used to prune empty folders).
 */
function filterNodes(
  nodes: FileNode[],
  activeTags: Set<string>
): FileNode[] {
  if (activeTags.size === 0) return nodes;

  const result: FileNode[] = [];

  for (const node of nodes) {
    if (node.type === "file") {
      if (fileMatchesTags(node, activeTags)) {
        result.push(node);
      }
    } else {
      // folder
      const filteredChildren = filterNodes(node.children ?? [], activeTags);
      if (filteredChildren.length > 0) {
        result.push({ ...node, children: filteredChildren });
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// FileTreeNode
// ---------------------------------------------------------------------------

interface FileTreeNodeProps {
  node: FileNode;
  depth: number;
  activePath: string;
  onContextMenu: (node: FileNode, x: number, y: number) => void;
  onNavigate: (href: string) => void;
}

function FileTreeNode({
  node,
  depth,
  activePath,
  onContextMenu,
  onNavigate,
}: FileTreeNodeProps): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const isActive = node.path === activePath;
  // Each depth level adds 14px of indentation
  const paddingLeft = 12 + depth * 14;

  function handleContextMenu(e: React.MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(node, e.clientX, e.clientY);
  }

  if (node.type === "folder") {
    const children = node.children ? sortNodes(node.children) : [];

    return (
      <div>
        <button
          type="button"
          className="group flex w-full items-center gap-1.5 rounded-md py-1.5 pr-2 text-left text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800/60 dark:hover:text-neutral-200"
          style={{ paddingLeft: `${paddingLeft}px` }}
          onClick={() => setIsExpanded((prev) => !prev)}
          onContextMenu={handleContextMenu}
        >
          {/* Expand/collapse chevron */}
          <span className="flex-shrink-0 text-neutral-400 transition-transform dark:text-neutral-500">
            {isExpanded ? (
              <IconChevronDown className="h-3 w-3" />
            ) : (
              <IconChevronRight className="h-3 w-3" />
            )}
          </span>
          {/* Folder icon */}
          <span className={`flex-shrink-0 transition-colors ${isExpanded ? "text-amber-500 dark:text-amber-400" : "text-neutral-400 dark:text-neutral-500"}`}>
            {isExpanded ? (
              <IconFolderOpen className="h-3.5 w-3.5" />
            ) : (
              <IconFolderClosed className="h-3.5 w-3.5" />
            )}
          </span>
          <span className="truncate">{node.name}</span>
        </button>

        {isExpanded && (
          <div className="relative">
            {/* Subtle vertical guide line for nesting */}
            {depth >= 0 && (
              <div
                className="absolute top-0 bottom-0 w-px bg-neutral-200 dark:bg-neutral-700/60"
                style={{ left: `${paddingLeft + 5}px` }}
              />
            )}
            {children.length === 0 ? (
              <div
                className="py-1 text-xs text-neutral-400 italic dark:text-neutral-600"
                style={{ paddingLeft: `${paddingLeft + 20}px` }}
              >
                Empty folder
              </div>
            ) : (
              children.map((child) => (
                <FileTreeNode
                  key={child.path}
                  node={child}
                  depth={depth + 1}
                  activePath={activePath}
                  onContextMenu={onContextMenu}
                  onNavigate={onNavigate}
                />
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  // File node
  return (
    <button
      type="button"
      className={`group flex w-full items-center gap-1.5 rounded-md py-1.5 pr-2 text-left text-xs transition-colors ${
        isActive
          ? "bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
          : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800/60 dark:hover:text-neutral-200"
      }`}
      style={{ paddingLeft: `${paddingLeft}px` }}
      onClick={() => onNavigate(`/editor/${encodeURIComponent(node.path)}`)}
      onContextMenu={handleContextMenu}
    >
      {/* File icon */}
      <span
        className={`flex-shrink-0 transition-colors ${
          isActive
            ? "text-indigo-500 dark:text-indigo-400"
            : "text-neutral-400 group-hover:text-neutral-500 dark:text-neutral-500 dark:group-hover:text-neutral-400"
        }`}
      >
        <IconDocument className="h-3.5 w-3.5" />
      </span>
      <span className="truncate">{node.name}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// FileTree (top-level)
// ---------------------------------------------------------------------------

interface FileTreeProps {
  /** File tree data passed in from parent (Sidebar). */
  tree: FileNode[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  /** Active tag filters — tree is filtered to show only matching files. */
  activeTags: Set<string>;
}

/** Sidebar file tree: shows vault structure, handles loading/error/empty states. */
export default function FileTree({
  tree,
  isLoading,
  error,
  refresh,
  activeTags,
}: FileTreeProps): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const { requestNavigation } = useUnsavedChanges();
  const toast = useToast();

  function handleNavigate(href: string): void {
    requestNavigation(href, () => router.push(href));
  }

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [modal, setModal] = useState<ModalState>({ kind: "none" });
  const [uploadModalOpen, setUploadModalOpen] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Derive active path from /editor/{encodedPath}
  const activePath = pathname.startsWith("/editor/")
    ? decodeURIComponent(pathname.slice("/editor/".length))
    : "";

  // ---- Context menu handlers ------------------------------------------------

  function openContextMenu(node: FileNode, x: number, y: number): void {
    setContextMenu({ node, x, y });
  }

  function closeContextMenu(): void {
    setContextMenu(null);
  }

  // ---- Modal openers --------------------------------------------------------

  function openNewFileModal(
    parentPath: string,
    initialType: "file" | "folder" = "file"
  ): void {
    setContextMenu(null);
    setModal({ kind: "newFile", parentPath, initialType });
  }

  function openRenameModal(node: FileNode): void {
    setContextMenu(null);
    setModal({ kind: "rename", node });
  }

  function openConfirmDelete(node: FileNode): void {
    setContextMenu(null);
    setDeleteError(null);
    setModal({ kind: "confirmDelete", node });
  }

  function closeModal(): void {
    setModal({ kind: "none" });
    setDeleteError(null);
    setIsDeleting(false);
  }

  // ---- Actions --------------------------------------------------------------

  function handleNewFileSuccess(): void {
    closeModal();
    refresh();
  }

  function handleRenameSuccess(newPath: string): void {
    // Capture the old path before closing the modal
    const oldPath = modal.kind === "rename" ? modal.node.path : null;
    closeModal();
    refresh();
    // Navigate to new path if the renamed file was currently open
    if (oldPath !== null && oldPath === activePath) {
      router.replace(`/editor/${encodeURIComponent(newPath)}`);
    }
  }

  function handleUploadSuccess(path: string): void {
    void path;
    setUploadModalOpen(false);
    refresh();
  }

  async function handleDelete(): Promise<void> {
    if (modal.kind !== "confirmDelete") return;
    const { node } = modal;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteFile(node.path);
      toast.success(`${node.type === "file" ? "File" : "Folder"} deleted: ${node.name}`);
      closeModal();
      refresh();
      // Navigate away if the deleted item was open or is a parent of the open path
      if (activePath === node.path || activePath.startsWith(`${node.path}/`)) {
        router.replace("/");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete item.";
      setDeleteError(message);
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  // ---- Render ---------------------------------------------------------------

  const filtered = filterNodes(tree, activeTags);
  const sorted = sortNodes(filtered);

  /** Render the file tree body based on loading/error/data state. */
  function renderTreeBody(): React.JSX.Element {
    if (isLoading) {
      return (
        <div className="space-y-1.5 px-3 py-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-5 animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800"
              style={{ width: `${50 + i * 9}%` }}
            />
          ))}
        </div>
      );
    }
    if (error) {
      return (
        <div className="mx-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/30 dark:text-red-400">
          Failed to load files: {error}
        </div>
      );
    }
    if (sorted.length === 0) {
      if (activeTags.size > 0) {
        return (
          <div className="mx-2 rounded-md bg-neutral-100 px-3 py-2.5 text-xs text-neutral-500 italic dark:bg-neutral-800/40 dark:text-neutral-500">
            No files match the selected tags.
          </div>
        );
      }
      return (
        <div className="mx-2 rounded-md bg-neutral-100 px-3 py-2.5 text-xs text-neutral-500 italic dark:bg-neutral-800/40 dark:text-neutral-500">
          No files yet. Create one to get started.
        </div>
      );
    }
    return (
      <div className="space-y-0.5 px-1">
        {sorted.map((node) => (
          <FileTreeNode
            key={node.path}
            node={node}
            depth={0}
            activePath={activePath}
            onContextMenu={openContextMenu}
            onNavigate={handleNavigate}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* "New file" action — more prominent call-to-action */}
      <div className="mb-2 flex items-center px-2">
        <button
          type="button"
          title="New file or folder at vault root"
          aria-label="New file or folder at vault root"
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-neutral-300 py-1.5 text-xs font-medium text-neutral-500 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-neutral-700 dark:text-neutral-500 dark:hover:border-indigo-600 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400"
          onClick={() => openNewFileModal("")}
        >
          <IconPlus className="h-3.5 w-3.5" />
          <span>New file</span>
        </button>
      </div>

      <div className="mb-2 flex items-center px-2">
        <button
          type="button"
          title="Upload a .md file to the vault"
          aria-label="Upload a .md file to the vault"
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-neutral-300 py-1.5 text-xs font-medium text-neutral-500 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-neutral-700 dark:text-neutral-500 dark:hover:border-indigo-600 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400"
          onClick={() => setUploadModalOpen(true)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-3.5 w-3.5"
            aria-hidden="true"
          >
            <path d="M9.25 13.25a.75.75 0 0 0 1.5 0V4.636l2.955 3.129a.75.75 0 0 0 1.09-1.03l-4.25-4.5a.75.75 0 0 0-1.09 0l-4.25 4.5a.75.75 0 1 0 1.09 1.03L9.25 4.636v8.614Z" />
            <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
          </svg>
          <span>Upload file</span>
        </button>
      </div>

      {/* File tree body */}
      {renderTreeBody()}

      {/* Context menu */}
      {contextMenu !== null && (
        <ContextMenu
          node={contextMenu.node}
          x={contextMenu.x}
          y={contextMenu.y}
          onNewFile={() => openNewFileModal(contextMenu.node.path, "file")}
          onNewFolder={() => openNewFileModal(contextMenu.node.path, "folder")}
          onRename={() => openRenameModal(contextMenu.node)}
          onDelete={() => openConfirmDelete(contextMenu.node)}
          onClose={closeContextMenu}
        />
      )}

      {/* New file/folder modal */}
      {modal.kind === "newFile" && (
        <NewFileModal
          parentPath={modal.parentPath}
          initialType={modal.initialType}
          onSuccess={handleNewFileSuccess}
          onCancel={closeModal}
        />
      )}

      {/* Rename modal */}
      {modal.kind === "rename" && (
        <RenameModal
          currentPath={modal.node.path}
          currentName={modal.node.name}
          itemType={modal.node.type}
          onSuccess={handleRenameSuccess}
          onCancel={closeModal}
        />
      )}

      {/* Confirm delete dialog */}
      {modal.kind === "confirmDelete" && (
        <ConfirmDialog
          title={`Delete ${modal.node.type === "folder" ? "Folder" : "File"}`}
          message={`Are you sure you want to delete "${modal.node.name}"?${
            modal.node.type === "folder"
              ? " This will also delete all files inside it."
              : ""
          }`}
          confirmLabel="Delete"
          isLoading={isDeleting}
          error={deleteError}
          onConfirm={() => void handleDelete()}
          onCancel={closeModal}
        />
      )}

      {uploadModalOpen && (
        <UploadFileModal
          tree={tree}
          onSuccess={handleUploadSuccess}
          onCancel={() => setUploadModalOpen(false)}
        />
      )}
    </>
  );
}
