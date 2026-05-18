<!-- block: state, values: {mu: 0, sigma: 1, n: 30} -->

<!-- block: plot, spec: gaussian_pdf, params: {mu: 0, sigma: 1}, binds: [mu, sigma], anchor: ci-pdf, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "The most-misread number in stats" -->

# Confidence intervals

A 95% confidence interval is the most-misunderstood statistic in everyday use. The math is precise. The popular reading isn't.

---

<!-- block: gear, n: 2, label: "What 95% actually means" -->

## What 95% actually means

You compute a 95% CI for the mean. You report $[2.1, 4.3]$. Most people read that as "there's a 95% chance the true mean is in $[2.1, 4.3]$."

That reading is *wrong* under the frequentist framework — and it matters.

The correct reading: if you re-ran your study many times, computing a fresh 95% CI each time, **95% of those intervals** would contain the true mean. The 95% is a property of the *procedure*, not of any single interval. Once you've computed a specific interval, the true mean either is or isn't in it — there's no probability about *that* anymore.

---

<!-- block: gear, n: 3, label: "Which reading is right?" -->

<!-- block: decision, anchor: ci-pick -->
question: |
  You compute a 95% CI for a population mean and get $[2.1, 4.3]$. Which of
  these statements is *correct* under the frequentist definition of CI?
options:
  - id: a
    label: "There's a 95% probability the true mean is between 2.1 and 4.3."
    writes: { mu: 0 }
    response: |
      This is the popular reading — and it's wrong frequentist-wise. The true
      mean is a fixed (unknown) constant; either it *is* in $[2.1, 4.3]$ or it
      isn't. The 95% can't refer to a probability about the parameter once the
      data is collected. (A Bayesian credible interval *would* support this
      reading — but it requires a prior, and the math is different.)
  - id: b
    label: "If we repeated this procedure many times, 95% of the resulting intervals would contain the true mean."
    writes: { mu: 1.5 }
    response: |
      Right. The 95% describes the *long-run frequency* of intervals containing
      the parameter. It's a property of the procedure (and of the assumptions
      it relies on — normality, iid, etc.), not of any single interval you
      happen to have computed.
  - id: c
    label: "95% of the data falls between 2.1 and 4.3."
    writes: { sigma: 0.5 }
    response: |
      That would be a *prediction* interval for individual observations, not a
      confidence interval for the *mean*. They're different things — prediction
      intervals are wider because they have to account for the variability of
      single observations, not just the precision of the mean estimate.
correct: b
<!-- /block -->

---

<!-- block: callout, kind: insight, depends_on: ci-pick, branch: b -->
The frequentist CI is a statement about the long-run reliability of the *procedure* under repeated sampling. Most readers want a Bayesian credible interval — *given my data, where do I think the parameter is?* — and the two coincide numerically only under specific priors. Knowing which one you're computing matters.
<!-- /block -->

<!-- block: callout, kind: insight, depends_on: ci-pick, branch: a|c -->
The trap was conflating "95% of intervals contain the parameter" with "this interval contains the parameter with 95% probability." Frequentists treat the parameter as fixed; the randomness is in the *interval*. Bayesians treat the parameter as a random variable and *can* make probability statements about it — but that's a different framework with different machinery.
<!-- /block -->

---

<!-- layer: formal -->

<!-- block: gear, n: 4, label: "Estimate ± critical × SE" -->

## Construction

For the mean of a normal population with known variance:

$$\bar{X} \pm z_{\alpha/2} \cdot \frac{\sigma}{\sqrt{n}}$$

For 95% CIs, $z_{0.025} \approx 1.96$. With unknown variance you swap the normal critical value for a $t$-distribution critical value with $n-1$ degrees of freedom:

$$\bar{X} \pm t_{\alpha/2, n-1} \cdot \frac{s}{\sqrt{n}}$$

For other parameters (proportions, variances, regression coefficients), the form is the same: an estimate, plus or minus a critical value times a standard error.

<!-- block: derivation, title: "Why $\bar{X} \pm 1.96 \, \sigma/\sqrt{n}$ has 95% coverage", collapsed: true -->
By the CLT, $\bar{X} \sim N(\mu, \sigma^2/n)$. Standardize:

$$Z = \frac{\bar{X} - \mu}{\sigma / \sqrt{n}} \sim N(0, 1)$$

By construction, $P(-1.96 < Z < 1.96) = 0.95$. Algebra:

$$P\!\left(\bar{X} - 1.96 \cdot \tfrac{\sigma}{\sqrt{n}} < \mu < \bar{X} + 1.96 \cdot \tfrac{\sigma}{\sqrt{n}}\right) = 0.95$$

The probability is over $\bar{X}$, not over $\mu$. That's the whole subtlety: $\mu$ is the constant; the *interval* is what's random.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "100 intervals, ~95 should cover" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: ci-sim -->
```python
import numpy as np
import matplotlib.pyplot as plt
from scipy import stats

# Simulate the frequentist promise: build 100 95%-CIs for the mean of a
# normal population with known μ=0, σ=1, n=30. Count how many cover μ=0.
np.random.seed(42)
n = 30
mu_true = 0
sigma = 1
n_intervals = 100

intervals = []
for _ in range(n_intervals):
    sample = np.random.normal(mu_true, sigma, n)
    se = sigma / np.sqrt(n)
    z = stats.norm.ppf(0.975)
    intervals.append((sample.mean() - z * se, sample.mean() + z * se))

contains = sum(lo <= mu_true <= hi for lo, hi in intervals)
print(f"{contains} / {n_intervals} intervals contain the true mean (target: ~95)")

fig, ax = plt.subplots(figsize=(8, 5))
for i, (lo, hi) in enumerate(intervals):
    color = '#14b8a6' if lo <= mu_true <= hi else '#c98b8b'
    ax.plot([lo, hi], [i, i], color=color, linewidth=1.5)
ax.axvline(mu_true, color='#a1a1aa', linestyle='--', linewidth=1, label='true μ')
ax.set_ylabel('Replication')
ax.set_xlabel('CI for μ')
ax.set_title(f'{contains}/{n_intervals} intervals cover the true mean')
ax.legend()
plt.tight_layout()
plt.show()
```

---

<!-- layer: both -->

<!-- block: gear, n: 6, label: "Where it leads" -->

<!-- block: callout, kind: insight -->
**Where this leads.** **Hypothesis testing** is a mirror of CIs — a CI that excludes 0 corresponds to a rejection of $H_0: \mu = 0$ at the same level. **Bayesian inference** offers credible intervals that *do* support the popular reading, at the cost of a prior. **Sampling distributions** is the engine room: every CI relies on a sampling distribution to compute its critical value.
<!-- /block -->

---

<!-- block: misconception, inline: true -->
**"A 95% CI has a 95% probability of containing the true value."**

*Wrong:* the interval is a probabilistic statement about where the parameter lives.

*Correct:* under frequentism, the parameter is fixed and the interval is random. *Before* you collect data, the interval-construction *procedure* covers the parameter 95% of the time. *After* the data is collected, the specific interval either covers the parameter or doesn't — there's no remaining probability statement to make. For a probabilistic reading of the parameter given the data, you need Bayesian inference.
<!-- /block -->
