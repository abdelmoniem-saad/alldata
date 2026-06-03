<!-- block: state, values: {df: 5} -->

<!-- block: plot, spec: student_t_pdf, params: {df: 5}, binds: [df], anchor: t-curve, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "The honest small-sample curve" -->

# Student's t-distribution

The t-distribution is what you reach for when you want to reason about a mean but you *don't know the true spread* — you only have an estimate of it from a small sample. It looks like the normal's close relative: symmetric, bell-shaped, centered at zero. The difference is in the tails, and that difference is the whole point.

The dashed curve on the right is the standard normal; the solid one is the t. One dial controls it: the **degrees of freedom**, $\nu$ (here `df`).

---

<!-- block: gear, n: 2, label: "Why the tails are fat" -->

When you standardize a sample mean you divide by the spread. If you knew the true $\sigma$, the result would be exactly normal. But with a small sample you must *estimate* $\sigma$ from the same data — and that estimate is itself noisy, sometimes too small, which occasionally makes the standardized value blow up. Those extra blow-ups are the t's heavier tails: it's the normal, widened to stay honest about the uncertainty in your own spread estimate.

The fewer the degrees of freedom, the more that matters. At $\nu = 1$ the tails are so heavy the distribution has no finite mean; by $\nu = 30$ it's almost indistinguishable from the normal.

---

<!-- block: gear, n: 3, label: "Watch it become normal" -->

Raise the degrees of freedom and watch the solid t-curve climb toward the dashed normal — the tails pull in and the peak rises.

<!-- block: state_reset, anchor: t-feel -->

<!-- block: playground, anchor: t-feel -->
binds: [df]
controls:
  - param: df
    label: "Degrees of freedom (ν)"
    min: 1
    max: 40
    step: 1
goal:
  prompt: "Turn the degrees of freedom up until the t-curve is essentially the normal."
  target: { df: 30 }
  success_when: "df >= 30"
  on_success: |
    By about $\nu = 30$ the t and the normal are visually the same — which is
    the origin of the old "n ≥ 30" rule of thumb for using z instead of t.
    Below that, the t's heavier tails give wider, more honest intervals; the
    normal would be overconfident.
<!-- /block -->

---

<!-- layer: formal -->

<!-- block: gear, n: 4, label: "Where it comes from" -->

The t-distribution with $\nu$ degrees of freedom is the distribution of

$$T = \frac{Z}{\sqrt{V / \nu}}$$

where $Z \sim N(0,1)$ and $V \sim \chi^2_\nu$ are independent. In practice that ratio is exactly what you get when you standardize a sample mean using the *sample* standard deviation $s$ instead of the true $\sigma$:

$$T = \frac{\bar{X} - \mu}{s / \sqrt{n}} \sim t_{\,n-1}$$

The "$n-1$" is the degrees of freedom — one fewer than the sample size, because estimating the mean spends one. Its density has the characteristic fat-tailed form

$$f(t; \nu) = \frac{\Gamma\!\left(\frac{\nu+1}{2}\right)}{\sqrt{\nu\pi}\;\Gamma\!\left(\frac{\nu}{2}\right)} \left(1 + \frac{t^2}{\nu}\right)^{-\frac{\nu+1}{2}}$$

and as $\nu \to \infty$ it converges to the standard normal.

---

<!-- block: gear, n: 5, label: "The tails, measured" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: t-sim -->
```python
import numpy as np
from scipy import stats

# Small samples from a normal, standardized with the SAMPLE sd. The
# standardized values follow t_{n-1}, not the normal — their tails are fatter.
rng = np.random.default_rng(0)
n = 5                      # tiny sample -> df = 4
N = 200_000
samples = rng.normal(0, 1, size=(N, n))
xbar = samples.mean(axis=1)
s = samples.std(axis=1, ddof=1)
t_stat = xbar / (s / np.sqrt(n))

# How often does |T| exceed 2.78 (the t critical value for df=4, 95%)
# versus the normal's 1.96? Using the normal cutoff over-rejects.
print(f"P(|T| > 1.96) = {np.mean(np.abs(t_stat) > 1.96):.4f}  (normal would say 0.05)")
print(f"P(|T| > {stats.t.ppf(0.975, n-1):.2f}) = "
      f"{np.mean(np.abs(t_stat) > stats.t.ppf(0.975, n-1)):.4f}  (t_4 cutoff -> ~0.05)")
```

Using the normal's $1.96$ cutoff rejects far more than 5% of the time — the heavy tails are real, and the wider t cutoff is what restores calibration.

---

<!-- block: misconception, inline: true -->
**"The t-distribution is just an approximate normal for lazy cases."**

*Wrong:* t is a rough stand-in you use when you can't be bothered with the normal.

*Correct:* it's the other way around. When $\sigma$ is unknown and estimated from a small sample, the standardized mean *genuinely* follows a t-distribution — the t is the exact, correct answer, and the normal is the approximation (a good one only once $n$ is large). Reaching for z with $n = 5$ isn't simpler; it's wrong, and overconfident.
<!-- /block -->

---

<!-- layer: both -->

<!-- block: gear, n: 6, label: "Where it leads" -->

<!-- block: callout, kind: insight -->
**Where this leads.** The t is the engine behind **confidence intervals** and **t-tests** for means when $\sigma$ is unknown — which is nearly always. It's built from the **normal** and the **chi-squared** distribution, and its degrees-of-freedom idea recurs throughout inference.
<!-- /block -->
