<!-- block: state, values: {mu: 0, sigma: 1} -->

<!-- block: plot, spec: gaussian_pdf, params: {mu: 0, sigma: 1}, binds: [mu, sigma], anchor: normal-curve, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "The one curve to know" -->

# Normal (Gaussian) distribution

If you learn one distribution by feel, make it this one. The bell curve shows up in heights, measurement errors, test scores, and — crucially — in the averages of almost everything else. Two numbers describe it completely: where it's centered ($\mu$) and how wide it is ($\sigma$).

---

<!-- block: gear, n: 2, label: "Center and width, nothing else" -->

The normal is fully pinned down by its mean $\mu$ and standard deviation $\sigma$. $\mu$ slides the whole curve left or right without changing its shape; $\sigma$ stretches or squeezes it without moving the center. There's no third knob — no skew, no extra bump. That two-parameter simplicity is a big part of why it's the default model for "noise."

A useful rule of thumb lives in $\sigma$: about **68%** of the mass falls within one $\sigma$ of the mean, **95%** within two, and **99.7%** within three. Quote someone "two standard deviations out" and you've said "in the outer 5%."

---

<!-- block: gear, n: 3, label: "Match the target" -->

The dashed curve on the right is a target. Slide $\mu$ and $\sigma$ until your solid curve sits on top of it — you'll feel that center and width move independently.

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
    label: "Standard deviation (σ)"
    min: 0.4
    max: 3
    step: 0.1
goal:
  prompt: "Match the dashed target: a curve centered near 1.5 and noticeably narrower than the standard one."
  target: { mu: 1.5, sigma: 0.8 }
  success_when: "abs(mu - 1.5) < 0.1 and abs(sigma - 0.8) < 0.1"
  on_success: |
    Center and width are independent levers: you found $\mu$ by sliding and
    $\sigma$ by squeezing, in either order. The total area under the curve is
    always 1 — so a smaller $\sigma$ doesn't lose mass, it concentrates it
    tightly around the mean.
<!-- /block -->

---

<!-- layer: formal -->

<!-- block: gear, n: 4, label: "The density and the z-score" -->

The probability density of $X \sim N(\mu, \sigma^2)$ is

$$f(x) = \frac{1}{\sigma \sqrt{2\pi}} \, \exp\!\left( -\frac{(x - \mu)^2}{2\sigma^2} \right)$$

The exponent is a parabola in $x$, which is what makes the curve fall off symmetrically; the $\frac{1}{\sigma\sqrt{2\pi}}$ out front is exactly the constant that makes the total area equal 1.

Any normal becomes the **standard normal** $N(0,1)$ by the **z-score** transform:

$$z = \frac{x - \mu}{\sigma}$$

which measures "how many standard deviations from the mean." That single rescaling is why one table — or one function — answers questions about *every* normal.

<!-- block: derivation, title: "Why the √(2π) makes the area 1", collapsed: true -->
The total area is $\int_{-\infty}^{\infty} \frac{1}{\sigma\sqrt{2\pi}} e^{-(x-\mu)^2 / 2\sigma^2}\,dx$. Substituting $z = (x-\mu)/\sigma$ reduces it to $\frac{1}{\sqrt{2\pi}} \int_{-\infty}^{\infty} e^{-z^2/2}\,dz$. The Gaussian integral $\int_{-\infty}^{\infty} e^{-z^2/2}\,dz = \sqrt{2\pi}$ (the classic trick: square it, switch to polar coordinates), so the whole thing is $\frac{\sqrt{2\pi}}{\sqrt{2\pi}} = 1$.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "The empirical rule, checked" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: normal-sim -->
```python
import numpy as np

# Draw from N(0,1) and confirm the 68–95–99.7 rule directly.
rng = np.random.default_rng(0)
x = rng.normal(0, 1, 1_000_000)
for k in (1, 2, 3):
    frac = np.mean(np.abs(x) < k)
    print(f"within {k} sigma: {frac*100:.2f}%")
# z-score: standardizing any normal lands on N(0,1).
y = rng.normal(50, 8, 1_000_000)          # N(mu=50, sigma=8)
z = (y - 50) / 8
print(f"standardized mean={z.mean():.3f}, sd={z.std():.3f}  (≈ 0, 1)")
```

---

<!-- block: misconception, inline: true -->
**"Any bell-shaped or symmetric data is normal."**

*Wrong:* if a histogram looks like a symmetric mound, it's a normal distribution.

*Correct:* "normal" is one *specific* curve, not a synonym for "symmetric and humped." Student's t is symmetric and bell-shaped but has heavier tails; a sum of two uniforms is humped but not normal. Symmetry is necessary, not sufficient — which is why we test normality rather than eyeball it.
<!-- /block -->

---

<!-- layer: both -->

<!-- block: gear, n: 6, label: "Where it leads" -->

<!-- block: callout, kind: insight -->
**Where this leads.** The **central limit theorem** explains *why* the normal is everywhere: averages of independent things converge to it. **Confidence intervals** and **hypothesis tests** lean on normal critical values (the $z$ in $\bar{x} \pm z \cdot \text{SE}$). And **Student's t** is the normal's small-sample cousin, for when you must estimate $\sigma$ instead of knowing it.
<!-- /block -->
