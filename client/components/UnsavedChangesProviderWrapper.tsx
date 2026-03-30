"use client";

import { UnsavedChangesProvider } from "@/lib/unsavedChangesContext";

/**
 * Thin client wrapper so the server-component RootLayout can include the
 * UnsavedChangesProvider without itself becoming a client component.
 */
export default function UnsavedChangesProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <UnsavedChangesProvider>{children}</UnsavedChangesProvider>;
}
