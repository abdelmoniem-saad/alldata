"""D5: content problem reports, the lightweight correction door.

POST /api/reports is public (per-IP rate-limited, anonymous allowed,
signed-in reporters get attached); the triage endpoints live on the
admin router. The pytest DB starts empty, so representative topics are
created here, as test_tracks does.
"""


import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.test_cycle_a import _topic

_MIN_NOTE = "The standard-error formula in the formal section drops the sqrt."


async def _login_token(client: AsyncClient) -> str:
    r = await client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "testpass123",
    })
    assert r.status_code == 200, r.text
    return r.json()["access_token"]

def _h(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_report_lifecycle(db: AsyncSession, client: AsyncClient, test_user):
    """File anonymously, triage as admin, resolve with a closure note."""
    await _topic(db, "hypothesis-testing", "Hypothesis Tests")

    r = await client.post("/api/reports", json={
        "topic_slug": "hypothesis-testing",
        "note": _MIN_NOTE,
    })
    assert r.status_code == 201
    body = r.json()
    assert body["status"] == "open"
    assert body["reporter_name"] is None
    report_id = body["id"]

    token = await _login_token(client)

    listed = await client.get("/api/admin/reports?status_filter=open", headers=_h(token))
    assert listed.status_code == 200
    assert any(x["id"] == report_id for x in listed.json())

    resolved = await client.patch(
        f"/api/admin/reports/{report_id}",
        json={"status": "resolved", "resolution_note": "fixed in next refresh"},
        headers=_h(token),
    )
    assert resolved.status_code == 200
    assert resolved.json()["status"] == "resolved"

    still_open = await client.get("/api/admin/reports?status_filter=open", headers=_h(token))
    assert all(x["id"] != report_id for x in still_open.json())


@pytest.mark.asyncio
async def test_report_attaches_signed_in_reporter(db: AsyncSession, client: AsyncClient, test_user):
    await _topic(db, "p-values", "P-values")

    token = await _login_token(client)
    r = await client.post(
        "/api/reports",
        json={"topic_slug": "p-values", "note": _MIN_NOTE},
        headers=_h(token),
    )
    assert r.status_code == 201
    assert r.json()["reporter_name"] == "Test User"


@pytest.mark.asyncio
async def test_report_validation(db: AsyncSession, client: AsyncClient, test_user):
    await _topic(db, "correlation", "Correlation")

    # Unknown topic → 404.
    r = await client.post("/api/reports", json={
        "topic_slug": "not-a-topic", "note": _MIN_NOTE,
    })
    assert r.status_code == 404

    # Note too short → 422.
    r = await client.post("/api/reports", json={
        "topic_slug": "correlation", "note": "too short",
    })
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_report_rate_limit(db: AsyncSession, client: AsyncClient, test_user):
    """The 5/min per-IP dam: the sixth report from the same address 429s."""
    await _topic(db, "hypothesis-testing", "Hypothesis Tests")
    statuses = []
    for _ in range(6):
        r = await client.post("/api/reports", json={
            "topic_slug": "hypothesis-testing", "note": _MIN_NOTE,
        })
        statuses.append(r.status_code)
    assert statuses[:5] == [201] * 5
    assert statuses[5] == 429


@pytest.mark.asyncio
async def test_report_admin_gate(db: AsyncSession, client: AsyncClient, test_user):
    """The triage endpoints refuse non-admins (and anonymous)."""
    await _topic(db, "hypothesis-testing", "Hypothesis Tests")

    r = await client.get("/api/admin/reports")
    assert r.status_code in (401, 403)

    # A learner (registered, non-admin) is also refused.
    r = await client.post("/api/auth/register", json={
        "email": "learner@example.com",
        "display_name": "Learner",
        "password": "password123",
    })
    learner_token = r.json()["access_token"]
    r = await client.get("/api/admin/reports", headers=_h(learner_token))
    assert r.status_code == 403

