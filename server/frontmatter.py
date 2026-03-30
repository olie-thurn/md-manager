"""Frontmatter parsing and serialization helpers for Markdown files."""
import sys
import importlib.util

# Load the python-frontmatter library without being shadowed by this module.
# When this file is imported as 'frontmatter', a plain `import frontmatter`
# inside this module would recurse back to itself.  We locate the installed
# package explicitly by finding the first spec whose origin lives outside the
# server/ source directory (i.e. the real site-packages copy).

def _load_fm_library():
    """Return the python-frontmatter library module, bypassing name shadowing.

    The installed python-frontmatter package lives in site-packages/frontmatter/
    (a package directory).  This file (server/frontmatter.py) shadows it when
    server/ is on sys.path.  We temporarily remove entries that contain this
    file from sys.path AND temporarily evict ourselves from sys.modules so that
    `import frontmatter` resolves to the real library.
    """
    import os
    this_dir = os.path.dirname(os.path.abspath(__file__))

    # Remove paths that would resolve to this file before the library.
    removed_paths = []
    for entry in list(sys.path):
        if os.path.abspath(entry) == this_dir:
            sys.path.remove(entry)
            removed_paths.append(entry)

    # Temporarily remove ourselves from sys.modules so `import frontmatter`
    # won't find us and will instead find the installed package.
    displaced = sys.modules.pop("frontmatter", None)

    try:
        import frontmatter as _lib  # resolves to site-packages/frontmatter now
        return _lib
    finally:
        # Put ourselves back in sys.modules.
        if displaced is not None:
            sys.modules["frontmatter"] = displaced
        # Restore removed paths at the front so relative imports still work.
        for entry in reversed(removed_paths):
            sys.path.insert(0, entry)


_fm = _load_fm_library()


def parse(content: str) -> tuple[dict, str]:
    """
    Parse a Markdown file and extract YAML frontmatter and body.

    Args:
        content: Raw file content string potentially with YAML frontmatter.

    Returns:
        A tuple of (metadata_dict, body_string).
        - metadata_dict: Extracted YAML frontmatter as a dict, empty dict if no frontmatter
        - body_string: Markdown content without the frontmatter block

    Handles edge cases gracefully:
    - Files with no frontmatter: returns ({}, full_content)
    - Files with empty frontmatter (--- / ---): returns ({}, body)
    - Malformed YAML: returns ({}, full_content) instead of raising
    """
    if not content:
        return {}, ""

    try:
        post = _fm.loads(content)
        metadata = post.metadata
        body = post.content
        return metadata, body
    except Exception:
        # If frontmatter parsing fails, treat as no frontmatter
        return {}, content


def serialize(metadata: dict, body: str) -> str:
    """
    Serialize metadata and body back into a complete file content string.

    Args:
        metadata: Dictionary of metadata to include in YAML frontmatter.
        body: Markdown body content.

    Returns:
        Complete file content with YAML frontmatter block (--- delimited) followed by body.
        If metadata is empty, returns just the body without frontmatter delimiters.
    """
    if not metadata:
        return body

    post = _fm.Post(body, **metadata)
    return _fm.dumps(post)
