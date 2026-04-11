<!-- layer: intuition -->

## The Most Misunderstood Number in Science

A **p-value** answers one specific question: "If the null hypothesis were true, how likely is it that I'd see data this extreme (or more extreme)?"

It is NOT:
- The probability that the null hypothesis is true
- The probability your result happened by chance
- The probability you'll replicate this result

It IS:
- A measure of how **surprising** your data is under the null hypothesis
- Smaller p = more surprising = stronger evidence against the null

**The threshold ritual:** If p < 0.05, we call it "statistically significant." This cutoff is a convention (Fisher suggested it in 1925), not a law of nature. There's nothing magical about 0.05.

---

## How P-Values Work

1. Assume the null hypothesis is true (e.g., "this coin is fair")
2. Calculate what you'd expect to see under this assumption
3. Measure how far your actual data deviates from that expectation
4. The p-value = probability of seeing a deviation this large or larger, by pure chance

**Example:** You flip a coin 100 times and get 60 heads. Under H₀ (fair coin), you'd expect 50. The p-value asks: "If the coin is fair, what's the probability of getting 60 or more heads?" If that probability is very small, you have evidence the coin isn't fair.

---

<!-- block: simulation, editable: true -->
```python
import numpy as np
import matplotlib.pyplot as plt
from scipy import stats

# Simulate: the distribution of p-values under H0 (true null) vs H1 (false null)
np.random.seed(42)
n_experiments = 10000
n_per_experiment = 30

# Under H0: true mean = 0
p_values_h0 = []
for _ in range(n_experiments):
    sample = np.random.normal(0, 1, n_per_experiment)  # True mean = 0
    _, p = stats.ttest_1samp(sample, 0)
    p_values_h0.append(p)

# Under H1: true mean = 0.5 (small effect)
p_values_h1 = []
for _ in range(n_experiments):
    sample = np.random.normal(0.5, 1, n_per_experiment)  # True mean = 0.5
    _, p = stats.ttest_1samp(sample, 0)
    p_values_h1.append(p)

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))

ax1.hist(p_values_h0, bins=50, color='#22c55e', alpha=0.7, density=True, edgecolor='white')
ax1.axhline(y=1, color='red', linestyle='--', label='Uniform (expected)')
ax1.axvline(0.05, color='#ef4444', linestyle=':', linewidth=2, label='α = 0.05')
ax1.set_title('P-values when H₀ is TRUE', fontweight='bold')
ax1.set_xlabel('p-value')
ax1.legend(fontsize=9)

ax2.hist(p_values_h1, bins=50, color='#ef4444', alpha=0.7, density=True, edgecolor='white')
ax2.axvline(0.05, color='#ef4444', linestyle=':', linewidth=2, label='α = 0.05')
ax2.set_title('P-values when H₀ is FALSE (effect=0.5)', fontweight='bold')
ax2.set_xlabel('p-value')
ax2.legend(fontsize=9)

plt.tight_layout()
plt.show()

false_positives = np.mean(np.array(p_values_h0) < 0.05)
power = np.mean(np.array(p_values_h1) < 0.05)
print(f"When H₀ is TRUE:  {false_positives:.1%} of p-values < 0.05 (should be ~5%)")
print(f"When H₀ is FALSE: {power:.1%} of p-values < 0.05 (this is 'power')")
print(f"\nKey insight: When H₀ is true, p-values are uniformly distributed!")
```
<!-- expected_output: ~5% false positive rate, higher power when H0 is false -->

---

<!-- layer: formal -->

## Formal Definition

For a test statistic $T$ and observed value $t_{obs}$, the **p-value** is:

**One-sided (right):** $p = P(T \geq t_{obs} \mid H_0)$

**One-sided (left):** $p = P(T \leq t_{obs} \mid H_0)$

**Two-sided:** $p = P(|T| \geq |t_{obs}| \mid H_0)$

**Properties:**
- Under $H_0$: $p \sim \text{Uniform}(0, 1)$ (for continuous test statistics)
- Under $H_1$: $p$ is stochastically smaller than Uniform — tends toward 0
- $P(\text{p-value} < \alpha \mid H_0) = \alpha$ (Type I error rate is controlled)

**Relationship to confidence intervals:** A 95% CI excludes $\theta_0$ if and only if the two-sided p-value for $H_0: \theta = \theta_0$ is < 0.05.

---

<!-- block: misconception -->
**Misconception: "A p-value of 0.03 means there's a 3% chance the null is true."**

*Wrong belief:* p = 0.03 means P(H₀ is true) = 3%.

*Correction:* The p-value is P(data this extreme | H₀ true), NOT P(H₀ true | data). These are different things (remember conditional probability!). To get P(H₀ true | data), you'd need Bayes' theorem and a prior probability that H₀ is true — which the p-value doesn't provide.

*Why this is common:* It's the most natural interpretation — "small p means H₀ is probably wrong" feels right. And it's sort of the spirit of the idea. But the precise claim "3% chance H₀ is true" is mathematically wrong. This confusion has been documented in studies of practicing scientists, medical doctors, and even statistics professors.

---

<!-- block: quiz -->
**Micro-challenge:** A researcher tests 20 hypotheses, all of which are actually true (no real effects). They use α = 0.05. How many "significant" results do they expect to find? This is the multiple testing problem — how could they protect against it?

*Hint:* If H₀ is true, P(p < 0.05) = 0.05 for each test. With 20 tests, use expected value. Look up "Bonferroni correction" for the fix.

<!-- solution: Expected false positives = 20 × 0.05 = 1. So on average, 1 out of 20 true nulls will appear "significant" just by chance! Bonferroni correction: use α/20 = 0.0025 per test instead of 0.05. This controls the family-wise error rate at 5%. More modern approaches include the Benjamini-Hochberg procedure (controls false discovery rate) which is less conservative. -->
