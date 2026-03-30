"use client";

import { useEffect, useRef } from "react";
import type { FileNode } from "../lib/types";

interface ContextMenuProps {
  node: FileNode;
  x: number;
  y: number;
  onNewFile: () => void;
  onNewFolder: () => void;
  onRename: () => void;
  onDelete: () => void;
  onClose: () => void;
}

/** A positioned right-click context menu for a file tree node. */
export default function ContextMenu({
  node,
  x,
  y,
  onNewFile,
  onNewFolder,
  onRename,
  onDelete,
  onClose,
}: ContextMenuProps): React.JSX.Element {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside or Escape
  useEffect(() => {
    function handleClick(e: MouseEvent): void {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === "Escape") onClose();
    }
    // Use capture phase so we catch the event before it bubbles
    document.addEventListener("mousedown", handleClick, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Adjust position so menu stays within viewport
  const menuStyle: React.CSSProperties = {
    position: "fixed",
    top: y,
    left: x,
    zIndex: 60,
  };

  function MenuItem({
    label,
    onClick,
    danger = false,
  }: {
    label: string;
    onClick: () => void;
    danger?: boolean;
  }): React.JSX.Element {
    return (
      <button
        type="button"
        className={`w-full px-3 py-1.5 text-left text-xs hover:bg-neutral-100 ${
          danger ? "text-red-600 hover:bg-red-50" : "text-neutral-700"
        }`}
        onClick={() => {
          onClick();
          onClose();
        }}
      >
        {label}
      </button>
    );
  }

  return (
    <div
      ref={menuRef}
      style={menuStyle}
      className="min-w-36 rounded border border-neutral-200 bg-white py-1 shadow-lg"
      role="menu"
      aria-label={`Actions for ${node.name}`}
      onContextMenu={(e) => e.preventDefault()}
    >
      {node.type === "folder" && (
        <>
          <MenuItem label="New File" onClick={onNewFile} />
          <MenuItem label="New Folder" onClick={onNewFolder} />
          <div className="my-1 border-t border-neutral-100" />
        </>
      )}
      <MenuItem label="Rename" onClick={onRename} />
      <MenuItem label="Delete" onClick={onDelete} danger />
    </div>
  );
}
