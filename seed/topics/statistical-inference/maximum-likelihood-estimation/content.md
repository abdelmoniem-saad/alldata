<!-- block: state, values: {successes: 7, trials: 10, loglik: 1} -->

<!-- block: plot, spec: likelihood_curve, params: {successes: 7, trials: 10, loglik: 1}, binds: [successes, trials], anchor: mle-curve, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "The best-supported parameter" -->

# Maximum likelihood estimation

Likelihood ranks every candidate parameter by how well it explains the data. The natural next move: pick the one that ranks highest. That value — the argmax of the likelihood — is the **maximum likelihood estimate** (MLE), your single best guess for the parameter. It's the most-used estimation principle in statistics, quietly powering linear regression, logistic regression, and most of the models you'll meet.

---

<!-- block: gear, n: 2, label: "Climb to the peak" -->

The curve here is the **log-likelihood** — same peak as the likelihood, but it turns the product into a sum, which is easier to differentiate and far more stable numerically. The MLE is where the curve tops out: the slope there (the **score**) is zero. For our coin the peak — and the $\hat{p}$ marker — sits exactly at $\hat{p} = k/n$, the sample proportion.

---

<!-- block: gear, n: 3, label: "Find the argmax" -->

Drag the data and watch the peak — and the $\hat{p}$ label — move to the new sample proportion. The MLE simply *reads off* where the curve is highest.

<!-- block: state_reset, anchor: mle-feel -->

<!-- block: playground, anchor: mle-feel -->
binds: [successes]
controls:
  - param: successes
    label: "Heads observed (out of 10)"
    min: 0
    max: 10
    step: 1
goal:
  prompt: "Imagine a new dataset of 3 heads in 10 — drag the count down to 3 and read the MLE off the peak."
  target: { successes: 3 }
  success_when: "successes <= 3"
  on_success: |
    The peak and the $\hat{p}$ marker land on $k/n = 0.3$. The MLE just reads
    off the sample proportion — no calculus needed *for this model*. But the
    same argmax logic powers models where there's no tidy formula and the peak
    has to be found numerically.
<!-- /block -->

---

<!-- layer: formal -->

<!-- block: gear, n: 4, label: "The recipe, and why log" -->

To find the MLE: write the likelihood $L(\theta) = \prod_i f(x_i; \theta)$, take the log $\ell(\theta) = \sum_i \ln f(x_i; \theta)$, differentiate, set the score $\ell'(\theta) = 0$, and solve. For the binomial,

$$\ell(p) = k \ln p + (n-k)\ln(1-p), \qquad \ell'(p) = \frac{k}{p} - \frac{n-k}{1-p} = 0 \ \Rightarrow\ \hat{p} = \frac{k}{n}.$$

Why the log? Sums differentiate more easily than products; it prevents underflow when multiplying many small probabilities; and because $\ln$ is increasing, the argmax is unchanged.

<!-- block: derivation, title: "Solving k/p = (n−k)/(1−p)", collapsed: true -->
Cross-multiply: $k(1-p) = (n-k)p \Rightarrow k - kp = np - kp \Rightarrow k = np \Rightarrow \hat{p} = k/n$. The sample proportion falls straight out.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "MLE on simulated data" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: mle-sim -->
```python
import numpy as np

rng = np.random.default_rng(0)
# True p = 0.3. Collect data, then recover it by maximizing the log-likelihood.
true_p, n = 0.3, 200
data = rng.random(n) < true_p
k = int(data.sum())

ps = np.linspace(0.001, 0.999, 999)
loglik = k * np.log(ps) + (n - k) * np.log(1 - ps)
print(f"observed {k}/{n};  MLE p_hat = {ps[loglik.argmax()]:.3f}   "
      f"(= k/n = {k/n:.3f}, true {true_p})")
```

The argmax of the log-likelihood lands on $k/n$, close to the true $0.3$ — and it tightens around the truth as $n$ grows, because MLEs are **consistent**.

---

<!-- block: misconception, inline: true -->
**"The MLE is the most probable value of the parameter."**

*Wrong:* the MLE is the $\theta$ with the highest probability of being correct.

*Correct:* the MLE maximizes $P(\text{data} \mid \theta)$, not $P(\theta \mid \text{data})$. It's the parameter that makes the *observed data* most probable — a statement about the data, not a probability of the parameter. The "most probable parameter" is the posterior mode, which needs a prior (Bayesian inference). With a flat prior the two coincide, which is why they're so easily confused.
<!-- /block -->

---

<!-- layer: both -->

<!-- block: gear, n: 6, label: "Where it leads" -->

<!-- block: callout, kind: insight -->
**Where this leads.** Least-squares [**linear regression**](/topic/simple-linear-regression) *is* maximum likelihood under normal noise; **logistic regression** is MLE for a binary outcome, solved numerically because there's no closed form. The curvature of the log-likelihood at its peak — the Fisher information — sets the estimate's standard error. Put a prior on $\theta$ and maximize the posterior instead, and you've crossed into **Bayesian inference**.
<!-- /block -->
