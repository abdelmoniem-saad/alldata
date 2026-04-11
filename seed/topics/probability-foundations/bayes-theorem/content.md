<!-- layer: intuition -->

## The Core Idea

You know P(B|A) — the probability of B given A. But you want P(A|B) — the reverse. Bayes' Theorem lets you **flip the conditional**.

**Real-world example:** A medical test for a disease is 95% accurate. You test positive. What's the probability you actually have the disease?

Your instinct says 95%. But that's P(positive|disease) — the accuracy of the test. You want P(disease|positive) — which depends on how rare the disease is.

If the disease affects 1 in 1000 people, even a 95%-accurate positive test means you probably *don't* have it. This is Bayes' Theorem in action.

---

## The Formula, Intuitively

$$P(A|B) = \frac{P(B|A) \cdot P(A)}{P(B)}$$

In English:
- **P(A)** — your *prior* belief (how likely is A before seeing evidence?)
- **P(B|A)** — the *likelihood* (how likely is the evidence if A is true?)
- **P(B)** — the *total probability of the evidence* (how common is B overall?)
- **P(A|B)** — your *posterior* belief (how likely is A after seeing evidence?)

**The key insight:** Bayes' Theorem is a recipe for **updating beliefs with evidence**. You start with a prior, see data, and get a posterior.

---

<!-- block: simulation, editable: true -->
```python
import numpy as np
import matplotlib.pyplot as plt

# Medical test simulation: Experience Bayes' Theorem before the formula
np.random.seed(42)

# Parameters
population = 100_000
disease_rate = 0.001        # 1 in 1000
test_sensitivity = 0.95     # P(positive | disease) = 95%
test_specificity = 0.95     # P(negative | no disease) = 95%

# Simulate population
has_disease = np.random.random(population) < disease_rate
n_sick = has_disease.sum()
n_healthy = population - n_sick

# Simulate test results
test_positive = np.zeros(population, dtype=bool)
test_positive[has_disease] = np.random.random(n_sick) < test_sensitivity
test_positive[~has_disease] = np.random.random(n_healthy) < (1 - test_specificity)

# Results
true_positives = (test_positive & has_disease).sum()
false_positives = (test_positive & ~has_disease).sum()
total_positives = test_positive.sum()

print(f"Population: {population:,}")
print(f"Actually sick: {n_sick:,}")
print(f"Test positive: {total_positives:,}")
print(f"  True positives: {true_positives:,}")
print(f"  False positives: {false_positives:,}")
print(f"\nP(disease | positive) = {true_positives/total_positives:.1%}")
print(f"This is WAY lower than the 95% test accuracy!")

# Visualize
fig, ax = plt.subplots(figsize=(8, 4))
ax.barh(['True Positive\n(sick & positive)', 'False Positive\n(healthy & positive)'],
        [true_positives, false_positives], color=['#e74c3c', '#3498db'])
ax.set_xlabel('Number of people')
ax.set_title('Among all positive tests, most are FALSE positives')
plt.tight_layout()
plt.show()
```

---

<!-- layer: formal -->

## Formal Statement

For events A and B with P(B) > 0:

$$P(A|B) = \frac{P(B|A) \, P(A)}{P(B)}$$

Using the law of total probability for P(B):

$$P(A|B) = \frac{P(B|A) \, P(A)}{P(B|A) \, P(A) + P(B|A^c) \, P(A^c)}$$

This extends to multiple hypotheses $H_1, H_2, \ldots, H_n$ that partition the sample space:

$$P(H_i|B) = \frac{P(B|H_i) \, P(H_i)}{\sum_{j=1}^{n} P(B|H_j) \, P(H_j)}$$

---

<!-- block: misconception -->
**Misconception: "The test is 95% accurate, so a positive result means 95% chance of disease."**

*Wrong belief:* Test accuracy directly tells you the probability of having the condition given a positive result.

*Correction:* Test accuracy is P(positive|disease), but you want P(disease|positive). These are NOT the same. The base rate (prevalence) of the disease matters enormously. For rare diseases, even very accurate tests produce mostly false positives.

*Why this is common:* Humans naturally confuse P(A|B) with P(B|A). This is called the **base rate fallacy** and has real consequences in medicine, law, and security screening.

---

<!-- block: quiz -->
**Micro-challenge:** In the simulation above, change the disease rate from 0.001 to 0.1 (10% prevalence). How does P(disease|positive) change? At what prevalence does a positive test become more likely true than false?

*Hint:* The crossover point is when true positives equal false positives. Solve: sensitivity × prevalence = (1 - specificity) × (1 - prevalence).
