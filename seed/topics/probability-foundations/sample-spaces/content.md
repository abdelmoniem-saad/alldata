<!-- layer: intuition -->

## The Starting Point of All Probability

Before you can calculate the probability of *anything*, you need to answer one question: **what could possibly happen?**

A **sample space** is the complete set of all possible outcomes of an experiment. Think of it as the universe of possibilities:

- Flip a coin → Sample space: {Heads, Tails}
- Roll a die → Sample space: {1, 2, 3, 4, 5, 6}
- Pick a card → Sample space: all 52 cards

An **event** is any subset of the sample space — it's the thing you're actually interested in. "Rolling an even number" is the event {2, 4, 6}, which lives inside the sample space {1, 2, 3, 4, 5, 6}.

**Key insight:** If you define the sample space wrong, your entire probability calculation is wrong. Getting this right is the foundation of everything else.

---

## Events and Set Operations

Events combine using the same operations as sets:

- **Union** (A ∪ B): "A or B happens" — rolling a 2 OR a 4
- **Intersection** (A ∩ B): "A and B both happen" — drawing a card that is red AND a face card
- **Complement** (Aᶜ): "A doesn't happen" — NOT rolling a 6

Venn diagrams are your best friend here. Every probability problem starts by identifying the sample space and the events of interest.

---

<!-- block: code_python, editable: true -->
```python
import numpy as np
import matplotlib.pyplot as plt

# Simulate rolling two dice — what's the sample space?
np.random.seed(42)
n_rolls = 50000
die1 = np.random.randint(1, 7, n_rolls)
die2 = np.random.randint(1, 7, n_rolls)

# The sample space has 36 equally likely outcomes
# Let's visualize how often each (die1, die2) pair appears
heatmap = np.zeros((6, 6))
for i in range(n_rolls):
    heatmap[die1[i]-1, die2[i]-1] += 1
heatmap /= n_rolls

plt.figure(figsize=(6, 5))
plt.imshow(heatmap, cmap='Blues', vmin=0)
plt.colorbar(label='Relative frequency')
plt.xticks(range(6), range(1, 7))
plt.yticks(range(6), range(1, 7))
plt.xlabel('Die 2')
plt.ylabel('Die 1')
plt.title('Sample Space of Two Dice (each cell ≈ 1/36)')
for i in range(6):
    for j in range(6):
        plt.text(j, i, f'{heatmap[i,j]:.3f}', ha='center', va='center', fontsize=8)
plt.tight_layout()
plt.show()

# Event: "sum is 7"
event_sum7 = np.sum(die1 + die2 == 7) / n_rolls
print(f"P(sum = 7) = {event_sum7:.4f} (theoretical: {6/36:.4f})")
print(f"Sample space size: 6 × 6 = 36 outcomes")
```
<!-- expected_output: P(sum = 7) ≈ 0.1667 -->

---

<!-- layer: formal -->

## Formal Definition

A **probability space** is a triple $(\Omega, \mathcal{F}, P)$ where:

- $\Omega$ is the **sample space** — the set of all possible outcomes
- $\mathcal{F}$ is a **σ-algebra** on $\Omega$ — a collection of events (subsets of $\Omega$) closed under complement and countable union
- $P: \mathcal{F} \to [0,1]$ is a **probability measure** satisfying:
  - $P(\Omega) = 1$
  - $P(\emptyset) = 0$
  - For disjoint events $A_1, A_2, \ldots$: $P\left(\bigcup_{i=1}^{\infty} A_i\right) = \sum_{i=1}^{\infty} P(A_i)$

For **finite** sample spaces with equally likely outcomes:

$$P(A) = \frac{|A|}{|\Omega|}$$

---

<!-- block: misconception -->
**Misconception: "The sample space is just the outcomes I care about."**

*Wrong belief:* When calculating P(rolling a 6), the sample space is just {6, not-6}.

*Correction:* The sample space must include ALL possible outcomes: {1, 2, 3, 4, 5, 6}. The event "rolling a 6" is {6}, but the sample space is the full set. Collapsing outcomes you don't care about into "not-6" can work for simple problems but leads to errors in conditional probability and more complex scenarios.

*Why this is common:* For simple yes/no questions, a two-element sample space gives the right answer, so students don't realize they're implicitly using the full sample space.

---

<!-- block: quiz -->
**Micro-challenge:** Two coins are flipped. Someone tells you "at least one is heads." What's the sample space for this experiment? What's the probability both are heads, given this information?

*Hint:* The full sample space is {HH, HT, TH, TT}. The condition "at least one heads" eliminates one outcome. Be careful — it's not 1/2!

<!-- solution: The sample space given "at least one heads" is {HH, HT, TH}. P(both heads | at least one heads) = 1/3, not 1/2. The key is that HT and TH are different outcomes. -->
