# MD Manager

Self-hosted Markdown file manager for your local network. No subscription, no cloud, no database — just your `.md` files on disk, managed through a clean two-panel web UI.

Built as a lightweight alternative to tools like Obsidian Publish for people who want full control over their notes on their own hardware.

## Features

- Browse, create, edit, rename, move, and delete Markdown files and folders
- Live preview with GitHub Flavored Markdown and syntax-highlighted code blocks
- Full-text search across all files
- Tag filtering via YAML frontmatter (`tags: [foo, bar]`)
- Dark mode
- Mobile-responsive sidebar
- File watcher keeps search index in sync with external edits (e.g. Syncthing, rsync)

## Quick Start (Docker Compose)

```bash
# 1. Clone the repo
git clone https://github.com/your-username/md-server.git
cd md-server

# 2. Copy and configure environment
cp .env.example .env

# 3. Start both containers
docker compose up --build
```

Open `http://localhost:3000` in your browser.

Your Markdown files live in the `vault/` directory (or wherever `VAULT_PATH` points). The vault is mounted into the server container — files are real `.md` files on disk, not stored in any database.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VAULT_PATH` | `./vault` | Host path to your Markdown files directory |
| `SERVER_PORT` | `8000` | Port the FastAPI backend listens on |
| `CLIENT_PORT` | `3000` | Port the Next.js frontend listens on |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated CORS origins for the API |

## Security

**This app has no authentication.** It is designed to run on a trusted local network only.

- Do not expose it to the public internet without adding authentication in front (e.g. via a reverse proxy with basic auth or OAuth).
- All file operations are sandboxed to the vault directory — path traversal attempts are rejected.
- No external services are contacted. All data stays on your machine.

## Architecture

```
client/   — Next.js (TypeScript) frontend: file tree, editor, preview, search
server/   — FastAPI (Python) backend: file API, in-memory search index, file watcher
vault/    — Your .md files (mounted bind volume, not tracked in git)
```

See [`app-idea.md`](app-idea.md) for the full architecture document and build plan.

## Development

See [`CLAUDE.md`](CLAUDE.md) for the complete developer setup guide, including direct (non-Docker) dev instructions for both services.

### Run with Docker (recommended)

```bash
docker compose up --build
```

### Run without Docker

```bash
# Backend
cd server
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
VAULT_PATH=../vault uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Frontend (separate terminal)
cd client
npm install
npm run dev
```

## License

MIT — see [LICENSE](LICENSE).
