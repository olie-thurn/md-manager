"use client";

import type { ToastItem } from "../hooks/useToast";

interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

const colorMap: Record<ToastItem["type"], string> = {
  success:
    "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300",
  error:
    "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300",
  info: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
};

const iconMap: Record<ToastItem["type"], string> = {
  success: "✓",
  error: "✕",
  info: "ℹ",
};

/** Single toast notification item. */
export default function Toast({
  toast,
  onDismiss,
}: ToastProps): React.JSX.Element {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`flex w-full max-w-xs items-start gap-2 rounded-lg border px-3 py-2.5 shadow-md transition-all duration-200 ${
        toast.isClosing
          ? "translate-x-2 opacity-0"
          : "translate-x-0 opacity-100 animate-toast-in"
      } ${colorMap[toast.type]}`}
    >
      {/* Icon */}
      <span className="mt-0.5 flex-shrink-0 text-xs font-bold" aria-hidden="true">
        {iconMap[toast.type]}
      </span>

      {/* Message */}
      <p className="min-w-0 flex-1 break-words text-xs leading-snug">
        {toast.message}
      </p>

      {/* Close button */}
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => onDismiss(toast.id)}
        className="ml-1 flex-shrink-0 rounded p-0.5 opacity-60 hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-current"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className="h-3 w-3"
          aria-hidden="true"
        >
          <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
        </svg>
      </button>
    </div>
  );
}
