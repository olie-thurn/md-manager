"""Search endpoints — implemented in Phase 3."""
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

import index

router = APIRouter()


class SearchResult(BaseModel):
    """A single search result with path, name, snippet, and matched tags."""

    path: str
    name: str
    snippet: str
    matchedTags: list[str]


@router.get("", response_model=list[SearchResult])
async def search(
    q: Optional[str] = None,
    tags: Optional[str] = None,
    limit: Optional[int] = 50,
) -> list[SearchResult]:
    """
    Search the vault by full-text query and/or tags.

    Query parameters:
    - q: Optional full-text search query (searches file names and content)
    - tags: Optional comma-separated list of tags to filter by (AND logic)
    - limit: Maximum number of results to return (default 50)

    Returns:
        A JSON array of SearchResult objects sorted by relevance.
        If both q and tags are empty/missing, returns all indexed files.
    """
    # Parse tags parameter if provided
    tags_list: list[str] | None = None
    if tags:
        # Split on commas and strip whitespace from each tag
        tags_list = [t.strip() for t in tags.split(",") if t.strip()]

    # Query the index
    results = index.query(q=q, tags=tags_list)

    # Limit results
    if limit and limit > 0:
        results = results[:limit]

    # Convert to SearchResult objects
    return [
        SearchResult(
            path=result["path"],
            name=result["name"],
            snippet=result["snippet"],
            matchedTags=result["matchedTags"],
        )
        for result in results
    ]
