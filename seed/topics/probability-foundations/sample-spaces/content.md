<!-- block: state, values: {prior: 0.5} -->

<!-- block: plot, spec: posterior_update, params: {prior: 0.5, sensitivity: 0.9, specificity: 0.9, observed_result: "positive"}, binds: [prior], anchor: sample-spaces-feel, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "TODO — name the spark" -->

# Sample Spaces and Events

Before you can calculate the probability of *anything*, you need to answer one question: **what could possibly happen?** That set of possibilities is the sample space. Everything else in probability is built on it.

> TODO (N): replace this paragraph with the spark — the sentence or example that makes the reader feel why getting the sample space right matters.

---

<!-- block: gear, n: 2, label: "TODO — name the intuition" -->

## What you mean by "could happen"

A **sample space** $\Omega$ is the complete set of every outcome an experiment could produce. Flip a coin: $\{H, T\}$. Roll a die: $\{1, 2, 3, 4, 5, 6\}$. Draw a card: all 52 cards.

An **event** is any subset of $\Omega$. "Rolled an even number" is the event $\{2, 4, 6\}$. Events combine like sets:

- Union $A \cup B$ — A or B (or both)
- Intersection $A \cap B$ — A and B together
- Complement $A^c$ — not A

> TODO (N): expand on what changes when the sample space is wrong. The "Monty Hall trap" framing or a coin-flips-with-conditional reveal both work.

---

<!-- block: gear, n: 3, label: "TODO — name the mechanic" -->

<!-- block: decision, anchor: sample-spaces-pick -->
question: |
  Two coins are flipped. Someone tells you "at least one is heads." Given
  that information, what's the probability *both* are heads?
options:
  - id: a
    label: "1/2 — once you know one is heads, the other is independent."
    writes: { prior: 0.5 }
    response: |
      The trap: the two flips *are* independent before conditioning, but the
      conditional information changes the sample space. The four equally
      likely outcomes were {HH, HT, TH, TT}; "at least one heads" eliminates
      TT, leaving three equally likely outcomes. Only one of them (HH) has
      both heads.
  - id: b
    label: "1/3 — the condition narrows the sample space to three outcomes."
    writes: { prior: 0.333 }
    response: |
      Right. The original sample space had four equally likely outcomes.
      Conditioning on "at least one heads" removes TT and leaves
      $\{HH, HT, TH\}$ — three outcomes, each still equally likely. Only HH
      has both heads, so $P = 1/3$.
  - id: c
    label: "1/4 — both heads is one of the original four outcomes."
    writes: { prior: 0.25 }
    response: |
      That's the unconditional probability — the answer to "what's the chance
      both flips come up heads" with no extra information. The "at least one
      is heads" condition rules out one of the four outcomes, so the
      denominator shrinks from 4 to 3.
correct: b
<!-- /block -->

> TODO (N): expand the response prose. Add a callout (branch: b) that connects this to conditional probability.

---

<!-- layer: formal -->

<!-- block: gear, n: 4, label: "TODO — name the formalism" -->

## Probability space, formally

A **probability space** is a triple $(\Omega, \mathcal{F}, P)$:

- $\Omega$ is the **sample space** — the set of every possible outcome.
- $\mathcal{F}$ is a **σ-algebra** on $\Omega$ — a collection of subsets (events) closed under complement and countable union.
- $P : \mathcal{F} \to [0, 1]$ is a **probability measure**: $P(\Omega) = 1$, $P(\emptyset) = 0$, and countable additivity for disjoint events.

For a **finite** sample space with equally likely outcomes,

$$P(A) = \frac{|A|}{|\Omega|}$$

> TODO (N): walk through the derivation of conditional probability from the probability-space axioms — that's the natural next step after the decision above.

<!-- block: derivation, title: "Why σ-algebras and not just power sets", collapsed: true -->
> TODO (N): explain why on infinite Ω we need σ-algebras (not the full power set) for the probability measure to exist. Vitali sets, Banach-Tarski as the cautionary tales.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "TODO — name the code" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: sample-spaces-sim -->
```python
import numpy as np

# Two coins, 50,000 flips. Check that the sample space is {HH, HT, TH, TT}
# in equal proportions, then conditionally re-rank to verify the decision above.
np.random.seed(42)
n = 50_000
c1 = np.random.randint(0, 2, n)
c2 = np.random.randint(0, 2, n)

# Encode each outcome as a 2-char string for tallying
labels = np.array([f"{'H' if a else 'T'}{'H' if b else 'T'}" for a, b in zip(c1, c2)])

unique, counts = np.unique(labels, return_counts=True)
print("Unconditional sample space frequencies (each ~0.25):")
for u, c in zip(unique, counts):
    print(f"  {u}: {c/n:.4f}")

# Condition on "at least one heads" — drop TT outcomes
mask = labels != "TT"
print(f"\nP(both heads | at least one heads) = "
      f"{(labels[mask] == 'HH').mean():.4f}  (theoretical 1/3 ≈ 0.3333)")
```

> TODO (N): expand the prose intro to the simulation; explain what the code is checking against the decision above.

---

<!-- layer: both -->

<!-- block: gear, n: 6, label: "Where it leads" -->

<!-- block: callout, kind: insight -->
**Where this leads.** Once you can write down sample spaces and events cleanly, **basic probability** gives you the three axioms that turn them into measures, **conditional probability** formalizes what "at least one is heads" did to the sample space above, and **independence** gives the test for when two events don't constrain each other.
<!-- /block -->
