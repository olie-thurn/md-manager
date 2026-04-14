"""File and folder CRUD endpoints — implemented in Phase 2."""
import logging
import os
import shutil
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, Form, HTTPException, UploadFile
from pydantic import BaseModel

logger = logging.getLogger(__name__)

from frontmatter import parse as parse_frontmatter

router = APIRouter()


def get_vault_path() -> Path:
    """Return the vault directory path from the VAULT_PATH env var."""
    return Path(os.environ.get("VAULT_PATH", "./vault"))


class FileMetadata(BaseModel):
    """Metadata extracted from a Markdown file's frontmatter."""

    tags: list[str] = []


class FileNode(BaseModel):
    """A node in the file tree — either a file or a folder."""

    name: str
    path: str
    type: str  # "file" or "folder"
    children: Optional[list["FileNode"]] = None
    metadata: Optional[FileMetadata] = None


FileNode.model_rebuild()


class FileContent(BaseModel):
    """Response body for a single file read."""

    path: str
    content: str
    metadata: dict[str, Any]


class CreateRequest(BaseModel):
    """Request body for creating a file or folder."""

    type: str  # "file" or "folder"


class UpdateRequest(BaseModel):
    """Request body for updating file content."""

    content: str


class RenameRequest(BaseModel):
    """Request body for renaming a file or folder."""

    newName: str


class MoveRequest(BaseModel):
    """Request body for moving a file or folder."""

    destination: str


def _validate_path(rel_path: str, vault_root: Path) -> Path:
    """
    Resolve a relative path against the vault root and validate it stays inside.

    Args:
        rel_path: Path relative to the vault root (from URL parameter).
        vault_root: The resolved vault root directory.

    Returns:
        The resolved absolute Path.

    Raises:
        HTTPException 400 if the path escapes the vault root.
    """
    resolved_vault = vault_root.resolve()
    resolved_target = (vault_root / rel_path).resolve()
    # Check the resolved path starts with the vault root
    try:
        resolved_target.relative_to(resolved_vault)
    except ValueError:
        raise HTTPException(status_code=400, detail="Path traversal detected")
    return resolved_target


def _build_tree(directory: Path, vault_root: Path) -> list[FileNode]:
    """
    Recursively build a file tree for the given directory.

    Args:
        directory: The directory to list.
        vault_root: The vault root used to compute relative paths.

    Returns:
        A sorted list of FileNode objects (folders first, then files, both alphabetically).
        Symlinks, hidden entries (starting with '.'), and non-.md files are excluded.
    """
    folders: list[FileNode] = []
    files: list[FileNode] = []

    try:
        entries = list(directory.iterdir())
    except PermissionError:
        return []

    for entry in sorted(entries, key=lambda e: e.name.lower()):
        # Skip hidden entries
        if entry.name.startswith("."):
            continue

        # Skip symlinks
        if entry.is_symlink():
            continue

        # Compute relative path from vault root (use forward slashes for consistency)
        rel_path = entry.relative_to(vault_root).as_posix()

        if entry.is_dir():
            children = _build_tree(entry, vault_root)
            folders.append(
                FileNode(
                    name=entry.name,
                    path=rel_path,
                    type="folder",
                    children=children,
                )
            )
        elif entry.is_file() and entry.suffix == ".md":
            try:
                content = entry.read_text(encoding="utf-8")
            except (OSError, UnicodeDecodeError):
                content = ""

            metadata_dict, _ = parse_frontmatter(content)
            raw_tags = metadata_dict.get("tags", [])

            # Normalise tags: ensure they're a list of strings
            if isinstance(raw_tags, list):
                tags = [str(t) for t in raw_tags]
            elif raw_tags:
                tags = [str(raw_tags)]
            else:
                tags = []

            files.append(
                FileNode(
                    name=entry.name,
                    path=rel_path,
                    type="file",
                    metadata=FileMetadata(tags=tags),
                )
            )

    return folders + files


@router.get("", response_model=list[FileNode])
async def get_file_tree() -> list[FileNode]:
    """
    Return the complete vault directory as a nested JSON tree.

    Returns a sorted list of FileNode objects representing the vault root's
    contents. Folders are sorted before files; both are sorted alphabetically.
    Only .md files are included; hidden entries and symlinks are excluded.
    """
    vault = get_vault_path()

    if not vault.exists():
        logger.error("Vault directory does not exist: %s", vault)
        raise HTTPException(
            status_code=500,
            detail="Vault is not configured correctly",
        )

    if not vault.is_dir():
        logger.error("Vault path is not a directory: %s", vault)
        raise HTTPException(
            status_code=500,
            detail="Vault is not configured correctly",
        )

    return _build_tree(vault, vault)


@router.post("/upload", status_code=201)
async def upload_file(
    file: UploadFile,
    destination: str = Form(""),
    filename: str = Form(...),
) -> dict[str, str]:
    """
    Upload a Markdown file to the vault, with auto-renaming on conflicts.

    Args:
        file: Uploaded multipart file.
        destination: Optional destination folder path relative to vault root.
        filename: Desired file name, including .md extension.

    Returns:
        Dict containing the created vault-relative path.
    """
    if not filename.endswith(".md"):
        raise HTTPException(status_code=400, detail="Only .md files are supported")

    vault = get_vault_path()
    _validate_path(destination, vault)

    relative_target = filename if destination == "" else (Path(destination) / filename).as_posix()
    target = _validate_path(relative_target, vault)

    if target.exists():
        stem = filename[:-3]
        resolved = False
        for idx in range(1, 1000):
            candidate_name = f"{stem}_{idx}.md"
            candidate_relative = (
                candidate_name if destination == "" else (Path(destination) / candidate_name).as_posix()
            )
            candidate_target = _validate_path(candidate_relative, vault)
            if not candidate_target.exists():
                target = candidate_target
                resolved = True
                break
        if not resolved:
            raise HTTPException(status_code=409, detail="Could not resolve filename conflict")

    content = await file.read()
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(content)

    return {"path": target.relative_to(vault.resolve()).as_posix()}


@router.get("/{path:path}", response_model=FileContent)
async def get_file(path: str) -> FileContent:
    """
    Return the raw content and frontmatter metadata of a single .md file.

    Args:
        path: Path relative to the vault root.

    Returns:
        FileContent with path, content (full raw text), and parsed metadata dict.
    """
    vault = get_vault_path()
    target = _validate_path(path, vault)

    if not target.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {path}")

    if not target.is_file():
        raise HTTPException(status_code=400, detail=f"Path is not a file: {path}")

    try:
        raw = target.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError) as exc:
        logger.error("Could not read file %s: %s", path, exc)
        raise HTTPException(status_code=500, detail="Could not read file") from exc

    metadata_dict, _ = parse_frontmatter(raw)
    return FileContent(
        path=target.relative_to(vault.resolve()).as_posix(),
        content=raw,
        metadata=metadata_dict,
    )


@router.post("/{path:path}/move")
async def move_file_or_folder(path: str, body: MoveRequest) -> dict[str, str]:
    """
    Move a file or folder to a new location within the vault.

    This endpoint must be registered BEFORE POST /{path:path} to prevent
    the greedy path matcher from swallowing the '/move' suffix.

    Args:
        path: Source path relative to the vault root.
        body: MoveRequest with destination path relative to vault root.

    Returns:
        Dict with new path on success.
    """
    vault = get_vault_path()
    source = _validate_path(path, vault)
    destination = _validate_path(body.destination, vault)

    if not source.exists():
        raise HTTPException(status_code=404, detail=f"Source not found: {path}")

    if destination.exists():
        raise HTTPException(status_code=409, detail=f"Destination already exists: {body.destination}")

    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(source), str(destination))
    return {"path": destination.relative_to(vault.resolve()).as_posix()}


@router.post("/{path:path}", status_code=201)
async def create_file_or_folder(path: str, body: CreateRequest) -> dict[str, str]:
    """
    Create a new file or folder at the given path.

    Args:
        path: Path relative to the vault root.
        body: CreateRequest with type "file" or "folder".

    Returns:
        Dict with created path on success.
    """
    vault = get_vault_path()
    target = _validate_path(path, vault)

    if target.exists():
        raise HTTPException(status_code=409, detail=f"Already exists: {path}")

    if body.type == "folder":
        target.mkdir(parents=True, exist_ok=False)
    elif body.type == "file":
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text("", encoding="utf-8")
    else:
        raise HTTPException(status_code=400, detail=f"Invalid type: {body.type!r}. Must be 'file' or 'folder'.")

    return {"path": target.relative_to(vault.resolve()).as_posix()}


@router.put("/{path:path}", response_model=FileContent)
async def update_file(path: str, body: UpdateRequest) -> FileContent:
    """
    Overwrite file content at the given path.

    Args:
        path: Path relative to the vault root.
        body: UpdateRequest with new content string.

    Returns:
        Updated FileContent.
    """
    vault = get_vault_path()
    target = _validate_path(path, vault)

    if not target.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {path}")

    if not target.is_file():
        raise HTTPException(status_code=400, detail=f"Path is not a file: {path}")

    try:
        target.write_text(body.content, encoding="utf-8")
    except OSError as exc:
        logger.error("Could not write file %s: %s", path, exc)
        raise HTTPException(status_code=500, detail="Could not write file") from exc

    metadata_dict, _ = parse_frontmatter(body.content)
    return FileContent(
        path=target.relative_to(vault.resolve()).as_posix(),
        content=body.content,
        metadata=metadata_dict,
    )


@router.patch("/{path:path}")
async def rename_file_or_folder(path: str, body: RenameRequest) -> dict[str, str]:
    """
    Rename a file or folder within its parent directory.

    Args:
        path: Path relative to the vault root.
        body: RenameRequest with the new name (not a full path, just the name).

    Returns:
        Dict with new path on success.
    """
    vault = get_vault_path()
    target = _validate_path(path, vault)

    if not target.exists():
        raise HTTPException(status_code=404, detail=f"Not found: {path}")

    new_target = target.parent / body.newName
    # Validate new target is also inside vault
    _validate_path(new_target.relative_to(vault.resolve()).as_posix(), vault)

    if new_target.exists():
        raise HTTPException(status_code=409, detail=f"Already exists: {body.newName}")

    target.rename(new_target)
    return {"path": new_target.relative_to(vault.resolve()).as_posix()}


@router.delete("/{path:path}")
async def delete_file_or_folder(path: str) -> dict[str, str]:
    """
    Delete a file or folder (folders are deleted recursively).

    Args:
        path: Path relative to the vault root.

    Returns:
        Dict with deleted path on success.
    """
    vault = get_vault_path()
    target = _validate_path(path, vault)

    if not target.exists():
        raise HTTPException(status_code=404, detail=f"Not found: {path}")

    if target.is_dir():
        shutil.rmtree(target)
    else:
        target.unlink()

    return {"path": path}
