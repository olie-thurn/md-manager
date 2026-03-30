/** A node in the file tree — either a file or a folder. */
export interface FileNode {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: FileNode[];
  metadata?: {
    tags?: string[];
    [key: string]: unknown;
  };
}

/** Response body for a single file read. */
export interface FileContent {
  path: string;
  content: string;
  metadata: Record<string, unknown>;
}

/** A single search result entry. */
export interface SearchResult {
  path: string;
  name: string;
  snippet: string;
  matchedTags: string[];
}

/** YAML frontmatter fields for a Markdown file. */
export interface FrontmatterMeta {
  tags?: string[];
  title?: string;
  [key: string]: unknown;
}

/** Editor component state. */
export interface EditorState {
  content: string;
  isDirty: boolean;
  isLoading: boolean;
  error: string | null;
}
