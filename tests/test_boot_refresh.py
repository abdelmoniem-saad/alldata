"""C6a: the CONTENT_REFRESH_ON_BOOT flag.

Boot imports with the skip-if-exists default, so seed content.md edits
never reached a live deployment. The flag makes `main()` run the same
delete-and-reparse refresh the `--refresh-content` CLI flag runs, without
any operator action. These tests pin the wiring (flag off → no refresh;
flag on → refresh runs; explicit flag always runs) without touching the
real importer internals — every collaborator is faked out.
"""

import pytest

import seed.import_seed as importer
from backend.config import settings


@pytest.fixture
def fake_importer(monkeypatch):
    """Stub out main()'s collaborators, recording the call order."""
    calls: list[str] = []

    async def fake_create_tables():
        calls.append("create_tables")

    async def fake_system_user(db):
        calls.append("system_user")
        return None

    async def fake_import_schema(db, user):
        calls.append("schema")

    async def fake_refresh(db):
        calls.append("refresh")
        return 7

    async def fake_promote(db):
        calls.append("promote")

    monkeypatch.setattr(importer, "create_tables", fake_create_tables)
    monkeypatch.setattr(importer, "get_or_create_system_user", fake_system_user)
    monkeypatch.setattr(importer, "import_schema", fake_import_schema)
    monkeypatch.setattr(importer, "_refresh_content", fake_refresh)
    monkeypatch.setattr(importer, "_promote_admin_email", fake_promote)
    return calls


async def test_flag_off_keeps_skip_if_exists_boot(fake_importer, monkeypatch):
    """Default posture: boot never touches existing content."""
    monkeypatch.setattr(settings, "content_refresh_on_boot", False)

    code = await importer.main(refresh_content=False)

    assert code == 0
    assert "refresh" not in fake_importer
    assert fake_importer == ["create_tables", "system_user", "schema", "promote"]


async def test_flag_on_refreshes_on_boot(fake_importer, monkeypatch):
    """CONTENT_REFRESH_ON_BOOT=true runs the refresh with no CLI flag."""
    monkeypatch.setattr(settings, "content_refresh_on_boot", True)

    code = await importer.main(refresh_content=False)

    assert code == 0
    assert "refresh" in fake_importer
    # Refresh happens after the schema merge, before the admin promotion
    # and the final commit inside main().
    assert fake_importer.index("refresh") > fake_importer.index("schema")


async def test_explicit_flag_refreshes_even_with_env_off(fake_importer, monkeypatch):
    """--refresh-content keeps working regardless of the env flag."""
    monkeypatch.setattr(settings, "content_refresh_on_boot", False)

    await importer.main(refresh_content=True)

    assert "refresh" in fake_importer
