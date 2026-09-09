"""C8: the self-reported audience type (signup + profile)."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_stores_audience(client: AsyncClient):
    r = await client.post("/api/auth/register", json={
        "email": "aud@example.com",
        "display_name": "Aud",
        "password": "password123",
        "audience": "student",
    })
    assert r.status_code == 201
    assert r.json()["user"]["audience"] == "student"


@pytest.mark.asyncio
async def test_register_unknown_audience_degrades_to_none(client: AsyncClient):
    """An old or hostile client can't break signup with a bad value."""
    r = await client.post("/api/auth/register", json={
        "email": "aud2@example.com",
        "display_name": "Aud2",
        "password": "password123",
        "audience": "hax0r",
    })
    assert r.status_code == 201
    assert r.json()["user"]["audience"] is None


@pytest.mark.asyncio
async def test_patch_me_updates_audience(client: AsyncClient):
    r = await client.post("/api/auth/register", json={
        "email": "aud3@example.com",
        "display_name": "Aud3",
        "password": "password123",
    })
    token = r.json()["access_token"]
    r = await client.patch(
        "/api/users/me",
        json={"audience": "professor"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    assert r.json()["audience"] == "professor"

    # Invalid value is refused outright on the authenticated path.
    r = await client.patch(
        "/api/users/me",
        json={"audience": "wizard"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 422
