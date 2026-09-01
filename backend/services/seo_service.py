"""SEO layer, B4 (roadmap "B4"; ledger cycle A).

AllData is a pure SPA — crawlers that don't execute JS see the same default
<title> on every route, so topic content is invisible to search engines
and link previews. Full SSR is deliberately out of scope; instead the SPA
fallback does **targeted meta injection**: for `/topic/{slug}` requests it
swaps the default title/description/OG tags for the topic's own (one cheap
DB query, served from an in-memory index.html template), and
`/sitemap.xml` + `/robots.txt` give crawlers the topic map.

Everything here is read-only presentation; the SPA still boots normally on
top of the injected head.
"""

import html as _html
import re
import time

from fastapi import Request
from sqlalchemy import not_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.models.topic import Topic

_SITEMAP_TTL_SECONDS = 300
_sitemap_cache: tuple[float, str] | None = None


def load_index_template(dist_dir) -> str | None:
    """Read dist/index.html once; None when the SPA isn't built (dev mode)."""
    index = dist_dir / "index.html"
    if not index.is_file():
        return None
    return index.read_text(encoding="utf-8")


def base_url(request: Request) -> str:
    """Canonical origin for sitemap/canonical/og:url.

    Behind the HF proxy the socket peer is internal, so forwarded headers
    win. `SITE_URL` (env) overrides everything when set — recommended for
    deployments behind unusual proxies.
    """
    if settings.site_url:
        return settings.site_url.rstrip("/")
    proto = request.headers.get("x-forwarded-proto", request.url.scheme)
    host = (
        request.headers.get("x-forwarded-host")
        or request.headers.get("host")
        or request.url.netloc
    )
    return f"{proto}://{host}"


def _swap(html: str, pattern: str, replacement: str) -> str:
    out, n = re.subn(pattern, lambda _m: replacement, html, count=1, flags=re.S)
    return out if n else html


def inject_topic_meta(
    template: str, title: str, description: str, canonical_url: str
) -> str:
    """Swap the default head tags for a topic's own.

    Regex over HTML we fully control (dist/index.html is a build artifact
    with known double-quoted attributes) — an SSR framework would be the
    heavyweight answer to the same problem.
    """
    t = _html.escape(title, quote=True)
    d = _html.escape(description, quote=True)
    u = _html.escape(canonical_url, quote=True)

    out = _swap(template, r"<title>.*?</title>", f"<title>{t}</title>")
    out = _swap(
        out,
        r'<meta name="description" content="[^"]*"\s*/?>',
        f'<meta name="description" content="{d}" />',
    )
    out = _swap(
        out,
        r'<meta property="og:title" content="[^"]*"\s*/?>',
        f'<meta property="og:title" content="{t}" />',
    )
    out = _swap(
        out,
        r'<meta property="og:description" content="[^"]*"\s*/?>',
        f'<meta property="og:description" content="{d}" />',
    )
    out = _swap(
        out,
        r'<meta name="twitter:title" content="[^"]*"\s*/?>',
        f'<meta name="twitter:title" content="{t}" />',
    )
    out = _swap(
        out,
        r'<meta name="twitter:description" content="[^"]*"\s*/?>',
        f'<meta name="twitter:description" content="{d}" />',
    )
    out = _swap(
        out,
        r'<meta property="og:type" content="[^"]*"\s*/?>',
        '<meta property="og:type" content="article" />',
    )
    # canonical + og:url don't exist in the template; inject after </title>.
    block = (
        f'<link rel="canonical" href="{u}" />\n'
        f'    <meta property="og:url" content="{u}" />'
    )
    if "</title>" in out:
        out = out.replace("</title>", f"</title>\n    {block}", 1)
    return out


async def build_sitemap(db: AsyncSession, base: str) -> str:
    """Sitemap over published topics. `_meta` domains stay excluded — same
    hidden-surface rule as the graph filter (principles.md #7)."""
    global _sitemap_cache
    now = time.monotonic()
    if _sitemap_cache and now - _sitemap_cache[0] < _SITEMAP_TTL_SECONDS:
        return _sitemap_cache[1].replace("__BASE__", base)

    result = await db.execute(
        select(Topic.slug)
        .where(Topic.status == "published")
        .where(
            not_(Topic.domain.like(r"\_%", escape="\\"))
            | Topic.domain.is_(None)
        )
    )
    slugs = [s for (s,) in result.all()]

    static = ["/", "/explore", "/about", "/datasets", "/path"]
    urls = [base + p for p in static] + [f"{base}/topic/{s}" for s in slugs]
    body = "\n".join(f"  <url><loc>{u}</loc></url>" for u in urls)
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"{body}\n</urlset>"
    )
    # Cache the slug list (base-independent); swap the origin per request.
    _sitemap_cache = (now, xml.replace(base, "__BASE__"))
    return xml
