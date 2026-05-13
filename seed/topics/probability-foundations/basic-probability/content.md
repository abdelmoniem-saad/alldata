<!-- block: state, values: {n: 6, p: 0.5} -->

<!-- block: plot, spec: binomial_pmf, params: {n: 6, p: 0.5}, binds: [n, p], anchor: dice-pmf, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "The spark" -->

# Basic probability

Probability is what you do when you can't observe what you want. You don't know which face the die will land on — but you can be precise about how surprised you should be by each one.

---

<!-- block: gear, n: 2, label: "Intuition" -->

## Outcomes, events, probabilities

A **sample space** is the set of every outcome that could happen. Roll a die: $\{1, 2, 3, 4, 5, 6\}$. An **event** is any subset of that — "rolled an even number" is the event $\{2, 4, 6\}$. Probability is a number between 0 and 1 you assign to each event.

Three rules cover almost everything:

1. $P(\Omega) = 1$ — *something* happens.
2. $P(A) \ge 0$ — probabilities aren't negative.
3. For disjoint events, $P(A \cup B) = P(A) + P(B)$.

The third rule has a trap. "Disjoint" means the events can't both happen at once. If they can — if they overlap — you have to subtract the overlap or you'll double-count it.

---

<!-- block: gear, n: 3, label: "The decision" -->

<!-- block: decision, anchor: union-pick -->
question: |
  You roll a fair six-sided die. What's the probability the result is even
  *or* greater than 3? (i.e., $P(E \cup G)$ where $E = \{2,4,6\}$, $G = \{4,5,6\}$.)
options:
  - id: a
    label: "P(E) + P(G) = 3/6 + 3/6 = 1"
    writes: { p: 0.999 }
    response: |
      That gives probability 1 — meaning every roll satisfies the condition. But
      a roll of 1 is neither even nor greater than 3. The events $E$ and $G$
      *overlap* (both contain 4 and 6); summing them double-counts the overlap.
  - id: b
    label: "P(E) + P(G) − P(E ∩ G) = 1 − 2/6 = 4/6"
    writes: { p: 0.667 }
    response: |
      Right. The overlap is $\{4, 6\}$ (probability 2/6) and you subtract it once
      so the rolls in *both* sets aren't counted twice. Four out of six rolls
      satisfy $E \cup G$: $\{2, 4, 5, 6\}$.
  - id: c
    label: "P(E) · P(G) = 1/4"
    writes: { p: 0.25 }
    response: |
      Multiplication is for independent events you want to *both* happen. Here
      we want either-or, which is union, not intersection. (Also: $E$ and $G$
      aren't independent — knowing the roll is even tells you something about
      whether it's > 3.)
correct: b
<!-- /block -->

---

<!-- block: callout, kind: insight, depends_on: union-pick, branch: b -->
The inclusion-exclusion principle generalizes: $P(A \cup B) = P(A) + P(B) - P(A \cap B)$. Whenever events can overlap, you subtract the overlap to avoid double-counting. With three sets you add back the triple overlap, and so on.
<!-- /block -->

<!-- block: callout, kind: insight, depends_on: union-pick, branch: a|c -->
The trap was treating overlapping events like disjoint ones (option a) or confusing union with intersection (option c). The fix is the inclusion-exclusion correction: $P(A \cup B) = P(A) + P(B) - P(A \cap B)$.
<!-- /block -->

---

<!-- layer: formal -->

<!-- block: gear, n: 4, label: "The formalism" -->

## Probability axioms

A **probability measure** $P$ on a sample space $\Omega$ satisfies:

$$P(\Omega) = 1 \qquad P(A) \ge 0 \qquad P\!\left(\bigcup_{i} A_i\right) = \sum_i P(A_i) \text{ for disjoint } A_i$$

The third axiom is **countable additivity**. From these three, every other rule follows — including the inclusion-exclusion formula, the law of total probability, and the complement rule $P(A^c) = 1 - P(A)$.

<!-- block: derivation, title: "Where inclusion-exclusion comes from", collapsed: true -->
$A \cup B$ partitions into three disjoint pieces: $A \setminus B$, $A \cap B$, and $B \setminus A$. By the disjoint-additivity axiom,

$$P(A \cup B) = P(A \setminus B) + P(A \cap B) + P(B \setminus A)$$

But $P(A) = P(A \setminus B) + P(A \cap B)$ and $P(B) = P(B \setminus A) + P(A \cap B)$. Substituting:

$$P(A \cup B) = [P(A) - P(A \cap B)] + P(A \cap B) + [P(B) - P(A \cap B)] = P(A) + P(B) - P(A \cap B)$$
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Code" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: dice-sim -->
```python
import numpy as np

# Simulate the union question. P(even OR > 3) — should land near 4/6 ≈ 0.667.
np.random.seed(42)
n_rolls = 50_000
rolls = np.random.randint(1, 7, n_rolls)

is_even = rolls % 2 == 0
is_gt3 = rolls > 3
is_either = is_even | is_gt3

print(f"P(even):       {is_even.mean():.4f}  (theoretical 3/6 = 0.5000)")
print(f"P(>3):         {is_gt3.mean():.4f}  (theoretical 3/6 = 0.5000)")
print(f"P(even OR >3): {is_either.mean():.4f}  (theoretical 4/6 = 0.6667)")
print(f"P(even AND >3): {(is_even & is_gt3).mean():.4f}  (theoretical 2/6 = 0.3333)")
```

---

<!-- layer: both -->

<!-- block: gear, n: 6, label: "Connections" -->

<!-- block: callout, kind: insight -->
**Where this leads.** Once you can write down sample spaces and events, you can ask: "given that I know $B$ happened, what's the probability of $A$?" That's **conditional probability** — the next stop. Beyond it lies **Bayes' theorem**, which flips the conditional, and **independence**, which formalizes when two events don't constrain each other.
<!-- /block -->

---

<!-- block: misconception, inline: true -->
**"Probabilities of overlapping events add."**

*Wrong:* if 50% of rolls are even and 50% are > 3, then 100% are even-or->3.

*Correct:* you have to subtract the overlap. Even *and* > 3 happens 2/6 of the time, so $P(E \cup G) = 1/2 + 1/2 - 1/3 = 2/3$. The "100%" answer is the giveaway — it's claiming every roll satisfies the condition, which a roll of 1 obviously violates.
<!-- /block -->
