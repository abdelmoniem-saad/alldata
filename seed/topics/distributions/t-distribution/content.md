<!-- block: state, values: {mu: 0, sigma: 1} -->

<!-- block: plot, spec: gaussian_pdf, params: {mu: 0, sigma: 1}, binds: [mu, sigma], anchor: t-feel, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "TODO — name the spark" -->

# t-Distribution

When you estimate a mean from a small sample, you don't know the true standard deviation — you estimate it too. That extra uncertainty makes the estimator more variable than the normal would predict. The t-distribution is what shows up when you account for it honestly.

> TODO (N): replace with the spark. Anchor in a concrete scenario — a chemist measuring something with $n = 6$, a study with a tiny pilot, etc.

---

<!-- block: gear, n: 2, label: "TODO — name the intuition" -->

## Fatter tails because σ is also a guess

The standardized sample mean
$$T = \frac{\bar{X} - \mu}{s / \sqrt{n}}$$
divides by the *sample* standard deviation $s$, not the true $\sigma$. With $\sigma$ known, the result is exactly $N(0, 1)$. With only $s$, the denominator wobbles too — and the ratio's distribution gets *fatter tails* than the normal.

One parameter: **degrees of freedom** $\nu = n - 1$. Small $\nu$ → fat tails. Large $\nu$ → approaches the standard normal.

> TODO (N): expand on the "denominator wobbles" intuition. Why does dividing by a noisy quantity widen the distribution? An analogy or visual usually helps here.

---

<!-- block: gear, n: 3, label: "TODO — name the mechanic" -->

<!-- block: state_reset, anchor: t-feel -->

<!-- block: playground, anchor: t-feel -->
binds: [mu, sigma]
controls:
  - param: mu
    label: "Mean (μ)"
    min: -2
    max: 2
    step: 0.1
  - param: sigma
    label: "Scale (σ — proxies for df: smaller σ ≈ larger df)"
    min: 0.5
    max: 2
    step: 0.1
goal:
  prompt: "Set μ = 0 and σ = 0.7 — a tight, normal-like shape (proxy for large df)."
  target: { mu: 0, sigma: 0.7 }
  success_when: "abs(mu) < 0.1 and abs(sigma - 0.7) < 0.1"
  on_success: |
    As σ shrinks here (proxy for df growing), the bell tightens — same way the
    t-distribution tightens as df → ∞ and approaches the standard normal.
<!-- /block -->

> TODO (N): explicitly call out that this scaffold uses the Gaussian plot as a t stand-in until a `student_t_pdf` spec exists. <!-- todo: needs student_t_pdf spec with `df` binding in the plot library -->

---

<!-- layer: formal -->

<!-- block: gear, n: 4, label: "TODO — name the formalism" -->

## PDF and the df parameter

$$f(t; \nu) = \frac{\Gamma\!\left(\frac{\nu+1}{2}\right)}{\sqrt{\nu \pi} \; \Gamma\!\left(\frac{\nu}{2}\right)} \left(1 + \frac{t^2}{\nu}\right)^{-\frac{\nu+1}{2}}$$

The shape depends only on $\nu$. As $\nu \to \infty$, the PDF approaches the standard normal $\phi(t)$.

| ν | tail thickness | when used |
|---|---|---|
| 1 | very fat (Cauchy) | rarely; mean isn't even defined |
| 5 | noticeably fat | small samples, $n \approx 6$ |
| 30 | nearly normal | a common rule-of-thumb threshold |
| ∞ | standard normal | the limit |

<!-- block: derivation, title: "Where the t comes from — $Z$ over $\\sqrt{V/\\nu}$", collapsed: true -->
> TODO (N): walk through the construction. If $Z \sim N(0, 1)$ and $V \sim \chi^2_\nu$ are independent, then $T = Z / \sqrt{V/\nu}$ has a t-distribution with $\nu$ degrees of freedom. Connect this to the $(\bar{X} - \mu)/(s/\sqrt{n})$ form.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "TODO — name the code" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: t-sim -->
```python
import numpy as np
from scipy import stats

# Simulate sample means with small n. Compare the standardized empirical
# distribution to N(0, 1) and to t_{n-1}.
np.random.seed(42)
mu_true, sigma_true = 0.0, 1.0
for n in [3, 6, 30]:
    samples = np.random.normal(mu_true, sigma_true, (10_000, n))
    means = samples.mean(axis=1)
    sds = samples.std(axis=1, ddof=1)
    t_stat = (means - mu_true) / (sds / np.sqrt(n))
    # Fraction in the |T| > 2 tails
    normal_tail = 2 * (1 - stats.norm.cdf(2))
    empir_tail = (np.abs(t_stat) > 2).mean()
    print(f"n={n:>3}: P(|T| > 2) empirical = {empir_tail:.4f}  "
          f"(normal predicts {normal_tail:.4f})")
```

> TODO (N): annotate. With $n = 3$ the tail fraction is much fatter than the normal expects — that's the t fatness in action.

---

<!-- layer: both -->

<!-- block: gear, n: 6, label: "Where it leads" -->

<!-- block: callout, kind: insight -->
**Where this leads.** **Confidence intervals** for the mean of a normal population use $t$ critical values instead of $z$ when σ is unknown — which is almost always. **t-tests** are the inference cousin: same statistic, framed as a hypothesis test against a null value. And the family of **Student's distributions** generalizes to one-sample, two-sample, and paired forms; all use this curve.
<!-- /block -->
