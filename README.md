# Corex

Corex is a full-stack, self-hosted note-taking web application built around a fast API, a clean single-page interface, and a simple Docker-first development workflow. It combines JWT authentication, personal notes, tags, pinned and archived views, search, responsive layouts, and a polished Markdown editor.

![Corex stack](https://img.shields.io/badge/FastAPI-backend-009688?style=for-the-badge&logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis)
![Vite](https://img.shields.io/badge/Vite-frontend-646CFF?style=for-the-badge&logo=vite)
[![Docker Compose Up](https://github.com/fxrebxrn/Corex/actions/workflows/docker.yml/badge.svg)](https://github.com/fxrebxrn/Corex/actions/workflows/docker.yml)
[![CodeFactor](https://www.codefactor.io/repository/github/fxrebxrn/corex/badge)](https://www.codefactor.io/repository/github/fxrebxrn/corex)

## Table of contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [How Corex works](#how-corex-works)
- [API overview](#api-overview)
- [Data model](#data-model)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Development workflow](#development-workflow)
- [Testing](#testing)
- [Deployment notes](#deployment-notes)

## Overview

Corex is organized as two independently built applications plus supporting infrastructure:

- **Backend**: an asynchronous FastAPI service that exposes REST endpoints under `/api`, uses SQLAlchemy async sessions, validates data with Pydantic, persists data in PostgreSQL, and uses Redis for token blacklisting and login-rate-limit state.
- **Frontend**: a Vite-powered vanilla JavaScript SPA that renders landing, authentication, and application screens from a single `index.html` file and talks to the backend through a small API client module.
- **Infrastructure**: Docker Compose starts the backend, frontend, PostgreSQL, and Redis together for local development.

The product experience is centered on fast personal note capture: create a note, edit Markdown content with autosave, organize it with tags, pin important notes, archive old ones, and search by text.

## Features

### Product features

- **Landing page and SPA routing** for `/`, `/auth`, and `/app`.
- **User registration and login** with access and refresh tokens.
- **Automatic token refresh** on expired API requests.
- **Logout with token invalidation** through Redis-backed blacklisting.
- **Profile management** for display name, username, and email.
- **Note creation and autosave finalization** for title and content updates.
- **Markdown editing** powered by CodeMirror modules loaded from ESM CDN.
- **Pinned notes** with explicit reorder support.
- **Archived notes** for removing notes from the main active flow without deleting them.
- **Tags** with create, update, delete, sidebar rendering, and note/tag synchronization.
- **Text search** across note title and content.
- **Cursor pagination** for scalable note lists.
- **Responsive/mobile behavior** with a dedicated editor pane flow on small screens.
- **Toast notifications, modals, skeleton states, and contextual menus** for a richer UI.

### Engineering features

- Async FastAPI backend with dependency-injected database sessions.
- Repository/service/router layering to separate persistence, business logic, and HTTP concerns.
- Alembic migrations that run automatically when the backend container starts.
- Pydantic schemas for request/response validation.
- Centralized application exceptions and JSON error handling.
- Docker Compose health checks for PostgreSQL and Redis.
- Async pytest suite using in-memory SQLite and dependency overrides.

## Architecture

### Backend layering

The backend follows a pragmatic layered architecture:

1. **Routers** define HTTP endpoints and dependencies.
2. **Services** implement business rules such as ownership checks, note finalization, pinning, archiving, tag limits, and authentication flows.
3. **Repositories** encapsulate SQLAlchemy queries.
4. **Models** define database tables and relationships.
5. **Schemas** define validated API contracts.
6. **Core/config utilities** handle database sessions, security, Redis, exceptions, and application settings.

### Frontend layering

The frontend is a modular vanilla JavaScript SPA:

- `app.js` initializes routing, editor behavior, landing interactions, mobile behavior, and shared UI state.
- `router.js` handles route selection and authentication redirects.
- `api.js` centralizes backend calls, token attachment, automatic refresh, and session cleanup.
- `notes.js`, `editor.js`, and `tags.js` own the main note-taking workflows.
- `markdown_editor.js` builds the CodeMirror editor and Markdown decorations.
- CSS files are split by concern: app layout, auth, landing, editor, modals, loading states, and responsive rules.

## Tech stack

### Backend

- Python 3.13
- FastAPI
- SQLAlchemy 2 async ORM
- Alembic migrations
- Pydantic v2 and pydantic-settings
- PostgreSQL via `asyncpg`
- Redis async client
- JWT tokens via `python-jose`
- bcrypt password hashing
- pytest, pytest-asyncio, HTTPX, and SQLite for tests

### Frontend

- Vite
- Vanilla JavaScript ES modules
- HTML and CSS
- CodeMirror 6 modules via `esm.sh`
- Browser `localStorage` for tokens and small UI preferences

### Infrastructure

- Docker Compose
- PostgreSQL 16 Alpine
- Redis 7
- Separate backend and frontend containers

## Project structure

```text
Corex/
├── backend/
│   ├── alembic/                 # Database migrations
│   ├── app/
│   │   ├── config/              # Pydantic settings
│   │   ├── core/                # Database, security, Redis, exceptions
│   │   ├── models/              # SQLAlchemy models
│   │   ├── repositories/        # Query layer
│   │   ├── routers/             # FastAPI route modules
│   │   ├── schemas/             # Pydantic API schemas
│   │   ├── services/            # Business logic
│   │   ├── tests/               # Async API tests
│   │   └── utils/               # Query and rate-limit helpers
│   ├── Dockerfile
│   ├── docker-entrypoint.sh     # Runs Alembic then starts Uvicorn
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── css/                 # UI styling by page/feature
│   │   ├── js/                  # SPA modules
│   │   └── index.html           # App shell
│   ├── Dockerfile.dev
│   ├── package.json
│   └── vite.config.js
└── docker-compose.yml           # Backend, frontend, PostgreSQL, Redis
```

## How Corex works

### Authentication flow

1. A user registers or logs in through `/api/auth/register` or `/api/auth/login`.
2. The backend validates credentials, hashes/verifies passwords, and issues an access token plus a refresh token.
3. The frontend stores both tokens in `localStorage`.
4. API requests attach the access token as a Bearer token.
5. If a request returns `401`, the frontend attempts `/api/auth/refresh` once and retries with the new token.
6. Logout blacklists both access and refresh tokens in Redis until they expire.

### Notes flow

1. The frontend creates an empty note through `POST /api/notes/`.
2. The notes list is reloaded and the note can be opened in the editor.
3. Title/content changes are debounced and saved through `PUT /api/notes/{note_id}/finalize`.
4. If a note is finalized with no title and no content, the backend removes the empty note.
5. Notes can be pinned, archived, tagged, searched, paginated, or deleted.

### Tags flow

1. Users create tags through `POST /api/tags/`.
2. The backend enforces per-user uniqueness and a configurable maximum tag count.
3. Notes and tags are connected through the `note_tags` association table.
4. The frontend can synchronize a note's complete tag set with `PUT /api/notes/me/{note_id}/tags`.

### Pagination and search

Note list endpoints return a paginated response with:

- `items`: note summaries
- `limit`: requested page size
- `next_cursor`: `{ updated_at, id }` for the next page
- `has_more`: whether another page is available

The cursor uses `updated_at` plus `id` to keep ordering stable when notes share similar timestamps.

## API overview

All application endpoints are mounted under `/api`.

### Auth

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Register a user and return tokens |
| `POST` | `/api/auth/login` | Login with OAuth2 form credentials |
| `POST` | `/api/auth/refresh` | Rotate refresh token and issue new tokens |
| `GET` | `/api/auth/check` | Validate current access token |
| `POST` | `/api/auth/logout` | Blacklist access and refresh tokens |

### Users

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/users/me` | Get current profile and note counts |
| `GET` | `/api/users/check/{username}` | Check username availability |
| `GET` | `/api/users/{username}/notes` | List public-facing note summaries for a user |
| `PATCH` | `/api/users/me/email` | Update current user's email |
| `PUT` | `/api/users/me` | Update current user's name and username |

### Notes

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/notes/` | Create an empty note |
| `GET` | `/api/notes/me` | List current user's active notes |
| `GET` | `/api/notes/me/tag/{tag_id}` | List current user's notes by tag |
| `GET` | `/api/notes/me/pinned` | List pinned notes |
| `GET` | `/api/notes/me/archived` | List archived notes |
| `GET` | `/api/notes/me/search?query=...` | Search notes |
| `GET` | `/api/notes/me/{note_id}` | Get one owned note |
| `GET` | `/api/notes/public/{note_id}` | Get one public note |
| `PATCH` | `/api/notes/{note_id}/pin` | Toggle pinned state |
| `PATCH` | `/api/notes/{note_id}/archive` | Toggle archived state |
| `PUT` | `/api/notes/me/pinned/reorder` | Reorder pinned notes |
| `PUT` | `/api/notes/{note_id}/finalize` | Save title/content |
| `PUT` | `/api/notes/me/{note_id}/tags` | Replace a note's tag set |
| `DELETE` | `/api/notes/me/{note_id}` | Delete a note |

### Tags

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/tags/` | Create a tag |
| `GET` | `/api/tags/me` | List current user's tags |
| `PUT` | `/api/tags/{tag_id}` | Rename a tag |
| `DELETE` | `/api/tags/{tag_id}` | Delete a tag |

Interactive OpenAPI documentation is available at `http://localhost:8000/docs` when the backend is running.

## Data model

```text
users
├── id
├── email                  unique
├── username               unique
├── name
├── hashed_password
├── is_active
├── created_at
└── updated_at

notes
├── id
├── user_id                FK users.id, cascade delete
├── title
├── content
├── is_pinned
├── is_archived
├── is_public
├── pinned_position
├── created_at
└── updated_at

tags
├── id
├── user_id                FK users.id, cascade delete
├── name
├── created_at
└── updated_at

note_tags
├── note_id                FK notes.id, cascade delete
└── tag_id                 FK tags.id, cascade delete
```

Relationships:

- A user owns many notes.
- A user owns many tags.
- Notes and tags have a many-to-many relationship through `note_tags`.

## Getting started

### Prerequisites

- Docker and Docker Compose
- Git

For non-Docker development, install:

- Python 3.13+
- Node.js 22+
- PostgreSQL 16+
- Redis 7+

### Run with Docker Compose

```bash
git clone <your-repository-url>
cd Corex
docker compose up --build
```

The services will be available at:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- OpenAPI docs: `http://localhost:8000/docs`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

The backend entrypoint automatically applies Alembic migrations before starting Uvicorn.

### Stop the stack

```bash
docker compose down
```

To remove local database and Redis volumes as well:

```bash
docker compose down -v
```

## Configuration

Docker Compose reads environment variables from:

- `backend/docker.env`
- `frontend/docker.env`

### Backend variables

| Variable | Description | Example |
| --- | --- | --- |
| `SECRET_KEY` | JWT signing secret. Change this outside local development. | `CHANGE_ME` |
| `ALGORITHM` | JWT algorithm. | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifetime. | `30` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token lifetime. | `7` |
| `MAX_TAGS_COUNT` | Maximum tags per user. | `30` |
| `DATABASE_URL` | Async SQLAlchemy database URL. | `postgresql+asyncpg://...` |
| `DEBUG` | SQLAlchemy echo/debug flag. | `True` |
| `REDIS_HOST` | Redis hostname. | `redis` |
| `REDIS_PORT` | Redis port. | `6379` |

### Frontend variables

| Variable | Description | Example |
| --- | --- | --- |
| `VITE_API_URL` | Base API URL used by the frontend. | `http://localhost:8000/api` |

If `VITE_API_URL` is not set, the frontend falls back to `http://<current-hostname>:8000/api`.

## Development workflow

### Backend locally

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Make sure `DATABASE_URL`, Redis settings, and JWT settings are available through `backend/.env` or your shell environment.

### Frontend locally

```bash
cd frontend
npm ci
npm run dev -- --host
```

### Database migrations

Create a new migration after model changes:

```bash
cd backend
alembic revision --autogenerate -m "describe your change"
alembic upgrade head
```

## Testing

Run the backend test suite from the backend directory:

```bash
cd backend/app
pytest
```

The tests use an in-memory SQLite database and override Redis-dependent behavior, so they are fast and do not require the Docker database or Redis services.

You can also run the frontend production build:

```bash
cd frontend
npm run build
```

## Deployment notes

Before deploying Corex, review these production concerns:

- Replace `SECRET_KEY=CHANGE_ME` with a strong secret.
- Restrict CORS origins instead of allowing all origins.
- Set `DEBUG=False`.
- Use managed or persistent PostgreSQL and Redis instances.
- Serve the frontend as static files behind a production web server or CDN.
- Use HTTPS so tokens are never sent over plaintext connections.
- Consider moving frontend authentication storage from `localStorage` to a more hardened cookie-based strategy if your threat model requires it.

## AI-Helps in work

Since this is a pet project I’m using for learning, I used AI sparingly — only to handle routine tasks that would have otherwise taken hours of tedious work, but which AI could complete in mere minutes.

- Tests
- Idea generation
- Markdown syntax highlighting (colors)
- Task planning
