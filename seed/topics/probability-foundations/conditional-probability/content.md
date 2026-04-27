<!-- block: state, values: {prior: 0.333, sensitivity: 1.0, specificity: 0.5, treatment_strategy: "none"} -->

<!-- block: plot, spec: population_dot_grid, params: {prior: 0.333, sensitivity: 1.0, specificity: 0.5, treatment_strategy: "none"}, anchor: monty-population, mobile_order: 1 -->

---

<!-- layer: intuition -->

## When information changes everything

You're told a family has two children, and at least one is a girl. What's the probability both are girls?

Your gut says one in two. The answer is one in three. Welcome to **conditional probability** — the math of "given that I know B happened, what's the probability of A?"

The formula is simple:

$$P(A \mid B) = \frac{P(A \cap B)}{P(B)}$$

The intuition is the part worth thinking about: **knowing B happened shrinks the sample space.** You're not looking at all possible outcomes anymore — only the ones where B is true.

---

## The Monty Hall problem

The most famous conditional-probability puzzle. You're on a game show with three doors. Behind one is a car, behind the other two are goats. You pick door 1. The host — who knows where the car is — opens door 3, showing a goat. He asks: "Do you want to switch to door 2?"

Most people say it doesn't matter. The car is behind one of the two remaining doors, so it's 50/50, right? Pick what you want.

It isn't 50/50. Below, we run the game 1,000 times. The dot grid shows the population of games. Pick a strategy and see what happens.

---

<!-- block: decision, anchor: monty-decision -->
question: |
  You picked door 1. Monty opened door 3 and showed a goat. He offers you the
  switch to door 2. What do you do?
options:
  - id: stay
    label: "Stay with door 1 (it's 50/50 anyway)"
    writes: { treatment_strategy: "treat_half" }
    response: |
      Look at the population. About 1 in 3 of the games where you stuck with
      door 1 ended in a car; the other 2 in 3 had a goat. Your initial pick
      had a 1/3 chance — Monty's information didn't change *that*. The 2/3
      probability didn't disappear; it collapsed onto the door he didn't open.
  - id: switch
    label: "Switch to door 2"
    writes: { treatment_strategy: "treat_all" }
    response: |
      The dot grid is showing you why. Your original 1/3 chance of being
      right stayed exactly where it was. The other 2/3 — the world where
      the car is behind one of the doors you didn't pick — got concentrated
      into door 2 the moment Monty revealed door 3 was empty. Switching
      doubles your win rate.
  - id: indifferent
    label: "Doesn't matter — same odds"
    writes: { treatment_strategy: "none" }
    response: |
      It's a natural read of the problem, but it's the trap. Monty's choice
      isn't random — he *knows* where the car is and never opens that door.
      That asymmetry is information. The remaining 2/3 collapses onto door 2
      when door 3 is opened.
correct: switch
<!-- /block -->

---

<!-- block: callout, kind: insight, depends_on: monty-decision, branch: switch -->
This is conditional probability with teeth: $P(\text{car behind 2} \mid \text{Monty opened 3}) = 2/3$, not $1/2$. The conditioning event isn't "we have two doors left"; it's "Monty, who knows the answer, picked which empty door to open." That second part is what makes the math swing.
<!-- /block -->

<!-- block: callout, kind: insight, depends_on: monty-decision, branch: stay|indifferent -->
The trap is treating Monty as if he picked at random. He didn't. He picked the door he knew was empty *given* your choice. That conditioning is the whole game — and it's why $P(\text{car} \mid \text{Monty opened 3})$ is two-to-one in favor of switching.
<!-- /block -->

---

<!-- block: step_through, anchor: monty-walk -->
1. Before any door opens: $P(\text{car behind 1}) = P(\text{car behind 2}) = P(\text{car behind 3}) = 1/3$.
2. You pick door 1. Your $1/3$ chance is locked in.
3. Monty opens an empty door — he can always do this. The combined probability of doors 2 and 3, which was $2/3$, doesn't vanish.
4. Door 3 is revealed empty. The $2/3$ that was split between doors 2 and 3 is now entirely on door 2.
5. **Switching wins with probability $2/3$.** Staying wins with probability $1/3$.
<!-- /block -->

---

<!-- layer: formal -->

## Formal definition

For events $A$, $B$ with $P(B) > 0$:

$$P(A \mid B) = \frac{P(A \cap B)}{P(B)}$$

**Multiplication rule** (rearranging):

$$P(A \cap B) = P(A \mid B) \cdot P(B) = P(B \mid A) \cdot P(A)$$

**Law of total probability** — if $B_1, B_2, \ldots, B_n$ partition $\Omega$:

$$P(A) = \sum_{i=1}^{n} P(A \mid B_i) \, P(B_i)$$

**Chain rule:**

$$P(A_1 \cap A_2 \cap \cdots \cap A_n) = P(A_1) \cdot P(A_2 \mid A_1) \cdot P(A_3 \mid A_1 \cap A_2) \cdots$$

---

<!-- block: derivation, title: "Why Monty's choice gives you information", collapsed: true -->
Let $C_i$ be "the car is behind door $i$." You pick door 1. Let $M_3$ be "Monty opens door 3."

If the car is behind door 1, Monty has a free choice between doors 2 and 3 — he opens door 3 with probability $1/2$:

$$P(M_3 \mid C_1) = 1/2$$

If the car is behind door 2, Monty *must* open door 3:

$$P(M_3 \mid C_2) = 1$$

If the car is behind door 3, Monty can't open it:

$$P(M_3 \mid C_3) = 0$$

By Bayes:

$$P(C_2 \mid M_3) = \frac{P(M_3 \mid C_2) \cdot P(C_2)}{P(M_3)} = \frac{1 \cdot 1/3}{1/2} = 2/3$$

Switching wins two-thirds of the time.
<!-- /block -->

---

<!-- layer: both -->

---

<!-- block: misconception, inline: true -->
**"$P(A \mid B)$ and $P(B \mid A)$ are the same thing."**

*Wrong:* the probability of having a disease given a positive test is the same as the probability of testing positive given you have the disease.

*Correct:* these are completely different — that confusion is the **base rate fallacy**. A 99%-accurate test can still have a low $P(\text{disease} \mid +)$ if the disease is rare. English makes it easy to swap the direction; the math doesn't tolerate the swap.
<!-- /block -->

---

<!-- block: simulation, editable: true, auto_run: true, anchor: monty-sim -->
```python
import numpy as np
import matplotlib.pyplot as plt

# Monty Hall — simulate it. The math doesn't lie, but seeing 50,000 games
# converge to the theoretical numbers usually seals the intuition.
np.random.seed(42)
n_games = 50_000
car_positions = np.random.randint(0, 3, n_games)
initial_picks = np.random.randint(0, 3, n_games)

# Stay wins exactly when your initial pick is right.
# Switch wins exactly when your initial pick is wrong.
stay_wins = (initial_picks == car_positions).sum()
switch_wins = n_games - stay_wins

print(f"Games: {n_games:,}")
print(f"Stay wins:   {stay_wins/n_games:.4f}  (theoretical 1/3 = 0.3333)")
print(f"Switch wins: {switch_wins/n_games:.4f}  (theoretical 2/3 = 0.6667)")

cum_switch = np.cumsum(initial_picks != car_positions) / np.arange(1, n_games + 1)
cum_stay = np.cumsum(initial_picks == car_positions) / np.arange(1, n_games + 1)

fig, ax = plt.subplots(figsize=(8, 3.5))
ax.plot(cum_switch, color='#14b8a6', linewidth=1.5, label='Switch')
ax.plot(cum_stay, color='#71717a', linewidth=1.5, label='Stay')
ax.axhline(2/3, color='#14b8a6', linestyle='--', alpha=0.4)
ax.axhline(1/3, color='#71717a', linestyle='--', alpha=0.4)
ax.set_xlabel('Game number')
ax.set_ylabel('Win rate')
ax.set_title('Convergence')
ax.legend()
ax.grid(alpha=0.2)
plt.tight_layout()
plt.show()
```
