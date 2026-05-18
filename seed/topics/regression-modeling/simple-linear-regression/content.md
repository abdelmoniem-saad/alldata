<!-- block: state, values: {slope: 1.0, intercept: 0} -->

<!-- block: plot, spec: scatter_with_fit, params: {slope: 1.0, intercept: 0}, binds: [slope, intercept], anchor: slr-feel, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "TODO — name the spark" -->

# Simple Linear Regression

You have pairs $(x_i, y_i)$. You want a rule that turns any $x$ into a prediction $\hat{y}$. The simplest such rule is a line, and the most-used way to *pick* the line is "minimize the sum of squared errors." Regression is the answer to the line; OLS is the recipe.

> TODO (N): replace with the spark. The "predicting height from age" or "demand from price" framing both work — pick one that grounds the rest.

---

<!-- block: gear, n: 2, label: "TODO — name the intuition" -->

## A line through a cloud of points

A linear regression fits

$$\hat{y} = \beta_0 + \beta_1 x$$

The $\beta_1$ is the slope — how much $y$ changes per unit change in $x$. The $\beta_0$ is the intercept — what $\hat{y}$ predicts when $x = 0$. Two parameters, one line, one prediction rule.

Two flavors of line you could pick:

- **Eyeballed.** Draw a line that "looks right." Reproducible only if you trust your eye.
- **Optimized.** Pick the line that minimizes some honest error criterion. The standard choice is *squared* errors: $\sum_i (y_i - \hat{y}_i)^2$.

> TODO (N): expand. Why squared and not absolute? Squared errors penalize big misses disproportionately and produce a closed-form solution (the normal equations). Absolute errors give the median regression — robust but no closed form.

---

<!-- block: gear, n: 3, label: "TODO — name the mechanic" -->

## Drag a line, watch the residuals

<!-- block: state_reset, anchor: slr-feel -->

<!-- block: playground, anchor: slr-feel -->
binds: [slope, intercept]
controls:
  - param: slope
    label: "Slope (β₁)"
    min: -2
    max: 2
    step: 0.1
  - param: intercept
    label: "Intercept (β₀)"
    min: -2
    max: 2
    step: 0.1
goal:
  prompt: "Match the cloud — find slope and intercept that minimize the visible misses."
  target: { slope: 0.7, intercept: 0.3 }
  success_when: "abs(slope - 0.7) < 0.15 and abs(intercept - 0.3) < 0.2"
  on_success: |
    The slope you found is approximately $r \cdot (s_y / s_x)$ — the OLS
    closed-form. The intercept makes the line pass through $(\bar{x}, \bar{y})$.
    Both are mechanical consequences of "minimize the sum of squared residuals."
<!-- /block -->

> TODO (N): use this Gear 3 to name what a *residual* is and to lead into the formal derivation.

---

<!-- layer: formal -->

<!-- block: gear, n: 4, label: "TODO — name the formalism" -->

## OLS, closed-form

For data $(x_i, y_i)$, the OLS estimators are

$$\hat{\beta}_1 = \frac{\sum_i (x_i - \bar{x})(y_i - \bar{y})}{\sum_i (x_i - \bar{x})^2} = r \cdot \frac{s_y}{s_x}$$

$$\hat{\beta}_0 = \bar{y} - \hat{\beta}_1 \, \bar{x}$$

The fitted line passes through $(\bar{x}, \bar{y})$ by construction. The slope is the sample correlation $r$ scaled by the ratio of marginal standard deviations.

<!-- block: derivation, title: "Where the normal equations come from", collapsed: true -->
> TODO (N): write the derivation. Minimize $L(\beta_0, \beta_1) = \sum_i (y_i - \beta_0 - \beta_1 x_i)^2$ by setting $\partial L / \partial \beta_0 = 0$ and $\partial L / \partial \beta_1 = 0$. The two equations are the *normal equations*; solving them gives the closed forms above.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "TODO — name the code" -->

<!-- block: dataset, name: heights, source: synthetic -->

<!-- block: simulation, editable: true, auto_run: true, anchor: slr-sim -->
```python
import numpy as np

# Fit a line by hand using the closed-form OLS estimators, then verify
# against a library fit. The `heights` dataset is synthetic adult heights.
df = load("heights")
# Predict height_cm from the synthetic 'age_years' column if present; else
# fall back to a generated x for the scaffold.
if "age_years" in df.columns:
    x = df["age_years"].to_numpy()
else:
    x = np.arange(len(df))
y = df["height_cm"].to_numpy()

# Closed-form OLS
beta1 = np.cov(x, y, ddof=0)[0, 1] / np.var(x, ddof=0)
beta0 = y.mean() - beta1 * x.mean()
print(f"Closed-form OLS: ŷ = {beta0:.3f} + {beta1:.3f} · x")

# np.polyfit cross-check
p1, p0 = np.polyfit(x, y, 1)
print(f"np.polyfit:        ŷ = {p0:.3f} + {p1:.3f} · x")
```

> TODO (N): annotate. Mention what makes a fit *good* (low residual variance, well-behaved residuals) vs. *trustworthy* (assumptions hold).

---

<!-- layer: both -->

<!-- block: gear, n: 6, label: "Where it leads" -->

<!-- block: callout, kind: insight -->
**Where this leads.** **Multiple regression** adds more predictors and the math becomes matrix algebra — but the "minimize squared errors" recipe is identical. **Logistic regression** swaps the linear link for a logit when the outcome is binary. **Regularization** (ridge, lasso) shrinks $\hat{\beta}$ toward zero to trade bias for lower variance. **Model diagnostics** — residual plots, leverage, Cook's distance — check whether the OLS assumptions actually hold on your data.
<!-- /block -->
