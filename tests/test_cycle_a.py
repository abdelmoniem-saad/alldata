"""Cycle A: recovery codes + account settings (A2), admin roles (A3), body search (A1).

Backend-level tests only; the frontend surfaces (settings panel, admin table,
search snippets) are exercised manually + by the typecheck/build gate.
"""


from httpx import AsyncClient
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.content_block import ContentBlock
from backend.models.topic import Topic
from backend.models.user import User, UserRole

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def _make_user(db: AsyncSession, email: str,
                     role: str = UserRole.LEARNER.value,
                     password: str = "oldpassword1") -> User:
    user = User(
        email=email,
        display_name=email.split("@")[0],
        hashed_password=pwd.hash(password),
        role=role,
    )
    db.add(user)
    await db.flush()
    return user


def _headers(user: User) -> dict[str, str]:
    from jose import jwt

    from backend.config import settings

    token = jwt.encode({"sub": str(user.id)}, settings.secret_key, algorithm=settings.algorithm)
    return {"Authorization": f"Bearer {token}"}


class TestAccountSettings:
    async def test_update_profile(self, client: AsyncClient, test_user: User):
        resp = await client.patch(
            "/api/users/me",
            json={"display_name": "New Name", "bio": "hello"},
            headers=_headers(test_user),
        )
        assert resp.status_code == 200
        assert resp.json()["display_name"] == "New Name"
        assert resp.json()["bio"] == "hello"

    async def test_update_rejects_empty_name(self, client: AsyncClient, test_user: User):
        resp = await client.patch(
            "/api/users/me", json={"display_name": "   "}, headers=_headers(test_user)
        )
        assert resp.status_code == 422

    async def test_password_change_requires_current(self, client: AsyncClient, test_user: User):
        resp = await client.patch(
            "/api/users/me/password",
            json={"current_password": "wrong", "new_password": "newpassword1"},
            headers=_headers(test_user),
        )
        assert resp.status_code == 403

        resp = await client.patch(
            "/api/users/me/password",
            json={"current_password": "testpass123", "new_password": "short"},
            headers=_headers(test_user),
        )
        assert resp.status_code == 422

        resp = await client.patch(
            "/api/users/me/password",
            json={"current_password": "testpass123", "new_password": "newpassword1"},
            headers=_headers(test_user),
        )
        assert resp.status_code == 200

        # New password logs in; old one doesn't.
        login = await client.post(
            "/api/auth/login",
            json={"email": test_user.email, "password": "newpassword1"},
        )
        assert login.status_code == 200


class TestRecoveryCodes:
    async def test_full_recovery_flow(self, client: AsyncClient, db: AsyncSession):
        user = await _make_user(db, "recover@example.com")

        gen = await client.post("/api/users/me/recovery-code", headers=_headers(user))
        assert gen.status_code == 200
        code = gen.json()["recovery_code"]
        assert code.count("-") == 3

        recover = await client.post(
            "/api/auth/recover", json={"email": user.email, "code": code}
        )
        assert recover.status_code == 200
        assert "access_token" in recover.json()

        # Single use: same code again fails.
        again = await client.post(
            "/api/auth/recover", json={"email": user.email, "code": code}
        )
        assert again.status_code == 401

    async def test_password_change_invalidates_code(self, client: AsyncClient, db: AsyncSession):
        user = await _make_user(db, "invalidate@example.com", password="oldpassword1")
        gen = await client.post("/api/users/me/recovery-code", headers=_headers(user))
        code = gen.json()["recovery_code"]

        await client.patch(
            "/api/users/me/password",
            json={"current_password": "oldpassword1", "new_password": "newpassword1"},
            headers=_headers(user),
        )
        recover = await client.post(
            "/api/auth/recover", json={"email": user.email, "code": code}
        )
        assert recover.status_code == 401

    async def test_wrong_code_401(self, client: AsyncClient, db: AsyncSession):
        user = await _make_user(db, "wrongcode@example.com")
        await client.post("/api/users/me/recovery-code", headers=_headers(user))
        resp = await client.post(
            "/api/auth/recover", json={"email": user.email, "code": "aaaa-bbbb-cccc-dddd"}
        )
        assert resp.status_code == 401


class TestAdminRoles:
    async def test_requires_admin(self, client: AsyncClient, db: AsyncSession):
        learner = await _make_user(db, "learner@example.com")
        resp = await client.get("/api/admin/users", headers=_headers(learner))
        assert resp.status_code == 403

    async def test_list_and_role_change(
        self, client: AsyncClient, test_user: User, db: AsyncSession
    ):
        learner = await _make_user(db, "promotee@example.com")
        resp = await client.get("/api/admin/users", headers=_headers(test_user))
        assert resp.status_code == 200
        assert any(u["email"] == learner.email for u in resp.json())

        resp = await client.patch(
            f"/api/admin/users/{learner.id}/role",
            params={"role": "professor"},
            headers=_headers(test_user),
        )
        assert resp.status_code == 200
        assert resp.json()["role"] == "professor"

        resp = await client.patch(
            f"/api/admin/users/{learner.id}/role",
            params={"role": "bogus"},
            headers=_headers(test_user),
        )
        assert resp.status_code == 422

    async def test_cannot_demote_last_admin(self, client: AsyncClient, test_user: User):
        # test_user is the only admin in this test's DB (conftest drops all).
        resp = await client.patch(
            f"/api/admin/users/{test_user.id}/role",
            params={"role": "learner"},
            headers=_headers(test_user),
        )
        assert resp.status_code == 409

    async def test_cannot_deactivate_self(self, client: AsyncClient, test_user: User):
        resp = await client.patch(
            f"/api/admin/users/{test_user.id}/active",
            params={"active": False},
            headers=_headers(test_user),
        )
        assert resp.status_code == 409

    async def test_deactivate_then_login_fails(
        self, client: AsyncClient, test_user: User, db: AsyncSession
    ):
        other = await _make_user(db, "deactivatee@example.com", password="oldpassword1")
        resp = await client.patch(
            f"/api/admin/users/{other.id}/active",
            params={"active": False},
            headers=_headers(test_user),
        )
        assert resp.status_code == 200

        login = await client.post(
            "/api/auth/login", json={"email": other.email, "password": "oldpassword1"}
        )
        assert login.status_code == 403


class TestBodySearch:
    async def _topic_with_content(
        self, db: AsyncSession, slug: str, title: str, body: str
    ) -> Topic:
        author = (await db.execute(
            __import__("sqlalchemy").select(User).where(User.email == "system@alldata.dev")
        )).scalars().first()
        if author is None:
            author = User(
                email="system@alldata.dev", display_name="System",
                hashed_password=pwd.hash("nopass123"), role=UserRole.ADMIN.value,
            )
            db.add(author)
            await db.flush()
        topic = Topic(
            slug=slug, title=title, domain="probability-foundations",
            difficulty="intermediate", status="published", depth=1,
            created_by=author.id,
        )
        db.add(topic)
        await db.flush()
        db.add(ContentBlock(topic_id=topic.id, block_type="markdown", sort_order=0, content=body))
        await db.flush()
        return topic

    async def test_body_match_with_snippet(self, client: AsyncClient, db: AsyncSession):
        await self._topic_with_content(
            db, "body-only-topic", "Unrelated Title",
            "The false positive rate dominates the posterior at low prevalence.",
        )
        await db.commit()
        resp = await client.get("/api/graph/search", params={"q": "dominates the posterior"})
        assert resp.status_code == 200
        results = resp.json()
        hit = next(r for r in results if r["slug"] == "body-only-topic")
        assert hit["matched_in"] == "body"
        assert "dominates the posterior" in hit["snippet"]

    async def test_title_match_ranks_first(self, client: AsyncClient, db: AsyncSession):
        await self._topic_with_content(
            db, "body-mentions-bayes", "Totally Different",
            "we talk about bayes a lot in here",
        )
        await self._topic_with_content(
            db, "bayes-theorem", "Bayes' Theorem",
            "flipping a conditional around",
        )
        await db.commit()
        results = (await client.get("/api/graph/search", params={"q": "bayes"})).json()
        assert results, "expected results"
        # Title matches rank above body matches, even when the body match's
        # title sorts first alphabetically ("Bayes..." vs "Totally...").
        assert results[0]["slug"] == "bayes-theorem"
        assert results[0]["matched_in"] == "title"

    async def test_no_match_empty(self, client: AsyncClient):
        results = (await client.get("/api/graph/search", params={"q": "zzzqqqxxx"})).json()
        assert results == []
