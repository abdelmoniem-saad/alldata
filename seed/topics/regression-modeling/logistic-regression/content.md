<!-- block: state, values: {beta0: 0, beta1: 1} -->

<!-- block: plot, spec: logistic_curve, params: {beta0: 0, beta1: 1}, binds: [beta0, beta1], anchor: lr-curve, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "Predicting yes or no" -->

# Logistic regression

Will this email get clicked? Will this loan default? The outcome is binary — 0 or 1 — and a straight line is the wrong tool: it shoots below 0 and above 1, predicting "probabilities" that don't exist. **Logistic regression** bends the line into an S-curve pinned between 0 and 1, turning a linear score into an honest probability.

---

<!-- block: gear, n: 2, label: "The S-curve" -->

Logistic regression feeds a familiar linear combination $\beta_0 + \beta_1 x$ through the **logistic (sigmoid)** function $\sigma(z) = 1/(1 + e^{-z})$, which squashes any number into $(0, 1)$. The curve on the right is that probability. $\beta_1$ sets how steeply it rises (the strength of the effect); $\beta_0$ shifts it left or right. Where the curve crosses $0.5$ — at $x = -\beta_0/\beta_1$ — is the **decision boundary**: below it you'd predict 0, above it 1.

---

<!-- block: gear, n: 3, label: "Fit the S-curve by hand" -->

The dots are 0/1 outcomes. Drag the coefficients so the curve rises through them — low where the 0s pile up, high where the 1s do.

<!-- block: state_reset, anchor: lr-feel -->

<!-- block: playground, anchor: lr-feel -->
binds: [beta0, beta1]
controls:
  - param: beta0
    label: "Intercept (β₀)"
    min: -4
    max: 4
    step: 0.1
  - param: beta1
    label: "Slope (β₁)"
    min: 0
    max: 3
    step: 0.1
goal:
  prompt: "Thread the S-curve through the cloud — find the β₀ and β₁ that put the rise where the 0s give way to the 1s."
  target: { beta0: -0.5, beta1: 1.3 }
  success_when: "abs(beta0 + 0.5) < 0.4 and abs(beta1 - 1.3) < 0.4"
  on_success: |
    That's close to the maximum-likelihood fit. The curve threads the 0s
    (bottom) and 1s (top), and its $0.5$ crossing — the decision boundary — sits
    where the classes change over. Logistic regression finds these $\beta$'s by
    maximizing the likelihood of the observed labels.
<!-- /block -->

---

<!-- layer: formal -->

<!-- block: gear, n: 4, label: "Log-odds, odds ratios, and MLE" -->

The model is linear not in the probability but in the **log-odds**:

$$\ln\!\frac{p}{1-p} = \beta_0 + \beta_1 x \quad\Longleftrightarrow\quad p = \sigma(\beta_0 + \beta_1 x).$$

That makes the coefficients interpretable as **odds ratios**: a one-unit rise in $x$ multiplies the odds by $e^{\beta_1}$. There's no closed-form fit — unlike OLS, you maximize the [**likelihood**](/topic/likelihood) (the product of predicted probabilities of the actual labels) numerically. Logistic regression is a maximum-likelihood method through and through.

<!-- block: derivation, title: "Why the log-odds are linear", collapsed: true -->
Start from $p = \sigma(\beta_0 + \beta_1 x) = 1/(1 + e^{-(\beta_0 + \beta_1 x)})$. Then $1 - p = e^{-(\beta_0 + \beta_1 x)}/(1 + e^{-(\beta_0 + \beta_1 x)})$, so the odds are $p/(1-p) = e^{\beta_0 + \beta_1 x}$, and taking logs gives $\ln(p/(1-p)) = \beta_0 + \beta_1 x$. A plain linear model — on the log-odds scale.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Fit by maximizing likelihood" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: lr-sim -->
```python
import numpy as np

rng = np.random.default_rng(0)
# True model: log-odds = -0.5 + 1.3 x. Generate labels, then recover beta by
# gradient ascent on the log-likelihood — no library needed.
x = rng.uniform(-6, 6, 400)
p = 1 / (1 + np.exp(-(-0.5 + 1.3 * x)))
yb = (rng.random(400) < p).astype(float)

b0, b1, lr = 0.0, 0.0, 0.02
for _ in range(4000):
    pred = 1 / (1 + np.exp(-(b0 + b1 * x)))
    b0 += lr * np.mean(yb - pred)
    b1 += lr * np.mean((yb - pred) * x)
print(f"recovered beta0 = {b0:+.2f} (true -0.5),  beta1 = {b1:+.2f} (true 1.3)")
```

Gradient ascent on the log-likelihood walks the coefficients to the truth — maximum likelihood in action, no closed form required.

---

<!-- block: misconception, inline: true -->
**"Logistic regression outputs a class (0 or 1)."**

*Wrong:* it's a classifier, so it returns the predicted label.

*Correct:* it outputs a **probability** between 0 and 1. Turning that into a class requires choosing a **threshold** — 0.5 by default, but you'd raise it to guard against false positives or lower it to catch more positives. The probability is the valuable part: it carries the model's confidence. Collapsing straight to a label throws that away and bakes in an arbitrary cutoff.
<!-- /block -->

---

<!-- layer: both -->

<!-- block: gear, n: 6, label: "Where it leads" -->

<!-- block: callout, kind: insight -->
**Where this leads.** Logistic regression is [**multiple regression**](/topic/multiple-regression) for a binary outcome, fit by [**maximum likelihood**](/topic/maximum-likelihood-estimation) instead of least squares. It's the building block of classification: add predictors freely, restrain them with [**regularization**](/topic/regularization), judge it out-of-sample with **cross-validation**. Swap the link function and it generalizes to counts and beyond — the generalized linear model family.
<!-- /block -->
