<!-- block: state, values: {prior_a: 2, prior_b: 2, successes: 6, trials: 10} -->

<!-- block: plot, spec: beta_posterior, params: {prior_a: 2, prior_b: 2, successes: 6, trials: 10}, binds: [prior_a, prior_b, successes, trials], anchor: bayes-post, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "Beliefs, updated by data" -->

# Bayesian inference

Frequentist inference hands you a single best estimate. Bayesian inference hands you a whole *distribution* of belief — and a rule for updating it. Start with a **prior** (what you believed before), see data through the **likelihood**, and combine them into a **posterior** (what you believe now). Uncertainty is carried end to end, never collapsed to a lone point estimate.

---

<!-- block: gear, n: 2, label: "Prior × likelihood → posterior" -->

The picture shows all three for a coin's bias $p$: the **prior** (dashed), the **likelihood** from the data (dotted), and the **posterior** (solid) — which is just the prior and likelihood multiplied together and renormalized. The posterior always lands between them, pulled toward the data. Add observations and the likelihood sharpens; the posterior follows it, leaving the prior behind.

---

<!-- block: gear, n: 3, label: "Add data, watch belief sharpen" -->

Pour in evidence and watch the posterior spike. With little data the prior still visibly shapes the answer; with lots, the data take over.

<!-- block: state_reset, anchor: bayes-feel -->

<!-- block: playground, anchor: bayes-feel -->
binds: [successes, trials]
controls:
  - param: successes
    label: "Successes (k)"
    min: 0
    max: 40
    step: 1
  - param: trials
    label: "Trials (n)"
    min: 1
    max: 40
    step: 1
goal:
  prompt: "Pour in more data — raise the number of trials to 40 — and watch the posterior collapse to a narrow spike."
  target: { trials: 40 }
  success_when: "trials >= 40"
  on_success: |
    With 40 trials the posterior is a tight spike: the likelihood dominates and
    your starting prior barely registers. With weak data the prior still shapes
    the answer — that's the feature, not the bug. Any reasonable prior washes out
    once enough evidence arrives.
<!-- /block -->

---

<!-- layer: formal -->

<!-- block: gear, n: 4, label: "Bayes' theorem for parameters" -->

The posterior is proportional to prior times likelihood:

$$p(\theta \mid \text{data}) = \frac{p(\text{data} \mid \theta)\, p(\theta)}{p(\text{data})}, \qquad p(\text{data}) = \int p(\text{data} \mid \theta)\, p(\theta)\, d\theta.$$

For a proportion with a $\text{Beta}(a,b)$ prior and $k$ successes in $n$ trials, the algebra is clean: the posterior is $\text{Beta}(a+k,\, b+n-k)$. The Beta is **conjugate** to the binomial — same family in, same family out — so updating is just "add successes to $a$, failures to $b$." The posterior mean $(a+k)/(a+b+n)$ is a blend of prior and data that tilts toward the data as $n$ grows.

<!-- block: derivation, title: "Why Beta + binomial stays Beta", collapsed: true -->
The prior is $\propto p^{a-1}(1-p)^{b-1}$ and the likelihood is $\propto p^{k}(1-p)^{n-k}$. Multiply them: $p^{a+k-1}(1-p)^{b+n-k-1}$ — exactly the kernel of a $\text{Beta}(a+k,\, b+n-k)$. The normalizing constant is whatever makes it integrate to 1, so you never have to evaluate the integral $p(\text{data})$ at all.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Update two ways, agree once" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: bayes-sim -->
```python
import numpy as np

# Prior Beta(2,2); observe 6 of 10. Compute the posterior two ways.
a, b, k, n = 2, 2, 6, 10

# 1) Brute force on a grid: prior * likelihood, renormalized.
p = np.linspace(0, 1, 1001)
dp = p[1] - p[0]
post = p**(a-1) * (1-p)**(b-1) * p**k * (1-p)**(n-k)
post /= post.sum() * dp                       # renormalize to integrate to 1
grid_mean = (p * post).sum() * dp

# 2) Conjugacy: posterior is Beta(a+k, b+n-k); mean = (a+k)/(a+b+n).
print(f"grid posterior mean = {grid_mean:.4f}")
print(f"conjugate posterior = Beta({a+k},{b+n-k}), mean = {(a+k)/(a+b+n):.4f}")
print(f"prior mean {a/(a+b):.2f}  ->  data {k/n:.2f};  posterior sits between, nearer the data")
```

Both routes agree, and the posterior mean lands between the prior's $0.50$ and the data's $0.60$ — closer to the data.

---

<!-- block: misconception, inline: true -->
**"The prior is unscientific — it just biases the result toward what you wanted."**

*Wrong:* choosing a prior rigs the answer.

*Correct:* the prior is an explicit, auditable assumption — and as data accumulate the likelihood dominates and the posterior forgets it (you watched it spike). Frequentist methods make assumptions too — the model, the test, the sampling scheme — Bayesian inference just states one more, out in the open. With little data the prior matters and *should*: that's how you encode "extraordinary claims need extraordinary evidence." With plenty of data, any reasonable prior lands on the same posterior.
<!-- /block -->

---

<!-- layer: both -->

<!-- block: gear, n: 6, label: "Where it leads" -->

<!-- block: callout, kind: insight -->
**Where this leads.** Bayesian inference is [**Bayes' theorem**](/topic/bayes-theorem) applied to parameters, with the [**likelihood**](/topic/likelihood) as its engine; the posterior mode under a flat prior is the [**MLE**](/topic/maximum-likelihood-estimation). Conjugacy keeps simple models in closed form, but real models lean on **MCMC** to sample posteriors. And the posterior yields **credible intervals** — the statement people *wish* a confidence interval made: "95% probability the parameter lies in here."
<!-- /block -->
