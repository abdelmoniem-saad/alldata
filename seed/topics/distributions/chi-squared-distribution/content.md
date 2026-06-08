<!-- block: state, values: {df: 3} -->

<!-- block: plot, spec: chi_squared_pdf, params: {df: 3}, binds: [df], anchor: chi-curve, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "Squares of normals, added up" -->

# Chi-squared distribution

Take a standard normal, square it. Add up $k$ such independent squares. The total follows a **chi-squared distribution** with $k$ degrees of freedom. Because it's a sum of squares it can never be negative — it lives on $x \ge 0$ — and it shows up the moment you start measuring *squared* deviations. Which is exactly what a variance is.

---

<!-- block: gear, n: 2, label: "Degrees of freedom set the shape" -->

The one parameter, the **degrees of freedom** $k$, is just how many squared normals you summed. With $k$ small the distribution huddles near zero and skews hard to the right — a single squared normal is usually small, occasionally large. Pile on more and you're averaging many independent pieces, so the central limit theorem pulls the shape toward a symmetric mound. Its moments are clean: mean $k$, variance $2k$.

---

<!-- block: gear, n: 3, label: "Add degrees of freedom" -->

Drag $k$ up and watch the skew drain out of the curve. At a handful of degrees of freedom it's lopsided; by a dozen it's nearly a bell.

<!-- block: state_reset, anchor: chi-feel -->

<!-- block: playground, anchor: chi-feel -->
binds: [df]
controls:
  - param: df
    label: "Degrees of freedom (k)"
    min: 1
    max: 20
    step: 1
goal:
  prompt: "Pile on degrees of freedom until the right skew washes out and the curve looks roughly symmetric — get k up to 10 or more."
  target: { df: 12 }
  success_when: "df >= 10"
  on_success: |
    By $k \approx 10$–$12$ the lopsidedness has mostly flattened. A chi-squared
    with many degrees of freedom is approximately normal with mean $k$ and
    variance $2k$ — the central limit theorem again, since it's a sum of $k$
    independent squared normals.
<!-- /block -->

---

<!-- layer: formal -->

<!-- block: gear, n: 4, label: "Definition and moments" -->

If $Z_1, \ldots, Z_k \sim N(0,1)$ are independent, then

$$Q = \sum_{i=1}^{k} Z_i^2 \sim \chi^2(k), \qquad f(x) = \frac{x^{k/2 - 1} e^{-x/2}}{2^{k/2}\,\Gamma(k/2)}, \qquad \mathbb{E}[Q] = k, \quad \text{Var}(Q) = 2k.$$

Why it matters for inference: for $n$ normal observations, the sample variance satisfies $(n-1)s^2 / \sigma^2 \sim \chi^2(n-1)$. That's the bridge from this distribution to statements about a population variance — and the "$n-1$" is one degree of freedom spent estimating the mean.

<!-- block: derivation, title: "Why one squared normal has mean 1 and variance 2", collapsed: true -->
For a single $Z \sim N(0,1)$: $\mathbb{E}[Z^2] = \text{Var}(Z) = 1$, so summing $k$ of them gives mean $k$. For the variance, $\text{Var}(Z^2) = \mathbb{E}[Z^4] - (\mathbb{E}[Z^2])^2 = 3 - 1 = 2$ (the fourth moment of a standard normal is $3$). Summing $k$ independent copies gives variance $2k$.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Build it from normals" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: chi-sim -->
```python
import numpy as np

# Build chi-squared literally: square standard normals and sum k of them.
# Confirm mean = k and variance = 2k.
rng = np.random.default_rng(0)
for k in [1, 3, 10]:
    q = (rng.standard_normal((1_000_000, k)) ** 2).sum(axis=1)
    print(f"df={k}:  mean={q.mean():.3f} (=k {k})   var={q.var():.3f} (=2k {2*k})")
```

Mean lands on $k$, variance on $2k$ — exactly as built.

---

<!-- block: misconception, inline: true -->
**"Chi-squared is a symmetric, bell-shaped distribution like the normal."**

*Wrong:* it's just another bell, centered and symmetric.

*Correct:* it lives only on $x \ge 0$ (it's a sum of squares) and is right-skewed; the near-symmetry is only an approximation that emerges at large degrees of freedom. Treating a small-$k$ chi-squared as symmetric gives the wrong tail probabilities — and the tail is exactly what a goodness-of-fit test reads off.
<!-- /block -->

---

<!-- layer: both -->

<!-- block: gear, n: 6, label: "Where it leads" -->

<!-- block: callout, kind: insight -->
**Where this leads.** Chi-squared is the distribution of squared **normal** deviations, so it powers inference about a **variance** and the **goodness-of-fit** and independence tests that compare observed counts to expected ones. Divide two independent chi-squareds, each by its degrees of freedom, and you get the **F-distribution** — the engine of ANOVA and the overall test in regression.
<!-- /block -->
