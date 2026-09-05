import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select

from backend.api import (
    admin,
    auth,
    content,
    courses,
    datasets,
    execute,
    forks,
    graph,
    merge_back,
    misconceptions,
    progress,
    topics,
    track,
    users,
)
from backend.config import settings
from backend.models.topic import Topic
from backend.services import seo_service

logger = logging.getLogger("alldata")

_DEV_SECRET = "dev-secret-key-change-in-production"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup, S1 posture checks.
    # Local-fallback ON means /api/execute can run code unsandboxed on this
    # host when Docker is absent. Fine on a dev laptop; never in production.
    if settings.sandbox_allow_local_fallback:
        logger.warning(
            "SANDBOX_ALLOW_LOCAL_FALLBACK is on: without Docker, /api/execute "
            "runs submitted code directly on this host. Disable in production."
        )
    elif settings.secret_key == _DEV_SECRET:
        # Fallback disabled reads as production posture, refuse to sign
        # tokens with the published dev secret.
        raise RuntimeError(
            "secret_key is still the dev default but the deployment looks "
            "production-like (local sandbox fallback disabled). Set SECRET_KEY."
        )
    yield
    # Shutdown
    from backend.database import engine

    await engine.dispose()


app = FastAPI(
    title="AllData",
    description="Knowledge graph learning platform for statistics & data science",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
# T3: ADMIN-only user management (roles, activation).
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
# A10: first-party usage beacons (no auth, no PII).
app.include_router(track.router, prefix="/api/track", tags=["track"])
app.include_router(topics.router, prefix="/api/topics", tags=["topics"])
# C2: consolidated misconceptions catalog (the H10 backlog item).
app.include_router(misconceptions.router, prefix="/api/misconceptions", tags=["misconceptions"])
app.include_router(graph.router, prefix="/api/graph", tags=["graph"])
app.include_router(content.router, prefix="/api/content", tags=["content"])
app.include_router(courses.router, prefix="/api/courses", tags=["courses"])
app.include_router(execute.router, prefix="/api/execute", tags=["execute"])
app.include_router(datasets.router, prefix="/api/datasets", tags=["datasets"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
# M1: progress sync endpoints. Mounted under /api/users so the URL contract
# reads `/api/users/me/progress`, `me` is the "current authenticated user"
# alias matching the same convention as `/api/auth/me`.
app.include_router(progress.router, prefix="/api/users", tags=["progress"])
# (M1 wired; O1 merge-back wired below)
# N: fork model, anyone-can-fork, content-editable, public-by-default.
app.include_router(forks.router, prefix="/api/forks", tags=["forks"])
# O1: merge-back review queue (ADMIN/EDITOR). The fork-owner "suggest"
# action lives on the forks router so it sits next to other owner-only
# fork endpoints; the review queue is its own surface.
app.include_router(merge_back.router, prefix="/api/merge-backs", tags=["merge-backs"])


@app.get("/api/health")
async def health():
    """Liveness + database reachability.

    The keep-alive cron (`.github/workflows/keepalive.yml`) pings this every
    30 minutes to keep the Hugging Face Space awake; it also doubles as the
    "is the database actually reachable" probe for an external-Postgres
    deployment — 503 with the detail when the DB round-trip fails.
    """
    from sqlalchemy import text

    from backend.database import engine

    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception:
        logger.exception("Health check: database unreachable")
        raise HTTPException(
            status_code=503,
            detail={"status": "degraded", "database": "unreachable"},
        )
    return {"status": "ok", "database": "ok"}


# ── B4: crawler surfaces ─────────────────────────────────────────────────
# Registered before the SPA catch-all below (route order matters).
@app.get("/robots.txt", include_in_schema=False)
async def robots(request: Request):
    base = seo_service.base_url(request)
    return PlainTextResponse(
        "User-agent: *\n"
        "Disallow: /api/\n"
        "Disallow: /admin/\n"
        "Disallow: /review/\n"
        "Disallow: /settings/\n"
        f"Sitemap: {base}/sitemap.xml\n"
    )


@app.get("/sitemap.xml", include_in_schema=False)
async def sitemap(request: Request):
    from backend.database import async_session

    # One-off session: crawlers hit this rarely and it's cached for 5 min.
    async with async_session() as db:
        xml = await seo_service.build_sitemap(db, seo_service.base_url(request))
    return HTMLResponse(xml, media_type="application/xml")


# ── Serve the built frontend (single-container / Hugging Face deploy) ──
# In local dev the Vite server serves the SPA and this block is a no-op
# (frontend/dist is absent). In the container, FastAPI serves the built assets
# and falls back to index.html for client-side routes, so the whole app runs
# from one origin and the frontend's same-origin `/api` calls hit the routers
# above. Registered last so every `/api/...` route is matched first.
_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if (_DIST / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=_DIST / "assets"), name="assets")

if _DIST.is_dir():
    # B4: read the built index.html once; topic routes get meta injected.
    _INDEX_TEMPLATE = seo_service.load_index_template(_DIST)

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa(full_path: str, request: Request):
        # API + docs are matched by their own routes first; an unmatched
        # `/api/...` is a real 404, anything else is a client-side route.
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")
        candidate = _DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)

        # B4: topic routes get the topic's own title/description/OG tags
        # injected into the head so crawlers and link previews see real
        # content (the SPA itself renders identically on top of it).
        if _INDEX_TEMPLATE and full_path.startswith("topic/"):
            slug = full_path.split("/")[1].strip("/")
            if slug:
                from backend.database import async_session

                async with async_session() as db:
                    topic = (await db.execute(
                        select(Topic.title, Topic.summary).where(
                            Topic.slug == slug, Topic.status == "published"
                        )
                    )).first()
                if topic:
                    html = seo_service.inject_topic_meta(
                        _INDEX_TEMPLATE,
                        title=f"{topic.title} — AllData",
                        description=topic.summary or "A guided simulation on AllData.",
                        canonical_url=f"{seo_service.base_url(request)}/topic/{slug}",
                    )
                    return HTMLResponse(html)

        return FileResponse(_DIST / "index.html")

else:

    @app.get("/")
    async def root():
        return {"name": "AllData API", "health": "/api/health", "docs": "/docs"}
