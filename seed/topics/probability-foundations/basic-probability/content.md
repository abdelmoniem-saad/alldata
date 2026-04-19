<!-- layer: intuition -->

## The Rules of the Game

Once you have a sample space, you need rules for assigning numbers to events. Probability has three axioms — think of them as the rules every probability must follow:

1. **Non-negativity:** Probabilities are never negative. $P(A) \geq 0$
2. **Normalization:** Something must happen. $P(\Omega) = 1$
3. **Additivity:** For mutually exclusive events, probabilities add up.

From these three axioms, everything else follows. Let's build up the most important rules:

---

## The Key Rules

**Complement Rule:** $P(\text{not } A) = 1 - P(A)$
- P(NOT rolling a 6) = 1 - 1/6 = 5/6
- Often easier to calculate "not A" than "A" directly

**Addition Rule:** $P(A \text{ or } B) = P(A) + P(B) - P(A \text{ and } B)$
- We subtract the overlap to avoid counting it twice
- If A and B can't happen together (mutually exclusive): $P(A \text{ or } B) = P(A) + P(B)$

**Key insight:** The complement rule is the most underrated tool in probability. Whenever a problem asks "what's the probability that at least one...", flip it: calculate P(none) and subtract from 1.

---

<!-- block: code_python, editable: true -->
```python
import numpy as np
import matplotlib.pyplot as plt

# The complement rule in action:
# "What's P(at least one 6 in 4 rolls)?"
np.random.seed(42)
n_experiments = 100000
rolls = np.random.randint(1, 7, (n_experiments, 4))

# Direct: count experiments with at least one 6
has_six = np.any(rolls == 6, axis=1)
p_direct = np.mean(has_six)

# Complement: 1 - P(no sixes in 4 rolls)
p_complement = 1 - (5/6)**4

print(f"P(at least one 6 in 4 rolls):")
print(f"  Simulation: {p_direct:.4f}")
print(f"  Complement: {p_complement:.4f}")
print(f"  (This is the famous 'de Méré problem' from 1654!)")

# Visualize how P(at least one 6) grows with number of rolls
n_rolls_range = range(1, 25)
p_values = [1 - (5/6)**n for n in n_rolls_range]

plt.figure(figsize=(8, 4))
plt.plot(n_rolls_range, p_values, 'o-', color='#14b8a6', linewidth=2)
plt.axhline(y=0.5, color='gray', linestyle='--', alpha=0.5, label='50%')
plt.xlabel('Number of rolls')
plt.ylabel('P(at least one 6)')
plt.title('How many rolls until a 6 is likely?')
plt.legend()
plt.grid(alpha=0.2)
plt.tight_layout()
plt.show()

print(f"\nYou need ~4 rolls for >50% chance of seeing a 6")
```
<!-- expected_output: P(at least one 6 in 4 rolls): ~0.5177 -->

---

<!-- layer: formal -->

## Kolmogorov's Axioms

For a probability space $(\Omega, \mathcal{F}, P)$:

**Axiom 1 (Non-negativity):** $\forall A \in \mathcal{F}: P(A) \geq 0$

**Axiom 2 (Normalization):** $P(\Omega) = 1$

**Axiom 3 (Countable Additivity):** For mutually exclusive events $A_1, A_2, \ldots \in \mathcal{F}$:

$$P\left(\bigcup_{i=1}^{\infty} A_i\right) = \sum_{i=1}^{\infty} P(A_i)$$

**Derived results:**

$$P(A^c) = 1 - P(A)$$

$$P(A \cup B) = P(A) + P(B) - P(A \cap B)$$

**Inclusion-Exclusion (general):**

$$P\left(\bigcup_{i=1}^{n} A_i\right) = \sum_{i} P(A_i) - \sum_{i<j} P(A_i \cap A_j) + \sum_{i<j<k} P(A_i \cap A_j \cap A_k) - \cdots$$

---

<!-- block: misconception -->
**Misconception: "Probabilities always add up."**

*Wrong belief:* P(A or B) = P(A) + P(B) always.

*Correction:* This only works when A and B are **mutually exclusive** (can't happen at the same time). In general, $P(A \cup B) = P(A) + P(B) - P(A \cap B)$. For example: P(red card or face card) ≠ P(red) + P(face card), because some cards are both red AND face cards.

*Why this is common:* Many textbook problems start with mutually exclusive events (dice faces, coin outcomes), so students internalize the simple addition rule before encountering overlap.

---

<!-- block: quiz -->
**Micro-challenge:** A bag has 10 marbles: 4 red, 3 blue, 2 green, 1 yellow. You draw one marble. What is P(red or blue)? What is P(not green)?

*Hint:* Red and blue are mutually exclusive (a marble can't be both). For "not green," use the complement rule.

<!-- solution: P(red or blue) = P(red) + P(blue) = 4/10 + 3/10 = 7/10. P(not green) = 1 - P(green) = 1 - 2/10 = 8/10. -->
