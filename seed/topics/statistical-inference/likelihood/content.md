<!-- block: state, values: {successes: 7, trials: 10} -->

<!-- block: plot, spec: likelihood_curve, params: {successes: 7, trials: 10}, binds: [successes, trials], anchor: lik-curve, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "Probability, read backwards" -->

# Likelihood

You flip a bent coin 10 times and see 7 heads. **Probability** asks a forward question: *given* that the coin's bias is $p = 0.5$, how likely is 7 out of 10? **Likelihood** runs the question backwards: now that I've *seen* 7 of 10, how well does each candidate bias $p$ explain it? Same formula, opposite reading — the data are fixed, and the parameter is what varies.

---

<!-- block: gear, n: 2, label: "A function of the parameter" -->

The likelihood $L(p) = P(\text{data} \mid p)$ is read as a function of $p$ with the data nailed down. It is **not** a probability distribution over $p$ — it doesn't integrate to 1, and the area under it carries no meaning. What matters is its *shape*: where it's high, those parameter values make the observed data plausible; where it's low, they don't. The peak is the value the data support best.

---

<!-- block: gear, n: 3, label: "Slide the data, move the peak" -->

The curve is the likelihood for our coin. Drag the observed number of heads and watch the peak slide — the data's best-supported bias tracks the proportion you saw.

<!-- block: state_reset, anchor: lik-feel -->

<!-- block: playground, anchor: lik-feel -->
binds: [successes]
controls:
  - param: successes
    label: "Heads observed (out of 10)"
    min: 0
    max: 10
    step: 1
goal:
  prompt: "Suppose you actually saw 9 heads in the 10 flips — drag the count up to 9 and watch the peak march toward 0.9."
  target: { successes: 9 }
  success_when: "successes >= 9"
  on_success: |
    The peak sits at $k/n$ — the proportion you observed. That single
    best-supported value, $0.9$ here, is the parameter that makes the data most
    probable. Hold that thought: maximizing the likelihood is the next topic.
<!-- /block -->

---

<!-- layer: formal -->

<!-- block: gear, n: 4, label: "Likelihood is not probability" -->

For data $D$ and parameter $\theta$, the likelihood is $L(\theta) = P(D \mid \theta)$ — the same expression as the sampling probability, but viewed as a function of $\theta$. For the coin,

$$L(p) = \binom{10}{7} p^{7}(1-p)^{3} \ \propto\ p^{7}(1-p)^{3}.$$

Three things to keep straight: it's a function of $\theta$, not $D$; it needn't integrate to 1 over $\theta$ (it's not a density in $\theta$); and only *ratios* of likelihoods matter — the constant $\binom{10}{7}$ cancels. The **log-likelihood** $\ell(\theta) = \ln L(\theta)$ turns the product into a sum and is what you actually work with.

<!-- block: derivation, title: "Why the binomial coefficient doesn't matter", collapsed: true -->
$L(p) = \binom{n}{k} p^{k}(1-p)^{n-k}$. The factor $\binom{n}{k}$ is a constant in $p$, so it shifts $\ell(p)$ by a constant — it never moves the peak and cancels in any likelihood ratio. That's why we write $L(p) \propto p^{k}(1-p)^{n-k}$ and drop it.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Read the curve numerically" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: lik-sim -->
```python
import numpy as np

# Likelihood of p for 7 heads in 10 flips (up to the constant C(n,k)).
k, n = 7, 10
ps = np.linspace(0.01, 0.99, 99)
L = ps**k * (1 - ps)**(n - k)
print(f"peak at p = {ps[L.argmax()]:.2f}   (= k/n = {k/n:.2f})")

# It is NOT a density in p — its 'area' is an arbitrary number, not 1.
dp = ps[1] - ps[0]
print(f"area under L over p = {L.sum() * dp:.5f}   (likelihood doesn't normalize)")
```

The peak sits at $k/n$; the area is some arbitrary value — a reminder that $L$ ranks parameters, it isn't a distribution over them.

---

<!-- block: misconception, inline: true -->
**"The likelihood is the probability that the parameter equals $p$."**

*Wrong:* $L(0.7)$ being high means there's a high probability that $p = 0.7$.

*Correct:* $L(p) = P(\text{data} \mid p)$ — the probability of the *data* under that $p$, read as a function of $p$. It says nothing directly about $P(p)$. Turning the likelihood into a probability statement about the parameter requires a prior and Bayes' theorem — that's Bayesian inference. On its own, the likelihood only *ranks* parameters by how well they explain what you saw.
<!-- /block -->

---

<!-- layer: both -->

<!-- block: gear, n: 6, label: "Where it leads" -->

<!-- block: callout, kind: insight -->
**Where this leads.** Maximizing the likelihood gives the [**maximum likelihood estimate**](/topic/maximum-likelihood-estimation), the workhorse behind regression and logistic regression. Multiply the likelihood by a prior and renormalize and you get the posterior of **Bayesian inference**. And the *ratio* of likelihoods under two hypotheses is the basis of the most powerful tests in all of statistics.
<!-- /block -->
