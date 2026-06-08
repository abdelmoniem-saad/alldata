<!-- block: state, values: {lambda: 0, penalty: "lasso"} -->

<!-- block: plot, spec: coefficient_path, params: {lambda: 0, penalty: "lasso"}, binds: [lambda, penalty], anchor: reg-path, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "When the fit is too eager" -->

# Regularization

Give regression many predictors — especially correlated or noisy ones — and it overfits: huge coefficients that nail the training data and flail on new data. **Regularization** fights back by adding a penalty for large coefficients, deliberately shrinking them. You sacrifice a little fit on the data you *have* to gain a lot of stability on the data you *don't*.

---

<!-- block: gear, n: 2, label: "Two penalties, two behaviors" -->

**Ridge** (L2) penalizes the sum of *squared* coefficients; **lasso** (L1) penalizes the sum of their *absolute values*. The strength is a knob $\lambda$: at $\lambda = 0$ you're back to ordinary least squares; as $\lambda$ grows, the coefficients shrink. The crucial difference — watch the paths — is that ridge shrinks everything smoothly toward zero but never quite reaches it, while lasso drives coefficients to *exactly* zero one at a time, automatically selecting features by discarding the rest.

---

<!-- block: gear, n: 3, label: "Turn up the penalty" -->

Raise $\lambda$ and watch the coefficient paths shrink. Under lasso they snap to exactly zero, one by one.

<!-- block: state_reset, anchor: reg-feel -->

<!-- block: playground, anchor: reg-feel -->
binds: [lambda]
controls:
  - param: lambda
    label: "Penalty strength (λ)"
    min: 0
    max: 2.5
    step: 0.05
goal:
  prompt: "Push λ up until lasso has zeroed out the two weakest predictors — leaving only the two strongest standing."
  target: { lambda: 0.7 }
  success_when: "lambda >= 0.6"
  on_success: |
    Under lasso the two smallest coefficients have hit *exactly* zero — the
    model has **selected** the two strong predictors and dropped the weak ones.
    Ridge would have shrunk all four but kept every one of them nonzero. That
    automatic feature selection is lasso's signature.
<!-- /block -->

---

<!-- layer: formal -->

<!-- block: gear, n: 4, label: "The penalized objective" -->

Both methods minimize the residual sum of squares *plus* a penalty:

$$\text{ridge: } \lVert y - X\beta \rVert^2 + \lambda \sum_j \beta_j^2, \qquad \text{lasso: } \lVert y - X\beta \rVert^2 + \lambda \sum_j |\beta_j|.$$

Ridge has a closed form, $\hat{\beta} = (X^{\top}X + \lambda I)^{-1}X^{\top}y$ — the $+\lambda I$ also cures the instability from collinearity. Lasso has none; its absolute-value penalty has a corner at zero that pushes coefficients exactly onto it, hence sparsity. Two practical rules: **standardize** the predictors first (the penalty is scale-sensitive), and choose $\lambda$ by **cross-validation**, never by eye.

<!-- block: derivation, title: "Why lasso zeros coefficients but ridge doesn't", collapsed: true -->
Picture each penalty as a constraint region the coefficients must stay inside. Lasso's $|\beta_1| + |\beta_2| \le t$ is a diamond with sharp corners *on the axes*; ridge's $\beta_1^2 + \beta_2^2 \le t$ is a smooth circle. The loss contours expand until they first touch the region — and they're far likelier to strike a *corner* (where a coefficient is exactly zero) than a smooth arc. Squared penalties have no corners, so ridge shrinks without ever zeroing.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Bias for variance, measured" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: reg-sim -->
```python
import numpy as np

rng = np.random.default_rng(0)
# 30 predictors, only 3 truly matter; 40 training rows -> OLS overfits badly.
n, p = 40, 30
Xtr = rng.standard_normal((n, p)); beta = np.zeros(p); beta[:3] = [2.0, -1.5, 1.0]
ytr = Xtr @ beta + rng.normal(0, 1, n)
Xte = rng.standard_normal((500, p)); yte = Xte @ beta + rng.normal(0, 1, 500)

test_err = lambda B: np.mean((Xte @ B - yte) ** 2)
ols = np.linalg.lstsq(Xtr, ytr, rcond=None)[0]
ridge = np.linalg.solve(Xtr.T @ Xtr + 5 * np.eye(p), Xtr.T @ ytr)
print(f"OLS   test MSE = {test_err(ols):.2f}")
print(f"Ridge test MSE = {test_err(ridge):.2f}   (lambda=5 — shrinkage wins on new data)")
```

OLS fits the 40 rows too eagerly and generalizes badly; ridge's shrinkage roughly halves the test error — bias traded for variance.

---

<!-- block: misconception, inline: true -->
**"Regularization just makes the model worse — you're deliberately worsening the fit."**

*Wrong:* adding bias can only hurt.

*Correct:* it worsens the fit *on the training data* on purpose, to improve predictions on *new* data. Unregularized models with many predictors overfit — they memorize noise. A little shrinkage trades a small rise in bias for a large drop in variance, and the net test error falls. The goal was never to fit the sample; it's to predict the population.
<!-- /block -->

---

<!-- layer: both -->

<!-- block: gear, n: 6, label: "Where it leads" -->

<!-- block: callout, kind: insight -->
**Where this leads.** Regularization keeps [**multiple regression**](/topic/multiple-regression) and [**logistic regression**](/topic/logistic-regression) honest when predictors are many or collinear; the bias-it-buys against the variance-it-saves *is* the **bias-variance tradeoff** made tunable, and $\lambda$ is chosen by **cross-validation**. Lasso's sparsity makes it a feature-selection tool; ridge and lasso combine as the elastic net.
<!-- /block -->
