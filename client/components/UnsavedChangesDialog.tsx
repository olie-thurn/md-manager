"use client";

import { useEffect, useRef } from "react";

interface UnsavedChangesDialogProps {
  /** Called when the user chooses "Save and Continue". */
  onSaveAndContinue: () => void;
  /** Called when the user chooses "Discard". */
  onDiscard: () => void;
  /** Called when the user chooses "Cancel". */
  onCancel: () => void;
  /** Whether a save is in progress (disables buttons). */
  isSaving?: boolean;
}

/**
 * Modal dialog shown when the user attempts to navigate away from a dirty
 * editor. Offers three choices: save then navigate, discard and navigate,
 * or stay on the current page.
 */
export default function UnsavedChangesDialog({
  onSaveAndContinue,
  onDiscard,
  onCancel,
  isSaving = false,
}: UnsavedChangesDialogProps): React.JSX.Element {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus cancel button when the dialog opens
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
      aria-labelledby="unsaved-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-5 shadow-lg">
        <h2
          id="unsaved-dialog-title"
          className="text-sm font-semibold text-neutral-800"
        >
          Unsaved Changes
        </h2>
        <p className="mt-2 text-sm text-neutral-600">
          You have unsaved changes. What would you like to do?
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            className="rounded px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
            disabled={isSaving}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            disabled={isSaving}
            onClick={onDiscard}
          >
            Discard
          </button>
          <button
            type="button"
            className="rounded bg-neutral-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
            disabled={isSaving}
            onClick={onSaveAndContinue}
          >
            {isSaving ? "Saving…" : "Save and Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
