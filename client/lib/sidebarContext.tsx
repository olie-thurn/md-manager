"use client";

import { createContext, useContext } from "react";

interface SidebarContextValue {
  openSidebar: () => void;
}

export const SidebarContext = createContext<SidebarContextValue>({
  openSidebar: () => {},
});

export function useSidebar(): SidebarContextValue {
  return useContext(SidebarContext);
}
