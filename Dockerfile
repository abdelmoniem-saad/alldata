# AllData — single-container build for Hugging Face Spaces (Docker SDK).
# Stage 1 builds the React frontend; stage 2 runs the FastAPI app, which both
# serves that frontend and executes lesson code (Python) in-process.
#
# Deploy: see docs/deploy-huggingface.md. The app listens on 7860 (the port
# Hugging Face expects) and runs as uid 1000 (the user HF runs containers as).

# ---------- Stage 1: build the frontend ----------
FROM node:20-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build      # -> /app/frontend/dist

# ---------- Stage 2: backend + runtime ----------
FROM python:3.12-slim

# Backend dependencies + the scientific stack the lessons execute against
# (numpy/pandas/scipy/... — code runs in THIS interpreter via the local
# fallback, since Hugging Face can't nest Docker sandboxes).
RUN pip install --no-cache-dir \
      "fastapi>=0.115" "uvicorn[standard]>=0.32" "sqlalchemy[asyncio]>=2.0.36" \
      "asyncpg>=0.30" \
      "aiosqlite>=0.20" "pydantic>=2.10" "pydantic-settings>=2.6" \
      "python-jose[cryptography]>=3.3" "passlib[bcrypt]>=1.7.4" "bcrypt<5" \
      "python-multipart>=0.0.12" "pyyaml>=6.0" "httpx>=0.28" "redis>=5.2" "docker>=7.1" \
 && pip install --no-cache-dir \
      numpy pandas scipy matplotlib seaborn statsmodels scikit-learn sympy

# Non-root user (Hugging Face runs the container as uid 1000).
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    MPLBACKEND=Agg \
    SANDBOX_ALLOW_LOCAL_FALLBACK=true
WORKDIR /home/user/app

# App source + the prebuilt frontend from stage 1.
COPY --chown=user backend/ ./backend/
COPY --chown=user seed/ ./seed/
COPY --chown=user --from=frontend /app/frontend/dist ./frontend/dist
COPY --chown=user infra/hf_start.sh ./hf_start.sh

EXPOSE 7860
CMD ["bash", "hf_start.sh"]
