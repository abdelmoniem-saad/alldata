<!-- block: state, values: {mu: 0, sigma: 1, n: 1} -->

<!-- block: plot, spec: gaussian_pdf, params: {mu: 0, sigma: 1}, binds: [mu, sigma], anchor: sampling-feel, mobile_order: 1 -->

---

<!-- layer: intuition -->

## The distribution of your estimate

Your sample mean is one number from one sample. Pull a different sample, you'd get a different number. Pull a thousand samples and the means form their own distribution — the **sampling distribution**.

The sampling distribution is the answer to "how much would my estimate change if I'd collected a different sample?" It's the bridge between the one dataset you have and any honest claim about the population.

---

## The shape of $\bar{X}$

The Central Limit Theorem says: regardless of the population's shape, the sampling distribution of the mean is approximately normal for large enough samples.

$$\bar{X} \sim N\!\left(\mu,\, \frac{\sigma^2}{n}\right) \text{ approximately}$$

Three things to notice:

- The mean of sample means equals the population mean. Estimates of $\mu$ are unbiased on average.
- The spread shrinks by a factor of $1/\sqrt{n}$. Doubling your sample size doesn't halve the spread; it shrinks it by about 30%.
- The shape goes to normal even if the population is skewed, uniform, or bimodal.

---

## Feel the standard error

The plot above is showing $N(\mu, \sigma^2 / n)$ — the sampling distribution of the mean from a population with the parameters you set. As you increase $n$, the curve gets narrower; the dashed target shows what "5×-narrower-than-the-population" looks like. Your job: find an $n$ that gets you there.

<!-- block: state_reset, anchor: sampling-goal -->

<!-- block: playground, anchor: sampling-goal -->
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
    Make the sampling distribution five times narrower than the population
    standard deviation — i.e. find an $n$ where $\sigma/\sqrt{n} \le \sigma/5$.
  target: { mu: 0, sigma: 1, n: 25 }
  success_when: "n >= 25"
  on_success: |
    There it is. To shrink the standard error by a factor of 5, you need
    $n = 25$. By a factor of 10? $n = 100$. By a factor of 100? $n = 10{,}000$.
    That square-root scaling is why "more data" gets expensive fast — and why
    sample sizes in the low hundreds are the sweet spot for most applied work.
  hints:
    - after_seconds: 25
      text: "The standard error is σ/√n. You want σ/√n = σ/5."
    - after_seconds: 50
      text: "Solve √n = 5. So n = 25."
<!-- /block -->

---

<!-- block: derivation, title: "Why the standard error scales as 1/√n", collapsed: true -->
The sample mean of $n$ iid observations is

$$\bar{X} = \frac{1}{n}\sum_{i=1}^{n} X_i$$

If each $X_i$ has variance $\sigma^2$, then by linearity of variance for independent terms:

$$\text{Var}(\bar{X}) = \frac{1}{n^2}\sum_{i=1}^{n} \text{Var}(X_i) = \frac{n \sigma^2}{n^2} = \frac{\sigma^2}{n}$$

The standard error is the square root: $\sigma / \sqrt{n}$. The variance shrinks linearly in $n$; the standard error shrinks as the square root. That's the law of large numbers in numerical form.
<!-- /block -->

---

<!-- block: simulation, editable: true, auto_run: true, anchor: clt-sim -->
```python
import numpy as np
import matplotlib.pyplot as plt
from scipy import stats

# Pick a heavily non-normal population — exponential — and watch the sample
# means of size n approach normality as n grows.
np.random.seed(42)
n_samples = 5000
pop_mean = 2.0

fig, axes = plt.subplots(2, 3, figsize=(11, 6))

# Row 1: exponential population
axes[0, 0].hist(np.random.exponential(pop_mean, 10000), bins=50,
                color='#71717a', alpha=0.7, density=True)
axes[0, 0].set_title('Population: Exponential')
axes[0, 0].axvline(pop_mean, color='#14b8a6', linestyle='--')

for idx, n in enumerate([5, 30]):
    means = [np.random.exponential(pop_mean, n).mean() for _ in range(n_samples)]
    axes[0, idx + 1].hist(means, bins=50, color='#d4d4d8', alpha=0.7, density=True)
    x = np.linspace(min(means), max(means), 200)
    axes[0, idx + 1].plot(x, stats.norm.pdf(x, pop_mean, pop_mean / np.sqrt(n)),
                          color='#14b8a6', linewidth=2, label='N(μ, σ²/n)')
    axes[0, idx + 1].set_title(f'Sample means, n={n}')
    axes[0, idx + 1].legend(fontsize=9)
    axes[0, idx + 1].axvline(pop_mean, color='#14b8a6', linestyle='--')

# Row 2: uniform population
pop = np.random.uniform(0, 10, 1000000)
axes[1, 0].hist(pop[:10000], bins=50, color='#71717a', alpha=0.7, density=True)
axes[1, 0].set_title('Population: Uniform')
axes[1, 0].axvline(5, color='#14b8a6', linestyle='--')

for idx, n in enumerate([5, 30]):
    means = [np.random.uniform(0, 10, n).mean() for _ in range(n_samples)]
    axes[1, idx + 1].hist(means, bins=50, color='#d4d4d8', alpha=0.7, density=True)
    axes[1, idx + 1].set_title(f'Sample means, n={n}')
    axes[1, idx + 1].axvline(5, color='#14b8a6', linestyle='--')

plt.suptitle('CLT: any population → normal sample means', fontsize=12, y=1.0)
plt.tight_layout()
plt.show()
```

---

<!-- layer: formal -->

## Formal definition

The **sampling distribution** of a statistic $T(X_1, \ldots, X_n)$ is the probability distribution of $T$ induced by random sampling.

For $X_1, \ldots, X_n$ iid with mean $\mu$ and variance $\sigma^2$:

$$E[\bar{X}] = \mu, \quad \text{Var}(\bar{X}) = \frac{\sigma^2}{n}$$

**Central Limit Theorem.** As $n \to \infty$:

$$\frac{\bar{X} - \mu}{\sigma / \sqrt{n}} \xrightarrow{d} N(0, 1)$$

**Standard error.** $\text{SE}(\bar{X}) = \sigma / \sqrt{n}$, estimated by $s / \sqrt{n}$ when $\sigma$ is unknown.

---

<!-- block: misconception, inline: true -->
**"The CLT says my data becomes normal with large samples."**

*Wrong:* if I collect enough data, my data will follow a normal distribution.

*Correct:* the CLT says the **sample mean** (or sum) becomes normal — not the data itself. If your population is skewed, the data stays skewed no matter how much you collect. It's the *average* of the data that goes normal. The shorthand "everything is normal for large $n$" loses exactly this distinction.
<!-- /block -->
