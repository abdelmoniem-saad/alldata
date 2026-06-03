<!-- block: state, values: {n: 1, p: 0.5} -->

<!-- block: plot, spec: binomial_pmf, params: {n: 1, p: 0.5}, binds: [n, p], anchor: bernoulli-bars, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "One trial, one number" -->

# Bernoulli distribution

A single yes/no trial. The coin lands heads or tails; the click happens or it doesn't; the part is defective or it isn't. One outcome out of two, with probability $p$ of "success." That's the whole distribution — and almost every count you'll ever model is built by stacking copies of it.

---

<!-- block: gear, n: 2, label: "What p buys you" -->

The Bernoulli has exactly one parameter, $p$ — the probability of a 1 (success). The probability of a 0 (failure) is whatever is left over, $1 - p$. Nothing else is free to vary.

It's worth holding onto how little structure that is. "Will this email get a click?" ($p \approx 0.02$), "will this treated patient recover?" ($p$ depends on the treatment), "will this fair coin land heads?" ($p = 0.5$) — same distribution, different dial setting. The model doesn't care what the trial *is*; it only cares about $p$.

---

<!-- block: gear, n: 3, label: "Where uncertainty peaks" -->

The two bars on the right are the whole distribution: the height at 0 is $1-p$, the height at 1 is $p$. Drag $p$ and watch them trade height — they always sum to 1.

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
  prompt: "Find the value of p where the outcome is hardest to predict — where the two bars are equal."
  target: { p: 0.5 }
  success_when: "abs(p - 0.5) < 0.03"
  on_success: |
    That's the point of maximum uncertainty. The variance of a Bernoulli is
    $p(1-p)$, which is largest exactly at $p = 0.5$ (variance $0.25$) and
    shrinks to $0$ as $p$ approaches either edge — a trial that almost always
    does the same thing carries almost no surprise.
<!-- /block -->

---

<!-- layer: formal -->

<!-- block: gear, n: 4, label: "The whole thing in three lines" -->

A random variable $X \sim \text{Bernoulli}(p)$ takes the value 1 with probability $p$ and 0 with probability $1-p$. Its probability mass function packs both cases into one expression:

$$P(X = x) = p^x (1-p)^{1-x}, \qquad x \in \{0, 1\}$$

$$\mathbb{E}[X] = p \qquad \text{Var}(X) = p(1-p)$$

The mean is just $p$ because $X$ is 0 or 1: averaging it gives the fraction of 1s, which is $p$. The variance peaks at $p = 0.5$ and vanishes at the edges.

<!-- block: derivation, title: "Why the mean is p and the variance is p(1−p)", collapsed: true -->
For a variable that is only ever 0 or 1, $X^2 = X$, which makes both moments easy.

$$\mathbb{E}[X] = 0 \cdot (1-p) + 1 \cdot p = p$$

$$\mathbb{E}[X^2] = 0^2 \cdot (1-p) + 1^2 \cdot p = p$$

$$\text{Var}(X) = \mathbb{E}[X^2] - (\mathbb{E}[X])^2 = p - p^2 = p(1-p)$$

Differentiating $p(1-p)$ and setting it to zero gives $1 - 2p = 0$, so the variance is maximized at $p = 0.5$.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Check it against draws" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: bernoulli-sim -->
```python
import numpy as np

# Draw 100,000 Bernoulli trials at several p and compare the empirical
# mean and variance to the closed forms p and p(1-p).
rng = np.random.default_rng(0)
n = 100_000
for p in [0.1, 0.3, 0.5, 0.8]:
    x = (rng.random(n) < p).astype(int)
    print(f"p={p}:  mean={x.mean():.4f} (=p {p})   "
          f"var={x.var():.4f} (=p(1-p) {p*(1-p):.4f})")
```

The empirical mean tracks $p$ and the variance tracks $p(1-p)$, peaking at $p = 0.5$.

---

<!-- block: misconception, inline: true -->
**"A Bernoulli trial means a fifty-fifty coin flip."**

*Wrong:* the Bernoulli is the model for a fair coin, so $p = 0.5$.

*Correct:* $p$ can be any value in $[0, 1]$. A 2%-click-rate ad and a 99%-reliable sensor are both Bernoulli trials — just with very lopsided $p$. The fair coin is the *one* special case where uncertainty is maximal, not the definition.
<!-- /block -->

---

<!-- layer: both -->

<!-- block: gear, n: 6, label: "Where it leads" -->

<!-- block: callout, kind: insight -->
**Where this leads.** Add up $n$ independent Bernoulli($p$) trials and the count of successes is the **binomial distribution** — the next topic. Let the trials become many and rare and the count limits to the **Poisson**. And estimating $p$ from observed trials is the simplest case of **maximum likelihood estimation**.
<!-- /block -->
