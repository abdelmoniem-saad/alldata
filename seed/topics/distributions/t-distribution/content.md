<!-- layer: intuition -->

## The Normal's Heavier-Tailed Cousin

When you estimate a population mean from a small sample, you don't know the true standard deviation — you estimate it too. This extra uncertainty makes your estimate wobblier than a Normal distribution would suggest.

The **t-distribution** (or Student's t) accounts for this extra uncertainty. It looks like a Normal distribution but with **heavier tails** — extreme values are more likely.

The key parameter is **degrees of freedom** (df), which is typically n-1 where n is your sample size:
- **Low df** (small sample): very heavy tails, lots of uncertainty
- **High df** (large sample): almost identical to Normal
- **df → ∞**: converges exactly to the Normal distribution

---

## Why "Student"?

William Sealy Gosset developed this distribution in 1908 while working at the Guinness brewery, trying to monitor beer quality with small samples. He published under the pseudonym "Student" because Guinness didn't want competitors to know they were using statistics. The t-distribution is sometimes called "Student's t" in his honor.

---

<!-- block: code_python, editable: true -->
```python
import numpy as np
import matplotlib.pyplot as plt
from scipy import stats

# Compare t-distributions with different degrees of freedom
x = np.linspace(-5, 5, 1000)

plt.figure(figsize=(8, 5))
for df in [1, 3, 10, 30]:
    plt.plot(x, stats.t.pdf(x, df), linewidth=2, label=f't(df={df})')
plt.plot(x, stats.norm.pdf(x), 'k--', linewidth=2, label='Normal (df=∞)')
plt.xlabel('x')
plt.ylabel('Density')
plt.title('t-Distribution: Heavier Tails with Fewer Degrees of Freedom')
plt.legend()
plt.grid(alpha=0.2)
plt.tight_layout()
plt.show()

# Show how tail probabilities differ
print("P(|X| > 2.5) — probability of extreme values:")
print(f"  Normal:    {2 * stats.norm.sf(2.5):.4f}")
for df in [3, 5, 10, 30]:
    print(f"  t(df={df:2d}): {2 * stats.t.sf(2.5, df):.4f}")
print("\nWith small samples, extreme values are MORE likely!")
```
<!-- expected_output: t-distribution has heavier tails than Normal -->

---

<!-- layer: formal -->

## Formal Definition

If $Z \sim N(0,1)$ and $V \sim \chi^2(k)$ are independent, then:

$$T = \frac{Z}{\sqrt{V/k}} \sim t(k)$$

**PDF:**

$$f(t) = \frac{\Gamma\left(\frac{k+1}{2}\right)}{\sqrt{k\pi} \, \Gamma\left(\frac{k}{2}\right)} \left(1 + \frac{t^2}{k}\right)^{-\frac{k+1}{2}}$$

**Mean:** $E[T] = 0$ for $k > 1$

**Variance:** $\text{Var}(T) = \frac{k}{k-2}$ for $k > 2$

As $k \to \infty$: $t(k) \to N(0,1)$

**Key application:** When $X_1, \ldots, X_n \sim N(\mu, \sigma^2)$:

$$\frac{\bar{X} - \mu}{S/\sqrt{n}} \sim t(n-1)$$

where $S$ is the sample standard deviation.

---

<!-- block: misconception -->
**Misconception: "The t-distribution is only for small samples."**

*Wrong belief:* Use t for n < 30, use Normal for n ≥ 30.

*Correction:* The t-distribution is **always** technically correct when you're estimating the population standard deviation from data (which is almost always). The "n ≥ 30 use Normal" rule is a rough approximation — at df=30, the t and Normal are very similar but not identical. Modern software always uses the t-distribution regardless of sample size, and so should you.

*Why this is common:* Before computers, t-distribution tables were annoying to use, so the "n ≥ 30" shortcut was taught as a practical compromise. With software, there's no reason to use this shortcut anymore.

---

<!-- block: quiz -->
**Micro-challenge:** You have a sample of 5 measurements with mean 12.3 and standard deviation 2.1. Find the t-statistic for testing whether the true mean is 10. How many degrees of freedom? Using a t-table or scipy, is this significant at α = 0.05?

*Hint:* t = (x̄ - μ₀) / (s/√n), with df = n-1.

<!-- solution: t = (12.3 - 10) / (2.1/√5) = 2.3 / 0.939 ≈ 2.449. df = 4. The critical value for a two-tailed t-test at α=0.05 with df=4 is ±2.776. Since |2.449| < 2.776, we fail to reject at the 5% level. The p-value is about 0.071 — suggestive but not quite significant. With only 5 observations, we need a larger effect to be confident. -->
