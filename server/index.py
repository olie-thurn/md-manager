"""In-memory search index for the MD Manager vault.

The index is a module-level dict keyed by relative file path (str).  Each
entry stores the parsed metadata, lowercase content for searching, and the
original content for snippet extraction.

Thread safety: the file watcher runs in a background thread while query()
is called from async FastAPI request handlers.  A threading.Lock guards all
mutations (build, update, remove) so that reads never see a partially
updated index.
"""
import re
import threading
from pathlib import Path
from typing import Any

from frontmatter import parse as parse_frontmatter

# ---------------------------------------------------------------------------
# Index storage
# ---------------------------------------------------------------------------

# {relative_path_str: IndexEntry}
_index: dict[str, dict[str, Any]] = {}
_lock = threading.Lock()

_SNIPPET_CONTEXT = 50  # characters before/after match


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _relative_path(vault_path: str, file_path: str | Path) -> str:
    """Return the relative path string used as an index key."""
    return str(Path(file_path).relative_to(Path(vault_path)))


def _index_file(vault_path: str, file_path: str | Path) -> dict[str, Any] | None:
    """Read and parse a single .md file; return the index entry or None on error."""
    path = Path(file_path)
    try:
        raw_content = path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return None

    metadata, body = parse_frontmatter(raw_content)

    tags: list[str] = []
    raw_tags = metadata.get("tags", [])
    if isinstance(raw_tags, list):
        tags = [str(t) for t in raw_tags]
    elif isinstance(raw_tags, str):
        tags = [raw_tags]

    rel_path = _relative_path(vault_path, file_path)

    return {
        "path": rel_path,
        "name": path.name,
        "raw_content": raw_content,
        "content": body.lower(),  # lowercase body for case-insensitive search
        "tags": tags,
        "metadata": metadata,
    }


def _extract_snippet(raw_content: str, query_lower: str) -> str:
    """Return ~100-char context snippet around the first occurrence of query.

    Searches the raw body (frontmatter stripped) for the query.  Falls back
    to the beginning of the content if not found.
    """
    content_lower = raw_content.lower()
    pos = content_lower.find(query_lower)
    if pos == -1:
        # Query not found in body — return start of raw content
        snippet = raw_content[:_SNIPPET_CONTEXT * 2].strip()
        return snippet + "…" if len(raw_content) > _SNIPPET_CONTEXT * 2 else snippet

    start = max(0, pos - _SNIPPET_CONTEXT)
    end = min(len(raw_content), pos + len(query_lower) + _SNIPPET_CONTEXT)
    snippet = raw_content[start:end].strip()

    prefix = "…" if start > 0 else ""
    suffix = "…" if end < len(raw_content) else ""
    return prefix + snippet + suffix


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def build(vault_path: str) -> None:
    """Walk the entire vault and index every .md file.

    Replaces the existing index contents atomically.

    Args:
        vault_path: Absolute or relative path to the vault root directory.
    """
    new_entries: dict[str, dict[str, Any]] = {}
    vault = Path(vault_path)
    for md_file in vault.rglob("*.md"):
        entry = _index_file(vault_path, md_file)
        if entry is not None:
            new_entries[entry["path"]] = entry

    with _lock:
        _index.clear()
        _index.update(new_entries)


def update(vault_path: str, file_path: str | Path) -> None:
    """Re-index a single file (used by the file watcher on create/modify).

    Args:
        vault_path: Path to the vault root directory.
        file_path: Absolute path to the file that was created or modified.
    """
    entry = _index_file(vault_path, file_path)
    if entry is None:
        return

    with _lock:
        _index[entry["path"]] = entry


def remove(file_path: str | Path) -> None:
    """Remove a file from the index (used by the file watcher on delete).

    Args:
        file_path: The relative path key (as used in the index) OR an
                   absolute path — we attempt both forms.  KeyErrors are
                   silently ignored.
    """
    key = str(file_path)
    with _lock:
        _index.pop(key, None)


def query(
    q: str | None = None,
    tags: list[str] | None = None,
) -> list[dict[str, Any]]:
    """Search the index by full-text query and/or tags.

    Args:
        q: Optional query string.  Case-insensitive substring match against
           file name and body content.
        tags: Optional list of tags.  Only files whose frontmatter tags
              include *all* requested tags are returned (AND logic).

    Returns:
        List of result dicts with keys:
            path        - relative path from vault root
            name        - filename (e.g. "note.md")
            snippet     - ~100-char context around first match (or start of file)
            matchedTags - tags from this file that were in the requested tags list
    """
    q_lower = q.lower().strip() if q else None
    # Normalise tags to lowercase for case-insensitive tag matching
    filter_tags = [t.lower() for t in tags] if tags else None

    results: list[dict[str, Any]] = []

    with _lock:
        entries = list(_index.values())

    for entry in entries:
        # --- tag filter ---
        if filter_tags:
            entry_tags_lower = [t.lower() for t in entry["tags"]]
            if not all(ft in entry_tags_lower for ft in filter_tags):
                continue

        # --- text filter ---
        if q_lower:
            name_match = q_lower in entry["name"].lower()
            content_match = q_lower in entry["content"]  # content is already lowercase
            if not name_match and not content_match:
                continue

        # --- build result ---
        snippet = ""
        if q_lower:
            snippet = _extract_snippet(entry["raw_content"], q_lower)
        else:
            # No text query — snippet is the beginning of the file
            snippet = entry["raw_content"][:_SNIPPET_CONTEXT * 2].strip()
            if len(entry["raw_content"]) > _SNIPPET_CONTEXT * 2:
                snippet += "…"

        matched_tags: list[str] = []
        if filter_tags:
            matched_tags = [
                t for t in entry["tags"]
                if t.lower() in filter_tags
            ]

        results.append(
            {
                "path": entry["path"],
                "name": entry["name"],
                "snippet": snippet,
                "matchedTags": matched_tags,
            }
        )

    return results
