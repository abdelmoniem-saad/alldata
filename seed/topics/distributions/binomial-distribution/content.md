<!-- block: state, values: {n: 10, p: 0.5} -->

<!-- block: plot, spec: binomial_pmf, params: {n: 10, p: 0.5}, binds: [n, p], anchor: binomial-feel, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "TODO — name the spark" -->

# Binomial Distribution

Flip a coin ten times. How many heads do you get? The count is a random variable, and the *distribution* of that count is binomial.

> TODO (N): replace this paragraph with the spark. The "ten coin flips" framing or a more concrete example (clicks, defects, free throws) both work — pick one that grounds the rest of the topic.

---

<!-- block: gear, n: 2, label: "TODO — name the intuition" -->

## Sum of Bernoullis

A **Binomial** count $X \sim \text{Binomial}(n, p)$ is the sum of $n$ independent Bernoulli($p$) trials. Two parameters: $n$ (how many trials) and $p$ (per-trial success probability).

The shape changes with both:

- Small $p$, any $n$ → right-skewed (most weight on small counts).
- Large $p$, any $n$ → left-skewed (most weight on large counts).
- $p = 0.5$ → symmetric.
- Large $n$ → looks like a bell curve regardless of $p$ (a preview of the CLT).

> TODO (N): expand on what "independent, same $p$" means in practice. The classic example failures: order effects, learning effects, varying conditions.

---

<!-- block: gear, n: 3, label: "TODO — name the mechanic" -->

<!-- block: state_reset, anchor: binomial-feel -->

<!-- block: playground, anchor: binomial-feel -->
binds: [n, p]
controls:
  - param: n
    label: "Trials (n)"
    min: 1
    max: 60
    step: 1
  - param: p
    label: "Per-trial probability (p)"
    min: 0.05
    max: 0.95
    step: 0.05
goal:
  prompt: |
    Find an n, p combination where the distribution looks roughly bell-shaped
    and centered around 8. (Hint: $np = 8$ and $n$ large enough that the CLT
    starts to bite.)
  target: { n: 40, p: 0.2 }
  success_when: "n >= 30 and abs(n * p - 8) < 1.5"
  on_success: |
    Two things happened: the *center* sits at $np$ (where the mass concentrates),
    and the *shape* becomes bell-like once $n$ is large enough — Binomial is
    the discrete cousin of the normal, with $\mu = np$ and $\sigma^2 = np(1-p)$.
<!-- /block -->

> TODO (N): use this gear to introduce the rule-of-thumb that binomial looks normal-ish when $np$ and $n(1-p)$ are both ≥ 10.

---

<!-- layer: formal -->

<!-- block: gear, n: 4, label: "TODO — name the formalism" -->

## PMF, mean, variance

$$P(X = k) = \binom{n}{k} p^k (1-p)^{n-k}, \qquad k \in \{0, 1, \ldots, n\}$$

$$\mathbb{E}[X] = np, \qquad \text{Var}(X) = np(1-p)$$

The mean and variance both grow linearly in $n$. The *standard deviation* — the spread you actually see — grows like $\sqrt{n}$.

<!-- block: derivation, title: "Why $\mathbb{E}[X] = np$ (in one line)", collapsed: true -->
> TODO (N): write the linearity-of-expectation argument: $X = \sum_{i=1}^n X_i$ where each $X_i \sim \text{Bernoulli}(p)$, so $\mathbb{E}[X] = \sum_i \mathbb{E}[X_i] = np$. Same one-liner for variance, but variance needs independence.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "TODO — name the code" -->

<!-- block: dataset, name: coin-flips-1000, source: synthetic -->

<!-- block: simulation, editable: true, auto_run: true, anchor: binomial-sim, pair_id: binomial-mean-var -->
```python
import numpy as np

# Draw 5,000 binomial counts at three (n, p) combinations and compare the
# empirical mean / variance to the closed forms np and np(1-p).
np.random.seed(42)
for n, p in [(10, 0.5), (40, 0.2), (100, 0.05)]:
    x = np.random.binomial(n, p, 5_000)
    print(f"Binomial(n={n}, p={p}): "
          f"mean={x.mean():.3f} (target {n*p:.3f}), "
          f"var={x.var():.3f} (target {n*p*(1-p):.3f}), "
          f"max observed={x.max()}")
```

<!-- block: code_r, editable: true, pair_id: binomial-mean-var -->
```r
# Same demo in R. Tab above to switch back to Python.
set.seed(42)
for (params in list(c(10, 0.5), c(40, 0.2), c(100, 0.05))) {
  n <- params[1]; p <- params[2]
  x <- rbinom(5000, n, p)
  cat(sprintf("Binomial(n=%g, p=%g): mean=%.3f (target %.3f), var=%.3f (target %.3f), max observed=%d\n",
              n, p, mean(x), n*p, var(x), n*p*(1-p), max(x)))
}
```

> TODO (N): expand the prose intro. Mention the `coin-flips-1000` dataset chip above — link to an exercise using `load("coin-flips-1000")` to compute the empirical PMF. The Python/R pair above is the M5 demo — tabs at the top of the code surface swap between languages without leaving the section.

---

<!-- layer: both -->

<!-- block: gear, n: 6, label: "Where it leads" -->

<!-- block: callout, kind: insight -->
**Where this leads.** As $n \to \infty$ with $np$ held fixed, the binomial limits to the **Poisson** distribution. As $n \to \infty$ with $p$ held fixed, the standardized binomial limits to the **Normal** (the **CLT** in its earliest form). And every **hypothesis test** for proportions and every **confidence interval** for a rate is binomial machinery in disguise.
<!-- /block -->
