<!-- layer: intuition -->

## The Distribution of Your Estimate

Here's a mind-bending idea: your sample mean is just one number from one sample. But if you could repeat the sampling process thousands of times, you'd get thousands of different sample means. Those sample means form their own distribution — the **sampling distribution**.

The sampling distribution answers: "How much would my estimate change if I collected a different sample?"

This is the bridge between a single dataset and statements about the population. Without understanding sampling distributions, confidence intervals and hypothesis tests are just magic formulas.

---

## The Central Limit Theorem at Work

The most powerful result in statistics: regardless of the population's shape, the sampling distribution of the mean is approximately **Normal** for large enough samples.

$$\bar{X} \sim N\left(\mu, \frac{\sigma^2}{n}\right) \text{ approximately}$$

This means:
- The average of the sample means equals the population mean (no bias)
- The spread shrinks by $1/\sqrt{n}$ (precision improves with more data)
- The shape is Normal (even if the population is skewed, uniform, or bimodal!)

---

<!-- block: simulation, editable: true -->
```python
import numpy as np
import matplotlib.pyplot as plt
from scipy import stats

# The CLT in action: sample from VERY non-normal populations
np.random.seed(42)
n_samples = 5000

# Population: exponential (heavily right-skewed)
pop_mean = 2.0
population = np.random.exponential(pop_mean, 1000000)

fig, axes = plt.subplots(2, 3, figsize=(12, 7))

# Top row: the population + sampling distributions
axes[0, 0].hist(population[:10000], bins=50, color='#ff8a3d', alpha=0.7, density=True)
axes[0, 0].set_title('Population (Exponential)', fontweight='bold')
axes[0, 0].axvline(pop_mean, color='red', linestyle='--')

for idx, n in enumerate([5, 30]):
    means = [np.random.exponential(pop_mean, n).mean() for _ in range(n_samples)]
    axes[0, idx+1].hist(means, bins=50, color='#a78bfa', alpha=0.7, density=True)
    
    # Overlay theoretical normal
    x = np.linspace(min(means), max(means), 200)
    axes[0, idx+1].plot(x, stats.norm.pdf(x, pop_mean, pop_mean/np.sqrt(n)),
                         'r-', linewidth=2, label='Normal approx')
    axes[0, idx+1].set_title(f'Sample Means (n={n})', fontweight='bold')
    axes[0, idx+1].legend(fontsize=9)
    axes[0, idx+1].axvline(pop_mean, color='red', linestyle='--')

# Bottom row: uniform population (very different from normal!)
pop = np.random.uniform(0, 10, 1000000)
axes[1, 0].hist(pop[:10000], bins=50, color='#ff8a3d', alpha=0.7, density=True)
axes[1, 0].set_title('Population (Uniform)', fontweight='bold')
axes[1, 0].axvline(5, color='red', linestyle='--')

for idx, n in enumerate([5, 30]):
    means = [np.random.uniform(0, 10, n).mean() for _ in range(n_samples)]
    axes[1, idx+1].hist(means, bins=50, color='#a78bfa', alpha=0.7, density=True)
    axes[1, idx+1].set_title(f'Sample Means (n={n})', fontweight='bold')
    axes[1, idx+1].axvline(5, color='red', linestyle='--')

plt.suptitle('Central Limit Theorem: Any Population → Normal Sample Means', fontsize=13, y=1.02)
plt.tight_layout()
plt.show()

print("Even heavily skewed or flat populations → Normal sample means!")
print(f"Standard error = σ/√n: for n=30, SE is {1/np.sqrt(30):.1%} of population σ")
```
<!-- expected_output: Even skewed populations produce Normal sample means -->

---

<!-- layer: formal -->

## Formal Definition

The **sampling distribution** of a statistic $T(X_1, \ldots, X_n)$ is the probability distribution of $T$ induced by the random sampling.

For $X_1, \ldots, X_n$ iid with mean $\mu$ and variance $\sigma^2$:

$$E[\bar{X}] = \mu, \quad \text{Var}(\bar{X}) = \frac{\sigma^2}{n}$$

**Central Limit Theorem:** As $n \to \infty$:

$$\frac{\bar{X} - \mu}{\sigma/\sqrt{n}} \xrightarrow{d} N(0, 1)$$

**Standard Error:** $\text{SE}(\bar{X}) = \frac{\sigma}{\sqrt{n}}$ (estimated by $\frac{s}{\sqrt{n}}$)

---

<!-- block: misconception -->
**Misconception: "The CLT says data becomes Normal with large samples."**

*Wrong belief:* If I collect enough data, my data will follow a Normal distribution.

*Correction:* The CLT says the **sample mean** (or sum) becomes Normal, NOT the data itself. If your population is skewed, your data will still be skewed no matter how much you collect. It's the *average* of the data that becomes Normal. This distinction is crucial!

*Why this is common:* The shorthand "everything is Normal for large n" loses the critical nuance about what exactly becomes Normal.

---

<!-- block: quiz -->
**Micro-challenge:** A population has mean 100 and standard deviation 20. You take samples of size n=64. What's the standard error of the sample mean? What's the probability that the sample mean falls between 97 and 103?

*Hint:* SE = σ/√n. Then standardize and use the Normal distribution.

<!-- solution: SE = 20/√64 = 20/8 = 2.5. Z₁ = (97-100)/2.5 = -1.2. Z₂ = (103-100)/2.5 = 1.2. P(-1.2 < Z < 1.2) = 2·Φ(1.2) - 1 ≈ 2·0.8849 - 1 = 0.7699. About 77% of sample means will fall within ±3 of the true mean. -->
