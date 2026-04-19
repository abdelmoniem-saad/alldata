<!-- layer: intuition -->

## Counting Successes

Flip a coin 10 times. How many heads do you get? That count follows a **Binomial distribution**.

The Binomial models the number of successes in a fixed number of independent trials, each with the same probability of success:

- **n** = number of trials
- **p** = probability of success on each trial
- **X** = number of successes (what we're counting)

**Real examples:**
- Out of 100 emails sent, how many get opened? (n=100, p=open rate)
- Out of 20 patients given a drug, how many recover? (n=20, p=recovery rate)
- Out of 50 free throws, how many go in? (n=50, p=0.77)

The shape of the Binomial depends on n and p. When n is large and p isn't extreme, it starts looking like a bell curve — this is the Normal approximation, and it's why the Normal distribution appears everywhere.

---

<!-- block: code_python, editable: true -->
```python
import numpy as np
import matplotlib.pyplot as plt
from scipy import stats

# Compare Binomial distributions with different parameters
fig, axes = plt.subplots(1, 3, figsize=(12, 4))
params = [(10, 0.5), (10, 0.2), (50, 0.3)]

for ax, (n, p) in zip(axes, params):
    x = np.arange(0, n + 1)
    pmf = stats.binom.pmf(x, n, p)

    ax.bar(x, pmf, color='#a1a1aa', alpha=0.7, edgecolor='white')
    ax.set_title(f'Binomial(n={n}, p={p})', fontweight='bold')
    ax.set_xlabel('Number of successes')
    ax.set_ylabel('Probability')
    ax.axvline(n * p, color='#14b8a6', linestyle='--', label=f'E[X]={n*p:.1f}')
    ax.legend(fontsize=9)

plt.tight_layout()
plt.show()

# Demonstrate Normal approximation
n, p = 100, 0.3
x = np.arange(0, n + 1)
binomial_pmf = stats.binom.pmf(x, n, p)
normal_pdf = stats.norm.pdf(x, n*p, np.sqrt(n*p*(1-p)))

plt.figure(figsize=(8, 4))
plt.bar(x, binomial_pmf, color='#a1a1aa', alpha=0.5, label='Binomial(100, 0.3)')
plt.plot(x, normal_pdf, color='#14b8a6', linewidth=2, label=f'Normal({n*p}, {np.sqrt(n*p*(1-p)):.1f}²)')
plt.xlabel('Number of successes')
plt.ylabel('Probability')
plt.title('Binomial → Normal as n grows')
plt.legend()
plt.xlim(10, 50)
plt.grid(alpha=0.2)
plt.tight_layout()
plt.show()

print(f"Binomial(100, 0.3): mean={n*p}, std={np.sqrt(n*p*(1-p)):.2f}")
```
<!-- expected_output: Binomial(100, 0.3): mean=30.0, std=4.58 -->

---

<!-- layer: formal -->

## Formal Definition

A random variable $X \sim \text{Binomial}(n, p)$ has:

**PMF:**

$$P(X = k) = \binom{n}{k} p^k (1-p)^{n-k}, \quad k = 0, 1, \ldots, n$$

where $\binom{n}{k} = \frac{n!}{k!(n-k)!}$ counts the ways to choose which $k$ trials are successes.

**Mean:** $E[X] = np$

**Variance:** $\text{Var}(X) = np(1-p)$

**Normal Approximation:** When $np \geq 5$ and $n(1-p) \geq 5$:

$$X \approx N(np, np(1-p))$$

---

<!-- block: misconception -->
**Misconception: "The Binomial requires exactly 50/50 odds."**

*Wrong belief:* Binomial distribution only applies to fair coin flips or equally likely outcomes.

*Correction:* The Binomial works for ANY success probability p between 0 and 1. The requirements are: (1) fixed number of trials n, (2) each trial is independent, (3) same probability p on every trial, (4) binary outcome per trial. The coin doesn't have to be fair!

*Why this is common:* Most textbook introductions use fair coins (p=0.5), making students associate "binomial" with "equally likely."

---

<!-- block: quiz -->
**Micro-challenge:** A quality control inspector checks 20 items. The defect rate is 5%. What's the probability of finding exactly 0 defects? What about at least 2 defects? 

*Hint:* X ~ Binomial(20, 0.05). For "at least 2", use the complement: P(X ≥ 2) = 1 - P(X=0) - P(X=1).

<!-- solution: P(X=0) = (0.95)^20 ≈ 0.3585. P(X=1) = 20·(0.05)·(0.95)^19 ≈ 0.3774. P(X≥2) = 1 - 0.3585 - 0.3774 ≈ 0.2642. So there's about a 26% chance of finding 2+ defects in a batch of 20. -->
