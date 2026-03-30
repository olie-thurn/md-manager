"use client";

import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  isLoading?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/** A simple accessible confirmation dialog with focus trap and keyboard support. */
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "Delete",
  isLoading = false,
  error = null,
  onConfirm,
  onCancel,
}: ConfirmDialogProps): React.JSX.Element {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus the cancel button when the dialog opens
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === "Escape") {
        onCancel();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-5 shadow-lg">
        <h2
          id="confirm-dialog-title"
          className="text-sm font-semibold text-neutral-800"
        >
          {title}
        </h2>
        <p className="mt-2 text-sm text-neutral-600">{message}</p>

        {error && (
          <p className="mt-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
            {error}
          </p>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            className="rounded px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
            disabled={isLoading}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            disabled={isLoading}
            onClick={onConfirm}
          >
            {isLoading ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
