<!-- block: gear, n: 1, label: "Two dice, one table" -->

Everything so far lived on one axis: one random variable, one
distribution. But real questions have two (or fifty) variables at once.
Height and wingspan. Rainfall and crop yield. The joint distribution is
the object that answers questions about *both at once*, and it has a
shape that neither variable's own distribution shows.

---

<!-- block: gear, n: 2, label: "The cloud remembers" -->

Plot every observed pair as a point and the joint distribution becomes a
cloud. Read it the way you read terrain. Where the cloud is dense, both
variables sit there together. If the cloud tilts, high-left to
low-right, the variables move together: tall people tend to have long
wingspans. If the cloud is a round blob, knowing one coordinate tells
you nothing about the other.

The tilt is real information that vanishes the moment you summarize
each variable separately. Two variables can have identical means,
identical variances, even identical shapes, and still be utterly
different partners: one pairs up with its twin, the other is a stranger
to everything. The number that captures the tilt is the covariance:

$$\text{Cov}(X, Y) = E\big[(X - E[X])(Y - E[Y])\big]$$

Positive when the cloud tilts up, negative when it tilts down, zero
when the tilt washes out. Its units are the awkward product of the two
variables' units, which is why the correlation coefficient (next
domain) will rescale it into something comparable across pairs.

---

<!-- block: gear, n: 3, label: "Tilt or no tilt" -->

<!-- block: decision, anchor: jd-pick -->
question: |
  Pairs (X, Y) are drawn so Y = 0.8X + noise. A second pair (X, W) is
  drawn with W = 0.8X + noise, but the noise is made to perfectly
  cancel the signal. Which cloud shows real tilt?
options:
  - id: a
    label: "Both; same coefficients"
    writes: { slope: 0.7 }
    response: |
      The fitted lines both tilted, but tilt is exactly what the second
      cloud lacks: its slope is a straight horizontal line at the mean.
      A coefficient printed in a notebook is not a property of the
      cloud; the cloud decides.
  - id: b
    label: "Only the first; the second's tilt was cancelled"
    writes: { slope: 0 }
    response: |
      Correct, and the flat fit line is the picture of zero covariance:
      knowing X neither raises nor lowers the expectation of W. Two
      variables with the same marginal story can be strangers, and only
      the joint view can tell.
  - id: c
    label: "Neither; noise always wins"
    writes: { slope: -0.4 }
    response: |
      The cloud is now tilted the wrong way: a negative slope means
      below-average X goes with above-average W. That is a real,
      strong covariance, just a negative one. Noise doesn't erase
      signal, it competes with it.
correct: b
<!-- /block -->

<!-- block: plot, spec: scatter_with_fit, params: {slope: 0.7, intercept: 0.3}, binds: [slope, intercept], anchor: jd-cloud, mobile_order: 1 -->

The fit line's slope is the cloud's tilt, the covariance made visible.
Flat at zero covariance, climbing with it. The scatter is the joint
distribution; everything else is its summary.

---

<!-- block: gear, n: 4, label: "The variance bonus" -->

Covariance is not just descriptive; it does arithmetic. For a sum of two
variables:

$$\text{Var}(X + Y) = \text{Var}(X) + \text{Var}(Y) + 2\,\text{Cov}(X, Y)$$

The covariance term is why diversifying works in finance (imperfectly
correlated assets sum to less risk than their parts), and why
replicating measurements cancels noise (errors uncorrelated with the
signal contribute no covariance). Perfect positive covariance doubles
the cross term and the risks add whole; perfect negative covariance
cancels them and the sum can be a constant.

<!-- block: fill_in, anchor: jd-fill -->
1. The joint distribution is the terrain; the marginals are its two shadows, and different terrains cast the same shadows.
2. Covariance measures the cloud's tilt in product units, and zero covariance means the tilt washes out.
3. Variances of a sum add only up to the covariance term, which is why uncorrelated errors are the analyst's best friend.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Feel the sum" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: jd-sim -->
```python
import numpy as np

rng = np.random.default_rng(13)
n = 200_000

for rho in (-1.0, 0.0, 0.5, 1.0):
    x, z = rng.normal(size=n), rng.normal(size=n)
    y = rho * x + np.sqrt(1 - rho**2) * z   # Var(y) = 1 always
    print(f"rho={rho:+.1f}: Var(X+Y) = {(x + y).var():.3f}  (theory {2 + 2*rho:.1f})")
# Watch the sum's variance collapse at rho = -1: two full-variance
# variables can sum to a constant. That is the covariance term at work.
```

---

<!-- block: gear, n: 6, label: "Where this leads" -->

<!-- block: callout, kind: insight -->
**The gateway to everything relational.** Correlation is covariance
rescaled by the two standard deviations. Simple linear regression is the
tilt measured as a slope rather than a spread ratio. And the subtle
caution, "covariance is not causation", gets its own treatment much
later, after you have the tools to say what would have happened instead.
<!-- /block -->

<!-- block: misconception, inline: true -->
**"Zero covariance means the variables don't interact at all."**

*Wrong:* a covariance of zero certifies the two variables are
independent.

*Correct:* zero covariance only means the *linear* tilt washes out. A
cloud shaped like a perfect parabola, y = x^2, has zero covariance and a
very strong dependence: knowing x pins y exactly. Independence kills
every form of interaction; zero covariance kills only the straight-line
one.
<!-- /block -->
