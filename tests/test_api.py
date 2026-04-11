"""Tests for the API endpoints."""

import pytest
from httpx import AsyncClient


class TestHealth:
    async def test_health(self, client: AsyncClient):
        resp = await client.get("/api/health")
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}


class TestAuth:
    async def test_register(self, client: AsyncClient):
        resp = await client.post("/api/auth/register", json={
            "email": "new@example.com",
            "display_name": "New User",
            "password": "securepass123",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert "access_token" in data
        assert data["user"]["email"] == "new@example.com"

    async def test_register_duplicate_email(self, client: AsyncClient):
        payload = {
            "email": "dup@example.com",
            "display_name": "User",
            "password": "pass123",
        }
        await client.post("/api/auth/register", json=payload)
        resp = await client.post("/api/auth/register", json=payload)
        assert resp.status_code == 400

    async def test_login(self, client: AsyncClient):
        # Register first
        await client.post("/api/auth/register", json={
            "email": "login@example.com",
            "display_name": "Login User",
            "password": "mypassword",
        })

        # Login
        resp = await client.post("/api/auth/login", json={
            "email": "login@example.com",
            "password": "mypassword",
        })
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    async def test_login_wrong_password(self, client: AsyncClient):
        await client.post("/api/auth/register", json={
            "email": "wrong@example.com",
            "display_name": "User",
            "password": "correct",
        })
        resp = await client.post("/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "incorrect",
        })
        assert resp.status_code == 401

    async def test_me(self, client: AsyncClient, auth_headers):
        resp = await client.get("/api/auth/me", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["email"] == "test@example.com"

    async def test_me_unauthorized(self, client: AsyncClient):
        resp = await client.get("/api/auth/me")
        assert resp.status_code == 401


class TestTopics:
    async def test_create_topic(self, client: AsyncClient, auth_headers):
        resp = await client.post("/api/topics", headers=auth_headers, json={
            "slug": "test-topic",
            "title": "Test Topic",
            "summary": "A test topic",
            "domain": "test",
            "difficulty": "intro",
            "content_blocks": [
                {
                    "block_type": "markdown",
                    "content": "# Hello\nThis is a test.",
                    "sort_order": 0,
                }
            ],
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["slug"] == "test-topic"
        assert len(data["content_blocks"]) == 1

    async def test_get_topic(self, client: AsyncClient, auth_headers):
        # Create
        await client.post("/api/topics", headers=auth_headers, json={
            "slug": "fetch-me",
            "title": "Fetch Me",
            "status": "published",
        })

        # Fetch
        resp = await client.get("/api/topics/fetch-me")
        assert resp.status_code == 200
        assert resp.json()["title"] == "Fetch Me"

    async def test_topic_not_found(self, client: AsyncClient):
        resp = await client.get("/api/topics/nonexistent")
        assert resp.status_code == 404


class TestGraph:
    async def test_get_graph(self, client: AsyncClient, auth_headers):
        # Create some topics
        await client.post("/api/topics", headers=auth_headers, json={
            "slug": "topic-a", "title": "Topic A", "status": "published",
        })
        await client.post("/api/topics", headers=auth_headers, json={
            "slug": "topic-b", "title": "Topic B", "status": "published",
        })

        resp = await client.get("/api/graph?status=published")
        assert resp.status_code == 200
        data = resp.json()
        assert "nodes" in data
        assert "edges" in data

    async def test_create_edge(self, client: AsyncClient, auth_headers):
        # Create topics
        resp_a = await client.post("/api/topics", headers=auth_headers, json={
            "slug": "edge-a", "title": "Edge A",
        })
        resp_b = await client.post("/api/topics", headers=auth_headers, json={
            "slug": "edge-b", "title": "Edge B",
        })
        id_a = resp_a.json()["id"]
        id_b = resp_b.json()["id"]

        # Create edge
        resp = await client.post("/api/graph/edges", headers=auth_headers, json={
            "source_id": id_a,
            "target_id": id_b,
            "edge_type": "prerequisite",
            "description": "A is needed for B",
        })
        assert resp.status_code == 201
        assert resp.json()["edge_type"] == "prerequisite"
