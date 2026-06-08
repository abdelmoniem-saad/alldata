<!-- block: state, values: {controlled: 0} -->

<!-- block: plot, spec: added_variable_plot, params: {controlled: 0}, binds: [controlled], anchor: mr-avp, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "More than one cause" -->

# Multiple linear regression

Simple regression draws a line from one predictor to an outcome. But outcomes rarely have a single cause: a house price depends on size *and* location *and* age. Multiple regression fits them all at once,

$$\hat{y} = \beta_0 + \beta_1 x_1 + \cdots + \beta_p x_p,$$

and each coefficient answers a sharper question than you might expect.

---

<!-- block: gear, n: 2, label: "Holding everything else constant" -->

Each $\beta_j$ is the effect of $x_j$ **with all the other predictors held fixed** — the slope you'd see if you could move $x_j$ alone. That conditioning is the whole point, and it's why a coefficient can *flip sign* versus simple regression: a predictor that looks helpful on its own may reverse once you control for a confounder it was secretly standing in for.

---

<!-- block: gear, n: 3, label: "Watch a coefficient flip" -->

The scatter shows $y$ against $x_1$, ignoring a lurking confounder $x_2$ that's tangled up with both.

<!-- block: decision, anchor: mr-flip -->
question: |
  The cloud of $y$ against $x_1$ slopes clearly *upward* — the marginal slope is
  positive. But $x_1$ is entangled with a confounder $x_2$ you haven't accounted
  for. What happens to $x_1$'s effect once you control for $x_2$?
options:
  - id: same
    label: "Stays positive — controlling for x₂ won't change much"
    writes: { controlled: 0 }
    response: |
      Not here. $x_1$ only looked helpful because it was riding along with
      $x_2$, the real driver. The positive marginal slope is borrowed from
      $x_2$ — strip it away and $x_1$'s own contribution is something else
      entirely.
  - id: flips
    label: "It can reverse — show me the partial relationship"
    writes: { controlled: 1 }
    response: |
      Exactly — watch the cloud become the added-variable plot and the slope
      flip *negative*. With $x_2$ held constant, $x_1$'s true partial effect
      (about $-1$ here) emerges. The positive marginal slope was an artifact of
      confounding.
  - id: zero
    label: "It drops to exactly zero"
    writes: { controlled: 1 }
    response: |
      Close — controlling for $x_2$ does change it dramatically, but not to
      zero. The added-variable plot reveals a genuine *negative* partial slope,
      not a null one.
correct: flips
<!-- /block -->

<!-- block: callout, kind: insight, depends_on: mr-flip, branch: flips -->
This is the **added-variable plot**: $y$ and $x_1$ each stripped of what $x_2$ explains. Its slope is exactly $x_1$'s multiple-regression coefficient. The lesson — a coefficient is only interpretable *alongside the others in the model*. Change the set of predictors and you change what every coefficient means.
<!-- /block -->

---

<!-- layer: formal -->

<!-- block: gear, n: 4, label: "The model in matrix form" -->

Stack the predictors into a matrix $X$ (a column per predictor, plus a column of 1s for the intercept). The model is $y = X\beta + \varepsilon$, and OLS minimizes $\lVert y - X\beta \rVert^2$ with the closed form

$$\hat{\beta} = (X^{\top}X)^{-1} X^{\top} y.$$

Each $\hat{\beta}_j$ is the partial effect of predictor $j$. Two cautions: predictors that are highly correlated (**multicollinearity**) make $X^{\top}X$ nearly singular, so coefficients become unstable and their signs untrustworthy; and a coefficient is *causal* only if the model already includes every relevant confounder — regression controls for what you give it, nothing more.

<!-- block: derivation, title: "Why β̂ = (XᵀX)⁻¹Xᵀy", collapsed: true -->
Minimize $S(\beta) = (y - X\beta)^{\top}(y - X\beta)$. The gradient is $\partial S/\partial\beta = -2X^{\top}(y - X\beta)$; setting it to zero gives the **normal equations** $X^{\top}X\beta = X^{\top}y$, so $\hat{\beta} = (X^{\top}X)^{-1}X^{\top}y$ whenever $X^{\top}X$ is invertible. The added-variable plot is the one-coefficient-at-a-time view of this (the Frisch–Waugh–Lovell theorem).
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Fit it, and see the flip" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: mr-sim -->
```python
import numpy as np

rng = np.random.default_rng(0)
# x2 confounds: it drives both x1 and y. x1's TRUE effect on y is -1.
x2 = rng.uniform(-2, 2, 200)
x1 = x2 + 0.7 * rng.standard_normal(200)
y = -1.0 * x1 + 3.0 * x2 + 0.6 * rng.standard_normal(200)

# Simple regression of y on x1 alone (confounded):
b_simple = np.polyfit(x1, y, 1)[0]
# Multiple regression y ~ x1 + x2 via the normal equations:
X = np.column_stack([np.ones_like(x1), x1, x2])
beta = np.linalg.solve(X.T @ X, X.T @ y)
print(f"simple slope on x1  = {b_simple:+.2f}   (confounded)")
print(f"multiple coef on x1 = {beta[1]:+.2f}   (true -1.0),   on x2 = {beta[2]:+.2f} (true 3.0)")
```

The simple slope is positive; controlling for $x_2$ recovers $x_1$'s true negative effect.

---

<!-- block: misconception, inline: true -->
**"Adding more predictors always makes the model better."**

*Wrong:* more variables, more accuracy.

*Correct:* adding a predictor *never increases* training error and usually nudges $R^2$ up — even if the predictor is pure noise. That's the trap. Irrelevant predictors add variance, inflate standard errors, and hurt predictions on new data (overfitting); correlated ones destabilize each other's coefficients. More predictors is a cost-benefit decision judged by *out-of-sample* performance, not in-sample fit.
<!-- /block -->

---

<!-- layer: both -->

<!-- block: gear, n: 6, label: "Where it leads" -->

<!-- block: callout, kind: insight -->
**Where this leads.** Multiple regression generalizes [**simple linear regression**](/topic/simple-linear-regression) to many predictors. Checking its assumptions is [**model diagnostics**](/topic/model-diagnostics); swapping the line for an S-curve to predict a yes/no outcome is [**logistic regression**](/topic/logistic-regression); taming too many or collinear predictors is what [**regularization**](/topic/regularization) is for. And out-of-sample honesty comes from **cross-validation**.
<!-- /block -->
