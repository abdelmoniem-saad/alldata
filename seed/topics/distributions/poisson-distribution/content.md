<!-- block: state, values: {lambda: 4} -->

<!-- block: plot, spec: poisson_pmf, params: {lambda: 4}, binds: [lambda], anchor: poisson-bars, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "Counting rare events" -->

# Poisson distribution

How many emails land in the next hour? How many cars pass a sensor in a minute? How many typos are on this page? When you count events that happen at some steady average rate — each one rare, but many chances for one to occur — the count follows a **Poisson distribution**. It has a single dial: $\lambda$, the average number of events per window.

---

<!-- block: gear, n: 2, label: "One rate sets everything" -->

The Poisson's one parameter $\lambda$ is both its mean *and* its variance. Set the rate and you've set the center and the spread at once — there's no second knob.

It arises whenever events are independent and the rate is roughly constant over the window. Think of a long interval chopped into tiny slices: each slice is a near-Bernoulli trial with a tiny chance of an event, and there are a huge number of slices. The total count of events is Poisson. That's not a coincidence — it's exactly the limit the binomial approaches when $n$ is large and $p$ is small.

---

<!-- block: gear, n: 3, label: "Tune the rate" -->

Drag $\lambda$ and watch the bars. At small $\lambda$ the distribution is bunched against zero and right-skewed; as $\lambda$ grows it slides right and rounds into a near-symmetric mound.

<!-- block: state_reset, anchor: poisson-feel -->

<!-- block: playground, anchor: poisson-feel -->
binds: [lambda]
controls:
  - param: lambda
    label: "Rate (λ — events per window)"
    min: 0.5
    max: 12
    step: 0.5
goal:
  prompt: "Turn the rate up until seeing *zero* events becomes unlikely — find a λ where P(0) drops below about 5%."
  target: { lambda: 3 }
  success_when: "lambda >= 3"
  on_success: |
    The probability of zero events is $P(0) = e^{-\lambda}$, so it falls fast:
    $e^{-3} \approx 0.05$. By $\lambda = 3$ you'll almost always see at least
    one event in the window. Notice the whole distribution has shifted right
    and started to look symmetric — at large $\lambda$ the Poisson approaches
    a normal.
<!-- /block -->

---

<!-- layer: formal -->

<!-- block: gear, n: 4, label: "The formula, mean, variance" -->

For $X \sim \text{Poisson}(\lambda)$, the probability of exactly $k$ events is

$$P(X = k) = \frac{\lambda^{k} e^{-\lambda}}{k!}, \qquad k = 0, 1, 2, \ldots$$

Unlike the binomial there's no upper limit on $k$ — any count is possible, just increasingly unlikely. Its defining signature:

$$\mathbb{E}[X] = \lambda \qquad \text{Var}(X) = \lambda$$

Mean equals variance. That **equidispersion** is the property to remember — and the thing to check before trusting a Poisson model on real data.

<!-- block: derivation, title: "Binomial → Poisson as n → ∞, p → 0, np → λ", collapsed: true -->
Start from $\text{Binomial}(n, p)$ with $p = \lambda / n$ and let $n \to \infty$:

$$\binom{n}{k} p^k (1-p)^{n-k} = \frac{n!}{k!\,(n-k)!} \left(\frac{\lambda}{n}\right)^k \left(1 - \frac{\lambda}{n}\right)^{n-k}.$$

The falling factorial $\frac{n!}{(n-k)!} \approx n^k$ cancels the $n^k$ in the denominator; $\left(1 - \frac{\lambda}{n}\right)^{n} \to e^{-\lambda}$; and $\left(1 - \frac{\lambda}{n}\right)^{-k} \to 1$. What's left is $\frac{\lambda^k e^{-\lambda}}{k!}$ — the Poisson PMF.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Mean equals variance, checked" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: poisson-sim -->
```python
import numpy as np

# Draw Poisson counts and confirm mean ≈ variance ≈ lambda, and P(0) = e^-lambda.
rng = np.random.default_rng(0)
for lam in [1, 4, 9]:
    x = rng.poisson(lam, 500_000)
    print(f"lambda={lam}:  mean={x.mean():.3f}  var={x.var():.3f}  "
          f"P(0)={np.mean(x == 0):.4f} (=e^-lambda {np.exp(-lam):.4f})")
```

Mean and variance both land on $\lambda$ — the equidispersion signature.

---

<!-- block: misconception, inline: true -->
**"Any count data is Poisson."**

*Wrong:* the data are counts, so model them as Poisson.

*Correct:* the Poisson forces variance to equal the mean. Real counts are often **overdispersed** — clustered or bursty, with variance well above the mean (think website traffic with spikes). When that happens, Poisson understates the spread and a different model (negative binomial) is needed. Check mean-versus-variance before assuming Poisson.
<!-- /block -->

---

<!-- layer: both -->

<!-- block: gear, n: 6, label: "Where it leads" -->

<!-- block: callout, kind: insight -->
**Where this leads.** The Poisson is the rare-event limit of the **binomial**. The *waiting time between* Poisson events follows the **exponential distribution**. And at large $\lambda$ the Poisson is well-approximated by the **normal** — another face of the central limit theorem.
<!-- /block -->
