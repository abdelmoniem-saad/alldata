# Forks

A fork is a user-owned, editable copy of one topic. Forks are a learner /
contributor surface — not just a teaching tool. Anyone with an account can
fork any topic, edit its content freely, and share the result by URL.

Introduced in cycle N. See [`cycles.md`](cycles.md#n--fork-model) for the
build history and [`features.md`](features.md) for the rendered-behavior
catalog.

## What a fork is

- A user-owned, editable copy of **one** topic.
- The editable surface is the topic's `content.md` — the same markdown +
  directive language the seed authoring loop uses ([`authoring.md`](authoring.md)).
- Forks are **public** — anyone with the URL can read them.
- One fork per `(user, topic)`. Forking a topic you've already forked
  re-opens the existing fork rather than making a second.

## What a fork is *not*

- **Not a way to change the master topic.** Forks don't propagate. Editing
  a fork never touches the canonical content. Merge-back ("suggest this
  change to master") is a future cycle.
- **Not a way to change the knowledge graph.** Prerequisite edges and the
  topic's place in the graph stay master-only. Per-fork graph overrides are
  a future cycle.
- **Not a copy of someone's progress.** A fork shares *content*, not
  *history*. Reading a fork tracks engagement under a separate
  `fork:{username}:{slug}` key — it never marks the master topic complete.
- **Not editable by anyone but the owner.** Reads are public; writes
  (`PUT` / `DELETE`) are owner-only.

## The lifecycle

1. A signed-in reader opens a topic and clicks **"Fork this topic"** in the
   bottom chrome.
2. The server creates a `TopicFork`, seeding its `markdown_source` from the
   master topic's `content.md`.
3. The reader is redirected to the fork's **editor** (`/u/me/topic/{slug}/edit`).
4. They edit the markdown in the left pane; the right pane previews live
   (debounced parse, ~400ms).
5. They **Save** (button or Cmd/Ctrl-S). The fork is now reachable at
   `/u/{their-username}/topic/{slug}`.
6. They can re-edit, share the URL, or delete the fork. The master is
   untouched throughout.

## URLs

| URL | What |
|---|---|
| `/u/me/forks` | Your forks (card grid, with edit/delete). |
| `/u/{username}/forks` | Anyone's public fork listing (read-only). |
| `/u/{username}/topic/{slug}` | Read someone's fork. |
| `/u/me/topic/{slug}/edit` | The editor for your own fork. |

The `me` segment resolves to the signed-in user. `{username}` matches a
user's `display_name` (fuzzy: case-insensitive, dashes/underscores treated
as spaces) — the same lookup the K7 public-snapshot route uses.

## Authoring inside a fork

- Same directive surface as the seed authoring loop — `gear`, `plot`,
  `decision`, `playground`, `callout`, `derivation`, `code_*`, `graph_view`,
  `dataset`, paired `pair_id` code blocks, everything. See
  [`authoring.md`](authoring.md).
- `--strict` validation is **not** enforced on fork content — a fork can be
  a work in progress. When a directive's YAML body fails to parse, the J3
  parse-error fallback renders the offending block visibly inline (in a
  dashed amber panel) so the author sees exactly what didn't parse.
- The editor's preview pane surfaces parser warnings (unknown plot spec,
  dangling `depends_on`, …) in a strip above the rendered topic.

## Storage model

`TopicFork` (`backend/models/fork.py`) holds `markdown_source` — the
editable source of truth. The blocks a reader sees are produced by parsing
`markdown_source` on every `GET` (no persisted parsed tree). The parser is
the seed importer's `parse_content_md(text)`, shared verbatim between the
import loop and the fork save/preview endpoints.

`content_snapshot` is a legacy column from the table's original (unused)
course-scoped scaffold — the N code paths never read it; it's slated for
removal.

## Merge-back — proposing a fork's content as the new master (O1)

A fork owner can suggest their fork's content replace the master topic's. An ADMIN or EDITOR reviews the diff and accepts or rejects. Accept rewrites the master both in the DB *and* on disk (`seed/topics/{domain}/{slug}/content.md`), so the repo's seed files stay honest as source-of-truth.

**Lifecycle.**

1. Owner edits their fork in `/u/{username}/topic/{slug}/edit` and **saves**.
2. Owner clicks **"Suggest to master"** in the editor's top bar. The button is disabled until the fork is saved — the suggestion snapshots the *saved* `markdown_source`, not in-progress edits.
3. The suggestion appears in `/review` for ADMIN/EDITOR users. The status chip on the fork now reads **"In review"**.
4. The reviewer opens the suggestion → a unified line diff renders master's current `content.md` against the proposed replacement (`MergeDiff`).
5. **Accept** → the master topic's content blocks + misconceptions are replaced from the suggestion's markdown, and the seed `content.md` on disk is rewritten. The fork's chip flips to **"Merged"**. The fork itself is untouched — the owner can keep editing and suggest again.
6. **Reject** → the suggestion is marked `rejected` with an optional reviewer note. The fork's chip reads **"Declined"**. The owner can edit and re-suggest, which creates a fresh pending suggestion.

**Re-suggesting while pending.** One pending suggestion per fork. If the owner clicks the button again while one is already pending, the existing suggestion's `suggested_markdown` snapshot updates in place (the owner is revising). No queue of stale duplicates.

**Why writing the seed file.** Reimport (`python -m seed.import_seed`) skips topics that already have content, so a DB-only accept would survive reimport without divergence. We still write the seed file because the repo's `seed/topics/.../content.md` is the readable source-of-truth a contributor reads; letting it drift out of sync with the DB would be dishonest documentation.

**Review gate.** `ADMIN` and `EDITOR` roles only — mirrors the existing gate on `PUT /api/content/blocks` for direct master edits. `LEARNER` / `CONTRIBUTOR` / `PROFESSOR` who hit `/review` see a clear "not authorized" state.

**Endpoints.** See [`features.md`](features.md#api-surface) for the full row. In short:

- `POST /api/forks/{username}/{slug}/suggest` — owner only.
- `GET  /api/merge-backs` / `GET /api/merge-backs/{id}` — reviewer queue + detail.
- `POST /api/merge-backs/{id}/accept` / `/reject` — apply or close.

**Fork surfaces show suggestion status** via a chip in the lineage banner on `ForkView` and in `ForkEditor`'s top bar. The chip reads "In review" / "Merged" / "Declined" based on the *latest* `MergeBackSuggestion` for that fork; null when the fork has never been suggested.

---

## Not yet (deferred to later cycles)

- **Forking a fork** — multi-level fork chains. N+O keep forks one level
  deep.
- **Signal aggregation** — "which sections get forked / edited most often,"
  surfaced to master-content authors.
- **Per-fork prerequisites / graph structure** — editing the topic's place
  in the knowledge graph.
- **`meta.yaml` editing** — title, difficulty, summary, dataset stay
  master-only. Merge-back accept therefore only ever rewrites
  `content.md`, never `meta.yaml`.
- **Visibility flags** — forks are public-by-default; unlisted / private
  toggles are a follow-on.
- **Fork / suggestion comment threads.**
- **Block-level diff + partial accept** — accept is all-or-nothing on the
  whole `content.md`; the diff is line-level.
- **Merge-back notifications** — owners learn the outcome from the status
  chip on their fork, not a push.
- **Course ↔ fork integration** — a course built from a set of your forks.
  The `TopicFork.course_id` column is reserved for it.
