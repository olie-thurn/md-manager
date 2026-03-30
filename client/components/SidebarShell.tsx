"use client";

import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import { SidebarContext } from "../lib/sidebarContext";

/**
 * Client component that owns sidebar open/close state.
 * Kept separate so layout.tsx can remain a server component (metadata export).
 */
export default function SidebarShell({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Lock body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [sidebarOpen]);

  return (
    <SidebarContext.Provider value={{ openSidebar: () => setSidebarOpen(true) }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
    </SidebarContext.Provider>
  );
}
