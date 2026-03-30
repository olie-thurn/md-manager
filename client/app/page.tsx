"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const LAST_OPENED_KEY = "md-manager:lastOpenedFile";

export default function Home(): React.JSX.Element {
  const router = useRouter();

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
  );
}
