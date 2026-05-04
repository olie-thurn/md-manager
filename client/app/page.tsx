"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSidebar } from "@/lib/sidebarContext";

const LAST_OPENED_KEY = "md-manager:lastOpenedFile";

export default function Home(): React.JSX.Element {
  const router = useRouter();
  const { openSidebar } = useSidebar();

  useEffect(() => {
    const lastPath =
      typeof window !== "undefined"
        ? localStorage.getItem(LAST_OPENED_KEY)
        : null;

    if (lastPath) {
      // Encode each path segment individually
      const encodedPath = lastPath
        .split("/")
        .map(encodeURIComponent)
        .join("/");
      router.replace(`/editor/${encodedPath}`);
    }
  }, [router]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Top bar — mirrors the editor page header so mobile has a hamburger */}
      <div className="flex items-center border-b border-neutral-200 bg-white px-4 py-2 dark:border-neutral-700 dark:bg-neutral-900 md:hidden">
        <button
          type="button"
          aria-label="Open sidebar"
          onClick={openSidebar}
          className="rounded p-1 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
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
      </div>

      {/* Empty state */}
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 text-3xl">
          📝
        </div>
        <div>
          <h2 className="text-base font-semibold text-neutral-800">
            No file open
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Select a file from the sidebar to start editing.
          </p>
        </div>
        <p className="text-xs text-neutral-400">
          Your vault files are listed on the left.
        </p>
      </div>
    </div>
  );
}
