<!-- block: state, values: {complexity: 1} -->

<!-- block: plot, spec: bias_variance_curve, params: {complexity: 1}, binds: [complexity], anchor: bv-curve, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "Three sources of error" -->

# Bias-variance tradeoff

Why a model misses splits into three parts. **Bias**: it's too simple to capture the real pattern, wrong on average. **Variance**: it's so flexible it swings wildly with the particular training sample it saw. **Irreducible noise**: randomness no model can ever explain. You can trade bias against variance, but you can't drive both to zero.

---

<!-- block: gear, n: 2, label: "The U-shaped total" -->

The picture decomposes error against model complexity. A simple model has **high bias, low variance** (it underfits, confidently wrong). A complex model has **low bias, high variance** (it overfits, it memorizes this sample and flails on the next). Bias² falls and variance rises, so their sum plus the noise floor is **U-shaped**. The bottom of that U is the model you want: as flexible as the data supports, no more.

---

<!-- block: gear, n: 3, label: "Slide to the bottom" -->

Move complexity to minimize total error, the marked dot, where falling bias and rising variance balance.

<!-- block: decision, anchor: bv-diagnose -->
question: |
  A model posts near-zero error on its training data and falls apart
  on new data. Where on the U-curve are you, and which direction do
  you move?
options:
  - id: a
    label: "Far left, high bias: add flexibility"
    writes: { complexity: 1 }
    response: |
      That's the *opposite* disease. At complexity 1 the model is stiff,
      it misses on the training set too. Your model aced the training
      set, which at the far left never happens: bias means it can't even
      fit what it saw.
  - id: b
    label: "Far right, high variance: pull complexity back"
    writes: { complexity: 15 }
    response: |
      Right, and the curve's right arm is your biography: total error
      climbing while the model chases sample-specific noise. Memorizing
      the training set is the variance signature. The fix walks left
      toward the bottom of the U, simplifying until new-data error
      stops improving.
  - id: c
    label: "At the bottom: the tradeoff is already optimal"
    writes: { complexity: 4 }
    response: |
      The bottom of the U is where training error is *higher* than it
      could be, some training error is deliberately left on the table.
      Near-zero training error plus bad new-data error is the exact
      opposite shape of the sweet spot; you're diagnosing the right
      symptom from the wrong position.
correct: b
<!-- /block -->

<!-- block: state_reset, anchor: bv-feel -->

<!-- block: playground, anchor: bv-feel -->
binds: [complexity]
controls:
  - param: complexity
    label: "Model complexity"
    min: 1
    max: 15
    step: 1
goal:
  prompt: "Find the complexity that minimizes total error, the bottom of the U, where bias² and variance trade off."
  target: { complexity: 4 }
  success_when: "complexity >= 3 and complexity <= 6"
  on_success: |
    That's the balance point. To its left, bias dominates, the model is too
    stiff. To its right, variance takes over, the model chases noise. Notice
    total error never drops below the irreducible-noise floor: no amount of
    cleverness beats randomness.
<!-- /block -->

---

<!-- layer: formal -->

<!-- block: gear, n: 4, label: "The decomposition" -->

For a prediction $\hat{f}(x)$ of a target $y = f(x) + \varepsilon$ with noise variance $\sigma^2$, expected squared error splits exactly:

$$\mathbb{E}\big[(y - \hat{f}(x))^2\big] = \underbrace{(f(x) - \mathbb{E}[\hat{f}(x)])^2}_{\text{bias}^2} + \underbrace{\mathbb{E}\big[(\hat{f}(x) - \mathbb{E}[\hat{f}(x)])^2\big]}_{\text{variance}} + \underbrace{\sigma^2}_{\text{irreducible}}.$$

Every knob is a point on this curve: $k$ in k-nearest-neighbors (large $k$ = high bias, $k=1$ = high variance), polynomial degree, tree depth, the penalty $\lambda$ (more shrinkage trades variance for bias). The $\sigma^2$ floor is the part no model beats.

<!-- block: derivation, title: "Where the three terms come from", collapsed: true -->
Write $y = f + \varepsilon$ with $\mathbb{E}[\varepsilon] = 0$, $\text{Var}(\varepsilon) = \sigma^2$. Add and subtract $\mathbb{E}[\hat{f}]$ inside $(y - \hat{f})^2$ and take expectations. The cross terms vanish because $\varepsilon$ is independent of $\hat{f}$ and $\hat{f} - \mathbb{E}[\hat{f}]$ has mean zero. What remains is $(f - \mathbb{E}[\hat{f}])^2 + \mathbb{E}[(\hat{f} - \mathbb{E}[\hat{f}])^2] + \sigma^2$, bias², variance, and noise.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Watch bias fall and variance rise" -->

<!-- block: code_python, editable: true, auto_run: true, anchor: bv-code, layer: both, pair_id: bv-code -->
```python
import numpy as np
rng = np.random.default_rng(0)

# Truth is a smooth sine. Fit polynomials of rising degree on many resampled
# training sets, then measure bias^2 and variance of the prediction at x0 = 2.
f = lambda x: np.sin(x)
x0, truth = 2.0, np.sin(2.0)

for deg in [1, 3, 9]:
    preds = []
    for _ in range(300):
        x = rng.uniform(0, 2*np.pi, 30)
        y = f(x) + rng.normal(0, 0.3, 30)
        preds.append(np.polyval(np.polyfit(x, y, deg), x0))
    preds = np.array(preds)
    bias2 = (preds.mean() - truth)**2
    var = preds.var()
    print(f"degree {deg}:  bias^2 = {bias2:.3f}   variance = {var:.3f}")
```

<!-- block: code_r, pair_id: bv-code, editable: true, layer: both -->
```r
set.seed(0)

# Truth is a smooth sine. Fit polynomials of rising degree on many resampled
# training sets, then measure bias^2 and variance of the prediction at x0 = 2.
truth <- sin(2.0); x0 <- 2.0
polypred <- function(xtr, ytr, xte, deg) {
  Xtr <- outer(xtr, 0:deg, "^"); Xte <- outer(xte, 0:deg, "^")
  as.vector(Xte %*% qr.solve(Xtr, ytr))
}
for (deg in c(1, 3, 9)) {
  preds <- numeric(300)
  for (i in seq_len(300)) {
    x <- runif(30, 0, 2*pi)
    y <- sin(x) + rnorm(30, 0, 0.3)
    preds[i] <- polypred(x, y, x0, deg)
  }
  bias2 <- (mean(preds) - truth)^2
  v <- mean((preds - mean(preds))^2)
  cat(sprintf("degree %d:  bias^2 = %.3f   variance = %.3f\n", deg, bias2, v))
}
```

The straight line (degree 1) is badly biased but stable; degree 9 is nearly unbiased but its predictions swing all over the place. Bias down, variance up, the tradeoff in numbers.

---

<!-- block: misconception, inline: true -->
**"A more flexible model is always better."**

*Wrong:* more capacity means more accuracy.

*Correct:* flexibility cuts bias but *raises* variance, and past the sweet spot total error climbs as the model fits noise it can't reproduce. The best model is as simple as the data allows, not as complex as possible, Occam's razor, operationalized. "More powerful" is not "more accurate on data you haven't seen yet."
<!-- /block -->

---

<!-- layer: both -->

<!-- block: gear, n: 6, label: "Where it leads" -->

<!-- block: callout, kind: insight -->
**Where this leads.** The U you minimized here is exactly what [**cross-validation**](/topic/cross-validation) measures from the outside, and the variance half of it is the [**variance**](/topic/variance) concept applied to predictions. [**Regularization**](/topic/regularization) is a direct lever on the tradeoff via $\lambda$; ensembles exploit it too, bagging attacks variance, boosting attacks bias.
<!-- /block -->
