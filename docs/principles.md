# Principles

The list of constraints already enforced in code. Every new contributor reads this once. Every new feature is checked against it.

---

## 1. Authoring is markdown

A topic is `.md` + directives + `meta.yaml`. No WYSIWYG, no headless CMS, no separate authoring app.

The cost of this principle is that authors learn a small directive vocabulary. The benefit is that lessons live in a Git repo alongside everything else, diffs are readable, prerequisites are grep-able, and the author's loop is *save file → page reflects within ~1 second* via `python -m seed.watch`. Any feature that proposes adding a parallel authoring surface (a CMS, a UI editor, an "easier" web form) needs to argue against this principle explicitly.

## 2. Aesthetic is locked: Laboratory Monolith

Zinc surfaces, muted jewel domain accents, one teal accent, hairline borders. Every new component reads as a quiet, deliberate element.

The aesthetic name comes from the vibe the surface aims for: a working scientist's notebook, not a marketing page. Visual choices that work: `var(--color-bg-secondary)` panels, 1px borders, small-caps labels, the existing five domain hues, the single teal accent for "this is what's interactive." Visual choices that don't: gradients, glows, drop shadows on content, oversized iconography, pastel color expansions.

## 3. No gamification

No points, badges, streaks, confetti, level-ups, celebratory animations. Verdict comes through response text and a single accent bar.

The reader is here to learn statistics, not to collect rewards. A wrong decision colors the relevant accent bar amber and shows the response text that explains the mistake. A right decision colors it teal and shows the response text that affirms the reasoning. The plot recolors regardless. That's the entire feedback loop. No "Great job!" no XP, no progress avatar.

## 4. Layer pedagogy: intuition, formal, both

Every topic exposes one or more layers. The reader chooses depth; the surface honors it.

The intuition layer is felt understanding — analogies, decisions, playgrounds, dot grids. The formal layer is the math — proofs, derivations, measure-theoretic statements. Topics that have both let the reader toggle between them; topics that have only one don't pretend to offer the other. The toggle in the chrome is the reader's way of asking "show me more rigor" or "show me less."

## 5. One plot system

Decisions, playgrounds, and static visuals all write to / read from a single `useTopicState` bag. There is no separate sim engine.

This is the architectural payoff of the I-cycle. A decision dispatches a state write, the plot subscribes to that key, the plot recolors. A playground slider writes the same way. A static `<!-- block: plot -->` reads from the same state. Authors think in one model — *what state does this topic have, and what plots show it?* — and renderers don't have to coordinate between a sim and a plot because there isn't one.

## 6. Reduced-motion and color-blind safe by default

Every animation gates on `prefers-reduced-motion`; every color carries luminance contrast independent of hue.

The motion gate is non-negotiable: every transition, every stagger, every crossfade short-circuits to instant under the user's stated preference. The luminance rule is the achromatopsia-safe constraint — every domain hue is distinguishable on its luminance value alone, so a reader with no color vision can still tell domains apart by darkness. New hues must pass the same test. New animations must inherit the same gate.

## 7. Reimport-from-seed is the migration story

Schema changes ship alongside a `python -m seed.import_seed` run, not hand-written SQL.

Topics live in `seed/topics/{domain}/{slug}/` as the source of truth. The database is a derived artifact. Adding a column to a model means: edit the model, run the importer, and the importer's self-healing pass adds the column to the live DB. There are no Alembic migrations, no manual SQL, no migration ordering to track. If a change can't be expressed by re-running the importer, it's the wrong change.

---

## How to use this list

When proposing a change, name which principle it touches. If the change strengthens a principle, say so and ship. If it weakens one, the change either needs to be redesigned or the principle needs to be revised explicitly — the principle doesn't get bent silently. New principles get added through the same kind of review and only when an actual constraint repeatedly bites.
