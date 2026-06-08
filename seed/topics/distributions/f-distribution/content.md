<!-- block: state, values: {df1: 5, df2: 10} -->

<!-- block: plot, spec: f_pdf, params: {df1: 5, df2: 10}, binds: [df1, df2], anchor: f-curve, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "A ratio of two variances" -->

# F-distribution

A surprising number of questions collapse to one shape: *is this variation bigger than that variation?* Spread between groups versus spread within them (ANOVA). Variation a model explains versus the variation it leaves behind (regression). Form the ratio of two variance estimates and — when there's no real difference — that ratio follows an **F-distribution**.

---

<!-- block: gear, n: 2, label: "Two degrees of freedom, centered near one" -->

F carries *two* degrees-of-freedom parameters: $d_1$ for the numerator variance, $d_2$ for the denominator. If the two variances are genuinely equal, their ratio hovers around **1** — so the distribution is centered just above one. Values far above 1 are the signal that the numerator's variation is really larger. It's right-skewed (a ratio bottoms out at 0 but can spike high) and it tightens around 1 as both degrees of freedom grow.

---

<!-- block: gear, n: 3, label: "Dial both degrees of freedom" -->

Drag $d_1$ and $d_2$. With lots of degrees of freedom in both variance estimates, each is measured precisely, so their ratio clusters tightly around 1.

<!-- block: state_reset, anchor: f-feel -->

<!-- block: playground, anchor: f-feel -->
binds: [df1, df2]
controls:
  - param: df1
    label: "Numerator df (d₁)"
    min: 2
    max: 30
    step: 1
  - param: df2
    label: "Denominator df (d₂)"
    min: 2
    max: 30
    step: 1
goal:
  prompt: "Give both the numerator and denominator plenty of degrees of freedom — push each up — and watch the curve tighten around 1."
  target: { df1: 20, df2: 20 }
  success_when: "df1 >= 15 and df2 >= 15"
  on_success: |
    With both variance estimates based on lots of data, each is precise, so the
    ratio sits tightly around 1 — which makes even a moderately large $F$ strong
    evidence. With few degrees of freedom the distribution is broad and a big
    ratio can happen by chance alone.
<!-- /block -->

---

<!-- layer: formal -->

<!-- block: gear, n: 4, label: "Definition and use" -->

If $U \sim \chi^2(d_1)$ and $V \sim \chi^2(d_2)$ are independent, then

$$F = \frac{U / d_1}{V / d_2} \sim F(d_1, d_2), \qquad \mathbb{E}[F] = \frac{d_2}{d_2 - 2} \ \ (d_2 > 2).$$

Each chi-squared is divided by its own degrees of freedom, then the two are stacked as a ratio. In **ANOVA** the statistic is (between-group mean square) / (within-group mean square); in **regression** it's (explained mean square) / (residual mean square). A large $F$ gives a small $p$-value: the numerator's variation is too big to be noise.

<!-- block: derivation, title: "Why F is centered just above 1, not exactly at 1", collapsed: true -->
Each chi-squared over its degrees of freedom has mean 1, since $\mathbb{E}[\chi^2(d)] = d$. So the numerator $U/d_1$ averages 1 and the denominator $V/d_2$ averages 1. But $\mathbb{E}[1/(V/d_2)] \ne 1 / \mathbb{E}[V/d_2]$ by Jensen's inequality — the reciprocal is convex — which nudges the mean up to $d_2/(d_2 - 2)$. As $d_2 \to \infty$ that ratio returns to 1.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Build it from chi-squareds" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: f-sim -->
```python
import numpy as np

# Build F directly: two independent chi-squareds, each divided by its df, ratioed.
rng = np.random.default_rng(0)
for d1, d2 in [(5, 10), (10, 30), (20, 20)]:
    U = (rng.standard_normal((400_000, d1)) ** 2).sum(axis=1)
    V = (rng.standard_normal((400_000, d2)) ** 2).sum(axis=1)
    F = (U / d1) / (V / d2)
    print(f"F({d1},{d2}):  mean={F.mean():.3f} (d₂/(d₂-2)={d2/(d2-2):.3f})   "
          f"median≈{np.median(F):.3f}")
```

The mean sits just above 1 at $d_2/(d_2-2)$; the median is even closer to 1.

---

<!-- block: misconception, inline: true -->
**"A bigger F always means a bigger, more important effect."**

*Wrong:* read $F$ as a raw effect size — large $F$, large effect.

*Correct:* $F$ weighs variation against its degrees of freedom, so the *same* $F$ is overwhelming with lots of data and unremarkable with little. It answers "is this ratio surprising if nothing is going on?" — not "how big is the effect?" For that you still need an effect size like $R^2$ or $\eta^2$. (And order matters: $F$ and $1/F$ swap numerator and denominator.)
<!-- /block -->

---

<!-- layer: both -->

<!-- block: gear, n: 6, label: "Where it leads" -->

<!-- block: callout, kind: insight -->
**Where this leads.** F is a ratio of two **chi-squared** variables, each over its degrees of freedom. It's the test statistic of **ANOVA** — comparing several group means at once — and the overall-significance test in **multiple regression**: does the model explain more than noise? A neat special case: the square of a **t** statistic with $\nu$ degrees of freedom is exactly an $F(1, \nu)$.
<!-- /block -->
