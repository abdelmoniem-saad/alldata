---
title: AllData
emoji: 📊
colorFrom: green
colorTo: gray
sdk: docker
app_port: 7860
pinned: false
---

<!-- The YAML block above is Hugging Face Space metadata, read when this repo is
     deployed as a Docker Space (see docs/deploy-huggingface.md). It must stay at
     the very top of the file. It is harmless on GitHub. -->

# AllData

**Statistics is a graph, not a textbook.**

A knowledge-graph learning platform for statistics and data science. Every
concept is a guided simulation: the reader commits to an answer, watches the
consequence play out on a live visualization, then reads the explanation on top
of the choice they just made. **Ask → act → explain.**

The graph view (`/explore`) shows the field; the topic view shows the lesson.
Both speak the same visual vocabulary so the surface stays out of the way of
the math.

## How it works

- **Authoring is markdown.** A topic is `meta.yaml` + one `content.md` with a
  small directive vocabulary (`decision`, `playground`, `plot`, `state`,
  `derivation`, `misconception`, …). No CMS. Import with
  `python -m seed.import_seed` (`--strict` in CI validates the whole catalog).
- **One reactive plot system.** Decisions, playgrounds, and static visuals all
  read/write a single topic-state bag. No separate sim engine.
- **Anyone can fork.** A fork is editable content for one topic; merge-back
  goes through an ADMIN/EDITOR review queue with a whole-file diff.
- **Progress sync.** Local-first progress, synced to the account; read-only
  public snapshots at `/u/{username}`. Spaced-repetition recall (SM-2) is a
  quiet prompt, never a score. No gamification.
- **Sandboxed code execution.** Lesson code runs in Docker
  (`--network=none`, memory/CPU caps) with an unsandboxed local fallback for
  hosts that can't nest Docker (Hugging Face Spaces) — hardened with a
  scrubbed child environment, POSIX rlimits, process-group timeouts, a global
  concurrency gate, and per-user + per-IP rate limits.

## Stack

- **Backend:** Python 3.12+, FastAPI, SQLAlchemy 2 (async), SQLite/Postgres.
- **Frontend:** React + TypeScript + Vite, D3 force-directed graph, no UI framework.
- **Deploy:** single Docker container (Hugging Face Spaces Docker SDK, port 7860).

## Quick start

```powershell
# Backend (Windows PowerShell; use && on POSIX, separate lines here)
Set-Location "A:\Projects\alldata\alldata"
python -m pip install -e ".[dev]"
python -m seed.import_seed          # seed the content database
uvicorn backend.main:app --reload   # http://127.0.0.1:8000
```

```powershell
# Frontend (second terminal)
Set-Location "A:\Projects\alldata\alldata\frontend"
npm install
npm run dev                         # http://localhost:5173
```

Health check: `Invoke-RestMethod "http://127.0.0.1:8000/api/health"`

Tests and lint:

```powershell
python -m pytest tests/ -q
ruff check backend seed tests
```

## Deploying to Hugging Face Spaces

The repo root carries the Space metadata (the YAML block above), a
multi-stage `Dockerfile`, and `infra/hf_start.sh`. The Space remote is
already wired (`git remote -v` should show `hf`); deploying is:

```sh
git push hf main    # HF rebuilds the Space automatically
```

Free-tier caveats (see `docs/deploy-huggingface.md` for the full walkthrough):

- Storage is **ephemeral**: content re-seeds from `seed/` on every boot;
  accounts, progress, and forks reset on restart. Point `DATABASE_URL` at an
  external Postgres via a Space secret to make them durable.
- Without nested Docker, submitted code runs on the host interpreter. The
  fallback is hardened (scrubbed env, rlimits, concurrency gate, rate limits),
  but don't put anything private in the Space.

## Project layout

```
backend/        FastAPI app (api / models / schemas / services)
frontend/       React SPA (Vite), served by FastAPI in production
seed/           Source of truth: schema.yaml + topics/{domain}/{slug}/ + datasets
tests/          pytest suite (API, parser, graph engine, forks, limits, hardening)
docs/           vision · principles · features · cycles · authoring · deploy
infra/          Docker/sandbox images, hf_start.sh, nginx, init.sql
```

## Documentation

| Doc | What it is |
|---|---|
| [`docs/vision.md`](docs/vision.md) | What this is, who it's for, the ask → act → explain loop |
| [`docs/principles.md`](docs/principles.md) | The constraints enforced in code (start here) |
| [`docs/features.md`](docs/features.md) | Every user-visible feature, with cycle + code refs |
| [`docs/cycles.md`](docs/cycles.md) | The development ledger: what shipped when, and why |
| [`docs/identity.md`](docs/identity.md) | Name, mark, tagline, voice |
| [`docs/authoring.md`](docs/authoring.md) | How to write a topic (directives, meta.yaml, reactive state) |
| [`docs/deploy-huggingface.md`](docs/deploy-huggingface.md) | Click-by-click deploy to a free HF Space |

## Contributing

Read [`docs/principles.md`](docs/principles.md) once, then
[`docs/authoring.md`](docs/authoring.md). Content lives in
`seed/topics/{domain}/{slug}/` — the database is a derived artifact; schema
changes ship as a re-import, not migrations.

## License

[MIT](LICENSE)
