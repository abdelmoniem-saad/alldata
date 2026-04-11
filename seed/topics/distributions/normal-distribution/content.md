<!-- layer: intuition -->

## Why Is It Everywhere?

The normal distribution shows up constantly in nature: heights, measurement errors, exam scores, stock returns. This isn't a coincidence — it's a consequence of the **Central Limit Theorem**: whenever you add up many small, independent effects, the result tends toward a bell curve.

A person's height is the sum of contributions from hundreds of genes plus environmental factors. Each factor adds a tiny amount. Sum them up → normal distribution.

---

## The Shape

The bell curve is defined by just two numbers:
- **Mean (μ)** — the center, where the peak is
- **Standard deviation (σ)** — the width, how spread out the data is

The **68-95-99.7 rule** tells you almost everything:
- 68% of data falls within 1σ of the mean
- 95% within 2σ
- 99.7% within 3σ

---

<!-- block: simulation, editable: true -->
```python
import numpy as np
import matplotlib.pyplot as plt

# SIMULATION FIRST: See the Central Limit Theorem create a normal distribution
np.random.seed(42)

# Roll a single die — NOT normal (it's uniform)
single_die = np.random.randint(1, 7, 10000)

# Average of 2 dice — getting closer
avg_2 = np.array([np.random.randint(1, 7, 2).mean() for _ in range(10000)])

# Average of 30 dice — nearly perfect normal!
avg_30 = np.array([np.random.randint(1, 7, 30).mean() for _ in range(10000)])

fig, axes = plt.subplots(1, 3, figsize=(14, 4))

axes[0].hist(single_die, bins=6, density=True, color='#e74c3c', edgecolor='white')
axes[0].set_title('1 die: Uniform')
axes[0].set_xlabel('Value')

axes[1].hist(avg_2, bins=30, density=True, color='#f39c12', edgecolor='white')
axes[1].set_title('Average of 2 dice')
axes[1].set_xlabel('Average')

axes[2].hist(avg_30, bins=40, density=True, color='#2ecc71', edgecolor='white')
axes[2].set_title('Average of 30 dice: Normal!')
axes[2].set_xlabel('Average')

# Overlay the theoretical normal on the last plot
from scipy import stats
x = np.linspace(avg_30.min(), avg_30.max(), 100)
axes[2].plot(x, stats.norm.pdf(x, avg_30.mean(), avg_30.std()), 'k-', lw=2, label='Normal PDF')
axes[2].legend()

plt.suptitle('The Central Limit Theorem in Action', fontsize=14, fontweight='bold')
plt.tight_layout()
plt.show()

print(f"Average of 30 dice — Mean: {avg_30.mean():.3f}, Std: {avg_30.std():.3f}")
print(f"Theoretical — Mean: 3.500, Std: {np.sqrt(35/12/30):.3f}")
```

---

<!-- layer: formal -->

## Formal Definition

A random variable $X$ follows a normal distribution, written $X \sim N(\mu, \sigma^2)$, if its PDF is:

$$f(x) = \frac{1}{\sigma\sqrt{2\pi}} \exp\left(-\frac{(x-\mu)^2}{2\sigma^2}\right)$$

for $x \in (-\infty, \infty)$.

**Properties:**
- $E[X] = \mu$
- $\text{Var}(X) = \sigma^2$
- Symmetric about $\mu$
- If $X \sim N(\mu, \sigma^2)$, then $Z = \frac{X - \mu}{\sigma} \sim N(0, 1)$ (standardization)
- The sum of independent normals is normal: if $X_i \sim N(\mu_i, \sigma_i^2)$ independently, then $\sum X_i \sim N(\sum \mu_i, \sum \sigma_i^2)$

The **standard normal** $Z \sim N(0, 1)$ has CDF denoted $\Phi(z)$, used in virtually all statistical tables.

---

<!-- block: misconception -->
**Misconception: "If data is bell-shaped, it's normally distributed."**

*Wrong belief:* Any symmetric, unimodal distribution is normal.

*Correction:* Many distributions look bell-shaped but aren't normal. The t-distribution has heavier tails. The logistic distribution looks similar but has different tail behavior. "Bell-shaped" is necessary but not sufficient. Use QQ-plots or formal tests (Shapiro-Wilk) to check normality.

*Why this is common:* The normal distribution is taught so early and so often that it becomes the default mental model for any symmetric data.

---

<!-- block: quiz -->
**Micro-challenge:** Modify the simulation to use `np.random.exponential` instead of `np.random.randint`. The exponential distribution is *heavily skewed* (not symmetric at all). Does the average of 30 exponential draws still look normal? What does this tell you about the Central Limit Theorem?
