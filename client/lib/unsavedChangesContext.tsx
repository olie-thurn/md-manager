"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PendingNavigation {
  /** The URL to navigate to once the user resolves the dialog. */
  href: string;
  /** Called when the user chooses to proceed (save-and-continue or discard). */
  onProceed: () => void;
}

interface UnsavedChangesContextValue {
  /** Whether the editor currently has unsaved changes. */
  isDirty: boolean;
  /** Register or clear the dirty state from the editor. */
  setIsDirty: (dirty: boolean) => void;
  /**
   * Request navigation to `href`. If there are unsaved changes the
   * dialog will be shown; otherwise the callback runs immediately.
   */
  requestNavigation: (href: string, navigate: () => void) => void;
  /** The pending navigation waiting for user confirmation, or null. */
  pendingNavigation: PendingNavigation | null;
  /** Called by the dialog when the user dismisses it (Cancel). */
  cancelNavigation: () => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(
  null
);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function UnsavedChangesProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [isDirty, setIsDirtyState] = useState<boolean>(false);
  const [pendingNavigation, setPendingNavigation] =
    useState<PendingNavigation | null>(null);

  // Keep a stable ref so requestNavigation can read the latest isDirty
  // without being re-created every render.
  const isDirtyRef = useRef<boolean>(false);

  const setIsDirty = useCallback((dirty: boolean): void => {
    isDirtyRef.current = dirty;
    setIsDirtyState(dirty);
  }, []);

  const requestNavigation = useCallback(
    (href: string, navigate: () => void): void => {
      if (!isDirtyRef.current) {
        navigate();
        return;
      }
      setPendingNavigation({ href, onProceed: navigate });
    },
    []
  );

  const cancelNavigation = useCallback((): void => {
    setPendingNavigation(null);
  }, []);

  return (
    <UnsavedChangesContext.Provider
      value={{
        isDirty,
        setIsDirty,
        requestNavigation,
        pendingNavigation,
        cancelNavigation,
      }}
    >
      {children}
    </UnsavedChangesContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useUnsavedChanges(): UnsavedChangesContextValue {
  const ctx = useContext(UnsavedChangesContext);
  if (ctx === null) {
    throw new Error(
      "useUnsavedChanges must be used inside UnsavedChangesProvider"
    );
  }
  return ctx;
}
