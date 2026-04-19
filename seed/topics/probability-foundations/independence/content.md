<!-- layer: intuition -->

## When Knowing One Thing Tells You Nothing About Another

Two events are **independent** if knowing one happened doesn't change the probability of the other. Mathematically:

$$P(A|B) = P(A)$$

This means learning B gives you zero information about A. It's the probabilistic equivalent of "these things have nothing to do with each other."

**Examples of independence:**
- Flipping a coin twice: the second flip doesn't care about the first
- Rolling two separate dice: each die has its own outcome
- Whether it rains in Tokyo and whether you pass a math test in New York

**Examples of NON-independence:**
- Drawing cards without replacement: each draw changes the deck
- Height and weight of a person: taller people tend to weigh more
- Whether the road is wet and whether it rained: clearly related!

---

## The Multiplication Rule for Independent Events

When events are independent, "and" becomes multiplication:

$$P(A \text{ and } B) = P(A) \times P(B)$$

This is incredibly powerful. Want the probability of flipping 10 heads in a row?

$$P = (1/2)^{10} = 1/1024 \approx 0.001$$

But be careful: independence must be **justified**, not assumed. Many real-world events that seem independent aren't.

---

<!-- block: code_python, editable: true -->
```python
import numpy as np
import matplotlib.pyplot as plt

# Demonstrate: independent vs dependent events
np.random.seed(42)
n = 100000

# Independent: two separate coin flips
coin1 = np.random.choice([0, 1], n)  # 0=T, 1=H
coin2 = np.random.choice([0, 1], n)

p_h1 = np.mean(coin1)
p_h2_given_h1 = np.mean(coin2[coin1 == 1])  # P(H2 | H1)
print("=== Independent Events (two coins) ===")
print(f"P(H on coin 1) = {p_h1:.4f}")
print(f"P(H on coin 2 | H on coin 1) = {p_h2_given_h1:.4f}")
print(f"These are {'≈ equal' if abs(p_h1 - p_h2_given_h1) < 0.01 else 'different'} → independent!\n")

# Dependent: drawing WITHOUT replacement from a deck
# Simplified: bag of 5 red, 5 blue balls
draws1 = []
draws2_given_red1 = []

for _ in range(n):
    bag = ['R']*5 + ['B']*5
    first = np.random.choice(bag)
    bag.remove(first)
    second = np.random.choice(bag)
    draws1.append(first)
    if first == 'R':
        draws2_given_red1.append(second)

p_red1 = sum(1 for d in draws1 if d == 'R') / len(draws1)
p_red2_given_red1 = sum(1 for d in draws2_given_red1 if d == 'R') / len(draws2_given_red1)

print("=== Dependent Events (drawing without replacement) ===")
print(f"P(Red on draw 1) = {p_red1:.4f} (theoretical: 0.5)")
print(f"P(Red on draw 2 | Red on draw 1) = {p_red2_given_red1:.4f} (theoretical: {4/9:.4f})")
print(f"These are {'≈ equal' if abs(p_red1 - p_red2_given_red1) < 0.01 else 'different'} → dependent!")

# Visualize
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 4))
ax1.bar(['P(H₂)', 'P(H₂|H₁)'], [np.mean(coin2), p_h2_given_h1], color=['#14b8a6', '#14b8a6'])
ax1.set_title('Independent: Two Coins')
ax1.set_ylim(0, 0.7)
ax2.bar(['P(R₂)', 'P(R₂|R₁)'], [0.5, p_red2_given_red1], color=['#71717a', '#71717a'])
ax2.set_title('Dependent: Drawing w/o Replacement')
ax2.set_ylim(0, 0.7)
plt.tight_layout()
plt.show()
```
<!-- expected_output: P(Red on draw 2 | Red on draw 1) ≈ 0.4444 -->

---

<!-- layer: formal -->

## Formal Definition

Events A and B are **independent** if and only if:

$$P(A \cap B) = P(A) \cdot P(B)$$

Equivalently (when $P(B) > 0$):

$$P(A|B) = P(A)$$

For **mutual independence** of events $A_1, \ldots, A_n$, we require:

$$P\left(\bigcap_{i \in S} A_i\right) = \prod_{i \in S} P(A_i)$$

for **every** subset $S \subseteq \{1, \ldots, n\}$. Note: pairwise independence does not imply mutual independence.

---

<!-- block: misconception -->
**Misconception: "Events that don't affect each other are always independent."**

*Wrong belief:* If there's no causal mechanism between A and B, they must be independent.

*Correction:* Independence is a mathematical property about probabilities, not about causation. Two events can be statistically dependent even without any causal relationship (this is called a **spurious correlation** or **confounding**). Conversely, causal relationships don't always create statistical dependence in all contexts.

*Why this is common:* We naturally think about independence in terms of physical mechanisms. But statistical independence is defined purely by the numbers — P(A∩B) = P(A)·P(B) — regardless of why.

---

<!-- block: quiz -->
**Micro-challenge:** You roll a fair die. Let A = "result is even" = {2, 4, 6} and B = "result ≤ 3" = {1, 2, 3}. Are A and B independent?

*Hint:* Check if P(A ∩ B) = P(A) · P(B). What is A ∩ B?

<!-- solution: A ∩ B = {2} (even AND ≤ 3). P(A∩B) = 1/6. P(A) = 3/6 = 1/2. P(B) = 3/6 = 1/2. P(A)·P(B) = 1/4. Since 1/6 ≠ 1/4, A and B are NOT independent. Knowing the result is ≤ 3 makes "even" less likely (only 1 out of 3 instead of 3 out of 6). -->
