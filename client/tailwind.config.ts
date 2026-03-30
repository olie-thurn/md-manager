import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      spacing: {
        70: "17.5rem", // sidebar width ~280px
      },
      typography: {
        DEFAULT: {
          css: {
            // Remove default backtick quotes around inline code
            "code::before": { content: '""' },
            "code::after": { content: '""' },
            // Inline code: light background, slight padding
            code: {
              backgroundColor: "#f3f4f6",
              borderRadius: "0.25rem",
              paddingTop: "0.125rem",
              paddingBottom: "0.125rem",
              paddingLeft: "0.25rem",
              paddingRight: "0.25rem",
              fontWeight: "400",
            },
            // Code blocks: distinct background and border
            pre: {
              backgroundColor: "#f3f4f6",
              borderRadius: "0.375rem",
              border: "1px solid #e5e7eb",
            },
            "pre code": {
              backgroundColor: "transparent",
              padding: "0",
              borderRadius: "0",
            },
            // Blockquotes: left border, muted colour
            blockquote: {
              borderLeftColor: "#9ca3af",
              color: "#6b7280",
            },
            // Tables: visible borders
            table: {
              borderCollapse: "collapse",
            },
            "td, th": {
              border: "1px solid #e5e7eb",
            },
            "tbody tr:nth-child(even)": {
              backgroundColor: "#f9fafb",
            },
          },
        },
        invert: {
          css: {
            // Inline code: dark background in dark mode
            code: {
              backgroundColor: "#2d2d2d",
            },
            // Code blocks: dark background in dark mode
            pre: {
              backgroundColor: "#161b22",
              border: "1px solid #30363d",
            },
            // Blockquotes: dimmer in dark mode
            blockquote: {
              borderLeftColor: "#6b7280",
              color: "#9ca3af",
            },
            // Tables: dark borders and row backgrounds in dark mode
            "td, th": {
              border: "1px solid #404040",
            },
            "tbody tr:nth-child(even)": {
              backgroundColor: "#262626",
            },
          },
        },
      },
    },
  },
  plugins: [typography],
};
export default config;
