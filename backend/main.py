from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api import (
    auth, content, courses, datasets, execute, forks, graph, merge_back,
    progress, topics, users,
)
from backend.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
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
app.include_router(topics.router, prefix="/api/topics", tags=["topics"])
app.include_router(graph.router, prefix="/api/graph", tags=["graph"])
app.include_router(content.router, prefix="/api/content", tags=["content"])
app.include_router(courses.router, prefix="/api/courses", tags=["courses"])
app.include_router(execute.router, prefix="/api/execute", tags=["execute"])
app.include_router(datasets.router, prefix="/api/datasets", tags=["datasets"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
# M1: progress sync endpoints. Mounted under /api/users so the URL contract
# reads `/api/users/me/progress` — `me` is the "current authenticated user"
# alias matching the same convention as `/api/auth/me`.
app.include_router(progress.router, prefix="/api/users", tags=["progress"])
# (M1 wired; O1 merge-back wired below)
# N: fork model — anyone-can-fork, content-editable, public-by-default.
app.include_router(forks.router, prefix="/api/forks", tags=["forks"])
# O1: merge-back review queue (ADMIN/EDITOR). The fork-owner "suggest"
# action lives on the forks router so it sits next to other owner-only
# fork endpoints; the review queue is its own surface.
app.include_router(merge_back.router, prefix="/api/merge-backs", tags=["merge-backs"])


@app.get("/")
async def root():
    return {"name": "AllData API", "health": "/api/health", "docs": "/docs"}


@app.get("/api/health")
async def health():
    return {"status": "ok"}
