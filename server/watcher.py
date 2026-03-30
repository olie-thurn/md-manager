"""Filesystem watcher for the MD Manager vault.

Monitors the vault directory for changes and keeps the in-memory search index
in sync.  Runs in a daemon background thread so it does not prevent app
shutdown.

Only .md files are processed; changes to other file types are silently ignored.
"""
import logging
import threading
from pathlib import Path

from watchfiles import Change, watch

import index

logger = logging.getLogger(__name__)


def _is_markdown(path: str) -> bool:
    """Return True if the path points to a .md file that is not hidden."""
    p = Path(path)
    # Ignore hidden files (starting with .)
    if p.name.startswith("."):
        return False
    return p.suffix == ".md"


def _watch_loop(vault_path: str) -> None:
    """Inner loop: watch the vault and dispatch index updates.

    Runs indefinitely until the process exits (daemon thread).  All exceptions
    are caught and logged so the watcher never crashes the app.
    """
    vault = Path(vault_path)
    logger.info("File watcher started for vault: %s", vault)

    try:
        for changes in watch(vault_path, stop_event=threading.Event()):
            for change_type, path in changes:
                if not _is_markdown(path):
                    continue

                try:
                    if change_type in (Change.added, Change.modified):
                        logger.debug("Index update: %s (%s)", path, change_type.name)
                        index.update(vault_path, path)
                    elif change_type == Change.deleted:
                        # Compute the relative path key used by the index.
                        try:
                            rel_key = str(Path(path).relative_to(vault))
                        except ValueError:
                            rel_key = path
                        logger.debug("Index remove: %s", rel_key)
                        index.remove(rel_key)
                except Exception:
                    logger.exception("Error processing change for %s", path)

    except Exception:
        logger.exception(
            "File watcher encountered a fatal error and has stopped. "
            "The search index will no longer update automatically."
        )


def start_watcher(vault_path: str) -> threading.Thread:
    """Start the background file watcher thread.

    The thread is a daemon thread so it is automatically terminated when the
    main process exits.  This function returns immediately after spawning the
    thread.

    Args:
        vault_path: Absolute or relative path to the vault root directory.

    Returns:
        The started daemon thread (for testing/introspection).
    """
    thread = threading.Thread(
        target=_watch_loop,
        args=(vault_path,),
        name="vault-watcher",
        daemon=True,
    )
    thread.start()
    return thread
