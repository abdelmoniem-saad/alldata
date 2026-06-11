<!-- block: state, values: {mu: 0, sigma: 1, n: 1} -->

<!-- block: plot, spec: gaussian_pdf, params: {mu: 0, sigma: 1, n: 1}, binds: [mu, sigma, n], anchor: pv-null, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "How surprising is your data?" -->

# P-values

You ran the experiment and the average came out at 0.4. Is that evidence of a real effect, or the kind of bump that noise produces all the time? The **p-value** answers exactly one question: *if nothing were going on, how often would chance alone produce data at least this extreme?* Small p-value: your data would be rare in the nothing-going-on world. That's the entire content of the number — no more, no less.

---

<!-- block: gear, n: 2, label: "A tail area under the null" -->

The curve on the right is the **null distribution** — what your statistic looks like across repeated experiments when $H_0$ is true. Your observed value lands somewhere on it; the p-value is the **tail area** beyond that point: the fraction of nothing-going-on experiments that look at least as extreme as yours. Far into the tail → tiny area → tiny p. Near the middle → most of the curve is "more extreme" → large p, unremarkable data.

---

<!-- block: gear, n: 3, label: "Same effect, more data, smaller p" -->

Here's what most explanations miss: the p-value depends on the *evidence*, not just the effect. Suppose your observed lift is fixed at $0.4$. The curve is the null distribution of the sample mean — and it tightens as $n$ grows.

<!-- block: state_reset, anchor: pv-feel -->

<!-- block: playground, anchor: pv-feel -->
binds: [n]
controls:
  - param: n
    label: "Sample size (n)"
    min: 1
    max: 100
    step: 1
goal:
  prompt: "Tighten the null distribution until an observed mean of 0.4 becomes genuinely surprising — push n to 25 or beyond."
  target: { n: 25 }
  success_when: "n >= 25"
  on_success: |
    At $n = 25$ the null's spread is $1/\sqrt{25} = 0.2$, so your observed
    $0.4$ sits two standard errors out: $z = 2.0$, $p \approx 0.046$ —
    significant at the usual bar. At $n = 1$ the *same* $0.4$ gave
    $p \approx 0.69$: utterly ordinary. The effect never changed; the
    evidence did. P-values measure surprise, and surprise scales with data.
<!-- /block -->

---

<!-- layer: formal -->

<!-- block: gear, n: 4, label: "Definition, and what p is not" -->

Formally, for observed statistic $t$ and a two-sided test,

$$p = P\big(|T| \ge |t| \,\big|\, H_0\big).$$

Read the conditioning bar carefully: the probability is computed *in the null world*. Three things a p-value is **not**: it is not $P(H_0 \mid \text{data})$ (that's the inverted conditional — Bayes territory); it is not the probability your result is a fluke; and it is not a measure of how *big* or *important* the effect is. It measures incompatibility between your data and the null — nothing else. And the 0.05 bar is a 1925 convention, not a law of nature.

<!-- block: derivation, title: "Why p-values are uniform when the null is true", collapsed: true -->
Under $H_0$, the p-value is $p = 1 - F(T)$ where $F$ is the null CDF of the statistic. For any $a \in [0,1]$: $P(p \le a) = P(1 - F(T) \le a) = P(F(T) \ge 1-a) = a$, because $F(T)$ is itself uniform (the probability integral transform). So when nothing is going on, $p$ is **uniformly distributed**: $p = 0.03$ is exactly as likely as $p = 0.93$. That's what makes the $\alpha$ cutoff calibrated — $P(p < 0.05 \mid H_0) = 0.05$ by construction.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Watch the uniform appear" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: pv-sim -->
```python
import numpy as np
from math import erf, sqrt

rng = np.random.default_rng(0)
# Run 100,000 experiments where H0 is TRUE (mean really is 0).
# Compute each experiment's two-sided p-value and look at the distribution.
n, trials = 30, 100_000
z = rng.standard_normal((trials, n)).mean(axis=1) * np.sqrt(n)
phi = np.vectorize(lambda x: 0.5 * (1 + erf(x / sqrt(2))))
p = 2 * (1 - phi(np.abs(z)))

print(f"P(p < 0.05) under a true null: {(p < 0.05).mean():.4f}   (calibrated to 0.05)")
hist, _ = np.histogram(p, bins=10, range=(0, 1))
print("share of p-values per decile:", np.round(hist / trials, 3))
```

Every decile holds ~10% — the p-value is uniform under a true null, and exactly 5% of null experiments land below 0.05. The false-alarm rate is the calibration, working as designed.

---

<!-- block: misconception, inline: true -->
**"p < 0.05 means the effect is real and important."**

*Wrong:* statistical significance certifies a meaningful discovery.

*Correct:* a p-value measures *surprise under the null*, not *size*. With a huge sample, a vanishingly small, practically irrelevant effect produces a tiny p-value — you watched exactly that mechanism in the playground. And $p = 0.049$ versus $p = 0.051$ is a hair's difference in evidence, not a boundary between truth and falsehood. Always report the **effect size and a confidence interval** alongside p; significance alone says "probably not pure noise," nothing more.
<!-- /block -->

---

<!-- layer: both -->

<!-- block: gear, n: 6, label: "Where it leads" -->

<!-- block: callout, kind: insight -->
**Where this leads.** The p-value is step 4 of [**hypothesis testing**](/topic/hypothesis-testing); its miss-rate companion is [**statistical power**](/topic/statistical-power), and the dual view — the parameter values you *wouldn't* reject — is the [**confidence interval**](/topic/confidence-intervals). Its uniformity under the null is what **A/B testing**'s peeking problem violates: re-checking until p dips below 0.05 turns a calibrated 5% into ~20%.
<!-- /block -->
