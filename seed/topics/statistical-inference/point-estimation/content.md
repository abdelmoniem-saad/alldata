<!-- block: state, values: {mu: 0, sigma: 1} -->

<!-- block: plot, spec: gaussian_pdf, params: {mu: 0, sigma: 1}, binds: [mu, sigma], anchor: pe-pdf, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "The spark" -->

# Point estimation

You have data. You have a parameter you want to know. The estimator is the rule that turns the data into a single number. The interesting question isn't "what's the rule?" — it's "how good is it?"

---

<!-- block: gear, n: 2, label: "Intuition" -->

## Two questions an estimator has to answer

For any estimator $\hat{\theta}$ of a parameter $\theta$:

- **Bias.** Does $\mathbb{E}[\hat{\theta}] = \theta$? If yes, the estimator is *unbiased* — on average, across many samples, it lands on the parameter.
- **Variance.** How much does $\hat{\theta}$ jump around between samples? Even an unbiased estimator can be useless if it's too noisy.

The sample mean $\bar{X}$ is an unbiased estimator of the population mean $\mu$. Its variance is $\sigma^2/n$. Doubling the data doesn't halve the variance — it cuts it in half *linearly*, but the *standard error* (the spread you actually see) drops as $1/\sqrt{n}$.

---

<!-- block: gear, n: 3, label: "The decision" -->

<!-- block: decision, anchor: pe-pick -->
question: |
  You have two estimators of a population mean. Estimator $A$ is unbiased
  with variance 4. Estimator $B$ has bias 0.5 (always estimates 0.5 high) but
  variance 1. Which is better?
options:
  - id: a
    label: "A — unbiased always wins."
    writes: { sigma: 2 }
    response: |
      Unbiasedness is a virtue, but not the only one. The mean squared error
      of A is $0^2 + 4 = 4$. The MSE of B is $0.5^2 + 1 = 1.25$. B has a
      systematic offset, but it's so much more *precise* that it's closer to
      the truth on average. Unbiasedness alone doesn't beat smaller MSE.
  - id: b
    label: "B — its MSE is 1.25, lower than A's 4."
    writes: { sigma: 1 }
    response: |
      Right. Mean squared error decomposes into $\text{bias}^2 + \text{variance}$.
      B trades a known bias for a much smaller variance and wins on the total.
      This is the **bias-variance tradeoff** in its simplest form: a slightly
      biased estimator can be *better* than an unbiased one if it's enough
      tighter.
  - id: c
    label: "It depends on the cost of being wrong."
    writes: { sigma: 1.5 }
    response: |
      True in spirit, but for the standard MSE loss the question has a clean
      answer. MSE penalizes squared error symmetrically, and B wins on MSE.
      For asymmetric loss functions (where over-estimating is much worse than
      under-estimating, say), the answer can flip — but that's a separate
      decision-theory question.
correct: b
<!-- /block -->

---

<!-- block: callout, kind: insight, depends_on: pe-pick, branch: b -->
The bias-variance decomposition is everywhere downstream. Regularized regression (ridge, lasso) deliberately introduces bias to cut variance — and the resulting estimator can dominate the unbiased least-squares fit when predictors are correlated or noisy. This is the same trade you just made in the toy problem.
<!-- /block -->

<!-- block: callout, kind: insight, depends_on: pe-pick, branch: a|c -->
The trap was over-weighting unbiasedness as a virtue. MSE = bias² + variance, and a small bias with much smaller variance beats unbiased + huge variance. This is the basic argument for shrinkage estimators, regularization, and most modern ML.
<!-- /block -->

---

<!-- layer: formal -->

<!-- block: gear, n: 4, label: "The formalism" -->

## Bias-variance decomposition

For estimator $\hat{\theta}$ of parameter $\theta$:

$$\text{MSE}(\hat{\theta}) = \mathbb{E}[(\hat{\theta} - \theta)^2] = \text{Var}(\hat{\theta}) + \text{Bias}(\hat{\theta})^2$$

where $\text{Bias}(\hat{\theta}) = \mathbb{E}[\hat{\theta}] - \theta$.

Two estimators that come up everywhere:

- **Method of moments.** Set sample moments equal to population moments and solve. Easy, often inefficient.
- **Maximum likelihood.** Pick $\hat{\theta}$ that maximizes $\prod_i f(x_i; \theta)$. Asymptotically optimal under regularity conditions (Cramér–Rao bound).

<!-- block: derivation, title: "Why MSE = bias² + variance", collapsed: true -->
Add and subtract $\mathbb{E}[\hat{\theta}]$ inside the square:

$$\mathbb{E}[(\hat{\theta} - \theta)^2] = \mathbb{E}[(\hat{\theta} - \mathbb{E}[\hat{\theta}] + \mathbb{E}[\hat{\theta}] - \theta)^2]$$

Expand:

$$= \mathbb{E}[(\hat{\theta} - \mathbb{E}[\hat{\theta}])^2] + 2 \, \mathbb{E}[(\hat{\theta} - \mathbb{E}[\hat{\theta}])(\mathbb{E}[\hat{\theta}] - \theta)] + (\mathbb{E}[\hat{\theta}] - \theta)^2$$

The first term is $\text{Var}(\hat{\theta})$. The middle term is zero because $\mathbb{E}[\hat{\theta}] - \theta$ is a constant and $\mathbb{E}[\hat{\theta} - \mathbb{E}[\hat{\theta}]] = 0$. The last term is $\text{Bias}^2$. The cross term *vanishes* — that's the structural fact that makes the decomposition clean.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Code" -->

<!-- block: dataset, name: heights, source: synthetic -->

<!-- block: simulation, editable: true, auto_run: true, anchor: pe-sim -->
```python
import numpy as np

# Two estimators on the same draws: A unbiased high-variance, B biased low-variance.
# Watch their MSE behavior over many simulated samples.
np.random.seed(42)
mu_true = 5
sigma = 2
n = 20

n_sims = 5000
estimates_A = []
estimates_B = []
for _ in range(n_sims):
    sample = np.random.normal(mu_true, sigma, n)
    estimates_A.append(sample.mean())                  # unbiased, var = σ²/n = 0.2
    estimates_B.append(sample.mean() * 0.9 + 0.5)      # biased toward 0.5 + 0.9μ, lower var

A = np.array(estimates_A)
B = np.array(estimates_B)

def mse(est, truth): return ((est - truth) ** 2).mean()
def bias(est, truth): return est.mean() - truth
def var(est): return est.var()

print(f"  bias    var     MSE     decomposition")
print(f"A: {bias(A, mu_true):+.4f}  {var(A):.4f}  {mse(A, mu_true):.4f}  ({bias(A,mu_true)**2 + var(A):.4f})")
print(f"B: {bias(B, mu_true):+.4f}  {var(B):.4f}  {mse(B, mu_true):.4f}  ({bias(B,mu_true)**2 + var(B):.4f})")
```

---

<!-- layer: both -->

<!-- block: gear, n: 6, label: "Connections" -->

<!-- block: callout, kind: insight -->
**Where this leads.** **Confidence intervals** quantify uncertainty around a point estimate. **Maximum likelihood estimation** is the most common general-purpose recipe for picking estimators. **The bias-variance tradeoff** in machine learning is the same decomposition; **regularization** trades bias for variance to lower MSE on out-of-sample data.
<!-- /block -->

---

<!-- block: misconception, inline: true -->
**"Unbiased estimators are always better."**

*Wrong:* if it's unbiased, use it.

*Correct:* unbiasedness is one virtue. Variance is another. The James–Stein estimator beats the sample mean (in $\ge 3$ dimensions) on MSE — by being biased. Ridge regression beats OLS on prediction error in many real settings — by being biased. The right metric is usually MSE (or out-of-sample loss), not unbiasedness.
<!-- /block -->
