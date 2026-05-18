<!-- block: state, values: {n: 1, p: 0.5} -->

<!-- block: plot, spec: binomial_pmf, params: {n: 1, p: 0.5}, binds: [n, p], anchor: bernoulli-feel, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "TODO — name the spark" -->

# Bernoulli Distribution

One trial. Two outcomes. One number that says everything: $p$. The Bernoulli is the smallest distribution worth naming — and the atom every binary process is built from.

> TODO (N): replace this paragraph with the spark. The "coin / click / defect" framing or a single sentence with a concrete real example both work.

---

<!-- block: gear, n: 2, label: "TODO — name the intuition" -->

## Yes-or-no, parameterized

A **Bernoulli** trial has two outcomes: success (1) with probability $p$, failure (0) with probability $1 - p$. The whole distribution is one number.

That's the *point* — the Bernoulli is what you reach for any time the world produces a binary outcome with a stable per-trial probability:

- A/B test: does the user click?
- Manufacturing: is the part defective?
- Free throw: does the ball go in?
- Medical screening: does the test return positive?

The assumption is that **each trial has the same $p$**. If $p$ shifts between trials — over time, between groups, by context — you need a richer model.

> TODO (N): expand on the "constant $p$" assumption. When does it hold? When does it visibly fail? A short example of each.

---

<!-- block: gear, n: 3, label: "TODO — name the mechanic" -->

<!-- block: state_reset, anchor: bernoulli-feel -->

<!-- block: playground, anchor: bernoulli-feel -->
binds: [p]
controls:
  - param: p
    label: "Success probability (p)"
    min: 0.05
    max: 0.95
    step: 0.05
goal:
  prompt: "Make the bar plot heavily favor success — p = 0.85."
  target: { p: 0.85 }
  success_when: "abs(p - 0.85) < 0.05"
  on_success: |
    Notice that the bars never *both* become tall — they trade height with each
    other because they must sum to 1. The variance is $p(1-p)$, which peaks
    at $p = 0.5$ and shrinks toward the edges.
<!-- /block -->

> TODO (N): use this Gear 3 to introduce the variance-peaks-at-0.5 intuition. The playground above hints at it; expand on what that means in plain words.

---

<!-- layer: formal -->

<!-- block: gear, n: 4, label: "TODO — name the formalism" -->

## PMF, mean, variance

A random variable $X \sim \text{Bernoulli}(p)$ has

$$P(X = x) = p^x (1 - p)^{1 - x}, \qquad x \in \{0, 1\}$$

$$\mathbb{E}[X] = p, \qquad \text{Var}(X) = p(1 - p)$$

The variance reaches its maximum $1/4$ at $p = 0.5$ — the point of maximum uncertainty. As $p$ approaches 0 or 1 the outcome becomes nearly deterministic and the variance shrinks toward 0.

The Bernoulli is the $n = 1$ case of the Binomial: $\text{Bernoulli}(p) = \text{Binomial}(1, p)$. Sum $n$ iid Bernoulli($p$) and you get Binomial($n, p$); that's the next topic.

<!-- block: derivation, title: "Why $\text{Var}(X) = p(1-p)$", collapsed: true -->
> TODO (N): walk through $\mathbb{E}[X^2] - (\mathbb{E}[X])^2 = p - p^2 = p(1-p)$. Add the max-at-$p=0.5$ argument via $\frac{d}{dp}[p(1-p)] = 1 - 2p = 0$.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "TODO — name the code" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: bernoulli-sim -->
```python
import numpy as np

# Bernoulli draws for several p values. Compare empirical mean + variance
# against the closed forms p and p(1-p).
np.random.seed(42)
n = 50_000
for p in [0.1, 0.3, 0.5, 0.7, 0.9]:
    x = (np.random.random(n) < p).astype(int)
    print(f"p={p}: mean={x.mean():.4f} (target {p:.4f}), "
          f"var={x.var():.4f} (target {p*(1-p):.4f})")
```

> TODO (N): annotate the output. Mention that as `n` grows the empirical numbers converge to the theoretical (a quiet preview of the law of large numbers).

---

<!-- layer: both -->

<!-- block: gear, n: 6, label: "Where it leads" -->

<!-- block: callout, kind: insight -->
**Where this leads.** Sum $n$ iid Bernoulli($p$) trials and the count is **Binomial**$(n, p)$. Let $n \to \infty$ with $np$ held fixed and the limit is **Poisson**. Every binary-outcome distribution descends from the Bernoulli atom.
<!-- /block -->
