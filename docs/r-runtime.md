# Running R (deployment guide)

R lesson code runs the **same way Python does**: server-side, in a sandboxed
Docker container, via `POST /api/execute`. To a reader it's seamless, type R,
hit Run, get stdout + plots back. This doc is the operator guide for turning R
on; the runtime itself is already built.

## Why server-side (not in-browser WebR)

The platform is server-bound (FastAPI backend for auth, progress, graph, forks),
and Python already executes server-side in a sandbox. R mirrors that exact path,
so it inherits the same security model and zero client download. The in-browser
alternative (WebR, R compiled to WASM) was declined for the same reasons Pyodide
was in cycle U: it conflicts with the "sign in to run" nudge, forces self-hosting
tens of MB of WASM (against the no-third-party value), its "works on static
hosts" benefit is moot here, and it's a second execution engine to maintain.

## What's already built

| Piece | Where |
|---|---|
| Executor (`_execute_r`, `_execute_local_r`, `_wrap_r_code`) | `backend/services/execution_service.py` |
| Sandbox image | `infra/Dockerfile.sandbox-r` (`FROM r-base:4.4.1` + `ggplot2`/`dplyr`/`tidyr`, non-root user) |
| Capability flag + probe | `backend/config.py` (`sandbox_r_enabled`), `runtime_capabilities()` |
| Capability endpoint | `GET /api/execute/capabilities` → `{python, r}` |
| UI gate | `CodeRunner` hides the **R** language toggle unless `r: true` |

The executor spawns the R container with the same hardening as Python:
`--network=none`, `--read-only`, `--memory`/`--cpus` caps, a 50 MB `/tmp` tmpfs,
the script mounted read-only, and the timeout enforced.

## Enable R in production

```sh
# 1. Build the sandbox image (tag must match settings.sandbox_r_image,
#    default alldata-sandbox-r:latest)
docker build -f infra/Dockerfile.sandbox-r -t alldata-sandbox-r:latest .

# 2. Run the API with the flag set
SANDBOX_R_ENABLED=true uvicorn backend.main:app
```

`runtime_capabilities()` then reports `r: true`, `GET /api/execute/capabilities`
returns it, and the reader's **R** toggle appears. Docker must be available to
the API process (the same requirement as the Python sandbox).

## Enable R in local dev

Either path makes the probe report `r: true`:

- **Install R** so `Rscript` is on `PATH` — the executor's local fallback runs it
  directly (dev only; gated by `SANDBOX_ALLOW_LOCAL_FALLBACK`).
- **Or** build the sandbox image + set `SANDBOX_R_ENABLED=true` as above.

With neither, the probe reports `r: false` and the R toggle stays hidden, no
dead end for the reader.

## Authoring R content

- A standalone R block: `<!-- block: code_r, editable: true -->` with an
  ```` ```r ```` fence.
- A **paired Python/R** block (the common case, one tabbed surface with a
  language toggle) uses a shared `pair_id` on two adjacent code blocks, e.g.
  `<!-- block: simulation, pair_id: clt-demo -->` (python) next to
  `<!-- block: code_r, pair_id: clt-demo -->`. See [`authoring.md`](authoring.md)
  and `frontend/src/components/topic/blocks/CodePairRenderer.tsx`.
- **Plots:** base-R graphics auto-capture (each page → a PNG). For `ggplot2`,
  call `print(p)` so the plot writes to the device. The wrapper themes the
  device background to match the reader's light/dark theme.

## R content ships on every topic

Every topic's Python simulation now has a paired **R** variant (40 pairs total,
a `simulation`/`code_python` block beside a `code_r` block sharing a `pair_id`).
The R is a faithful base-R translation of each Python sim. The reader sees the
Python by default; the **R** tab appears only once the runtime is provisioned
(`CodePairRenderer` gates it on the same capability probe), so the pairs are a
no-op until then, no dead tab.

> The R was authored against base R + `ggplot2`/`dplyr`/`tidyr` but **not
> execution-tested** (no R runtime on the authoring machine; RNG also differs
> from NumPy, so printed numbers are close, not identical). **Smoke-test once,**
> right after building the image: open a topic, switch to the R tab, hit Run,
> and confirm output + plots. A quick batch check is in `infra/smoke_r.sh`.
