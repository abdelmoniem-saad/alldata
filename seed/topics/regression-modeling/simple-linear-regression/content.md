<!-- block: state, values: {slope: 0, intercept: 0} -->

<!-- block: plot, spec: scatter_with_fit, params: {slope: 0, intercept: 0}, binds: [slope, intercept], anchor: slr-scatter, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "A line through the cloud" -->

# Simple linear regression

Correlation tells you *that* two variables move together. Regression goes one step further: it draws the line that lets you **predict** one from the other. Given $x$, what should you expect $y$ to be? One predictor, one outcome, one straight line — and every fancier model in this family is a variation on it.

The points on the right are fixed data. The line is yours to place.

---

<!-- block: gear, n: 2, label: "Slope, intercept, residuals" -->

The model is $\hat{y} = \beta_0 + \beta_1 x$. The **intercept** $\beta_0$ is the predicted $y$ when $x = 0$; the **slope** $\beta_1$ is the rate — how much $\hat{y}$ moves per unit of $x$. For each data point, the gap between the actual $y$ and the line's prediction $\hat{y}$ is a **residual**. A good line makes those residuals small.

But small *how*? You could minimize their absolute sizes, or their squares, or their worst case — each gives a different line. The standard choice squares them.

---

<!-- block: gear, n: 3, label: "Find the best line by hand" -->

Drag the slope and intercept until the line threads the cloud — until the points sit as close to it as you can get them, above and below in balance.

<!-- block: state_reset, anchor: slr-feel -->

<!-- block: playground, anchor: slr-feel -->
binds: [slope, intercept]
controls:
  - param: slope
    label: "Slope (β₁)"
    min: -1
    max: 2
    step: 0.05
  - param: intercept
    label: "Intercept (β₀)"
    min: -2
    max: 2
    step: 0.05
goal:
  prompt: "Thread the line through the cloud — find the slope and intercept that minimize the residuals."
  target: { slope: 0.7, intercept: 0.3 }
  success_when: "abs(slope - 0.7) < 0.1 and abs(intercept - 0.3) < 0.15"
  on_success: |
    That's essentially the least-squares fit. You balanced the points above and
    below the line — which is exactly what minimizing the *sum of squared
    residuals* does, just by eye. The line you found also passes through the
    mean point $(\bar{x}, \bar{y})$; every least-squares line does.
<!-- /block -->

---

<!-- layer: formal -->

<!-- block: gear, n: 4, label: "Ordinary least squares" -->

Ordinary least squares (OLS) chooses $\beta_0, \beta_1$ to minimize the sum of squared residuals $\sum_i (y_i - \beta_0 - \beta_1 x_i)^2$. Setting the derivatives to zero gives a clean closed form:

$$\hat{\beta}_1 = r \, \frac{s_y}{s_x}, \qquad \hat{\beta}_0 = \bar{y} - \hat{\beta}_1 \bar{x}$$

The slope is the **correlation** $r$ rescaled by the ratio of spreads — the direct link back to the previous topic. And because of the intercept formula, the line always passes through $(\bar{x}, \bar{y})$.

Why *squared* errors? Squaring makes the objective smooth and gives this unique closed-form solution; it also corresponds to maximum likelihood when the noise is normal. Minimizing *absolute* errors gives the median-like, outlier-resistant fit — sometimes what you want, but with no tidy formula and not unique.

<!-- block: derivation, title: "Where β̂₁ = r·(s_y/s_x) comes from", collapsed: true -->
Minimizing $\sum_i (y_i - \beta_0 - \beta_1 x_i)^2$, take $\partial/\partial\beta_0 = 0$ first: it forces $\beta_0 = \bar{y} - \beta_1\bar{x}$ (the line goes through the means). Substitute back and take $\partial/\partial\beta_1 = 0$:

$$\hat{\beta}_1 = \frac{\sum_i (x_i - \bar{x})(y_i - \bar{y})}{\sum_i (x_i - \bar{x})^2} = \frac{\text{Cov}(x, y)}{\text{Var}(x)} = r\,\frac{s_y}{s_x}.$$

The middle form is covariance over variance; the right form rewrites it with the correlation $r = \text{Cov}/(s_x s_y)$.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Fit it in code" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: slr-sim -->
```python
import numpy as np

# Data generated from y = 0.7x + 0.3 + noise (the same cloud you fit by hand).
# Recover the slope and intercept by least squares and confirm the formulas.
rng = np.random.default_rng(0)
x = rng.uniform(-3, 3, 200)
y = 0.7 * x + 0.3 + rng.normal(0, 0.75, x.size)

# Closed form: slope = cov(x,y)/var(x), intercept through the means.
slope = np.cov(x, y, bias=True)[0, 1] / np.var(x)
intercept = y.mean() - slope * x.mean()
r = np.corrcoef(x, y)[0, 1]
print(f"slope     = {slope:.3f}   (true 0.7)")
print(f"intercept = {intercept:.3f}   (true 0.3)")
print(f"check: r * (sy/sx) = {r * y.std() / x.std():.3f}  == slope")
```

---

<!-- block: misconception, inline: true -->
**"A line that fits the data can be trusted outside the data's range."**

*Wrong:* the regression line is valid everywhere, so plug in any $x$ and read off the prediction.

*Correct:* the line is only evidence about the range of $x$ you actually observed. **Extrapolating** beyond it assumes the linear relationship keeps holding where you have no data — a leap that has launched countless bad forecasts. A fit that's excellent from $x = 0$ to $10$ says nothing reliable about $x = 100$.
<!-- /block -->

---

<!-- layer: both -->

<!-- block: gear, n: 6, label: "Where it leads" -->

<!-- block: callout, kind: insight -->
**Where this leads.** Its slope is built from [**correlation**](/topic/correlation). Add more predictors and it becomes **multiple regression**; swap the straight line for an S-curve and it's **logistic regression** for yes/no outcomes. Checking whether the fit can be trusted — residual plots, leverage — is **model diagnostics**.
<!-- /block -->
