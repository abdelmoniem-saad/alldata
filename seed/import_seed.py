"""Import seed data from YAML/Markdown files into the database.

Usage: python -m seed.import_seed
"""

import asyncio
import json
import re
import uuid
from pathlib import Path

import yaml
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import Base, async_session, engine
from backend.models.content_block import ContentBlock, ExplanationLayer
from backend.models.edge import EdgeType, TopicEdge
from backend.models.misconception import Misconception
from backend.models.topic import Topic, TopicStatus
from backend.models.user import User, UserRole

# I — Dynamic Topic View: directive helpers
#
# Two directive forms coexist:
#   1. Single-line:  <!-- block: plot, spec: gaussian_pdf, anchor: bell-curve -->
#      The directive carries everything; no body, no closing tag.
#   2. Multi-line:   <!-- block: callout, kind: insight -->
#                    body...
#                    <!-- /block -->
#      Body sits between the open and close tags. Sections inside the body
#      are NOT split on `---` so authors can use normal markdown freely.
#
# The parser extracts multi-line blocks first (they own their own delimiters),
# leaves placeholders, then splits the remainder on `\n---\n` and applies the
# legacy single-line directive matchers from the original implementation.

_MULTILINE_BLOCK_TYPES = {
    "step_through", "callout", "derivation", "decision", "playground",
    # `misconception` is multi-line when authored with the new closing tag
    # form. The legacy single-line `<!-- block: misconception -->` is still
    # matched by the section-loop regex below.
    "misconception",
}
# Single-line block types that own their own placeholder so they survive the
# `---` splitter and never get merged into surrounding prose.
_SINGLE_LINE_BLOCK_TYPES = {"plot", "state", "state_reset"}
_DIRECTIVE_OPEN_RE = re.compile(
    r"<!--\s*block:\s*(?P<type>[a-z_]+)(?P<rest>[^>]*?)-->",
    re.IGNORECASE,
)
_DIRECTIVE_CLOSE_RE = re.compile(r"<!--\s*/block\s*-->", re.IGNORECASE)


def _parse_directive_attrs(rest: str) -> dict:
    """Parse `, key: value, key2: value2` into a dict.

    Values may be unquoted slugs, double-quoted strings, or YAML-ish inline
    objects (`{a: 1, b: 2}`) / arrays (`[a, b]`). For inline objects/arrays we
    re-use yaml.safe_load over the raw value substring so authors get the full
    YAML inline syntax for free without writing a tokenizer.
    """
    rest = rest.strip().lstrip(",").strip()
    if not rest:
        return {}
    # Try parsing as a single YAML mapping by wrapping in braces if missing.
    try:
        body = rest if rest.startswith("{") else "{" + rest + "}"
        loaded = yaml.safe_load(body)
        if isinstance(loaded, dict):
            return loaded
    except yaml.YAMLError:
        pass
    # Fallback: comma-split key:value pairs (best effort).
    out: dict = {}
    for chunk in rest.split(","):
        if ":" not in chunk:
            continue
        key, value = chunk.split(":", 1)
        out[key.strip()] = value.strip().strip('"').strip("'")
    return out


def _extract_multiline_blocks(text: str) -> tuple[str, list[dict]]:
    """Pull out every `<!-- block: TYPE ... --> ... <!-- /block -->` pair.

    Returns (text_with_placeholders, blocks). Placeholders are `\n@@BLOCK_N@@\n`
    sentinels that survive the later `\n---\n` split untouched.
    """
    blocks: list[dict] = []
    out_chunks: list[str] = []
    cursor = 0
    while True:
        m = _DIRECTIVE_OPEN_RE.search(text, cursor)
        if not m:
            out_chunks.append(text[cursor:])
            break
        block_type = m.group("type").lower()
        if block_type in _SINGLE_LINE_BLOCK_TYPES:
            # Self-contained directive — capture as a placeholder so it doesn't
            # get glommed into surrounding prose by the `---` splitter.
            out_chunks.append(text[cursor:m.start()])
            attrs = _parse_directive_attrs(m.group("rest"))
            blocks.append({"type": block_type, "attrs": attrs, "body": ""})
            out_chunks.append(f"\n@@BLOCK_{len(blocks) - 1}@@\n")
            cursor = m.end()
            continue
        if block_type not in _MULTILINE_BLOCK_TYPES:
            # Unknown directive — leave it for the legacy splitter (matches
            # the original code_python / quiz / legacy misconception flows).
            out_chunks.append(text[cursor:m.end()])
            cursor = m.end()
            continue
        close = _DIRECTIVE_CLOSE_RE.search(text, m.end())
        if not close:
            # Unterminated multi-line block — emit as-is.
            out_chunks.append(text[cursor:m.end()])
            cursor = m.end()
            continue
        out_chunks.append(text[cursor:m.start()])
        attrs = _parse_directive_attrs(m.group("rest"))
        body = text[m.end():close.start()].strip()
        blocks.append({"type": block_type, "attrs": attrs, "body": body})
        out_chunks.append(f"\n@@BLOCK_{len(blocks) - 1}@@\n")
        cursor = close.end()
    return "".join(out_chunks), blocks


def _build_multiline_block(spec: dict, sort_order: int, layer: str) -> dict | None:
    """Convert an extracted multiline block into a row dict for ContentBlock."""
    btype = spec["type"]
    attrs = spec["attrs"]
    body = spec["body"]
    anchor = attrs.get("anchor")
    # Preserve branch-filter attrs on every block type so ScrollReader's
    # `depends_on`/`branch` gating works regardless of which block-type was
    # tagged. These keys are passive metadata — renderers ignore them.
    branch_extras = {
        k: attrs[k] for k in ("depends_on", "branch") if k in attrs
    }

    if btype == "step_through":
        # Body is a numbered markdown list; split on lines starting with `\d+.`.
        steps = re.split(r"\n(?=\d+\.\s)", body.strip())
        steps = [re.sub(r"^\d+\.\s*", "", s).strip() for s in steps if s.strip()]
        meta = {"steps": steps, **branch_extras}
        if "auto_play" in attrs:
            meta["auto_play"] = bool(attrs["auto_play"])
        return {
            "block_type": "step_through",
            "content": body,
            "sort_order": sort_order,
            "layer": layer,
            "anchor": anchor,
            "meta": json.dumps(meta),
        }

    if btype == "callout":
        kind = attrs.get("kind", "insight")
        return {
            "block_type": "callout",
            "content": body,
            "sort_order": sort_order,
            "layer": layer,
            "anchor": anchor,
            "meta": json.dumps({"kind": kind, **branch_extras}),
        }

    if btype == "derivation":
        meta = {
            "title": attrs.get("title", "Derivation"),
            "collapsed": bool(attrs.get("collapsed", True)),
            **branch_extras,
        }
        return {
            "block_type": "derivation",
            "content": body,
            "sort_order": sort_order,
            "layer": layer,
            "anchor": anchor,
            "meta": json.dumps(meta),
        }

    if btype == "decision":
        # Body is a YAML document describing question/options/correct/reveals/...
        try:
            spec_doc = yaml.safe_load(body) or {}
        except yaml.YAMLError as exc:
            print(f"  Warning: decision block has invalid YAML body: {exc}")
            spec_doc = {}
        spec_doc = {**spec_doc, **branch_extras}
        return {
            "block_type": "decision",
            "content": body,
            "sort_order": sort_order,
            "layer": layer,
            "anchor": anchor,
            "meta": json.dumps(spec_doc),
        }

    if btype == "playground":
        try:
            spec_doc = yaml.safe_load(body) or {}
        except yaml.YAMLError as exc:
            print(f"  Warning: playground block has invalid YAML body: {exc}")
            spec_doc = {}
        spec_doc = {**spec_doc, **branch_extras}
        return {
            "block_type": "playground",
            "content": body,
            "sort_order": sort_order,
            "layer": layer,
            "anchor": anchor,
            "meta": json.dumps(spec_doc),
        }

    if btype == "misconception":
        # Inline misconceptions render in flow as a `misconception_inline`
        # content block. (Non-inline misconceptions go through the legacy
        # single-line `<!-- block: misconception -->` path which writes a
        # Misconception row instead of a content block.)
        if attrs.get("inline") is True or attrs.get("inline") == "true":
            return {
                "block_type": "misconception_inline",
                "content": body,
                "sort_order": sort_order,
                "layer": layer,
                "anchor": anchor,
                "meta": json.dumps({k: v for k, v in attrs.items() if k != "anchor"}),
            }
        # Without `inline: true` we fall through — caller treats it as no-op
        # so the legacy single-line path stays the single source of truth.
        return None

    # plot/state/state_reset just persist all attrs minus anchor as meta. The
    # branch extras are already inside `attrs`, so we don't need to merge
    # `branch_extras` separately.
    if btype == "plot":
        # Single-line directive captured by `_extract_multiline_blocks` — body
        # is empty. All info lives in attrs (spec, params, binds, ghost).
        meta = {k: v for k, v in attrs.items() if k != "anchor"}
        return {
            "block_type": "plot",
            "content": "",
            "sort_order": sort_order,
            "layer": layer,
            "anchor": anchor,
            "meta": json.dumps(meta),
        }

    if btype == "state":
        # Authoring-only marker — ScrollReader reads `meta.values` and seeds
        # `useTopicState` defaults from it. Stored as an inert content block
        # so reordering / progress tracking can locate it by sort_order.
        meta = {k: v for k, v in attrs.items() if k != "anchor"}
        return {
            "block_type": "state",
            "content": "",
            "sort_order": sort_order,
            "layer": layer,
            "anchor": anchor,
            "meta": json.dumps(meta),
        }

    if btype == "state_reset":
        meta = {k: v for k, v in attrs.items() if k != "anchor"}
        return {
            "block_type": "state_reset",
            "content": "",
            "sort_order": sort_order,
            "layer": layer,
            "anchor": anchor,
            "meta": json.dumps(meta),
        }

    return None

SEED_DIR = Path(__file__).parent


async def create_tables():
    """Create missing tables AND add any columns the model declares but the
    live SQLite schema is missing.

    SQLAlchemy's `create_all` only creates tables that don't exist — it
    silently leaves existing tables alone, so new model columns are dropped
    on the floor unless we ALTER explicitly. The project convention is
    "reimport from seed, not hand-written migrations", which works for fresh
    DBs but bites returning users every time we add a column.

    The helper below runs *after* `create_all` and walks every mapped table
    looking for columns that exist in `Base.metadata` but not in the live DB,
    then issues `ALTER TABLE ... ADD COLUMN`. This stays well within the
    "no migrations" ergonomic — authors don't write or check anything in —
    while making column additions automatic.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_self_heal_columns)


def _self_heal_columns(conn) -> None:
    """Add any columns declared on the model but missing in the live DB."""
    from sqlalchemy import inspect, text

    inspector = inspect(conn)
    for table in Base.metadata.sorted_tables:
        if not inspector.has_table(table.name):
            continue
        live_cols = {col["name"] for col in inspector.get_columns(table.name)}
        for col in table.columns:
            if col.name in live_cols:
                continue
            # Compile column type to a SQL string for the dialect we're on.
            col_type = col.type.compile(dialect=conn.dialect)
            nullable = "" if col.nullable else " NOT NULL"
            print(f"  Self-heal: adding column {table.name}.{col.name} ({col_type})")
            conn.execute(
                text(f'ALTER TABLE {table.name} ADD COLUMN {col.name} {col_type}{nullable}')
            )


async def get_or_create_system_user(db: AsyncSession) -> User:
    """Get or create a system user for seed data."""
    result = await db.execute(select(User).where(User.email == "system@alldata.dev"))
    user = result.scalar_one_or_none()
    if user:
        return user

    user = User(
        email="system@alldata.dev",
        display_name="AllData System",
        hashed_password="not-a-real-password",
        role=UserRole.ADMIN.value,
    )
    db.add(user)
    await db.flush()
    return user


def parse_content_file(content_path: Path) -> list[dict]:
    """Parse a content markdown file into content blocks."""
    if not content_path.exists():
        return []

    text = content_path.read_text(encoding="utf-8")
    blocks = []
    current_layer = ExplanationLayer.BOTH.value

    # Pull out every multi-line block (open tag + body + closing /block tag) and
    # replace with placeholders so they survive the legacy `---` splitter.
    text, multiline_blocks = _extract_multiline_blocks(text)

    # Split on horizontal rules (---)
    sections = re.split(r"\n---\n", text)

    sort_order = 0
    placeholder_re = re.compile(r"@@BLOCK_(\d+)@@")
    for section in sections:
        section = section.strip()
        if not section:
            continue

        # Multi-line block placeholder — emit any preceding markdown, then the
        # extracted block. Multiple placeholders in one section are handled in
        # order. Markdown around them is salvaged.
        if "@@BLOCK_" in section:
            cursor = 0
            for ph in placeholder_re.finditer(section):
                pre = section[cursor:ph.start()].strip()
                pre = re.sub(r"<!--.*?-->", "", pre).strip()
                if pre:
                    blocks.append({
                        "block_type": "markdown",
                        "content": pre,
                        "sort_order": sort_order,
                        "layer": current_layer,
                    })
                    sort_order += 1
                idx = int(ph.group(1))
                ml_block = _build_multiline_block(multiline_blocks[idx], sort_order, current_layer)
                if ml_block is not None:
                    blocks.append(ml_block)
                    sort_order += 1
                cursor = ph.end()
            tail = section[cursor:].strip()
            tail = re.sub(r"<!--.*?-->", "", tail).strip()
            if tail:
                blocks.append({
                    "block_type": "markdown",
                    "content": tail,
                    "sort_order": sort_order,
                    "layer": current_layer,
                })
                sort_order += 1
            continue

        # Check for layer directive
        layer_match = re.match(r"<!--\s*layer:\s*(\w+)\s*-->", section)
        if layer_match:
            current_layer = layer_match.group(1)
            section = section[layer_match.end():].strip()
            if not section:
                continue

        # NB: single-line `plot`/`state`/`state_reset` directives are extracted
        # earlier by `_extract_multiline_blocks` into placeholders, so they
        # never reach this point as raw HTML comments.

        # Check for code block
        code_match = re.search(
            r"<!--\s*block:\s*(code_python|simulation|code_r).*?-->\s*```python\n(.*?)```",
            section,
            re.DOTALL,
        )
        if code_match:
            block_type = code_match.group(1)
            code = code_match.group(2).strip()
            is_editable = "editable: true" in section

            # Extract expected output if present
            output_match = re.search(
                r"<!--\s*expected_output:\s*(.*?)-->", section
            )
            expected_output = output_match.group(1).strip() if output_match else None

            # Get any preceding markdown
            pre_text = section[:code_match.start()].strip()
            pre_text = re.sub(r"<!--.*?-->", "", pre_text).strip()
            if pre_text:
                blocks.append({
                    "block_type": "markdown",
                    "content": pre_text,
                    "sort_order": sort_order,
                    "layer": current_layer,
                })
                sort_order += 1

            # I — anchor + auto_run extras for code blocks
            anchor_match = re.search(r"anchor:\s*([\w-]+)", section)
            anchor = anchor_match.group(1) if anchor_match else None
            auto_run = "auto_run: true" in section
            code_meta = {"auto_run": True} if auto_run else None
            blocks.append({
                "block_type": block_type,
                "content": code,
                "sort_order": sort_order,
                "layer": current_layer,
                "expected_output": expected_output,
                "is_editable": is_editable,
                "anchor": anchor,
                "meta": json.dumps(code_meta) if code_meta else None,
            })
            sort_order += 1
            continue

        # Check for misconception block
        if "<!-- block: misconception -->" in section:
            section = section.replace("<!-- block: misconception -->", "").strip()
            # Parse misconception format
            title_match = re.search(r'\*\*Misconception:\s*"(.+?)"\*\*', section)
            wrong_match = re.search(r"\*Wrong belief:\*\s*(.+?)(?:\n\n|\n\*)", section, re.DOTALL)
            correct_match = re.search(r"\*Correction:\*\s*(.+?)(?:\n\n|\n\*)", section, re.DOTALL)
            why_match = re.search(r"\*Why this is common:\*\s*(.+?)$", section, re.DOTALL)

            blocks.append({
                "block_type": "misconception",
                "title": title_match.group(1) if title_match else "Common Misconception",
                "wrong_belief": wrong_match.group(1).strip() if wrong_match else "",
                "correction": correct_match.group(1).strip() if correct_match else "",
                "why_common": why_match.group(1).strip() if why_match else None,
            })
            sort_order += 1
            continue

        # Check for quiz block
        if "<!-- block: quiz -->" in section:
            section = section.replace("<!-- block: quiz -->", "").strip()

            # Extract solution if present
            solution_match = re.search(r"<!--\s*solution:\s*(.+?)-->", section, re.DOTALL)
            solution = solution_match.group(1).strip() if solution_match else None
            if solution_match:
                section = section[:solution_match.start()].strip()

            hint_match = re.search(r"\*Hint:\*\s*(.+?)$", section, re.DOTALL)
            hint = hint_match.group(1).strip() if hint_match else None
            content = section[:hint_match.start()].strip() if hint_match else section

            blocks.append({
                "block_type": "quiz",
                "content": content,
                "sort_order": sort_order,
                "layer": current_layer,
                "hint": hint,
                "solution": solution,
            })
            sort_order += 1
            continue

        # Default: markdown block
        clean = re.sub(r"<!--.*?-->", "", section).strip()
        if clean:
            blocks.append({
                "block_type": "markdown",
                "content": clean,
                "sort_order": sort_order,
                "layer": current_layer,
            })
            sort_order += 1

    return blocks


async def import_schema(db: AsyncSession, user: User):
    """Import the graph schema from seed/schema.yaml."""
    existing_topics = await db.scalar(select(func.count(Topic.id)))
    schema_exists = existing_topics and existing_topics > 0

    schema_path = SEED_DIR / "schema.yaml"
    with open(schema_path, encoding="utf-8") as f:
        schema = yaml.safe_load(f)

    if schema_exists:
        print(f"Found {existing_topics} existing topics — will add content to topics without it")
        # Build topic_map from existing DB
        result = await db.execute(select(Topic))
        all_topics = result.scalars().all()
        topic_map: dict[str, Topic] = {t.slug: t for t in all_topics}
    else:
        # Create domain topics (depth 0)
        domain_topics: dict[str, Topic] = {}
        for domain in schema.get("domains", []):
            topic = Topic(
                slug=domain["slug"],
                title=domain["title"],
                summary=domain.get("description"),
                depth=0,
                domain=domain["slug"],
                status=TopicStatus.PUBLISHED.value,
                created_by=user.id,
            )
            db.add(topic)
            domain_topics[domain["slug"]] = topic

        await db.flush()

        # Create topics (depth 2)
        topic_map = {}
        for topic_data in schema.get("topics", []):
            domain_slug = topic_data.get("domain")
            parent = domain_topics.get(domain_slug)

            topic = Topic(
                slug=topic_data["slug"],
                title=topic_data["title"],
                summary=topic_data.get("summary"),
                parent_id=parent.id if parent else None,
                depth=2,
                domain=domain_slug,
                difficulty=topic_data.get("difficulty"),
                status=TopicStatus.PUBLISHED.value,
                created_by=user.id,
            )
            db.add(topic)
            topic_map[topic_data["slug"]] = topic

        await db.flush()

        # Create prerequisite edges
        for topic_data in schema.get("topics", []):
            slug = topic_data["slug"]
            target = topic_map.get(slug)
            if not target:
                continue

            for prereq_slug in topic_data.get("prerequisites", []):
                source = topic_map.get(prereq_slug)
                if not source:
                    print(f"  Warning: prerequisite '{prereq_slug}' for '{slug}' not found")
                    continue

                edge = TopicEdge(
                    source_id=source.id,
                    target_id=target.id,
                    edge_type=EdgeType.PREREQUISITE.value,
                )
                db.add(edge)

        await db.flush()

        # Create edges from domain root nodes to their entry topics
        # Entry topics = topics whose prerequisites all lie outside the domain
        domain_entry_topics: dict[str, list[str]] = {}
        for topic_data in schema.get("topics", []):
            domain_slug = topic_data.get("domain")
            prereqs = topic_data.get("prerequisites", [])
            # Get domains of all prereqs
            prereq_domains = set()
            for ps in prereqs:
                pd = next((t.get("domain") for t in schema["topics"] if t["slug"] == ps), None)
                prereq_domains.add(pd)
            # If no prereqs are from the same domain, this is an entry topic
            if domain_slug not in prereq_domains:
                domain_entry_topics.setdefault(domain_slug, []).append(topic_data["slug"])

        for domain_slug, entry_slugs in domain_entry_topics.items():
            root = domain_topics.get(domain_slug)
            if not root:
                continue
            for entry_slug in entry_slugs:
                entry_topic = topic_map.get(entry_slug)
                if not entry_topic:
                    continue
                edge = TopicEdge(
                    source_id=root.id,
                    target_id=entry_topic.id,
                    edge_type=EdgeType.PREREQUISITE.value,
                    description=f"Part of {root.title}",
                )
                db.add(edge)

        await db.flush()

    # Import content for topics that have content files
    topics_dir = SEED_DIR / "topics"
    content_added = 0
    if topics_dir.exists():
        for domain_dir in topics_dir.iterdir():
            if not domain_dir.is_dir():
                continue
            for topic_dir in domain_dir.iterdir():
                if not topic_dir.is_dir():
                    continue

                content_path = topic_dir / "content.md"
                meta_path = topic_dir / "meta.yaml"

                if not meta_path.exists():
                    continue

                with open(meta_path, encoding="utf-8") as f:
                    meta = yaml.safe_load(f)

                slug = meta.get("slug", topic_dir.name)
                topic = topic_map.get(slug)
                if not topic:
                    print(f"  Warning: topic '{slug}' not in schema")
                    continue

                # Check if topic already has content blocks
                existing_blocks = await db.scalar(
                    select(func.count(ContentBlock.id)).where(
                        ContentBlock.topic_id == topic.id
                    )
                )
                if existing_blocks and existing_blocks > 0:
                    continue  # Skip topics that already have content

                # Update topic with meta info
                if meta.get("has_formal_layer"):
                    topic.has_formal_layer = True
                    topic.has_intuition_layer = True

                # Parse and add content blocks
                blocks = parse_content_file(content_path)
                for block_data in blocks:
                    if block_data["block_type"] == "misconception":
                        misc = Misconception(
                            topic_id=topic.id,
                            title=block_data["title"],
                            wrong_belief=block_data["wrong_belief"],
                            correction=block_data["correction"],
                            why_common=block_data.get("why_common"),
                        )
                        db.add(misc)
                    else:
                        block = ContentBlock(
                            topic_id=topic.id,
                            block_type=block_data["block_type"],
                            content=block_data.get("content", ""),
                            sort_order=block_data.get("sort_order", 0),
                            layer=block_data.get("layer", "both"),
                            expected_output=block_data.get("expected_output"),
                            is_editable=block_data.get("is_editable", False),
                            hint=block_data.get("hint"),
                            solution=block_data.get("solution"),
                            anchor=block_data.get("anchor"),
                            meta=block_data.get("meta"),
                        )
                        db.add(block)

                content_added += 1
                print(f"  Added content for: {slug}")

    await db.flush()
    if schema_exists:
        print(f"Added content to {content_added} topics")
    else:
        print(f"Imported {len(domain_topics)} domains, {len(topic_map)} topics, content for {content_added}")


async def main():
    print("Creating database tables...")
    await create_tables()

    async with async_session() as db:
        print("Creating system user...")
        user = await get_or_create_system_user(db)

        print("Importing schema and content...")
        await import_schema(db, user)

        await db.commit()
        print("Done!")


if __name__ == "__main__":
    asyncio.run(main())
