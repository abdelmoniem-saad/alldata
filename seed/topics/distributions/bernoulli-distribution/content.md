<!-- layer: intuition -->

## The Simplest Distribution

A **Bernoulli distribution** models a single yes/no experiment. Will the coin land heads? Will the customer click the ad? Will the part be defective?

There are only two outcomes:
- **Success** (1) with probability $p$
- **Failure** (0) with probability $1-p$

That's it. The entire distribution is described by a single number: $p$.

Despite its simplicity, the Bernoulli is the **building block** of many other distributions. Repeat a Bernoulli trial $n$ times and you get the Binomial. Let $n \to \infty$ with $np$ constant and you get the Poisson. It's the atom of probability.

---

## Real-World Bernoulli Trials

Any time you see a binary outcome, you're looking at a Bernoulli:

- **A/B testing:** Does user click the new button? (p ≈ 0.03 for many ads)
- **Manufacturing:** Is the product defective? (p ≈ 0.02 for quality lines)
- **Medicine:** Does the treatment work? (p varies)
- **Sports:** Does the free throw go in? (p ≈ 0.77 in the NBA)

The key assumption is that each trial has the **same probability** $p$. If p changes from trial to trial, you need a more complex model.

---

<!-- block: code_python, editable: true -->
```python
import numpy as np
import matplotlib.pyplot as plt

# Simulate Bernoulli trials with different p values
np.random.seed(42)
n_trials = 1000

probabilities = [0.1, 0.3, 0.5, 0.7, 0.9]
fig, axes = plt.subplots(1, 5, figsize=(12, 3), sharey=True)

for ax, p in zip(axes, probabilities):
    trials = np.random.binomial(1, p, n_trials)
    counts = [np.sum(trials == 0), np.sum(trials == 1)]
    ax.bar([0, 1], [c/n_trials for c in counts], color=['#71717a', '#14b8a6'],
           width=0.5, edgecolor='white')
    ax.set_title(f'p = {p}', fontsize=11, fontweight='bold')
    ax.set_xticks([0, 1])
    ax.set_xticklabels(['Fail', 'Success'])
    ax.set_ylim(0, 1)

axes[0].set_ylabel('Relative frequency')
plt.suptitle('Bernoulli Distribution for Various p', fontsize=13, y=1.02)
plt.tight_layout()
plt.show()

# Key statistics
p = 0.3
print(f"Bernoulli(p={p}):")
print(f"  E[X] = p = {p}")
print(f"  Var(X) = p(1-p) = {p*(1-p):.2f}")
print(f"  Variance is maximized at p=0.5: Var = {0.5*0.5:.2f}")
```
<!-- expected_output: E[X] = p = 0.3, Var(X) = p(1-p) = 0.21 -->

---

<!-- layer: formal -->

## Formal Definition

A random variable $X \sim \text{Bernoulli}(p)$ has:

**PMF:**

$$P(X = x) = p^x (1-p)^{1-x}, \quad x \in \{0, 1\}$$

**Mean:** $E[X] = p$

**Variance:** $\text{Var}(X) = p(1-p)$

**Moment Generating Function:**

$$M_X(t) = (1-p) + pe^t$$

The Bernoulli is a special case of the Binomial with $n=1$: $\text{Bernoulli}(p) = \text{Binomial}(1, p)$.

---

<!-- block: misconception -->
**Misconception: "If p = 0.5, the result is completely unpredictable."**

*Wrong belief:* A Bernoulli(0.5) trial gives no information — it's pure chaos.

*Correction:* Even at p=0.5, each individual trial is fully described by the distribution. What's true is that variance is **maximized** at p=0.5 — this is the point of maximum uncertainty. But the distribution still tells you exactly the probabilities. And over many trials, the law of large numbers guarantees the average converges to 0.5.

*Why this is common:* People conflate "hardest to predict a single outcome" with "gives no useful information." But a Bernoulli(0.5) is fully specified — we know everything about it.

---

<!-- block: quiz -->
**Micro-challenge:** A website has a 4% click-through rate on ads. If you show the ad to one person, what's E[revenue] if a click is worth $2? What's the variance of revenue per impression?

*Hint:* Revenue = $2 × X where X ~ Bernoulli(0.04). Use properties of expectation and variance with scaling.

<!-- solution: X ~ Bernoulli(0.04). Revenue R = 2X. E[R] = 2·E[X] = 2·0.04 = $0.08 per impression. Var(R) = 4·Var(X) = 4·0.04·0.96 = $0.1536. SD(R) = $0.39. So on average you earn 8 cents per impression, but with high variability. -->
