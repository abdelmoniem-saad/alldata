<!-- layer: intuition -->

## Counting Rare Events

How many emails do you receive per hour? How many typos per page? How many car accidents at an intersection per month?

The **Poisson distribution** models the number of events occurring in a fixed interval of time or space, when:

- Events occur **independently**
- Events occur at a **constant average rate** (λ, "lambda")
- Two events can't happen at exactly the same instant

The entire distribution is described by one number: **λ** (the average rate).

---

## The Poisson in the Wild

λ = 3 means "3 events per interval on average." But you might see 0, 1, 2, 5, or even 8 events in any particular interval. The Poisson tells you the probability of each count.

**Real examples:**
- Customers arriving at a store: λ = 15 per hour
- Server errors per day: λ = 2.5
- Goals per soccer match: λ ≈ 2.7
- Radioactive decay events per second

**Connection to Binomial:** The Poisson is the limit of Binomial(n, p) when n → ∞ and p → 0 while np → λ. Lots of trials, each with tiny probability, but a steady average rate.

---

<!-- block: simulation, editable: true -->
```python
import numpy as np
import matplotlib.pyplot as plt
from scipy import stats

# Simulate a Poisson process: customer arrivals
np.random.seed(42)
lam = 4  # average 4 customers per hour
n_hours = 10000

arrivals = np.random.poisson(lam, n_hours)

# Plot simulation vs theoretical
x = np.arange(0, 15)
theoretical = stats.poisson.pmf(x, lam)
simulated = np.array([np.mean(arrivals == k) for k in x])

plt.figure(figsize=(8, 4))
plt.bar(x - 0.15, simulated, 0.3, color='#a1a1aa', alpha=0.7, label='Simulated')
plt.bar(x + 0.15, theoretical, 0.3, color='#71717a', alpha=0.7, label='Theoretical')
plt.xlabel('Number of arrivals per hour')
plt.ylabel('Probability')
plt.title(f'Poisson(λ={lam}): Customer Arrivals per Hour')
plt.legend()
plt.grid(alpha=0.2)
plt.tight_layout()
plt.show()

# Show Binomial → Poisson convergence
print("Binomial → Poisson convergence (λ = 5):")
lam = 5
for n in [10, 50, 100, 1000]:
    p = lam / n
    binom_p = stats.binom.pmf(3, n, p)
    poisson_p = stats.poisson.pmf(3, lam)
    print(f"  Binom({n}, {p:.4f}): P(X=3) = {binom_p:.6f}  |  Poisson({lam}): P(X=3) = {poisson_p:.6f}")
```
<!-- expected_output: Binomial converges to Poisson as n grows -->

---

<!-- layer: formal -->

## Formal Definition

A random variable $X \sim \text{Poisson}(\lambda)$ has:

**PMF:**

$$P(X = k) = \frac{\lambda^k e^{-\lambda}}{k!}, \quad k = 0, 1, 2, \ldots$$

**Mean:** $E[X] = \lambda$

**Variance:** $\text{Var}(X) = \lambda$ (mean equals variance — a key property!)

**Sum property:** If $X \sim \text{Poisson}(\lambda_1)$ and $Y \sim \text{Poisson}(\lambda_2)$ are independent:

$$X + Y \sim \text{Poisson}(\lambda_1 + \lambda_2)$$

**Poisson limit theorem:** $\text{Binomial}(n, \lambda/n) \xrightarrow{n \to \infty} \text{Poisson}(\lambda)$

---

<!-- block: misconception -->
**Misconception: "The Poisson only works for rare events."**

*Wrong belief:* You can only use a Poisson when events are very unlikely.

*Correction:* The Poisson works for any count of independent events at a constant rate — λ can be large! A call center receiving λ=200 calls per hour is perfectly Poisson. The "rare events" description comes from its derivation as a Binomial limit (many trials, each with small probability), but the distribution itself applies whenever events arrive independently at a steady rate.

*Why this is common:* Every textbook introduces Poisson as "the distribution for rare events," which is technically about its derivation, not its applications.

---

<!-- block: quiz -->
**Micro-challenge:** A website gets an average of 3 server errors per day. What's the probability of a perfect day (0 errors)? What about a "bad day" with 7+ errors?

*Hint:* X ~ Poisson(3). P(X=0) = e^(-3). For P(X≥7), use the complement with the CDF.

<!-- solution: P(X=0) = e^(-3) · 3^0 / 0! = e^(-3) ≈ 0.0498 (about 5% chance of a perfect day). P(X≥7) = 1 - P(X≤6) = 1 - Σ P(X=k) for k=0..6 ≈ 1 - 0.9665 = 0.0335 (about 3.4% chance of 7+ errors). -->
