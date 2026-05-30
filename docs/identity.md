# Identity

The canonical answer to "what is AllData, and how does it present itself." This is the *name, mark, tagline, voice-in-brief, and the is/isn't* — the things a contributor needs to keep the product feeling like one coherent thing.

It does not duplicate the rest of the doc set; it points at it:
- **Visual system** (color, type, spacing, motion, component vocabulary) → [`brand.md`](brand.md)
- **Positioning, the loop, who it's for** → [`vision.md`](vision.md)
- **Voice for tooling** (the brand-voice `enforce-voice` skill) → [`.claude/brand-voice-guidelines.md`](../.claude/brand-voice-guidelines.md)

---

## The name

**AllData** — one word, camel-cased: `AllData`. Never "Alldata", "all data", "All Data", or "ALLDATA". The only exception is where the platform's own casing is structurally impossible (a lowercased URL host, an all-caps nav label that applies to every item equally).

The name signals the whole field of statistics held as a *single connected surface* — not a pile of separate lessons, but one graph you can see all of and move through.

---

## Tagline

- **Primary:** *Statistics is a graph, not a textbook.*
- **Short (tight spaces):** *Statistics is a graph.*

Use the primary in the hero, social cards, and anywhere the product introduces itself. Use the short form only where width forces it. Don't invent a new tagline per surface — these two are the set.

---

## In one sentence

AllData is a statistics learning surface where every concept is a guided simulation: you commit to an answer, watch the consequence play out on a live visualization, then read the explanation on top of the choice you just made. **Ask → act → explain.**

---

## The mark

A small **graph**: three nodes (a triad) joined by edges, inside a rounded square, in the one accent teal. The mark *is* the product's thesis — the field is a graph — so it's not decoration that could be swapped for anything else.

- Implemented as `<Logo>` (`frontend/src/components/Logo.tsx`). The favicon is derived from the same geometry so the browser tab and the navbar never drift.
- **Wordmark:** "AllData" set in Inter (`--font-sans`), weight 800, -0.5px tracking, in `--color-text`. Mark on the left, wordmark on the right, vertically centered. A mark-only variant exists for tight spots (favicon, mobile).

**Don't:** recolor the mark (there is exactly one accent — teal), introduce a second accent, stretch or re-space the wordmark, set it in another typeface, or add a gradient / drop-shadow. The mark is flat teal on its rounded square; that's the whole treatment.

---

## Voice, in brief

Direct, specific, no marketing language. Write the way a careful colleague explains something at a whiteboard — the reader is a *peer who wants to understand the math*, not a customer to be sold. Sentence case in UI. Math is allowed to be hairy; prose is not. Zero emoji.

Three quick tells:
- **Lead with the concrete claim.** Skip the warm-up, skip the hype words. "Bayes' Theorem flips a conditional," not "Bayes' Theorem is a powerful tool that revolutionizes…"
- **Say "reader", "topic", "the graph"** — not "user", "course", "lesson plan".
- **A verdict does double duty.** A decision response explains *why* the choice was right or wrong and points the reader at what to look at next on the visible plot.

The full do/don't table and examples live in [`brand.md` §1](brand.md). The machine-readable copy the brand-voice tooling consumes is [`.claude/brand-voice-guidelines.md`](../.claude/brand-voice-guidelines.md).

---

## What it is

- A **guided-simulation** surface for statistics: ask → act → explain.
- A **single knowledge graph** you navigate — the graph view shows the field, the topic view shows the lesson, both in the same vocabulary (domain hue, hairline border, zinc panel, teal accent).
- For the **self-taught practitioner** who has bounced off textbooks (too dry, too long) and watered-down courseware (too gamified) and wants a surface that lets them *think*.

## What it is not

- **Not a quiz site.** Decisions exist to make the reader commit before reading; they aren't graded, scored, or aggregated into a result.
- **Not gamified.** Spaced-repetition recall exists — it helps a reader revisit a topic at the right time — but there are no streaks, points, badges, or leaderboards. The cue is quiet, never a score.
- **Not a credentialing platform.** Progress can sync across a reader's devices and be shared as a read-only graph snapshot, but it is never a grade, a certificate, or a signal to anyone but the reader.
- **Not a reference manual.** Topics are lessons with an arc — prior, decision, consequence, formula, derivation — not lookup pages.

*(This list and `vision.md`'s "what it explicitly is not" are kept in sync — if one changes, change both.)*

---

## How to use this doc

- Naming a new surface, writing a headline, or designing a chip? Start here for the voice and the name/tagline rules, then `brand.md` for the tokens.
- Adding anything that carries the mark (a footer, an export, a share card)? Use `<Logo>` — don't hand-draw the SVG again.
- If the product's identity actually shifts (new positioning, a real tagline change), this doc changes first and the surfaces follow.
