# Startup Notes

Use this when setting up a local dev environment on Windows PowerShell 5.1.

## Backend

```powershell
Set-Location "A:\Projects\alldata\alldata"
python -m pip install -e ".[dev]"
```

Start dependencies (Docker path):

```powershell
Set-Location "A:\Projects\alldata\alldata"
docker compose up -d db redis
```

Default local DB is SQLite, so this step is optional unless you want Postgres/Redis.

Seed and run API:

```powershell
Set-Location "A:\Projects\alldata\alldata"
python -m seed.import_seed
uvicorn backend.main:app --reload
```

## Frontend

```powershell
Set-Location "A:\Projects\alldata\alldata\frontend"
npm install
npm run dev
```

## Quick checks

```powershell
Invoke-RestMethod "http://127.0.0.1:8000/api/health"
Test-NetConnection localhost -Port 5432
Test-NetConnection localhost -Port 6379
```

## PowerShell 5.1 gotcha

`&&` is not a valid separator in Windows PowerShell 5.1. Use separate lines or `;`.
