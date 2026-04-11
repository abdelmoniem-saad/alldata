"""Content routes — content blocks management."""

import uuid

from fastapi import APIRouter, HTTPException, status

from backend.deps import DB, CurrentUser
from backend.models.user import UserRole
from backend.schemas.topic import ContentBlockCreate, ContentBlockResponse
from backend.services import content_service

router = APIRouter()


@router.post(
    "/topics/{topic_id}/blocks",
    response_model=ContentBlockResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_block(topic_id: uuid.UUID, data: ContentBlockCreate, db: DB, user: CurrentUser):
    if user.role not in (UserRole.CONTRIBUTOR.value, UserRole.PROFESSOR.value,
                         UserRole.EDITOR.value, UserRole.ADMIN.value):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    block = await content_service.add_content_block(db, topic_id, data)
    await db.flush()
    return ContentBlockResponse.model_validate(block)


@router.put("/blocks/{block_id}", response_model=ContentBlockResponse)
async def update_block(block_id: uuid.UUID, content: str, db: DB, user: CurrentUser):
    if user.role not in (UserRole.EDITOR.value, UserRole.ADMIN.value):
        raise HTTPException(status_code=403, detail="Only editors and admins can update blocks")

    block = await content_service.update_content_block(db, block_id, content)
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    return ContentBlockResponse.model_validate(block)


@router.delete("/blocks/{block_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_block(block_id: uuid.UUID, db: DB, user: CurrentUser):
    if user.role not in (UserRole.EDITOR.value, UserRole.ADMIN.value):
        raise HTTPException(status_code=403, detail="Only editors and admins can delete blocks")

    deleted = await content_service.delete_content_block(db, block_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Block not found")
