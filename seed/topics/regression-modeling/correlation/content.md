<!-- block: state, values: {slope: 0.7, intercept: 0.3} -->

<!-- block: plot, spec: scatter_with_fit, params: {slope: 0.7, intercept: 0.3}, binds: [slope, intercept], anchor: corr-scatter, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "One number between −1 and +1" -->

# Correlation

Two variables move together. By how much? The Pearson correlation $r$ takes that question and gives you a single number between $-1$ and $+1$. It's compact. It's intuitive. And it answers a much narrower question than people usually think.

---

<!-- block: gear, n: 2, label: "The shape on a scatter plot" -->

## The shape on a scatter plot

Plot $y$ against $x$. The cloud of points has a shape. **Correlation** measures how close that shape is to a straight line:

- $r = +1$ — perfect positive linear relationship.
- $r = -1$ — perfect negative linear relationship.
- $r = 0$ — no *linear* relationship (the cloud could still have a clear nonlinear pattern; $r$ won't tell you).

Two key limits to remember:

- **Correlation is symmetric.** $r$ between $X$ and $Y$ is the same as between $Y$ and $X$. Causation isn't symmetric; correlation can't carry causal direction.
- **Correlation only sees lines.** A perfect quadratic ($y = x^2$ on $[-1, 1]$) has $r = 0$ — there's a perfect deterministic relationship and Pearson's $r$ misses it entirely.

---

<!-- block: gear, n: 3, label: "Drag the line" -->

<!-- block: state_reset, anchor: corr-feel -->

<!-- block: playground, anchor: corr-feel -->
binds: [slope, intercept]
controls:
  - param: slope
    label: "Slope"
    min: -2
    max: 2
    step: 0.1
  - param: intercept
    label: "Intercept"
    min: -2
    max: 2
    step: 0.1
goal:
  prompt: "Match the points by adjusting slope and intercept. Aim for slope ≈ 0.7, intercept ≈ 0.3 (the values that generated the cloud)."
  target: { slope: 0.7, intercept: 0.3 }
  success_when: "abs(slope - 0.7) < 0.1 and abs(intercept - 0.3) < 0.15"
  on_success: |
    The slope you found is approximately $r \cdot (s_y / s_x)$ — the
    least-squares fit. Pearson's $r$ measures how *tight* the points hug the
    line; the slope tells you the line's *direction and steepness*. They
    answer different questions.
<!-- /block -->

---

<!-- layer: formal -->

<!-- block: gear, n: 4, label: "Standardized covariance" -->

## Definition

For two random variables $X, Y$ with finite variances:

$$\rho(X, Y) = \frac{\text{Cov}(X, Y)}{\sigma_X \, \sigma_Y} = \frac{\mathbb{E}[(X - \mu_X)(Y - \mu_Y)]}{\sigma_X \, \sigma_Y}$$

The sample version, computed from $n$ paired observations:

$$r = \frac{\sum_i (x_i - \bar{x})(y_i - \bar{y})}{\sqrt{\sum_i (x_i - \bar{x})^2 \cdot \sum_i (y_i - \bar{y})^2}}$$

Both sit in $[-1, +1]$ by Cauchy–Schwarz.

<!-- block: derivation, title: "Why $|\\rho| \\le 1$ — Cauchy–Schwarz", collapsed: true -->
For random variables $U = X - \mu_X$ and $V = Y - \mu_Y$,

$$|\mathbb{E}[UV]|^2 \le \mathbb{E}[U^2] \cdot \mathbb{E}[V^2]$$

(Cauchy–Schwarz inequality.) Substituting the definitions:

$$|\text{Cov}(X, Y)|^2 \le \sigma_X^2 \, \sigma_Y^2$$

Take square roots and divide:

$$|\rho| = \frac{|\text{Cov}(X, Y)|}{\sigma_X \sigma_Y} \le 1$$

Equality iff $V = a U$ for some constant $a$ — i.e., $Y$ is a perfect linear function of $X$.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Linear, quadratic, no relationship" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: corr-sim -->
```python
import numpy as np

np.random.seed(42)
n = 200

# Three relationships, three correlations:
#   1. y = 0.7x + noise — strong positive linear, r ≈ 0.85
#   2. y = -0.5x + noise — moderate negative linear, r ≈ -0.7
#   3. y = x² — perfect quadratic, r ≈ 0 (Pearson can't see it)
x1 = np.random.uniform(-2, 2, n)
y1 = 0.7 * x1 + np.random.normal(0, 0.5, n)

x2 = np.random.uniform(-2, 2, n)
y2 = -0.5 * x2 + np.random.normal(0, 0.5, n)

x3 = np.random.uniform(-2, 2, n)
y3 = x3 ** 2 + np.random.normal(0, 0.05, n)

print(f"linear positive:  r = {np.corrcoef(x1, y1)[0, 1]:+.4f}")
print(f"linear negative:  r = {np.corrcoef(x2, y2)[0, 1]:+.4f}")
print(f"quadratic:        r = {np.corrcoef(x3, y3)[0, 1]:+.4f}  ← perfect relationship, r ≈ 0")
```

---

<!-- layer: both -->

<!-- block: gear, n: 6, label: "Where it leads" -->

<!-- block: callout, kind: insight -->
**Where this leads.** **Simple linear regression** uses correlation as a building block: the OLS slope is $r \cdot (s_y / s_x)$. **Multiple regression** generalizes to multiple predictors and partial correlations. **Causal inference** picks up where correlation gives up — $r$ tells you *that* two variables move together; causal methods try to tell you *why*.
<!-- /block -->

---

<!-- block: misconception, inline: true -->
**"Correlation implies causation."**

*Wrong:* if $r$ is high, $X$ causes $Y$ (or vice versa).

*Correct:* high correlation can come from $X \to Y$, from $Y \to X$, from a common cause $Z$, or from a selection bias in how the sample was collected. Correlation is symmetric; causation isn't. The classic gotchas — ice cream sales correlate with drowning deaths (both driven by summer); shoe size correlates with vocabulary in children (both driven by age) — are correlation without direct causation. To get causation you need experimental data (random assignment) or a careful causal model. Pearson's $r$ alone never gets you there.
<!-- /block -->
