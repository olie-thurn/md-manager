"""MD Manager — FastAPI entry point."""
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import index
from routes.files import router as files_router
from routes.search import router as search_router
from watcher import start_watcher


def get_vault_path() -> Path:
    """Return the vault directory path from the VAULT_PATH env var."""
    return Path(os.environ.get("VAULT_PATH", "./vault"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: ensure vault exists, build search index, and start watcher."""
    vault = get_vault_path()
    vault.mkdir(parents=True, exist_ok=True)
    index.build(str(vault))
    start_watcher(str(vault))
    yield


app = FastAPI(title="MD Manager", lifespan=lifespan)

_allowed_origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(files_router, prefix="/files")
app.include_router(search_router, prefix="/search")


@app.get("/health")
async def health() -> dict[str, str]:
    """Health check endpoint for container readiness probes."""
    return {"status": "ok"}
