import type { FileContent, FileNode, SearchResult } from "./types";

const API_BASE_URL = "/api";

/** Generic fetch helper — prepends base URL, sets JSON headers, throws on non-2xx. */
async function fetchApi<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    let message: string;
    try {
      const body = (await response.json()) as { detail?: string };
      message = body.detail ?? response.statusText;
    } catch {
      message = response.statusText;
    }
    throw new Error(`HTTP ${response.status}: ${message}`);
  }

  // Some endpoints return 204 No Content
  const contentType = response.headers.get("content-type") ?? "";
  if (response.status === 204 || !contentType.includes("application/json")) {
    return undefined as unknown as T;
  }

  return response.json() as Promise<T>;
}

/** GET /files — Return the vault directory tree. */
export async function getFileTree(): Promise<FileNode[]> {
  return fetchApi<FileNode[]>("/files");
}

/** GET /files/{path} — Return a single file's content and metadata. */
export async function getFile(path: string): Promise<FileContent> {
  return fetchApi<FileContent>(`/files/${encodeURIComponent(path)}`);
}

/** PUT /files/{path} — Overwrite file content. */
export async function saveFile(
  path: string,
  content: string
): Promise<void> {
  await fetchApi<void>(`/files/${encodeURIComponent(path)}`, {
    method: "PUT",
    body: JSON.stringify({ content }),
  });
}

/** POST /files/{path} — Create a new file or folder. */
export async function createFile(
  path: string,
  type: "file" | "folder"
): Promise<void> {
  await fetchApi<void>(`/files/${encodeURIComponent(path)}`, {
    method: "POST",
    body: JSON.stringify({ type }),
  });
}

/** PATCH /files/{path} — Rename a file or folder. Returns the new path. */
export async function renameFile(
  path: string,
  newName: string
): Promise<{ newPath: string }> {
  const result = await fetchApi<{ path: string }>(
    `/files/${encodeURIComponent(path)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ newName }),
    }
  );
  return { newPath: result.path };
}

/** DELETE /files/{path} — Delete a file or folder. */
export async function deleteFile(path: string): Promise<void> {
  await fetchApi<void>(`/files/${encodeURIComponent(path)}`, {
    method: "DELETE",
  });
}

/** POST /files/{path}/move — Move a file or folder to a new location. Returns the new path. */
export async function moveFile(
  path: string,
  destination: string
): Promise<{ newPath: string }> {
  const result = await fetchApi<{ path: string }>(
    `/files/${encodeURIComponent(path)}/move`,
    {
      method: "POST",
      body: JSON.stringify({ destination }),
    }
  );
  return { newPath: result.path };
}

/** GET /search — Full-text + tag search across the vault. */
export async function search(
  query: string,
  tags?: string[]
): Promise<SearchResult[]> {
  const params = new URLSearchParams({ q: query });
  if (tags && tags.length > 0) {
    tags.forEach((tag) => params.append("tags", tag));
  }
  return fetchApi<SearchResult[]>(`/search?${params.toString()}`);
}

/** POST /files/upload — Upload a file via multipart/form-data. */
export async function uploadFile(
  file: File,
  destination: string,
  filename: string
): Promise<{ path: string }> {
  const form = new FormData();
  form.append("file", file);
  form.append("destination", destination);
  form.append("filename", filename);

  const response = await fetch(`${API_BASE_URL}/files/upload`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    let message: string;
    try {
      const body = (await response.json()) as { detail?: string };
      message = body.detail ?? response.statusText;
    } catch {
      message = response.statusText;
    }
    throw new Error(`HTTP ${response.status}: ${message}`);
  }

  return response.json() as Promise<{ path: string }>;
}
