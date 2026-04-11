"""Import seed data from YAML/Markdown files into the database.

Usage: python -m seed.import_seed
"""

import asyncio
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

SEED_DIR = Path(__file__).parent


async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


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

    # Split on horizontal rules (---)
    sections = re.split(r"\n---\n", text)

    sort_order = 0
    for section in sections:
        section = section.strip()
        if not section:
            continue

        # Check for layer directive
        layer_match = re.match(r"<!--\s*layer:\s*(\w+)\s*-->", section)
        if layer_match:
            current_layer = layer_match.group(1)
            section = section[layer_match.end():].strip()
            if not section:
                continue

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

            blocks.append({
                "block_type": block_type,
                "content": code,
                "sort_order": sort_order,
                "layer": current_layer,
                "expected_output": expected_output,
                "is_editable": is_editable,
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
