<!-- block: state, values: {mu: 0, sigma: 1} -->

<!-- block: plot, spec: gaussian_pdf, params: {mu: 0, sigma: 1}, binds: [mu, sigma], anchor: normal-feel, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "TODO — name the spark" -->

# Normal (Gaussian) Distribution

The bell curve shows up everywhere — heights, exam scores, measurement errors, stock returns, sample means. That ubiquity isn't a coincidence; it's mechanical.

> TODO (N): replace with the spark. Pick a single concrete example (adult heights, lab measurements) and lead with what surprises about it.

---

<!-- block: gear, n: 2, label: "TODO — name the intuition" -->

## Two parameters, everything

Two numbers determine a normal distribution completely:

- $\mu$ (mean) — where the bell is centered.
- $\sigma$ (standard deviation) — how spread out it is.

That's all you need. No third parameter, no skew, no extra mass anywhere. If you can quote $\mu$ and $\sigma$, you can answer any probability question about the distribution.

The plot on the right is $N(\mu, \sigma^2)$ — drag the sliders below and you'll move the bell or change its width independently. **Mean is location; standard deviation is scale.** They never trade.

> TODO (N): expand. Optional: hint at why the normal shows up so often (preview of CLT) without giving the full argument away — that comes in Gear 6.

---

<!-- block: gear, n: 3, label: "TODO — name the mechanic" -->

<!-- block: state_reset, anchor: normal-feel -->

<!-- block: playground, anchor: normal-feel -->
binds: [mu, sigma]
controls:
  - param: mu
    label: "Mean (μ)"
    min: -3
    max: 3
    step: 0.1
  - param: sigma
    label: "Std dev (σ)"
    min: 0.3
    max: 3
    step: 0.1
goal:
  prompt: "Make a tall, narrow bell centered at μ = 1.5 (σ ≈ 0.4)."
  target: { mu: 1.5, sigma: 0.4 }
  success_when: "abs(mu - 1.5) < 0.1 and abs(sigma - 0.4) < 0.1"
  on_success: |
    Centering and spreading are independent levers. The bell *integrates* to 1
    no matter what — when σ shrinks the peak grows; when σ grows the peak
    falls. The total area is fixed.
<!-- /block -->

> TODO (N): use this gear to name the 68-95-99.7 rule. The empirical-rule prose fits naturally as a follow-up to the playground above.

---

<!-- layer: formal -->

<!-- block: gear, n: 4, label: "TODO — name the formalism" -->

## PDF and the standard normal

The probability density function is

$$f(x) = \frac{1}{\sigma\sqrt{2\pi}} \, \exp\!\left(-\frac{(x - \mu)^2}{2\sigma^2}\right)$$

The **standard normal** $Z \sim N(0, 1)$ is the special case $\mu = 0, \sigma = 1$. Every normal random variable transforms back to a standard normal:

$$Z = \frac{X - \mu}{\sigma}$$

That's why z-tables work — once you can answer a question about $Z$, you can answer it for any normal.

<!-- block: derivation, title: "Why the $\\sqrt{2\\pi}$ in the denominator", collapsed: true -->
> TODO (N): walk through the Gaussian integral $\int_{-\infty}^{\infty} e^{-x^2/2} \, dx = \sqrt{2\pi}$. The polar-coordinates trick is the classic move.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "TODO — name the code" -->

<!-- block: dataset, name: heights, source: synthetic -->

<!-- block: simulation, editable: true, auto_run: true, anchor: normal-sim -->
```python
import numpy as np

# The `heights` dataset is synthetic adult heights drawn from sex-conditional
# normals. Check that the empirical mean / std match the normal fit and that
# the 68% rule holds within rounding.
heights = load("heights")          # pandas DataFrame, column 'height_cm'
h = heights["height_cm"].to_numpy()
mu, sigma = h.mean(), h.std()
print(f"n = {len(h)}, mean = {mu:.2f} cm, sd = {sigma:.2f} cm")

# Empirical 68% rule: fraction of data within ±1 sd of the mean
within_1sd = ((h > mu - sigma) & (h < mu + sigma)).mean()
print(f"Fraction within ±1 sd: {within_1sd:.4f} (normal target: 0.6827)")
```

> TODO (N): expand the prose intro. The `heights` chip above is the K5 dataset attribution; mention the source explicitly in your prose so readers know what they're working with.

---

<!-- layer: both -->

<!-- block: gear, n: 6, label: "Where it leads" -->

<!-- block: callout, kind: insight -->
**Where this leads.** The **Central Limit Theorem** explains *why* the normal is everywhere — it's the limit shape of the sample mean. **Confidence intervals** and **hypothesis tests** lean on normal critical values almost everywhere. The **t-distribution** is the normal's "I don't know σ" cousin. And the **standard normal table** is the lookup that turns any normal question into an integral against $N(0, 1)$.
<!-- /block -->
