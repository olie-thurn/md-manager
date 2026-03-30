import type { Metadata } from "next";
import "./globals.css";
import SidebarShell from "../components/SidebarShell";
import UnsavedChangesProviderWrapper from "../components/UnsavedChangesProviderWrapper";
import { ToastProvider } from "../components/ToastContainer";
import { ThemeProvider } from "../components/ThemeProvider";

export const metadata: Metadata = {
  title: "MD Manager",
  description: "Self-hosted Markdown file manager",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="en">
      <head>
        {/* Anti-flash script: synchronously applies dark class before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('md-manager:theme');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})()`,
          }}
        />
      </head>
      <body className="flex h-screen overflow-hidden bg-neutral-50 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
        <ThemeProvider>
          <ToastProvider>
            <UnsavedChangesProviderWrapper>
              <SidebarShell>
                {children}
              </SidebarShell>
            </UnsavedChangesProviderWrapper>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
