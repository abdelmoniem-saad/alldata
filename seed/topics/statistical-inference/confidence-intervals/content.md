<!-- layer: intuition -->

## A Range of Plausible Values

A point estimate gives you one number. But how confident are you in that number? A **confidence interval** gives you a range: "The true value is probably somewhere in here."

A 95% confidence interval means: if you repeated this experiment 100 times, about 95 of those intervals would contain the true parameter. It's a statement about the **procedure**, not about any single interval.

**The formula for a mean:**

$$\bar{x} \pm z^* \cdot \frac{s}{\sqrt{n}}$$

Where $z^* = 1.96$ for 95% confidence. The interval gets **narrower** with:
- More data (larger n)
- Less variability (smaller s)
- Lower confidence level (but you'd be less sure!)

---

## The Trade-off: Precision vs. Confidence

Want a narrower interval? Lower your confidence level. Want higher confidence? Accept a wider interval.

- **90% CI:** narrower, but misses the truth 10% of the time
- **95% CI:** the standard — balances precision and coverage
- **99% CI:** wider, but very reliable

There's no free lunch. The only way to get **both** narrow intervals and high confidence is to **collect more data**.

---

<!-- block: simulation, editable: true -->
```python
import numpy as np
import matplotlib.pyplot as plt
from scipy import stats

# Visualize: "95 of 100 intervals contain the truth"
np.random.seed(42)
true_mean = 50
true_std = 10
n = 25
n_intervals = 100

fig, ax = plt.subplots(figsize=(10, 8))

contains_count = 0
for i in range(n_intervals):
    sample = np.random.normal(true_mean, true_std, n)
    x_bar = sample.mean()
    se = sample.std(ddof=1) / np.sqrt(n)
    t_crit = stats.t.ppf(0.975, df=n-1)
    ci_low = x_bar - t_crit * se
    ci_high = x_bar + t_crit * se
    
    contains = ci_low <= true_mean <= ci_high
    if contains:
        contains_count += 1
    
    color = '#22c55e' if contains else '#ef4444'
    ax.plot([ci_low, ci_high], [i, i], color=color, linewidth=1.5, alpha=0.7)
    ax.plot(x_bar, i, 'o', color=color, markersize=3)

ax.axvline(true_mean, color='#7c5cfc', linewidth=2, linestyle='--', label=f'True μ = {true_mean}')
ax.set_xlabel('Value', fontsize=12)
ax.set_ylabel('Experiment number', fontsize=12)
ax.set_title(f'100 Confidence Intervals (95%): {contains_count} contain the true mean', fontsize=13)
ax.legend(fontsize=11)
plt.tight_layout()
plt.show()

print(f"Coverage: {contains_count}/100 intervals contain the true mean")
print(f"This is close to the theoretical 95%!")
```
<!-- expected_output: ~95 out of 100 intervals contain the true mean -->

---

<!-- layer: formal -->

## Formal Definition

A **confidence interval** at level $1 - \alpha$ for parameter $\theta$ is a random interval $[L(X), U(X)]$ such that:

$$P(L(X) \leq \theta \leq U(X)) = 1 - \alpha$$

**For the mean (known σ):**

$$\bar{X} \pm z_{\alpha/2} \cdot \frac{\sigma}{\sqrt{n}}$$

**For the mean (unknown σ):**

$$\bar{X} \pm t_{\alpha/2, n-1} \cdot \frac{s}{\sqrt{n}}$$

**For a proportion:**

$$\hat{p} \pm z_{\alpha/2} \sqrt{\frac{\hat{p}(1-\hat{p})}{n}}$$

**Required sample size for desired margin of error $E$:**

$$n = \left(\frac{z_{\alpha/2} \cdot \sigma}{E}\right)^2$$

---

<!-- block: misconception -->
**Misconception: "There's a 95% probability the true mean is in this interval."**

*Wrong belief:* After computing [47.2, 52.8], there's a 95% chance μ is between 47.2 and 52.8.

*Correction:* Once you've computed the interval, μ is either in it or not — it's not random. The 95% refers to the **procedure**: if you repeated the experiment many times, 95% of the resulting intervals would contain μ. Think of it as: "I used a method that works 95% of the time," not "there's a 95% chance this specific answer is right."

*Why this is common:* The frequentist interpretation is genuinely counterintuitive. The Bayesian credible interval DOES have the interpretation "95% probability the parameter is in here," which is what most people actually want to say.

---

<!-- block: quiz -->
**Micro-challenge:** A sample of 36 light bulbs has mean lifetime 1200 hours with standard deviation 150 hours. Calculate the 95% confidence interval. How many bulbs would you need to test to get the margin of error down to ±25 hours?

*Hint:* For n=36, use z*=1.96 (large enough for Normal approximation). For the required n, solve n = (z*·s/E)².

<!-- solution: 95% CI: 1200 ± 1.96·(150/√36) = 1200 ± 1.96·25 = 1200 ± 49 = [1151, 1249] hours. For margin of error ±25: n = (1.96·150/25)² = (11.76)² ≈ 138.3 → need n=139 bulbs. That's almost 4× more bulbs to cut the margin of error in half! -->
