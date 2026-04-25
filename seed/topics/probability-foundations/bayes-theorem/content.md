<!-- block: state, values: {prior: 0.01, sensitivity: 0.95, specificity: 0.95, treatment_strategy: "none", observed_result: "positive"} -->

<!-- block: plot, spec: population_dot_grid, params: {prior: 0.01, sensitivity: 0.95, specificity: 0.95, treatment_strategy: "none"}, anchor: bayes-population -->

---

<!-- layer: intuition -->

## The setup

You've taken a medical test. It's 95% accurate. The disease affects 1 in 100 people. You test positive.

Before reading on — what's the probability you actually have the disease? Pick the answer that matches your gut.

---

<!-- block: decision, anchor: bayes-intuition -->
question: |
  A test is 95% accurate. The disease affects 1% of people. You test positive.
  What's the probability you actually have the disease?
options:
  - id: a
    label: "About 95%"
    writes: { treatment_strategy: "treat_all" }
    response: |
      Look at the plot — every positive test has been treated under your strategy.
      Most of those treated are healthy people who happened to flag a false positive.
      The test's accuracy isn't the whole story; the rarity of the disease dominates.
  - id: b
    label: "About 50%"
    writes: { treatment_strategy: "treat_half" }
    response: |
      Closer to the truth than 95%, but still anchored too high. Your "treat half"
      strategy still picks up a lot of healthy people. The base rate matters more
      than a 50/50 instinct gives it credit for.
  - id: c
    label: "About 16%"
    writes: { treatment_strategy: "retest" }
    response: |
      You're already past the trap most people fall into. Your "retest before treating"
      strategy filters out most of the false positives. Now let's see exactly *why*
      the rarity pulls the posterior so far down.
correct: c
<!-- /block -->

---

<!-- block: callout, kind: insight, depends_on: bayes-intuition, branch: a -->
Watch the plot. The dots colored as treated are mostly *healthy* — false positives. With a 1% base rate and a 95% test, only about 1 in 6 positive tests is actually sick. Treating everyone who tests positive means treating 5 healthy people for every 1 sick person you catch.
<!-- /block -->

<!-- block: callout, kind: insight, depends_on: bayes-intuition, branch: b -->
Your 50% guess respects that the test isn't perfect, but it doesn't yet account for how rare the disease is. With 1% prevalence, a 95% test still produces more false positives than true ones — your "treat half" strategy is missing real cases and treating healthy ones.
<!-- /block -->

<!-- block: callout, kind: insight, depends_on: bayes-intuition, branch: c -->
Exactly. Of every 100 positive tests, roughly 84 are healthy people. A retest filters those down — the second positive in a row is much harder to fake. This is Bayes' Theorem doing work for you.
<!-- /block -->

---

## The walk

The trap is treating the test's accuracy — `P(positive | sick)` — as if it were the answer to the question — `P(sick | positive)`. They aren't the same. To flip the conditional you need three numbers, not one.

<!-- block: step_through, anchor: bayes-walk -->
1. Start with the **prior**: $P(\text{sick}) = 0.01$. This is what you believe *before* the test.
2. Apply the **likelihood**: $P(+ \mid \text{sick}) = 0.95$. This is the test's accuracy on sick people.
3. Account for the **other path** to a positive — healthy people getting a false positive: $P(+ \mid \text{healthy}) = 0.05$.
4. Combine into the **total probability of a positive**: $P(+) = 0.95 \cdot 0.01 + 0.05 \cdot 0.99 \approx 0.059$.
5. The **posterior**: $P(\text{sick} \mid +) = (0.95 \cdot 0.01) / 0.059 \approx 16\%$.
<!-- /block -->

---

<!-- block: plot, spec: posterior_update, params: {prior: 0.01, sensitivity: 0.95, specificity: 0.95, observed_result: "positive"}, anchor: bayes-posterior-bars -->

The bar in the middle is the answer to the question you started with. Notice how far it is from 95%.

---

## The formula

$$P(A \mid B) = \frac{P(B \mid A) \cdot P(A)}{P(B)}$$

In English:

- **P(A)** — your *prior* belief (how likely is A before seeing evidence?)
- **P(B|A)** — the *likelihood* (how likely is the evidence if A is true?)
- **P(B)** — the *total probability of the evidence*
- **P(A|B)** — your *posterior* belief (how likely is A after seeing evidence?)

Bayes' Theorem is a recipe for **updating beliefs with evidence**. Prior + likelihood + base rate → posterior.

---

<!-- block: derivation, title: "Where the formula comes from", collapsed: true -->
Both $P(A \cap B)$ and $P(B \cap A)$ are the same event, so by the multiplication rule:

$$P(A \cap B) = P(A \mid B) \cdot P(B) = P(B \mid A) \cdot P(A)$$

Solve for $P(A \mid B)$:

$$P(A \mid B) = \frac{P(B \mid A) \cdot P(A)}{P(B)}$$

For multiple hypotheses $H_1, \ldots, H_n$ that partition the sample space, the law of total probability gives the denominator:

$$P(H_i \mid B) = \frac{P(B \mid H_i) \cdot P(H_i)}{\sum_{j=1}^{n} P(B \mid H_j) \cdot P(H_j)}$$
<!-- /block -->

---

## Feel the base rate

Move the prevalence slider. Watch the dot grid recolor — at low prevalence the false positives drown out the real ones. Find the **crossover point** where a positive test is more likely to be sick than healthy.

<!-- block: state_reset, anchor: bayes-feel -->

<!-- block: playground, anchor: bayes-feel -->
binds: [prior]
controls:
  - param: prior
    label: "Disease prevalence"
    min: 0.001
    max: 0.5
    step: 0.005
goal:
  prompt: "Find the prevalence where exactly half of positive tests are real (the crossover)."
  target: { prior: 0.05 }
  success_when: "prior >= 0.045 and prior <= 0.06"
  on_success: |
    That's the crossover. With 95% sensitivity and 95% specificity, you need roughly
    5% prevalence before a positive test tips past 50%. Below that, the rarity of
    the disease wins; above it, the test does. The crossover scales with the test —
    a more accurate test pulls it lower.
  hints:
    - after_seconds: 20
      text: "Try around 5%."
    - after_seconds: 45
      text: "Solve for sensitivity * prior = (1 - specificity) * (1 - prior)."
<!-- /block -->

---

<!-- block: misconception, inline: true -->
**"A 95%-accurate test means a 95% chance you have the disease if you test positive."**

*Wrong:* test accuracy is $P(+ \mid \text{sick})$, but you want $P(\text{sick} \mid +)$. These are not the same conditional.

*Correct:* the answer depends on the **base rate** (prevalence). For rare diseases, even very accurate tests produce mostly false positives. This is the **base rate fallacy** — and it shows up in medicine, law, and security screening.
<!-- /block -->

---

<!-- layer: formal -->

## Formal statement

For events $A$ and $B$ with $P(B) > 0$:

$$P(A \mid B) = \frac{P(B \mid A) \, P(A)}{P(B)}$$

Using the law of total probability for $P(B)$:

$$P(A \mid B) = \frac{P(B \mid A) \, P(A)}{P(B \mid A) \, P(A) + P(B \mid A^c) \, P(A^c)}$$

This extends to multiple hypotheses $H_1, H_2, \ldots, H_n$ that partition the sample space:

$$P(H_i \mid B) = \frac{P(B \mid H_i) \, P(H_i)}{\sum_{j=1}^{n} P(B \mid H_j) \, P(H_j)}$$

---

<!-- block: simulation, editable: true, auto_run: true, anchor: bayes-sim -->
```python
import numpy as np
import matplotlib.pyplot as plt

# Bayes — population simulation. Tweak the parameters and re-run.
np.random.seed(42)

population = 100_000
disease_rate = 0.01      # 1 in 100
test_sensitivity = 0.95  # P(+ | sick)
test_specificity = 0.95  # P(- | healthy)

has_disease = np.random.random(population) < disease_rate
n_sick = has_disease.sum()

test_positive = np.zeros(population, dtype=bool)
test_positive[has_disease] = np.random.random(n_sick) < test_sensitivity
test_positive[~has_disease] = np.random.random(population - n_sick) < (1 - test_specificity)

true_pos = (test_positive & has_disease).sum()
false_pos = (test_positive & ~has_disease).sum()
total_pos = test_positive.sum()

print(f"Population: {population:,}")
print(f"Actually sick: {n_sick:,}")
print(f"Test positive: {total_pos:,}")
print(f"  True positives: {true_pos:,}")
print(f"  False positives: {false_pos:,}")
print(f"\nP(disease | positive) = {true_pos/total_pos:.1%}")

fig, ax = plt.subplots(figsize=(8, 3))
ax.barh(['True positive\n(sick & +)', 'False positive\n(healthy & +)'],
        [true_pos, false_pos], color=['#14b8a6', '#71717a'])
ax.set_xlabel('Number of people')
ax.set_title('Among positive tests, most are FALSE positives')
plt.tight_layout()
plt.show()
```
