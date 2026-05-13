"""Dataset routes — K5.

Serves curated CSVs from `seed/datasets/{name}.csv` and the manifest that
catalogs them. The `/datasets` index page reads the listing endpoint to
render dataset cards and the reverse index of topics that use each dataset;
code blocks call the per-name endpoint via the `load(name)` helper injected
into the Python execution context.
"""

from pathlib import Path

import yaml
from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse, JSONResponse
from sqlalchemy import select

from backend.deps import DB
from backend.models.topic import Topic

router = APIRouter()

# Datasets live alongside the seed content. `seed/datasets/{name}.csv` is the
# canonical path; the manifest at `seed/datasets/manifest.yaml` describes them.
SEED_DATASETS_DIR = Path(__file__).resolve().parent.parent.parent / "seed" / "datasets"


@router.get("")
async def list_datasets(db: DB):
    """Return the manifest + reverse index of topics-per-dataset."""
    manifest_path = SEED_DATASETS_DIR / "manifest.yaml"
    if not manifest_path.exists():
        return JSONResponse({"datasets": []})

    with open(manifest_path, encoding="utf-8") as f:
        manifest = yaml.safe_load(f) or {}

    # Reverse index: dataset_name → [topic slugs that declare this dataset].
    result = await db.execute(
        select(Topic.slug, Topic.title, Topic.dataset)
        .where(Topic.dataset.is_not(None))
    )
    reverse: dict[str, list[dict]] = {}
    for slug, title, dataset_name in result.all():
        if dataset_name:
            reverse.setdefault(dataset_name, []).append({"slug": slug, "title": title})

    out = []
    for entry in manifest.get("datasets", []):
        name = entry.get("name")
        if not name:
            continue
        out.append({**entry, "topics": reverse.get(name, [])})

    return JSONResponse({"datasets": out})


@router.get("/{name}")
async def get_dataset(name: str):
    """Serve the CSV bytes for a named dataset.

    `name` must match a file in `seed/datasets/{name}.csv`. Slug-shaped only —
    no path traversal allowed.
    """
    if not name.replace("-", "").replace("_", "").isalnum():
        raise HTTPException(status_code=400, detail="Invalid dataset name")
    path = SEED_DATASETS_DIR / f"{name}.csv"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Dataset '{name}' not found")
    return PlainTextResponse(path.read_text(encoding="utf-8"), media_type="text/csv")
