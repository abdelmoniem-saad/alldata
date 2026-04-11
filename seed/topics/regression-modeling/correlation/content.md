<!-- layer: intuition -->

## Measuring Linear Relationships

**Correlation** quantifies how strongly two variables are linearly related. The most common measure is Pearson's correlation coefficient, **r**, which ranges from -1 to +1:

- **r = +1:** Perfect positive linear relationship (as X increases, Y increases proportionally)
- **r = 0:** No linear relationship (but there might be a non-linear one!)
- **r = -1:** Perfect negative linear relationship (as X increases, Y decreases proportionally)

**Key insight:** Correlation measures **linear** association only. Two variables can be strongly related but have r ≈ 0 if the relationship is curved.

---

## The Most Important Warning in Statistics

**Correlation does not imply causation.** Ice cream sales and drowning deaths are correlated (both increase in summer), but ice cream doesn't cause drowning.

Correlations arise from:
1. **Causation:** X actually causes Y
2. **Reverse causation:** Y causes X
3. **Confounding:** A third variable Z causes both
4. **Coincidence:** Spurious correlation from mining many variables

Always ask: is there a plausible mechanism? Could there be a confounder?

---

<!-- block: code_python, editable: true -->
```python
import numpy as np
import matplotlib.pyplot as plt

# Anscombe's Quartet: four datasets with identical statistics but very different shapes
# Same mean, variance, correlation, and regression line — but look completely different!
np.random.seed(42)

# Anscombe's quartet data
x1 = [10, 8, 13, 9, 11, 14, 6, 4, 12, 7, 5]
y1 = [8.04, 6.95, 7.58, 8.81, 8.33, 9.96, 7.24, 4.26, 10.84, 4.82, 5.68]
x2 = [10, 8, 13, 9, 11, 14, 6, 4, 12, 7, 5]
y2 = [9.14, 8.14, 8.74, 8.77, 9.26, 8.10, 6.13, 3.10, 9.13, 7.26, 4.74]
x3 = [10, 8, 13, 9, 11, 14, 6, 4, 12, 7, 5]
y3 = [7.46, 6.77, 12.74, 7.11, 7.81, 8.84, 6.08, 5.39, 8.15, 6.42, 5.73]
x4 = [8, 8, 8, 8, 8, 8, 8, 19, 8, 8, 8]
y4 = [6.58, 5.76, 7.71, 8.84, 8.47, 7.04, 5.25, 12.50, 5.56, 7.91, 6.89]

datasets = [(x1,y1,'I: Linear'), (x2,y2,'II: Curved'), (x3,y3,'III: Outlier'), (x4,y4,'IV: Leverage')]
fig, axes = plt.subplots(2, 2, figsize=(10, 8))

for ax, (x, y, title) in zip(axes.flat, datasets):
    x, y = np.array(x), np.array(y)
    r = np.corrcoef(x, y)[0, 1]
    ax.scatter(x, y, color='#7c5cfc', s=60, edgecolors='white', zorder=3)
    
    # Regression line
    m, b = np.polyfit(x, y, 1)
    ax.plot([3, 20], [m*3+b, m*20+b], 'r--', alpha=0.5)
    
    ax.set_title(f'{title}\nr = {r:.2f}, ȳ = {y.mean():.1f}', fontweight='bold')
    ax.set_xlim(3, 20)
    ax.set_ylim(2, 14)
    ax.grid(alpha=0.2)

plt.suptitle("Anscombe's Quartet: Same Statistics, Different Stories!", fontsize=14, y=1.02)
plt.tight_layout()
plt.show()

print("All four datasets have nearly identical:")
print(f"  Mean of x: ~9.0  |  Mean of y: ~7.5")
print(f"  Correlation: ~0.82  |  Regression line: y ≈ 0.5x + 3.0")
print(f"\nBut they tell COMPLETELY different stories.")
print(f"ALWAYS plot your data before computing statistics!")
```
<!-- expected_output: Anscombe's quartet — same r, different relationships -->

---

<!-- layer: formal -->

## Formal Definition

**Pearson's correlation coefficient:**

$$r = \frac{\sum_{i=1}^n (x_i - \bar{x})(y_i - \bar{y})}{\sqrt{\sum_{i=1}^n (x_i - \bar{x})^2 \sum_{i=1}^n (y_i - \bar{y})^2}}$$

Equivalently:

$$r = \frac{\text{Cov}(X, Y)}{\text{SD}(X) \cdot \text{SD}(Y)}$$

**Properties:**
- $-1 \leq r \leq 1$
- $r$ is invariant to linear transformations of X or Y
- $r^2$ = proportion of variance in Y "explained" by linear relationship with X

**Testing:** Under $H_0: \rho = 0$:

$$t = \frac{r\sqrt{n-2}}{\sqrt{1-r^2}} \sim t(n-2)$$

---

<!-- block: misconception -->
**Misconception: "Correlation of 0 means no relationship."**

*Wrong belief:* If r = 0, X and Y are completely unrelated.

*Correction:* r = 0 means no **linear** relationship. X and Y could have a strong **non-linear** relationship (U-shaped, circular, etc.) and still have r ≈ 0. Always plot your data! In Anscombe's quartet, dataset II has r = 0.82 but the true relationship is curved — the correlation is misleading.

*Why this is common:* "Correlation" in everyday language means "any relationship." In statistics, Pearson's r specifically measures linear association only. Rank correlations (Spearman's) can detect monotonic non-linear relationships.

---

<!-- block: quiz -->
**Micro-challenge:** You find r = 0.85 between hours studied and exam score. Does this prove studying causes higher scores? What's r² and what does it mean?

*Hint:* Think about confounders. r² is the coefficient of determination.

<!-- solution: No! Correlation ≠ causation. Possible confounders: motivation (motivated students both study more AND perform better), prior knowledge, intelligence. A randomized experiment would be needed to establish causation. r² = 0.85² = 0.7225, meaning about 72% of the variation in exam scores can be "explained" by the linear relationship with hours studied. The remaining 28% is due to other factors. -->
