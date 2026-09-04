<!-- block: state, values: {complexity: 1} -->

<!-- block: plot, spec: cv_error_curve, params: {complexity: 1}, binds: [complexity], anchor: cv-curve, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "The optimism of training error" -->

# Cross-validation

A model graded on the very data it learned from flatters itself, it has already seen the answers. That training error is an *optimistic* estimate of how the model will do in the wild. Cross-validation fixes this the obvious way: hold some data out of training, and grade the model on what it hasn't seen.

---

<!-- block: gear, n: 2, label: "k-fold, and the U-curve" -->

**k-fold cross-validation**: split the data into $k$ equal folds; train on $k-1$ of them and measure error on the held-out fold; rotate so each fold is the validation set once; average the $k$ errors. Plot that against model complexity and you get the picture on the right, **training error falls forever**, but **validation error is U-shaped**: too simple underfits, too complex overfits. The gap between the two curves *is* overfitting, made visible.

---

<!-- block: gear, n: 3, label: "Find the sweet spot" -->

Slide complexity to the bottom of the validation curve, the dot, not to where training error is lowest.

<!-- block: decision, anchor: cv-trap -->
question: |
  The validation curve bottoms out at complexity 4, but training error
  keeps falling all the way to 15. A teammate ships complexity 15
  "because it fits best." What did they ignore?
options:
  - id: a
    label: "Nothing: lowest training error is the right criterion"
    writes: { complexity: 15 }
    response: |
      Look at the gap between the two curves at 15: it's the widest on
      screen. That gap is memorized noise, error the model will
      definitely pay on data it hasn't seen. Training error is the one
      number on this chart that flatters you by construction.
  - id: b
    label: "The validation U: past the bottom, held-out error climbs"
    writes: { complexity: 4 }
    response: |
      Right. The held-out folds are the only honest rehearsal for new
      data, and their curve says complexity 15 is worse than 4: the
      model has started fitting fold-specific noise that won't
      reproduce. Ship at the bottom of the validation curve, not the
      bottom of the training curve. They only coincide when the model
      is too simple to overfit.
  - id: c
    label: "The noise floor: no model can go below it anyway"
    writes: { complexity: 9 }
    response: |
      The irreducible-noise floor is real, but it doesn't choose your
      complexity, both curves sit above it everywhere and only the
      *validation* curve tells you which point above it is closest.
      Picking 9 because "it's near the floor" ignores the actual
      ranking the held-out errors provide.
correct: b
<!-- /block -->

<!-- block: state_reset, anchor: cv-feel -->

<!-- block: playground, anchor: cv-feel -->
binds: [complexity]
controls:
  - param: complexity
    label: "Model complexity"
    min: 1
    max: 15
    step: 1
goal:
  prompt: "Land on the complexity that minimizes *validation* error, the marked dot at the bottom of the U, not the far right where training error is lowest."
  target: { complexity: 4 }
  success_when: "complexity >= 3 and complexity <= 6"
  on_success: |
    That's the sweet spot, the most complex model that still generalizes. Push
    further right and training error keeps dropping while validation error
    *climbs*: the model is now fitting noise. Cross-validation is what tells the
    two apart.
<!-- /block -->

---

<!-- layer: formal -->

<!-- block: gear, n: 4, label: "Choosing k, and the one rule" -->

Common choices: **5- or 10-fold** (a good cost/accuracy balance), or **leave-one-out** (LOOCV, $k = n$, nearly unbiased but high-variance and expensive). Smaller $k$ means each training set is smaller, nudging the estimate pessimistic; larger $k$ costs more compute and makes the folds correlated.

The cardinal rule: the **test set is touched exactly once**, at the very end. Anything you choose, features, polynomial degree, the penalty $\lambda$, must be chosen by cross-validation *within the training data*. The moment you tune on the test set, it stops estimating future performance. When you're both tuning *and* reporting, you need **nested** cross-validation.

<!-- block: derivation, title: "Why training error is biased downward", collapsed: true -->
The fitted model minimizes error *on the training set*, so it has adapted to that set's particular noise as well as its signal. Evaluated on the same points, it gets credit for fitting noise it can't reproduce on fresh data, so training error systematically under-estimates true error, and the gap widens as the model grows more flexible. Held-out data removes the credit for memorized noise.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Select a model by CV" -->

<!-- block: code_python, editable: true, auto_run: true, anchor: cv-code, layer: both, pair_id: cv-code -->
```python
import numpy as np
rng = np.random.default_rng(0)

# Truth is quadratic. Fit polynomials of rising degree; 5-fold CV picks the degree.
x = np.sort(rng.uniform(-3, 3, 120))
y = 0.5 * x**2 - x + 1 + rng.normal(0, 2, 120)

def cv_mse(deg, k=5):
    idx = rng.permutation(len(x))
    folds = np.array_split(idx, k)
    errs = []
    for i in range(k):
        te = folds[i]
        tr = np.concatenate([folds[j] for j in range(k) if j != i])
        coef = np.polyfit(x[tr], y[tr], deg)
        errs.append(np.mean((np.polyval(coef, x[te]) - y[te])**2))
    return np.mean(errs)

for deg in [1, 2, 3, 5, 9, 13]:
    train = np.mean((np.polyval(np.polyfit(x, y, deg), x) - y)**2)
    print(f"degree {deg:>2}:  train MSE = {train:5.2f}   CV MSE = {cv_mse(deg):5.2f}")
```

<!-- block: code_r, pair_id: cv-code, editable: true, layer: both -->
```r
set.seed(0)

# Truth is quadratic. Fit polynomials of rising degree; 5-fold CV picks the degree.
x <- sort(runif(120, -3, 3))
y <- 0.5 * x^2 - x + 1 + rnorm(120, 0, 2)

polypred <- function(xtr, ytr, xte, deg) {
  Xtr <- outer(xtr, 0:deg, "^"); Xte <- outer(xte, 0:deg, "^")
  as.vector(Xte %*% qr.solve(Xtr, ytr))
}
cv_mse <- function(deg, k = 5) {
  idx <- sample(length(x))
  folds <- split(idx, cut(seq_along(idx), k, labels = FALSE))
  errs <- numeric(k)
  for (i in seq_len(k)) {
    te <- folds[[i]]; tr <- setdiff(idx, te)
    errs[i] <- mean((polypred(x[tr], y[tr], x[te], deg) - y[te])^2)
  }
  mean(errs)
}
for (deg in c(1, 2, 3, 5, 9, 13)) {
  train <- mean((polypred(x, y, x, deg) - y)^2)
  cat(sprintf("degree %2d:  train MSE = %5.2f   CV MSE = %5.2f\n", deg, train, cv_mse(deg)))
}
```

Training error keeps falling as the degree climbs; CV error bottoms out at degree 2, the true shape, then rises as higher degrees start chasing noise.

---

<!-- block: misconception, inline: true -->
**"You can use the test set to pick your model."**

*Wrong:* try models on the test set and keep the best one.

*Correct:* the instant you choose *anything*, features, degree, $\lambda$, using the test set, it is no longer an unbiased estimate of future performance; you've fit to it. Use cross-validation on the training data for every choice, and lock the test set away until the final report. This "test-set leakage" is the single most common reason an impressive result fails to replicate in production.
<!-- /block -->

---

<!-- layer: both -->

<!-- block: gear, n: 6, label: "Where it leads" -->

<!-- block: callout, kind: insight -->
**Where this leads.** Cross-validation estimates out-of-sample error for *any* model, it's how the penalty $\lambda$ in [**regularization**](/topic/regularization) gets chosen, and how you'd compare a [**linear**](/topic/simple-linear-regression) fit to a [**logistic**](/topic/logistic-regression) one. The U-curve it traces is the [**bias-variance tradeoff**](/topic/bias-variance-tradeoff) seen from the outside.
<!-- /block -->
