<!-- block: gear, n: 1, label: "Two distributions your formulas keep meeting" -->

You have now met the binomial (counts of successes) and the exponential
(waiting times). Two relatives keep appearing around them, and both are
defined on restricted territory: the **Beta** lives on (0, 1), the
natural home of probabilities and proportions; the **Gamma** lives on
(0, ∞), the natural home of waiting times and positive scales.

---

<!-- block: gear, n: 2, label: "The Beta: a belief about a proportion" -->

A Beta(a, b) distribution describes uncertainty about a probability. Its
two knobs read like evidence counts: `a` pushes the belief toward 1
(success-shaped), `b` toward 0 (failure-shaped).

$$\text{Beta}(a, b): \qquad E[X] = \frac{a}{a+b}, \qquad \text{Var}(X) = \frac{ab}{(a+b)^2 (a+b+1)}$$

The behavior family is intuitive. Beta(1, 1) is the flat uniform: no
opinion about the coin. Beta(3, 3) is symmetric and concentrated at 1/2:
"a fair-ish coin, moderately sure." Beta(10, 2) concentrates at 10/12 ≈
0.83: "heads-prone, fairly sure." Beta(0.5, 0.5) is U-shaped and wild:
an opinion that extreme is more likely than middling (rarely what you
want).

**The conjugate miracle** is why Bayesians treasure it: start with a
Beta(a, b) prior, observe s successes in n flips, and the posterior is
Beta(a + s, b + n − s). Updating a belief is adding two numbers. The
beta_posterior plot in this catalog runs on exactly this arithmetic.

**The Gamma** is the exponential's parent: the sum of k independent
Exponential(rate λ) waits is Gamma(k, λ), the time until the k-th bus.
Its shape parameter k makes it the flexible model for positive-skewed
data, and its role as the conjugate prior for a Poisson rate and a
normal variance is the same convenience the Beta lends the binomial.

---

<!-- block: gear, n: 3, label: "Read the prior" -->

<!-- block: decision, anchor: bg-pick -->
question: |
  Before seeing any flips, your prior on a coin is Beta(2, 8). What is
  your prior mean for heads, and what does the asymmetry say?
options:
  - id: a
    label: "0.5; 2 and 8 average out"
    writes: { mu: 0.5 }
    response: |
      Averaging the knobs ignores what they encode. The mean is
      a / (a + b) = 2/10, and the wide gap between the knobs says the
      distribution leans hard toward tails. The curve slid left to
      show it.
  - id: b
    label: "0.2; tails-shaped, as if you'd seen 1 head in 9 flips"
    writes: { mu: 0.2 }
    response: |
      Correct, and that is the right way to read a Beta: Beta(a, b)
      behaves like a belief built from a previous a heads and b tails.
      The knobs ARE pseudo-counts, which is exactly why the Bayesian
      update is addition.
  - id: c
    label: "0.25; one quarter of the range"
    writes: { mu: 0.25 }
    response: |
      The quarter-of-the-range reading confuses the parameter space
      with the mean. The Beta's mean is a/(a+b) = 0.2 here, and the
      peak of the density for these knobs sits even lower than that.
correct: b
<!-- /block -->

<!-- block: plot, spec: beta_posterior, params: {prior_a: 2, prior_b: 8, successes: 0, trials: 0}, binds: [prior_a, prior_b, successes, trials], anchor: bg-curve, mobile_order: 1 -->

The Beta density itself. The knobs reshape it from flat (1, 1) to
peaked; the successes/trials arithmetic is the conjugate update playing
out live.

---

<!-- block: gear, n: 4, label: "Where each earns its keep" -->

The Beta: any bounded proportion (conversion rates, batting averages,
disease prevalence), prior distributions in Bayesian work, and smoothed
proportion estimates (a raw 3-for-3 night is Beta(4, 1) information, not
a literal 100% claim). The Gamma: total waiting times, insurance claim
sizes, rainfall totals, and as the conjugate prior for Poisson rates and
normal variances. Together they cover most "positive or bounded
quantity" modeling you will meet before hierarchical models.

<!-- block: fill_in, anchor: bg-fill -->
1. The Beta lives on (0, 1) and reads its knobs as evidence for and against a proportion.
2. The Gamma lives on (0, inf) and is the k-th waiting time of a Poisson process.
3. Both are conjugate: the posterior stays in the family, and updating is addition.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Watch the update" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: bg-sim -->
```python
import numpy as np

rng = np.random.default_rng(17)
a, b = 2.0, 8.0                      # prior: leans tails, as if 2-of-10
flips = rng.binomial(1, 0.3, 50)     # the truth is 0.3 heads

running = []
for n in (0, 5, 20, 50):
    s = flips[:n].sum()
    pa, pb = a + s, b + n - s
    running.append((pa / (pa + pb)))
    print(f"after {n:>2} flips ({s} heads): posterior mean = {pa/(pa+pb):.3f}")
# The belief walks from 0.2 toward the truth as evidence accumulates,
# each step pure addition. The plot above is this walk, live.
```

---

<!-- block: gear, n: 6, label: "Where this leads" -->

<!-- block: callout, kind: insight -->
**You have already used both.** The bayesian-inference topic's
posterior-update plot is the conjugate Beta in action, and the
student-t's variance story quietly leans on the Gamma's role as the
variance's prior. Hierarchical models, coming after regression, stack
these same two distributions into three levels.
<!-- /block -->

<!-- block: misconception, inline: true -->
**"Beta(2, 8) means 2 successes and 8 failures were observed."**

*Wrong:* the knobs are literal counts from a previous experiment.

*Correct:* they are pseudo-counts, a convenient encoding of prior
strength. Sometimes they come from a real earlier study, sometimes from
an expert's judgment ("behaves like 2-of-10 evidence"). The conjugate
update treats them exactly like observed counts, which is the feature,
and over-literal reading (claiming a study happened) is the bug.
<!-- /block -->
