<!-- layer: intuition -->

## What's a Random Variable?

Imagine you roll a die. The *outcome* is a physical event — the die lands on a face. But to do math with it, we need a **number**. A random variable is the rule that assigns a number to each outcome.

Think of it as a **translator** between the messy real world and the clean world of mathematics.

- Roll a die → the random variable X gives you 1, 2, 3, 4, 5, or 6
- Flip a coin → X gives you 1 (heads) or 0 (tails)
- Measure someone's height → X gives you a real number like 172.3 cm

**Key insight:** The random variable itself isn't random. It's a fixed rule. The *randomness* comes from which outcome happens.

---

## Discrete vs Continuous

There are two flavors:

**Discrete** random variables take on countable values (you can list them):
- Number of heads in 10 flips: 0, 1, 2, ..., 10
- Number of customers in an hour: 0, 1, 2, 3, ...

**Continuous** random variables can take any value in a range:
- Height: any value between, say, 50 cm and 250 cm
- Temperature: any real number

The distinction matters because we describe them differently — discrete ones use **probability mass functions**, continuous ones use **probability density functions**.

---

<!-- block: code_python, editable: true -->
```python
import numpy as np
import matplotlib.pyplot as plt

# Simulate a discrete random variable: sum of two dice
np.random.seed(42)
n_rolls = 10000
die1 = np.random.randint(1, 7, n_rolls)
die2 = np.random.randint(1, 7, n_rolls)
X = die1 + die2  # This is our random variable

# Plot the distribution
values, counts = np.unique(X, return_counts=True)
plt.bar(values, counts / n_rolls, color='steelblue', edgecolor='white')
plt.xlabel('Sum of two dice (X)')
plt.ylabel('Relative frequency')
plt.title('Distribution of X = sum of two dice (10,000 rolls)')
plt.xticks(range(2, 13))
plt.show()

print(f"Mean of X: {X.mean():.2f}")
print(f"Most common value: {values[counts.argmax()]}")
```
<!-- expected_output: Mean of X: 7.00\nMost common value: 7 -->

---

<!-- layer: formal -->

## Formal Definition

A **random variable** is a measurable function $X: \Omega \to \mathbb{R}$ from a sample space $\Omega$ to the real numbers.

For a **discrete** random variable, the **probability mass function (PMF)** is:

$$p_X(x) = P(X = x)$$

satisfying $\sum_x p_X(x) = 1$.

For a **continuous** random variable, the **probability density function (PDF)** $f_X(x)$ satisfies:

$$P(a \leq X \leq b) = \int_a^b f_X(x) \, dx$$

and $\int_{-\infty}^{\infty} f_X(x) \, dx = 1$.

The **cumulative distribution function (CDF)** works for both:

$$F_X(x) = P(X \leq x)$$

---

<!-- block: misconception -->
**Misconception: "A random variable is a variable that is random."**

*Wrong belief:* A random variable is like a regular variable (say, x in algebra) that somehow has randomness injected into it.

*Correction:* A random variable is a **function**, not a variable. It's a rule that maps each outcome of an experiment to a number. The "random" part comes from the underlying experiment, not from the function itself. The function is completely deterministic — given an outcome, the number is fixed.

*Why this is common:* The name "random variable" is genuinely misleading. A better name would be "numerical outcome function," but we're stuck with the historical terminology.

---

<!-- block: quiz -->
**Micro-challenge:** Modify the simulation above to plot the distribution of the *maximum* of two dice instead of the sum. What's the most common value now? Is the distribution symmetric?

*Hint:* Replace `die1 + die2` with `np.maximum(die1, die2)`.
