# alldata

Knowledge graph learning platform for statistics and data science.

## Quick Start (Windows PowerShell 5.1)

### 1) Install backend dependencies

```powershell
Set-Location "A:\Projects\alldata\alldata"
python -m pip install -e ".[dev]"
```

### 2) (Optional) Start Postgres + Redis

By default, local development now uses:

- `DATABASE_URL=sqlite+aiosqlite:///./alldata.db`

You only need Postgres/Redis if you want infrastructure parity with Docker services:

- Docker Desktop + Compose v2: `docker compose up -d db redis`
- Local services: run PostgreSQL and Redis yourself, then set env vars

### 3) Seed data

```powershell
Set-Location "A:\Projects\alldata\alldata"
python -m seed.import_seed
```

### 4) Run backend

```powershell
Set-Location "A:\Projects\alldata\alldata"
uvicorn backend.main:app --reload
```

Health check:

```powershell
Invoke-RestMethod "http://127.0.0.1:8000/api/health"
```

### 5) Run frontend

PowerShell 5.1 does not support `&&`, so run commands on separate lines:

```powershell
Set-Location "A:\Projects\alldata\alldata\frontend"
npm install
npm run dev
```

## Optional: use environment variables

Copy `.env.example` to `.env` and adjust values if needed.

## Quick diagnostics

Run the helper script to check tools, DB/Redis ports, and optionally seed/health:

```powershell
Set-Location "A:\Projects\alldata\alldata"
powershell -ExecutionPolicy Bypass -File ".\scripts\dev-check.ps1"
```

Optional flags:

```powershell
powershell -ExecutionPolicy Bypass -File ".\scripts\dev-check.ps1" -Seed
powershell -ExecutionPolicy Bypass -File ".\scripts\dev-check.ps1" -Health
```

## Troubleshooting

- `docker-compose` command not found:
  - Use `docker compose` (space) if Docker Desktop is installed.
  - If `docker` is also missing, install Docker Desktop and reopen terminal.
- `ConnectionRefusedError` during `python -m seed.import_seed`:
  - This usually means `DATABASE_URL` points to Postgres but Postgres is not running.
  - Remove/adjust `DATABASE_URL`, or start your Postgres service.
- Frontend command fails with `&&` parse error:
  - Use separate lines or `;` in PowerShell 5.1.



# RUN

You’re asking for the exact commands to run now; I’ll give you the corrected sequence for your current Windows PowerShell setup.

- [x] Use PowerShell 5.1-safe commands (no `&&`)
- [x] Skip Docker requirement for default local setup
- [x] Start backend and frontend with working commands

Run this instead:

```powershell
# Backend
Set-Location "A:\Projects\alldata\alldata"
python -m pip install -e ".[dev]"
python -m seed.import_seed
uvicorn backend.main:app --reload
```

Open a second PowerShell window for frontend:

```powershell
Set-Location "A:\Projects\alldata\alldata\frontend"
npm install
npm run dev
```

Do **not** run these in your current environment:
- `docker-compose up ...` (you don’t have Docker installed)
- `cd frontend && ...` (PowerShell 5.1 doesn’t support `&&`)

If later you install Docker Desktop, use:

```powershell
docker compose up -d db redis
```

(Notice: `docker compose`, not `docker-compose`.)



------

# Backend
Set-Location "A:\Projects\alldata\alldata"
python -m pip install -e ".[dev]"
python -m seed.import_seed
uvicorn backend.main:app --reload

------

Set-Location "A:\Projects\alldata\alldata\frontend"
npm install
npm run dev
