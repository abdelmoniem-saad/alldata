<!-- layer: intuition -->

## The Long-Run Average

If you played a game a million times, what would you expect to win *on average per game*? That's the **expected value**.

It's a weighted average: each possible outcome multiplied by its probability.

**Example:** A fair die roll. Each face has probability 1/6:

$$E[X] = 1 \cdot \frac{1}{6} + 2 \cdot \frac{1}{6} + 3 \cdot \frac{1}{6} + 4 \cdot \frac{1}{6} + 5 \cdot \frac{1}{6} + 6 \cdot \frac{1}{6} = 3.5$$

You'll never actually roll 3.5 — it's the "center of gravity" of the distribution.

---

## Why Expected Value Matters

Expected value is the foundation of decision-making under uncertainty:

- **Gambling:** A game where you pay $1 to roll a die and win $X has E[winnings] = $3.50 - $1 = $2.50 per game. Positive expected value = good bet.
- **Insurance:** Companies set premiums above the expected payout.
- **Investing:** Expected return guides portfolio decisions.

**Key insight:** Expected value doesn't tell you what will happen in a single trial — it tells you what happens *on average over many trials*. A lottery ticket has negative expected value, but someone still wins.

---

<!-- block: code_python, editable: true -->
```python
import numpy as np
import matplotlib.pyplot as plt

# Watch the sample mean converge to E[X]
np.random.seed(42)

# A loaded die: P(6) = 1/3, P(1-5) = 2/15 each
probs = [2/15, 2/15, 2/15, 2/15, 2/15, 1/3]
values = [1, 2, 3, 4, 5, 6]
theoretical_ev = sum(v * p for v, p in zip(values, probs))

n_rolls = 10000
rolls = np.random.choice(values, n_rolls, p=probs)
running_mean = np.cumsum(rolls) / np.arange(1, n_rolls + 1)

plt.figure(figsize=(8, 4))
plt.plot(running_mean, color='#14b8a6', linewidth=1, alpha=0.8)
plt.axhline(y=theoretical_ev, color='#71717a', linestyle='--', linewidth=2,
            label=f'E[X] = {theoretical_ev:.2f}')
plt.xlabel('Number of rolls')
plt.ylabel('Running average')
plt.title('Sample Mean → Expected Value (Loaded Die)')
plt.legend()
plt.grid(alpha=0.2)
plt.xlim(0, n_rolls)
plt.tight_layout()
plt.show()

print(f"Theoretical E[X] = {theoretical_ev:.4f}")
print(f"Sample mean after {n_rolls} rolls = {rolls.mean():.4f}")
print(f"The sample mean gets closer to E[X] as n grows!")
```
<!-- expected_output: Sample mean converges to E[X] -->

---

<!-- layer: formal -->

## Formal Definition

For a **discrete** random variable X:

$$E[X] = \sum_{x} x \cdot P(X = x) = \sum_{x} x \cdot p_X(x)$$

For a **continuous** random variable X with PDF $f_X$:

$$E[X] = \int_{-\infty}^{\infty} x \cdot f_X(x) \, dx$$

**Properties (linearity):**

$$E[aX + b] = aE[X] + b$$
$$E[X + Y] = E[X] + E[Y] \quad \text{(always, even if dependent!)}$$

**Law of the Unconscious Statistician (LOTUS):**

$$E[g(X)] = \sum_{x} g(x) \cdot p_X(x)$$

---

<!-- block: misconception -->
**Misconception: "The expected value is the most likely outcome."**

*Wrong belief:* E[X] = 3.5 for a die roll means 3.5 is the most probable result.

*Correction:* The expected value is the **average** over many trials, not the **mode** (most likely single outcome). For a die, the expected value 3.5 is impossible to roll! For a Bernoulli trial with p=0.3, E[X]=0.3 but the most likely outcome is 0. Expected value and mode are different concepts.

*Why this is common:* The word "expected" in everyday English means "what you anticipate will happen," which sounds like the most likely outcome. In probability, it specifically means the long-run average.

---

<!-- block: quiz -->
**Micro-challenge:** A game costs $5 to play. You roll two dice: if the sum is 7, you win $20; if the sum is 12, you win $50; otherwise you win nothing. What's the expected profit per game? Should you play?

*Hint:* P(sum=7) = 6/36, P(sum=12) = 1/36. Expected profit = Expected winnings - cost.

<!-- solution: E[winnings] = 20·(6/36) + 50·(1/36) + 0·(29/36) = 120/36 + 50/36 = 170/36 ≈ $4.72. Expected profit = $4.72 - $5.00 = -$0.28 per game. You lose 28 cents on average — don't play! -->
