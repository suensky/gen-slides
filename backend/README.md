# Backend (Python + uv)

This backend is managed with `uv`, with the virtual environment located at `backend/.venv`.

## Setup

From the repo root:

```bash
uv python install 3.14
uv --project backend sync
```

## Run

From the repo root:

```bash
uv --project backend run backend/server.py
```

## Environment variables

Create `backend/.env` (or set shell env vars) with:

```bash
GEMINI_API_KEY=...
```

## Add dependencies

Runtime dependency:

```bash
uv --project backend add <package>
```

Dev dependency:

```bash
uv --project backend add --group dev <package>
```
