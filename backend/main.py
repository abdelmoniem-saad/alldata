from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api import auth, content, courses, execute, graph, topics
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


@app.get("/")
async def root():
    return {"name": "AllData API", "health": "/api/health", "docs": "/docs"}


@app.get("/api/health")
async def health():
    return {"status": "ok"}
