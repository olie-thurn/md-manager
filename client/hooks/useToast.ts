"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  isClosing: boolean;
}

interface ToastContextValue {
  toasts: ToastItem[];
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  dismiss: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export const ToastContext = createContext<ToastContextValue | null>(null);

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/** Returns toast trigger functions. Must be used inside ToastProvider. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (ctx === null) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider state hook (used internally by ToastProvider component)
// ---------------------------------------------------------------------------

const MAX_TOASTS = 5;
const AUTO_DISMISS_MS = 4000;
const EXIT_ANIMATION_MS = 180;

/** Returns the state and actions needed to power the ToastProvider. */
export function useToastState(): ToastContextValue {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string): void => {
    setToasts((prev) =>
      prev.map((toast) =>
        toast.id === id ? { ...toast, isClosing: true } : toast
      )
    );

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, EXIT_ANIMATION_MS);
  }, []);

  const add = useCallback(
    (message: string, type: ToastType): void => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => {
        const next = [{ id, message, type, isClosing: false }, ...prev];
        // Cap at MAX_TOASTS — discard oldest (end of array)
        return next.slice(0, MAX_TOASTS);
      });

      setTimeout(() => {
        dismiss(id);
      }, AUTO_DISMISS_MS);
    },
    [dismiss]
  );

  const success = useCallback(
    (message: string) => add(message, "success"),
    [add]
  );
  const error = useCallback(
    (message: string) => add(message, "error"),
    [add]
  );
  const info = useCallback(
    (message: string) => add(message, "info"),
    [add]
  );

  return { toasts, success, error, info, dismiss };
}
