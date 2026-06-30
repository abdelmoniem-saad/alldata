# Going live (deployment guide)

The goal: a public URL where anyone can sign in and *run* the simulations. This
doc is the operator playbook, the shape, the steps, the hardening, and how to
scale past the first thousand users.

## The one constraint that drives everything

Running a lesson's code means **spawning a Docker container** (Python now, R when
enabled). That rules out serverless/static hosts (Vercel, Netlify, Cloudflare
Pages, plain Lambda), there's no Docker daemon to call. AllData needs a **real
Linux host with Docker**: a small VM is the natural fit.

Everything else is conventional: a Vite static bundle, a FastAPI/uvicorn API, and
(for a trial) a single SQLite file.

```
                 ┌──────────────────────── one Linux VM ────────────────────────┐
  visitor ──TLS──┤  Caddy : serves frontend/dist  +  reverse-proxies /api → 8000 │
                 │     │                                                          │
                 │  uvicorn (FastAPI)  ── docker run ──▶ alldata-sandbox (py)     │
                 │     │                              └▶ alldata-sandbox-r (R)    │
                 │  SQLite file (alldata.db)                                      │
                 └──────────────────────────────────────────────────────────────┘
```

## Recommended path: one VM + Caddy (fastest to public)

A 2 vCPU / 4 GB VM (DigitalOcean, Hetzner, Fly.io VM, Lightsail, any cloud) is
plenty for a trial. Steps:

**1. Host prep**
```sh
# Docker (the execution sandbox needs it)
curl -fsSL https://get.docker.com | sh
git clone <repo> alldata && cd alldata
```

**2. Build the two sandbox images**
```sh
docker build -f infra/Dockerfile.sandbox   -t alldata-sandbox:latest   .
docker build -f infra/Dockerfile.sandbox-r -t alldata-sandbox-r:latest .
./infra/smoke_r.sh   # first real run of the authored R, expect 0 failures
```

**3. Backend** (Python 3.13). Seed the DB once, then run uvicorn:
```sh
pip install -e .                                # deps from pyproject.toml
python -m seed.import_seed                       # builds alldata.db from seed/
SECRET_KEY="$(openssl rand -hex 32)" \
CORS_ORIGINS='["https://yourdomain.com"]' \
SANDBOX_R_ENABLED=true \
SANDBOX_ALLOW_LOCAL_FALLBACK=false \
uvicorn backend.main:app --host 127.0.0.1 --port 8000
```
(Run it under **systemd** or `docker compose` so it restarts, sketch below.)

**4. Frontend** static bundle:
```sh
cd frontend && npm ci && npm run build      # → frontend/dist
```

**5. Caddy** = auto-HTTPS + static + API proxy. `/etc/caddy/Caddyfile`:
```
yourdomain.com {
    root * /srv/alldata/frontend/dist
    handle /api/* { reverse_proxy 127.0.0.1:8000 }
    handle { try_files {path} /index.html; file_server }   # SPA fallback
}
```
Point DNS at the VM, `systemctl reload caddy`, done. Caddy provisions the TLS cert.

## Production config (env vars → `backend/config.py`)

| Var | Set it to | Why |
|---|---|---|
| `SECRET_KEY` | a 32-byte random hex | JWT signing, the default is a known dev string |
| `CORS_ORIGINS` | `["https://yourdomain.com"]` | lock the API to your origin |
| `SANDBOX_R_ENABLED` | `true` | turns on the R tab (see [`r-runtime.md`](r-runtime.md)) |
| `SANDBOX_ALLOW_LOCAL_FALLBACK` | `false` | **never** run user code on the host, Docker only |
| `DATABASE_URL` | leave SQLite for a trial | one file; revisit for scale (below) |

`sandbox_memory_limit` (256m), `sandbox_cpu_limit` (0.5), and the per-minute
execution rate limits already ship with safe defaults.

## Security posture (you're running strangers' code)

Already in place, verify it's on:
- **Sandbox isolation** every run: `--network=none`, `--read-only`, non-root user,
  memory/CPU caps, 50 MB tmpfs, hard timeout. Keep `SANDBOX_ALLOW_LOCAL_FALLBACK=false`.
- **Sign-in to run** gates execution to authenticated users (abuse friction).
- **Rate limiting** on `/api/execute` (per-role, per-minute).
- Keep the Docker images **pinned and minimal** (they are); rebuild for CVEs.
- Put the VM's Docker behind the firewall; only 80/443 open to the world.

## Scaling past the trial

- **SQLite → Postgres** when you need concurrent writers or backups: set
  `DATABASE_URL=postgresql+asyncpg://…` (SQLAlchemy async is already the data layer).
- **Execution load**: container spawns are the bottleneck. Move `/api/execute` to a
  dedicated worker pool / queue and cap concurrent containers per host; add hosts
  horizontally behind the proxy.
- **Frontend**: `frontend/dist` is static, push it to a CDN and leave only `/api`
  on the VM.
- **Observability**: uvicorn access logs + Docker stats; alert on sandbox timeouts
  and the execution rate-limit rejections.

## Smallest possible "just let people try it"

One VM, the Caddyfile above, SQLite, both images built, `SANDBOX_R_ENABLED=true`.
That serves the whole graph, every simulation in Python and R, forks, and review,
on a real HTTPS URL. Swap in Postgres + a CDN only when traffic asks for it.
