<!-- block: state, values: {n: 10, p: 0.5} -->

<!-- block: plot, spec: binomial_pmf, params: {n: 10, p: 0.5}, binds: [n, p], anchor: binomial-bars, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "Counting the yeses" -->

# Binomial distribution

Flip a coin ten times and count the heads. Show an ad to a thousand people and count the clicks. Inspect twenty parts and count the defects. Whenever you run the *same* yes/no trial a fixed number of times and add up the successes, the count follows a **binomial distribution**.

It has two dials: $n$, how many trials, and $p$, the success probability of each one.

---

<!-- block: gear, n: 2, label: "A stack of Bernoullis" -->

A binomial is nothing more than $n$ independent Bernoulli($p$) trials, summed. That "independent, identical" assumption is the whole contract: every trial has the same $p$, and no trial's outcome nudges another's. Break it — a coin that warms up, a sample drawn without replacement — and the count is no longer binomial.

The plot on the right shows $n = 10$, $p = 0.5$: the familiar symmetric mound centered on 5. The center sits at $np$, and the spread comes from $np(1-p)$.

---

<!-- block: gear, n: 3, label: "Find the center" -->

<!-- block: decision, anchor: binomial-mode -->
question: |
  A production line runs 5% defective. You pull a box of 20 parts. What's the
  *most likely* number of defective parts in the box?
options:
  - id: zero
    label: "0 — defects are rare, so probably none"
    writes: { n: 20, p: 0.05 }
    response: |
      Close, and 0 is genuinely common here (about a 36% chance) — but it's not
      the center. The distribution's mass concentrates around the *expected*
      count $np = 20 \times 0.05 = 1$. Zero and one are nearly tied, with one
      edging it; both dwarf everything to their right.
  - id: one
    label: "1 — about np = 20 × 0.05"
    writes: { n: 20, p: 0.05 }
    response: |
      Right. The binomial centers on its mean $np = 1$. The plot is now
      right-skewed — most boxes have 0, 1, or 2 defectives and a long thin
      tail beyond. The 5% rate doesn't mean "5 per 100 exactly"; it means the
      count clusters around $np$.
  - id: five
    label: "5 — that's what 5% of 20... no, wait"
    writes: { n: 20, p: 0.05 }
    response: |
      That's $25\%$ of 20, not $5\%$ — a slipped decimal. $5\%$ of 20 is 1, and
      that's where the distribution peaks. Watch the plot: there's essentially
      no mass out at 5.
correct: one
<!-- /block -->

<!-- block: callout, kind: insight, depends_on: binomial-mode, branch: one -->
The mean $np$ tells you where the mass sits; the standard deviation $\sqrt{np(1-p)}$ tells you how wide. For the box of 20 at 5%, that's a mean of 1 and an SD of about $0.97$ — so "1, give or take 1" captures most boxes.
<!-- /block -->

---

<!-- layer: formal -->

<!-- block: gear, n: 4, label: "The formula" -->

For $X \sim \text{Binomial}(n, p)$, the probability of exactly $k$ successes is

$$P(X = k) = \binom{n}{k} p^{k} (1-p)^{\,n-k}, \qquad k = 0, 1, \ldots, n$$

The $\binom{n}{k}$ counts the *orders* in which $k$ successes can land among $n$ trials; $p^k (1-p)^{n-k}$ is the probability of any one such order. Mean and variance follow from the Bernoulli pieces:

$$\mathbb{E}[X] = np \qquad \text{Var}(X) = np(1-p)$$

<!-- block: derivation, title: "Why E[X] = np without touching the binomial coefficient", collapsed: true -->
Write $X = X_1 + X_2 + \cdots + X_n$, where each $X_i \sim \text{Bernoulli}(p)$ is one trial. Expectation is linear — it passes through a sum regardless of dependence — so

$$\mathbb{E}[X] = \sum_{i=1}^{n} \mathbb{E}[X_i] = \sum_{i=1}^{n} p = np.$$

Variance needs the trials to be *independent*; with that, variances add too:

$$\text{Var}(X) = \sum_{i=1}^{n} \text{Var}(X_i) = \sum_{i=1}^{n} p(1-p) = np(1-p).$$
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Exactly, versus at least" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: binomial-sim -->
```python
import numpy as np
from math import comb

# 10 fair flips. The single value k=5 is the mode — but it's still only
# about 1 chance in 4. "Most likely" is not "likely".
n, p = 10, 0.5
p_exactly_5 = comb(n, 5) * p**5 * (1 - p)**(n - 5)
print(f"P(exactly 5 heads) = {p_exactly_5:.4f}")

# Empirical check + P(at least 5), which is much larger than P(exactly 5).
rng = np.random.default_rng(0)
draws = rng.binomial(n, p, 200_000)
print(f"empirical P(exactly 5) = {(draws == 5).mean():.4f}")
print(f"empirical P(5 or more) = {(draws >= 5).mean():.4f}")
print(f"mean = {draws.mean():.3f} (= np {n*p})   var = {draws.var():.3f} (= np(1-p) {n*p*(1-p)})")
```

---

<!-- block: misconception, inline: true -->
**"The most likely outcome is the likely outcome."**

*Wrong:* if 5 heads out of 10 is the most probable count, then 5 heads is what you should expect to see.

*Correct:* exactly 5 heads happens only about $25\%$ of the time. It's the *single tallest bar*, but the other 75% of the mass is spread across the neighbors. With many possible counts, even the mode can be uncommon — which is why "P(exactly $k$)" and "P(at least $k$)" are very different questions.
<!-- /block -->

---

<!-- layer: both -->

<!-- block: gear, n: 6, label: "Where it leads" -->

<!-- block: callout, kind: insight -->
**Where this leads.** Hold $np$ fixed and let $n \to \infty$ with $p \to 0$ and the binomial limits to the **Poisson distribution** — the model for rare-event counts. Hold $p$ fixed and let $n$ grow and the standardized count limits to the **normal distribution** (the central limit theorem in its oldest form). And every test or interval for a **proportion** is binomial machinery underneath.
<!-- /block -->
