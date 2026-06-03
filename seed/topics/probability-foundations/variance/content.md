<!-- block: state, values: {mu: 0, sigma: 1} -->

<!-- block: plot, spec: gaussian_pdf, params: {mu: 0, sigma: 1}, binds: [mu, sigma], anchor: var-curve, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "The average isn't enough" -->

# Variance and standard deviation

Two things can share the same average and still be nothing alike. A calm river and a flash-flooding creek can have the same mean depth; one drowns you on a bad day and the other never does. The mean tells you the center. **Variance** tells you the spread — how far values typically land from that center — and it's often the part that actually matters.

---

<!-- block: gear, n: 2, label: "Spread is risk" -->

Variance measures the *average squared distance* from the mean. Small variance: values huddle near the center, predictable. Large variance: values fling out wide, surprising. Slide $\sigma$ on the curve and you're dialing exactly this — same center, different spread.

Where the distinction bites is risk.

<!-- block: decision, anchor: var-funds -->
question: |
  Two funds have averaged the **same** 6% annual return over a decade. Fund A's
  yearly returns stay within a couple of points of 6%; Fund B's swing wildly,
  from −15% to +30%. Same mean. What separates them?
options:
  - id: same
    label: "Nothing meaningful — same average return, same investment"
    writes: { sigma: 1 }
    response: |
      The mean hides exactly what an investor cares about. Equal averages can
      sit on top of wildly different spreads, and that spread is risk: Fund B
      can hand you a −15% year that Fund A never would. "Same mean" is not
      "same thing."
  - id: variance
    label: "Fund B has far higher variance — much more risk"
    writes: { sigma: 3 }
    response: |
      Right — watch the curve widen. Same center, far more spread. Variance (and
      its square root, the standard deviation) is the standard measure of that
      risk: B's returns deviate from 6% by a lot, A's by a little. Two
      investments are only comparable once you know *both* moments.
  - id: mean
    label: "Fund B must have a higher true mean to swing that high"
    writes: { sigma: 1 }
    response: |
      A big upside year doesn't raise the average if it's paid for with big
      downside years — and here the averages are stated to be equal. The +30%
      and −15% years cancel in the mean; what they create is *spread*, which is
      variance, not a higher center.
correct: variance
<!-- /block -->

---

<!-- layer: formal -->

<!-- block: gear, n: 3, label: "Squared distance, and its square root" -->

Variance is the expected squared deviation from the mean:

$$\text{Var}(X) = \mathbb{E}\big[(X - \mu)^2\big] = \mathbb{E}[X^2] - (\mathbb{E}[X])^2$$

The second form is the one you compute with: "mean of the squares minus the square of the mean." Because it squares the deviations, variance comes out in *squared units* — squared dollars, squared centimeters — which is hard to interpret. So we usually report its square root, the **standard deviation**:

$$\sigma = \sqrt{\text{Var}(X)}$$

which is back in the original units and reads directly as "a typical distance from the mean."

<!-- block: derivation, title: "Why squared deviations, not absolute ones", collapsed: true -->
You could measure spread with mean *absolute* deviation $\mathbb{E}|X - \mu|$, and sometimes people do. Squaring wins for three reasons: it's smooth and differentiable (so minimizing it has clean closed-form solutions — this is what makes least-squares regression tractable), it makes variances of *independent* sums simply add, and it falls out of the normal distribution's mathematics naturally. The cost is sensitivity to outliers: a single far-flung value, squared, dominates.
<!-- /block -->

---

<!-- block: gear, n: 4, label: "Two ways to the same number" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: var-sim -->
```python
import numpy as np

# Same mean, different variance — and the two formulas agree.
rng = np.random.default_rng(0)
calm  = rng.normal(6, 2, 200_000)    # Fund A: mean 6, sd 2
wild  = rng.normal(6, 10, 200_000)   # Fund B: mean 6, sd 10

for name, x in [("calm", calm), ("wild", wild)]:
    v1 = np.mean((x - x.mean())**2)          # E[(X-mu)^2]
    v2 = np.mean(x**2) - x.mean()**2          # E[X^2] - (E[X])^2
    print(f"{name}: mean={x.mean():.2f}  var={v1:.2f}  "
          f"(check {v2:.2f})  sd={np.sqrt(v1):.2f}")
```

Both means land near 6; the variances and standard deviations are worlds apart, and the two formulas match.

---

<!-- block: misconception, inline: true -->
**"Variance and standard deviation are basically the same thing."**

*Wrong:* they're interchangeable measures of spread, so it doesn't matter which you quote.

*Correct:* they carry the same information but live in different units. Variance is in *squared* units (squared dollars), which makes it hard to read but easy to do algebra with — variances of independent things add. Standard deviation is its square root, back in the original units, which is what you quote to humans ("returns vary by about 10 percentage points"). Use variance for the math; report the standard deviation.
<!-- /block -->

---

<!-- layer: both -->

<!-- block: gear, n: 5, label: "Where it leads" -->

<!-- block: callout, kind: insight -->
**Where this leads.** Variance powers the **standard error** $\sigma/\sqrt{n}$ behind the **central limit theorem** and **sampling distributions**. Standardized covariance is **correlation**. And the **bias–variance tradeoff** in modeling is this exact quantity, applied to a model's predictions.
<!-- /block -->
