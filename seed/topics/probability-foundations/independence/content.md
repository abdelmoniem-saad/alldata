<!-- block: state, values: {prior: 0.5, sensitivity: 0.5, specificity: 0.5, treatment_strategy: "none"} -->

<!-- block: plot, spec: population_dot_grid, params: {prior: 0.5, sensitivity: 0.5, specificity: 0.5, treatment_strategy: "none"}, anchor: indep-grid, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "The spark" -->

# Independence

Two events are *independent* when learning one tells you nothing about the other. That sounds obvious. The math has a sharper claim: $P(A \cap B) = P(A) \cdot P(B)$ — exactly. Off by one rounding error and they're not independent.

---

<!-- block: gear, n: 2, label: "Intuition" -->

## What "tells you nothing" means

Flip two fair coins. The first comes up heads. Did that change your belief about the second? It shouldn't — the coins don't communicate. That's independence.

Now draw two cards from one deck without replacing. The first is the queen of hearts. Does that change your belief about the second? Of course — there are now 51 cards left, no queens of hearts among them. The cards aren't independent.

The math: events are **independent** iff

$$P(A \cap B) = P(A) \cdot P(B)$$

Equivalently, knowing $B$ doesn't move $P(A)$:

$$P(A \mid B) = P(A)$$

Either form works. Pick the one that's easier to check.

---

<!-- block: gear, n: 3, label: "The decision" -->

<!-- block: decision, anchor: indep-pick -->
question: |
  A class has 100 students. 50 are women, 50 are men. 50 study statistics, 50
  don't. Among women, 30 study statistics. Are gender and "studies statistics"
  independent in this class?
options:
  - id: a
    label: "Yes — half the class is women, half studies statistics, so they're independent"
    writes: { sensitivity: 0.5 }
    response: |
      The 50/50 marginal split is necessary but not sufficient. Independence
      requires that the *joint* distribution factor as the product of marginals.
      Among women, $P(\text{stats}) = 30/50 = 0.6$. Overall, $P(\text{stats}) = 0.5$.
      Knowing the student is a woman *raises* the probability they study stats
      by 10 points — that's a dependency, not independence.
  - id: b
    label: "No — among women, P(stats) = 0.6, but overall P(stats) = 0.5. Knowing gender shifts the probability."
    writes: { sensitivity: 0.6 }
    response: |
      Right. The joint $P(\text{woman} \cap \text{stats}) = 30/100 = 0.3$, but
      the product of marginals is $P(\text{woman}) \cdot P(\text{stats}) =
      0.5 \cdot 0.5 = 0.25$. They aren't equal — gender and "studies statistics"
      are *not* independent in this class.
  - id: c
    label: "It depends on the rest of the class — we don't have enough information"
    writes: { sensitivity: 0.5 }
    response: |
      We have all the information needed. The 50/50/30 trio fixes the entire
      joint table: 30 women-stats, 20 women-not-stats, 20 men-stats, 30
      men-not-stats. From that you can compute $P(A \cap B) = 0.3$ vs.
      $P(A) \cdot P(B) = 0.25$ — they don't match, so the events aren't
      independent.
correct: b
<!-- /block -->

---

<!-- block: callout, kind: insight, depends_on: indep-pick, branch: b -->
The clean test for independence is "joint = product of marginals." Marginals alone (the row and column sums) don't tell you. Two distributions can share marginals and disagree on the joint — that's where dependency lives.
<!-- /block -->

<!-- block: callout, kind: insight, depends_on: indep-pick, branch: a|c -->
The trap was reading the marginals (50/50, 50/50) as "everything's symmetric." Symmetric marginals are compatible with independence, but they don't *imply* it. Always check $P(A \cap B) \stackrel{?}{=} P(A) \cdot P(B)$ — that's the only test.
<!-- /block -->

---

<!-- layer: formal -->

<!-- block: gear, n: 4, label: "The formalism" -->

## Formal definition

Events $A$ and $B$ are **independent** iff

$$P(A \cap B) = P(A) \cdot P(B)$$

For three or more events, *pairwise* independence is weaker than *mutual* independence. Mutual independence requires the product rule to hold for every subcollection:

$$P(A_1 \cap \cdots \cap A_k) = \prod_{i=1}^{k} P(A_i)$$

A classic gotcha: roll two dice; let $A$ = "first is even," $B$ = "second is even," $C$ = "sum is even." Each pair is independent, but the triple isn't — knowing two of them determines the third.

<!-- block: derivation, title: "Why independence is symmetric", collapsed: true -->
If $P(A \cap B) = P(A) P(B)$ and $P(B) > 0$, then by definition of conditional probability,

$$P(A \mid B) = \frac{P(A \cap B)}{P(B)} = \frac{P(A) P(B)}{P(B)} = P(A)$$

By symmetry of intersection, the same gives $P(B \mid A) = P(B)$ when $P(A) > 0$. Independence is a property of the *pair*, not of one event "depending on" the other.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Code" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: indep-sim -->
```python
import numpy as np

# Build a 100-student class matching the decision setup. Then check whether
# gender and 'studies statistics' are independent.
np.random.seed(42)

# 30 women-stats, 20 women-not, 20 men-stats, 30 men-not
gender = np.array(['F'] * 50 + ['M'] * 50)
stats = np.array(['S'] * 30 + ['N'] * 20 + ['S'] * 20 + ['N'] * 30)

p_woman = (gender == 'F').mean()
p_stats = (stats == 'S').mean()
p_woman_and_stats = ((gender == 'F') & (stats == 'S')).mean()

print(f"P(woman):       {p_woman:.4f}")
print(f"P(stats):       {p_stats:.4f}")
print(f"P(woman ∩ stats): {p_woman_and_stats:.4f}")
print(f"P(woman) · P(stats): {p_woman * p_stats:.4f}")
print()
if abs(p_woman_and_stats - p_woman * p_stats) < 1e-9:
    print("Independent.")
else:
    print(f"NOT independent — diff = {p_woman_and_stats - p_woman * p_stats:+.4f}")
```

---

<!-- layer: both -->

<!-- block: gear, n: 6, label: "Connections" -->

<!-- block: callout, kind: insight -->
**Where this leads.** Independence is the assumption that makes the rest of probability tractable — most classical results (CLT, law of large numbers, the binomial distribution itself) assume it. **Conditional probability** measures *how* events depend when they're not independent. **Random variables** lift events into numbers, and independence of random variables generalizes the events case.
<!-- /block -->

---

<!-- block: misconception, inline: true -->
**"Disjoint events are independent."**

*Wrong:* if $A$ and $B$ can't both happen, they don't influence each other.

*Correct:* the opposite. If $A$ and $B$ are disjoint and both have positive probability, then $P(A \mid B) = 0$, but $P(A) > 0$ — knowing $B$ happened *eliminates* $A$. That's the strongest possible dependency, not independence. Disjoint and independent are nearly opposite concepts.
<!-- /block -->
