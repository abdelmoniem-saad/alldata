# Vision

## What this is

A statistics learning surface where every concept is a guided simulation. Reading is the fallback, not the goal. The reader meets each idea by being asked to commit to an answer, watching the consequence play out on a live visualization, and then seeing the explanation land on top of the mistake or the win they just made.

The graph view shows the field. The topic view shows the lesson. Both speak the same vocabulary — domain hue, hairline border, zinc panel, teal accent — so the surface stays out of the way of the math.

## Who it's for

The self-taught practitioner who has bounced off textbooks (too dry, too long, too far from a felt understanding) and bounced off courseware (too watered-down, too gamified, too much "drag the right answer into the box"). They already know how to read; they want a surface that lets them *think*.

Specifically: working programmers, researchers in adjacent fields, and students who want a second source on the material their course handed them. The platform assumes literacy in basic algebra and a willingness to read math notation — it doesn't try to teach those.

## What it explicitly is not

- **Not a quiz site.** Decisions exist to make the reader commit before reading; they aren't graded, scored, or aggregated.
- **Not a flashcard app.** No spaced repetition, no streak counter, no "review queue." The graph and the topic are the only navigation.
- **Not a reference manual.** Topics are lessons with an arc — prior, decision, consequence, formula, derivation — not lookup pages.
- **Not a credentialing platform.** No certificates, no badges, no shareable progress. Progress lives in localStorage and exists to help the reader, not to signal to anyone else.

## The loop

The reader's experience inside a topic is **ask → act → explain**.

*Ask.* The topic opens with a decision the reader has to commit to before scrolling. The question is concrete enough that any answer reveals what the reader currently believes. The wrong answers aren't traps; they're the most common ways people approach the question without the formal tool, and they each bend reality in a specific direction.

*Act.* The decision writes into a small pool of topic state. The pinned visualization — already on screen, already showing the population or the curve or the dot grid — recolors itself to reflect the consequence of the choice. The reader doesn't have to imagine what their answer means; they see it. The playground works the same way: sliders write to the same state, the same plot reacts, and a goal predicate tells the reader when they've found something.

*Explain.* The response text lands on top of the visible change. The formal layer follows for readers who want it. The misconception sidebar names the trap the reader may or may not have fallen into. None of this happens until the reader has acted; the lesson is shaped around the commitment, not around the prose.

## What success looks like

A reader finishes a topic and the felt understanding sticks. They could explain to someone else why the false-positive rate dominates the posterior at low prevalence, not because they memorized a formula, but because they watched the dot grid recolor under their own choice. The platform's job is to keep building topics that work that way and to keep the surface around them quiet enough that the math is what the reader remembers.
