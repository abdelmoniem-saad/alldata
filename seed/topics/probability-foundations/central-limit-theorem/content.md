<!-- block: state, values: {mu: 0, sigma: 1, n: 1} -->

<!-- block: plot, spec: gaussian_pdf, params: {mu: 0, sigma: 1}, binds: [mu, sigma], anchor: clt-feel, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "The spark" -->

# The Central Limit Theorem

The average of any reasonable thing, repeated enough times, looks like a bell curve. Not approximately. Not "ish." A specific bell curve, with a specific mean and a specific spread.

This is the most-used result in statistics. It's why "more data" works.

---

<!-- block: gear, n: 2, label: "Intuition" -->

## Averages forget their shape

Pull samples from a wildly skewed distribution — incomes, earthquake magnitudes, anything heavy-tailed. The samples themselves stay skewed. But take the *average* of $n$ of them, and as $n$ grows, the average becomes normal.

The original distribution's shape — uniform, exponential, bimodal — washes out. Only two facts about it survive in the limit: its mean $\mu$ and its variance $\sigma^2$.

That's why $\bar{X}$ is approximately normal even when $X$ isn't.

---

<!-- block: gear, n: 3, label: "Feel n grow" -->

## The width shrinks as 1/√n

The plot above shows the *sampling distribution* of the mean — what you'd get if you collected $n$ samples, took the average, and repeated forever. Two parameters control it: $\mu$ (same as the population mean) and $\sigma / \sqrt{n}$ (the standard error).

<!-- block: state_reset, anchor: clt-narrow -->

<!-- block: playground, anchor: clt-narrow -->
binds: [mu, sigma, n]
controls:
  - param: mu
    label: "Population mean (μ)"
    min: -2
    max: 2
    step: 0.1
  - param: sigma
    label: "Population SD (σ)"
    min: 0.5
    max: 3
    step: 0.1
  - param: n
    label: "Sample size (n)"
    min: 1
    max: 100
    step: 1
goal:
  prompt: |
    Make the sampling distribution four times narrower than the population SD.
    Find an $n$ where $\sigma/\sqrt{n} \le \sigma/4$.
  target: { mu: 0, sigma: 1, n: 16 }
  success_when: "n >= 16"
  on_success: |
    To shrink by a factor of 4, you need $n = 16$. By 10, $n = 100$. By 100,
    $n = 10{,}000$. Standard error decays as the square root of sample size —
    which is why doubling your data doesn't halve uncertainty. To halve
    uncertainty you need *four* times the data.
  hints:
    - after_seconds: 25
      text: "Solve √n = 4."
<!-- /block -->

---

<!-- layer: formal -->

<!-- block: gear, n: 4, label: "The formalism" -->

## Formal statement

Let $X_1, X_2, \ldots, X_n$ be iid with mean $\mu$ and variance $\sigma^2 < \infty$. Then as $n \to \infty$,

$$\frac{\bar{X}_n - \mu}{\sigma / \sqrt{n}} \xrightarrow{d} N(0, 1)$$

Equivalently:

$$\bar{X}_n \xrightarrow{d} N\!\left(\mu, \frac{\sigma^2}{n}\right)$$

Three conditions matter:
- **iid** — the samples are independent and identically distributed.
- **finite variance** — $\sigma^2 < \infty$. Cauchy distributions, with infinite variance, *never* converge.
- **the limit is in distribution** — pointwise CDF convergence, not pointwise sample convergence.

<!-- block: derivation, title: "The characteristic-function sketch", collapsed: true -->
Let $Y_i = (X_i - \mu) / \sigma$ — standardized iid with mean 0, variance 1. The characteristic function is $\phi_Y(t) = \mathbb{E}[e^{itY}]$. Expanding,

$$\phi_Y(t) = 1 - \frac{t^2}{2} + o(t^2)$$

The standardized sample mean is $Z_n = \frac{1}{\sqrt{n}} \sum_i Y_i$, with characteristic function

$$\phi_{Z_n}(t) = \phi_Y(t/\sqrt{n})^n = \left(1 - \frac{t^2}{2n} + o(1/n)\right)^n \xrightarrow{n \to \infty} e^{-t^2/2}$$

That's the characteristic function of $N(0, 1)$. Lévy's continuity theorem turns the limit of characteristic functions into a limit in distribution. Done.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Code" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: clt-sim -->
```python
import numpy as np
import matplotlib.pyplot as plt
from scipy import stats

# Pick a heavily non-normal population (exponential) and watch the sample
# means of size n approach normality as n grows.
np.random.seed(42)
n_samples = 5000
pop_mean = 2.0  # exponential(λ=0.5) has mean 2

fig, axes = plt.subplots(1, 4, figsize=(12, 3))
axes[0].hist(np.random.exponential(pop_mean, 10_000), bins=50,
             color='#71717a', alpha=0.7, density=True)
axes[0].set_title('Population (exponential)')
axes[0].axvline(pop_mean, color='#14b8a6', linestyle='--')

for idx, n in enumerate([2, 10, 50]):
    means = [np.random.exponential(pop_mean, n).mean() for _ in range(n_samples)]
    axes[idx + 1].hist(means, bins=50, color='#d4d4d8', alpha=0.7, density=True)
    x = np.linspace(min(means), max(means), 200)
    axes[idx + 1].plot(x, stats.norm.pdf(x, pop_mean, pop_mean / np.sqrt(n)),
                       color='#14b8a6', linewidth=2, label='N(μ, σ²/n)')
    axes[idx + 1].set_title(f'Sample means, n={n}')
    axes[idx + 1].legend(fontsize=8)
    axes[idx + 1].axvline(pop_mean, color='#14b8a6', linestyle='--')

plt.tight_layout()
plt.show()
```

---

<!-- layer: both -->

<!-- block: gear, n: 6, label: "Connections" -->

<!-- block: callout, kind: insight -->
**Where this leads.** **Confidence intervals** and **hypothesis tests** lean on the CLT to claim "the sample mean is approximately normal" — that approximation is what makes the math tractable. **Sampling distributions** is the topic that formalizes what the CLT is making claims about. **The law of large numbers** is its weaker companion: same setup, different conclusion (point convergence instead of distributional).
<!-- /block -->

---

<!-- block: misconception, inline: true -->
**"The CLT says the data becomes normal with large samples."**

*Wrong:* if I collect enough data, my data follows a normal distribution.

*Correct:* the CLT says the **sample mean** (or sum) becomes normal — not the data itself. If your population is skewed, your data stays skewed no matter how much you collect. It's the *average* of the data that turns normal. The shorthand "everything becomes normal for large $n$" loses exactly that distinction.
<!-- /block -->
