<!-- block: state, values: {n: 50, p: 0.1} -->

<!-- block: plot, spec: binomial_pmf, params: {n: 50, p: 0.1}, binds: [n, p], anchor: poisson-feel, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "TODO — name the spark" -->

# Poisson Distribution

How many emails arrive in the next hour? How many car accidents at an intersection this month? How many typos on a page? The count is Poisson when each *instant* has a tiny independent chance of an event, and you tally what actually happened over a fixed window.

> TODO (N): replace with the spark — one concrete example with the count and the rate (e.g., "a call center fielding ~12 calls per minute").

---

<!-- block: gear, n: 2, label: "TODO — name the intuition" -->

## What "rare and independent" buys you

The Poisson distribution is what the binomial limits to when:

- The number of "trials" $n$ is huge (each tiny instant is a trial).
- The per-trial probability $p$ is tiny.
- The product $\lambda = np$ stays finite (the *rate* per window).

A second's worth of customer traffic has $n$ = a billion tiny opportunities, each with vanishingly small probability of producing a click. The total clicks-per-second is well-modeled by Poisson($\lambda$) where $\lambda$ is the average rate.

One parameter: $\lambda > 0$. The distribution lives on $\{0, 1, 2, \ldots\}$.

> TODO (N): expand on the independence and constant-rate assumptions. The classic failure mode: clustering (burst arrivals violate Poisson; the right model is then a mixture or negative-binomial).

---

<!-- block: gear, n: 3, label: "TODO — name the mechanic" -->

<!-- block: state_reset, anchor: poisson-feel -->

<!-- block: playground, anchor: poisson-feel -->
binds: [n, p]
controls:
  - param: n
    label: "Trials (n)"
    min: 10
    max: 500
    step: 10
  - param: p
    label: "Per-trial probability (p)"
    min: 0.01
    max: 0.5
    step: 0.01
goal:
  prompt: |
    Find n and p that keep λ = np ≈ 5 but make n large enough that the bars
    look almost the same regardless of which (n, p) combination you picked.
    The shape only depends on λ in the limit.
  target: { n: 200, p: 0.025 }
  success_when: "n >= 100 and abs(n * p - 5) < 0.6"
  on_success: |
    The shape collapses onto the same Poisson($\lambda = 5$) curve for any large
    enough n. Binomial → Poisson in the limit.
<!-- /block -->

> TODO (N): explicitly call out that this scaffold uses the binomial plot as a Poisson stand-in until a `poisson_pmf` spec exists. <!-- todo: needs poisson_pmf spec in the plot library -->

---

<!-- layer: formal -->

<!-- block: gear, n: 4, label: "TODO — name the formalism" -->

## PMF, mean, variance

$$P(X = k) = \frac{\lambda^k \, e^{-\lambda}}{k!}, \qquad k \in \{0, 1, 2, \ldots\}$$

$$\mathbb{E}[X] = \lambda, \qquad \text{Var}(X) = \lambda$$

The mean and variance are *equal* — a signature of the distribution. If a count's variance is much bigger than its mean, the data is **overdispersed** and Poisson is the wrong model (try negative binomial); much smaller, it's **underdispersed** (regular, scheduled events).

<!-- block: derivation, title: "Binomial → Poisson as $n \\to \\infty$, $np \\to \\lambda$", collapsed: true -->
> TODO (N): write the limit. $\binom{n}{k} p^k (1-p)^{n-k}$ as $n \to \infty, p \to 0, np = \lambda$ goes to $\lambda^k e^{-\lambda} / k!$. The key step: $(1 - \lambda/n)^n \to e^{-\lambda}$.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "TODO — name the code" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: poisson-sim -->
```python
import numpy as np

# Show the binomial → Poisson convergence numerically: fix λ = 5, grow n.
np.random.seed(42)
lam = 5
for n in [50, 500, 5000]:
    p = lam / n
    binom = np.random.binomial(n, p, 20_000)
    poisson = np.random.poisson(lam, 20_000)
    diff = abs(binom.mean() - poisson.mean()) + abs(binom.var() - poisson.var())
    print(f"n={n:>5}: binom mean={binom.mean():.3f}, var={binom.var():.3f} | "
          f"poisson mean={poisson.mean():.3f}, var={poisson.var():.3f} | "
          f"|Δ| = {diff:.4f}")
```

> TODO (N): expand. Add a mention of the *equality* mean = variance = λ — that's the diagnostic test for Poisson-ness in real data.

---

<!-- layer: both -->

<!-- block: gear, n: 6, label: "Where it leads" -->

<!-- block: callout, kind: insight -->
**Where this leads.** **Poisson processes** generalize a single count to a stream of arrivals over time. The **exponential distribution** is the time *between* arrivals in a Poisson process — its CDF is $1 - e^{-\lambda t}$. **Poisson regression** uses the distribution as the link function for count outcomes in regression.
<!-- /block -->
