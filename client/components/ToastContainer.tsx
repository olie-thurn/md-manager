"use client";

import { ToastContext, useToast, useToastState } from "../hooks/useToast";
import Toast from "./Toast";

// ---------------------------------------------------------------------------
// ToastProvider
// ---------------------------------------------------------------------------

/**
 * Provides the toast context to the subtree and renders the ToastContainer.
 * Wrap the root layout with this component.
 */
export function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const state = useToastState();

  return (
    <ToastContext.Provider value={state}>
      {children}
      <ToastContainerInner />
    </ToastContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// ToastContainerInner (reads from context)
// ---------------------------------------------------------------------------

/** Fixed bottom-right container that renders all active toasts. */
function ToastContainerInner(): React.JSX.Element {
  const { toasts, dismiss } = useToast();

  return (
    <div
      aria-label="Notifications"
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast toast={toast} onDismiss={dismiss} />
        </div>
      ))}
    </div>
  );
}
