<!-- layer: intuition -->

## When Information Changes Everything

You're told a family has two children, and at least one is a girl. What's the probability both are girls? Your gut says 1/2, but the answer is 1/3. Welcome to conditional probability.

**Conditional probability** answers: "Given that I know B happened, what's the probability of A?"

The formula is deceptively simple:

$$P(A|B) = \frac{P(A \text{ and } B)}{P(B)}$$

But the intuition is what matters: **knowing B happened shrinks the sample space.** You're no longer looking at all possible outcomes — only the ones where B is true.

---

## The Monty Hall Problem

The most famous conditional probability puzzle: You're on a game show with three doors. Behind one is a car, behind the others are goats. You pick Door 1. The host (who knows where the car is) opens Door 3, showing a goat. Should you switch to Door 2?

**Yes! Switching wins 2/3 of the time.** The host's action gives you information that changes the probabilities. Your initial choice had a 1/3 chance; that doesn't change. The remaining 2/3 probability collapses onto the one unopened door.

Let's simulate it and see:

---

<!-- block: simulation, editable: true -->
```python
import numpy as np
import matplotlib.pyplot as plt

# Monty Hall simulation
np.random.seed(42)
n_games = 50000
car_positions = np.random.randint(0, 3, n_games)
initial_picks = np.random.randint(0, 3, n_games)

stay_wins = 0
switch_wins = 0

for i in range(n_games):
    if initial_picks[i] == car_positions[i]:
        stay_wins += 1
    else:
        switch_wins += 1

print("=== Monty Hall Simulation ===")
print(f"Games played: {n_games:,}")
print(f"Stay wins:   {stay_wins/n_games:.4f} (theoretical: 0.3333)")
print(f"Switch wins: {switch_wins/n_games:.4f} (theoretical: 0.6667)")
print(f"\nSwitching is {switch_wins/stay_wins:.1f}x better than staying!")

# Visualize convergence
cumulative_switch = np.cumsum(initial_picks != car_positions) / np.arange(1, n_games + 1)
cumulative_stay = np.cumsum(initial_picks == car_positions) / np.arange(1, n_games + 1)

plt.figure(figsize=(8, 4))
plt.plot(cumulative_switch, color='#22c55e', label='Switch strategy', linewidth=1.5)
plt.plot(cumulative_stay, color='#ef4444', label='Stay strategy', linewidth=1.5)
plt.axhline(y=2/3, color='#22c55e', linestyle='--', alpha=0.4)
plt.axhline(y=1/3, color='#ef4444', linestyle='--', alpha=0.4)
plt.xlabel('Number of games')
plt.ylabel('Win rate')
plt.title('Monty Hall: Always Switch!')
plt.legend()
plt.grid(alpha=0.2)
plt.tight_layout()
plt.show()
```
<!-- expected_output: Switch wins: ~0.6667 -->

---

<!-- layer: formal -->

## Formal Definition

For events A, B with $P(B) > 0$:

$$P(A|B) = \frac{P(A \cap B)}{P(B)}$$

**Multiplication rule** (rearranging):

$$P(A \cap B) = P(A|B) \cdot P(B) = P(B|A) \cdot P(A)$$

**Law of Total Probability:** If $B_1, B_2, \ldots, B_n$ partition $\Omega$:

$$P(A) = \sum_{i=1}^{n} P(A|B_i) P(B_i)$$

**Chain Rule:**

$$P(A_1 \cap A_2 \cap \cdots \cap A_n) = P(A_1) \cdot P(A_2|A_1) \cdot P(A_3|A_1 \cap A_2) \cdots$$

---

<!-- block: misconception -->
**Misconception: "P(A|B) and P(B|A) are the same thing."**

*Wrong belief:* The probability of having a disease given a positive test is the same as the probability of testing positive given you have the disease.

*Correction:* These are completely different! P(disease | positive test) depends on how common the disease is (base rate). A test that's 99% accurate (high P(positive | disease)) can still have a low P(disease | positive) if the disease is rare. This is called the **base rate fallacy** and is one of the most dangerous mistakes in medicine and criminal justice.

*Why this is common:* English makes it easy to swap the conditioning. "The probability of A given B" and "the probability of B given A" sound similar but are mathematically very different.

---

<!-- block: quiz -->
**Micro-challenge:** A medical test is 95% accurate (P(positive | disease) = 0.95) with a 3% false positive rate (P(positive | no disease) = 0.03). If 1% of the population has the disease, what's P(disease | positive test)?

*Hint:* Use the law of total probability to find P(positive), then use the definition of conditional probability. The answer is surprisingly low!

<!-- solution: P(positive) = P(pos|disease)·P(disease) + P(pos|no disease)·P(no disease) = 0.95·0.01 + 0.03·0.99 = 0.0095 + 0.0297 = 0.0392. P(disease|positive) = 0.0095/0.0392 ≈ 0.242, or about 24%. Despite the test being "95% accurate," there's only a 24% chance you actually have the disease! This is the base rate fallacy. -->
