<!-- layer: intuition -->

## The Core Question

You have data. You have a claim. Is the data consistent with that claim, or does it provide evidence against it?

**The logic of hypothesis testing is proof by contradiction:**
1. Assume the boring explanation is true (the **null hypothesis**, H₀)
2. Ask: how surprising is our data under that assumption?
3. If the data is very surprising → reject the boring explanation

**Example:** A coin is flipped 100 times and lands heads 65 times. Is the coin fair?
- H₀: The coin is fair (p = 0.5)
- We ask: if the coin *were* fair, how likely is 65+ heads out of 100?
- If that probability is tiny → we reject "the coin is fair"

---

## The Steps

1. **State hypotheses:** H₀ (null — no effect, no difference) vs H₁ (alternative — there IS an effect)
2. **Choose a significance level α** (usually 0.05) — your threshold for "surprising enough"
3. **Compute a test statistic** — a number that summarizes how far the data is from H₀
4. **Find the p-value** — the probability of getting a test statistic this extreme under H₀
5. **Decide:** if p-value < α, reject H₀

**Important:** rejecting H₀ doesn't *prove* H₁. It says the data is hard to explain under H₀.

---

<!-- block: simulation, editable: true -->
```python
import numpy as np
import matplotlib.pyplot as plt
from scipy import stats

np.random.seed(42)

# Simulate: is this coin fair?
true_p = 0.65  # The coin is actually biased (but we don't know this)
n_flips = 100
heads = np.random.binomial(n_flips, true_p)

# Under H0: p = 0.5, what's the distribution of heads?
null_mean = n_flips * 0.5
null_std = np.sqrt(n_flips * 0.5 * 0.5)

# Test statistic (z-score)
z = (heads - null_mean) / null_std
p_value = 2 * (1 - stats.norm.cdf(abs(z)))  # Two-tailed

print(f"Observed: {heads} heads out of {n_flips} flips")
print(f"Z-statistic: {z:.2f}")
print(f"P-value: {p_value:.4f}")
print(f"Decision at α=0.05: {'Reject H₀' if p_value < 0.05 else 'Fail to reject H₀'}")

# Visualize the null distribution and our observation
fig, ax = plt.subplots(figsize=(10, 5))
x = np.linspace(30, 70, 200)
y = stats.norm.pdf(x, null_mean, null_std)
ax.plot(x, y, 'k-', lw=2, label='Null distribution (H₀: p=0.5)')
ax.fill_between(x, y, where=(x >= heads) | (x <= 2*null_mean - heads),
                alpha=0.3, color='red', label=f'P-value region = {p_value:.4f}')
ax.axvline(heads, color='red', linestyle='--', lw=2, label=f'Observed: {heads} heads')
ax.axvline(null_mean, color='gray', linestyle=':', lw=1, label='Expected under H₀: 50')
ax.set_xlabel('Number of heads')
ax.set_ylabel('Probability density')
ax.set_title('Hypothesis Test: Is the Coin Fair?')
ax.legend()
plt.tight_layout()
plt.show()
```

---

<!-- layer: formal -->

## Formal Framework

**Hypotheses:**
- $H_0: \theta = \theta_0$ (null hypothesis)
- $H_1: \theta \neq \theta_0$ (two-sided alternative), or $H_1: \theta > \theta_0$ (one-sided)

**Test statistic:** $T = T(X_1, \ldots, X_n)$ — a function of the sample data.

**P-value:** $p = P(|T| \geq |t_{\text{obs}}| \mid H_0)$ for a two-sided test.

**Decision rule:** Reject $H_0$ if $p < \alpha$, where $\alpha$ is the pre-specified significance level.

**Type I error (α):** Rejecting $H_0$ when it's true (false positive).
**Type II error (β):** Failing to reject $H_0$ when $H_1$ is true (false negative).
**Power = 1 - β:** The probability of correctly rejecting a false $H_0$.

**Neyman-Pearson Lemma:** Among all tests of size $\alpha$ for testing simple $H_0$ vs simple $H_1$, the likelihood ratio test maximizes power.

---

<!-- block: misconception -->
**Misconception: "Failing to reject H₀ means H₀ is true."**

*Wrong belief:* If the p-value is above 0.05, the null hypothesis has been confirmed.

*Correction:* "Fail to reject" is NOT "accept." It means: the data is not surprising enough to rule out H₀, but that doesn't mean H₀ is correct. The study may simply lack enough data (statistical power) to detect a real effect. Absence of evidence is not evidence of absence.

*Why this is common:* The binary reject/fail-to-reject framework encourages black-and-white thinking. In reality, p = 0.04 and p = 0.06 represent nearly identical evidence.

---

<!-- block: quiz -->
**Micro-challenge:** Modify the simulation to run the hypothesis test 1000 times with a FAIR coin (true_p = 0.5). How often do you reject H₀ at α = 0.05? This number is the **Type I error rate** — it should be close to 5%.

*Hint:* Use a loop, count rejections, and divide by 1000.
