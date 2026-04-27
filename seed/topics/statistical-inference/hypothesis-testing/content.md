<!-- block: state, values: {prior: 0.5, sensitivity: 0.95, specificity: 0.95, treatment_strategy: "none"} -->

<!-- block: plot, spec: population_dot_grid, params: {prior: 0.5, sensitivity: 0.95, specificity: 0.95, treatment_strategy: "none"}, anchor: testing-population, mobile_order: 1 -->

---

<!-- layer: intuition -->

## The core question

You have data. You have a claim. Is the data consistent with that claim, or does it provide evidence against it?

The logic of hypothesis testing is proof by contradiction:

1. Assume the boring explanation — the **null hypothesis $H_0$**.
2. Ask: how surprising is the data under that assumption?
3. If the data is very surprising, reject the boring explanation.

The pinned plot is showing 1,000 *experiments* — half where the null is actually true, half where the alternative is. As you read on, you'll set the test's two error rates and watch which experiments get caught.

---

## The two errors

A test gives you a binary verdict: reject $H_0$ or don't. Reality also has two states: $H_0$ is true or it isn't. Cross those and you get four cells, two of which are mistakes:

- **Type I error.** $H_0$ is true, the test rejects anyway. False alarm. Probability: $\alpha$ (the significance level).
- **Type II error.** $H_0$ is false, the test fails to reject. Missed effect. Probability: $\beta$. Power is $1 - \beta$.

You want both error rates low. You can't have both without help — either more data, or accepting that they trade against each other.

---

<!-- block: decision, anchor: testing-decision -->
question: |
  You're designing a study. You can pre-set the significance level $\alpha$
  (the Type I error rate). You don't get to set $\beta$ directly — it's a
  consequence of $\alpha$, sample size, and effect size. What's the right
  default for $\alpha$?
options:
  - id: tight
    label: "α = 0.001 (only reject when very, very surprised)"
    writes: { sensitivity: 0.999, specificity: 0.999, treatment_strategy: "treat_all" }
    response: |
      A tiny α makes false alarms vanishingly rare — the plot shows almost no
      false rejections. The cost is power: you'll miss real effects unless
      they're huge or your sample is big. For exploratory work this is too
      strict; for high-stakes confirmatory work it's reasonable.
  - id: standard
    label: "α = 0.05 (the textbook default)"
    writes: { sensitivity: 0.8, specificity: 0.95, treatment_strategy: "treat_all" }
    response: |
      The conventional default — 5% false-positive rate. The plot shows the
      tradeoff: roughly 5% of true-null experiments still get rejected, and
      power lands at maybe 80% for a typical effect size. It's a defensible
      anchor, not a sacred number. Pre-register your $\alpha$, don't pick it
      after seeing the data.
  - id: loose
    label: "α = 0.20 (be willing to reject more often)"
    writes: { sensitivity: 0.95, specificity: 0.80, treatment_strategy: "treat_all" }
    response: |
      Loose $\alpha$ trades false alarms for power. You'll catch more real
      effects — but the plot is also showing more false rejections in the
      "null is true" half. Acceptable for screening or hypothesis-generation;
      not appropriate for a confirmatory study where false positives have
      real cost.
correct: standard
<!-- /block -->

---

<!-- block: callout, kind: insight, depends_on: testing-decision, branch: standard -->
$\alpha = 0.05$ is a Fisher-era convention, not a law of nature. Whether it's the right choice depends on the cost of a false positive versus the cost of a missed effect. Pre-register the choice; defending it after the fact is post-hoc reasoning.
<!-- /block -->

<!-- block: callout, kind: insight, depends_on: testing-decision, branch: tight|loose -->
You're right that $\alpha$ should match the cost structure of the decision. The textbook 0.05 is a default, not a target. The trap is choosing $\alpha$ *after* you've seen the data — which converts a hypothesis test into a story about the data you got.
<!-- /block -->

---

<!-- block: step_through, anchor: testing-walk -->
1. State $H_0$ — the boring explanation. ($\theta = \theta_0$.)
2. State $H_1$ — what you'd believe if $H_0$ falls. (Two-sided $\theta \ne \theta_0$, or one-sided.)
3. Choose $\alpha$ before looking at the data. This is your false-alarm rate.
4. Compute a test statistic — a number summarizing how far the data is from $H_0$.
5. Compute the **p-value** — $P(\text{statistic this extreme or more} \mid H_0)$.
6. Reject $H_0$ if $p < \alpha$. Otherwise, fail to reject.
<!-- /block -->

---

<!-- block: derivation, title: "What the p-value is and isn't", collapsed: true -->
The p-value is

$$p = P(\,|T| \ge |t_\text{obs}|\, \mid H_0\,)$$

It is **not** $P(H_0 \mid \text{data})$. The conditioning runs the other way. To go from a p-value to a posterior probability of $H_0$ you need a prior — Bayes' rule again — and the answer often differs by an order of magnitude. A p-value of 0.04 corresponds to roughly $P(H_0 \mid \text{data}) \approx 0.30$ under a 50/50 prior with reasonable power. The p-value alone does not tell you the probability that $H_0$ is true.

This is the **Lindley paradox**: with very large samples, even tiny deviations from $H_0$ produce small p-values, but the posterior probability of $H_0$ can stay high. Frequentist and Bayesian conclusions diverge precisely when the sample is large.
<!-- /block -->

---

<!-- block: simulation, editable: true, auto_run: true, anchor: testing-sim -->
```python
import numpy as np
import matplotlib.pyplot as plt
from scipy import stats

# Coin-fairness test. Generate one experiment under each of two worlds
# (fair coin and biased coin) and run a two-sided z-test for both.
np.random.seed(42)
n_flips = 100

for label, true_p in [('Fair coin', 0.5), ('Biased coin', 0.65)]:
    heads = np.random.binomial(n_flips, true_p)
    null_mean = n_flips * 0.5
    null_std = np.sqrt(n_flips * 0.5 * 0.5)
    z = (heads - null_mean) / null_std
    p_value = 2 * (1 - stats.norm.cdf(abs(z)))
    decision = "Reject H₀" if p_value < 0.05 else "Fail to reject H₀"
    print(f"{label}: heads={heads}, z={z:+.2f}, p={p_value:.4f}  →  {decision}")

# Calibration check: run 1,000 fair-coin experiments. Roughly 5% should
# wrongly reject H₀ — the false-positive rate is α by construction.
n_sims = 1000
rejections = 0
for _ in range(n_sims):
    heads = np.random.binomial(n_flips, 0.5)
    z = (heads - 50) / 5
    p = 2 * (1 - stats.norm.cdf(abs(z)))
    if p < 0.05: rejections += 1
print(f"\nFalse-positive rate over {n_sims} fair-coin runs: {rejections/n_sims:.1%}")

# Plot the null distribution + the rejection region.
fig, ax = plt.subplots(figsize=(8, 3.5))
x = np.linspace(30, 70, 200)
y = stats.norm.pdf(x, 50, 5)
crit = stats.norm.ppf(0.975, 50, 5)
ax.plot(x, y, color='#71717a', linewidth=1.5, label='Null distribution')
ax.fill_between(x, y, where=(x >= crit) | (x <= 100 - crit),
                color='#c98b8b', alpha=0.3, label='Rejection region (α=0.05)')
ax.axvline(50, color='#14b8a6', linestyle=':', linewidth=1)
ax.set_xlabel('Number of heads')
ax.set_ylabel('Density')
ax.legend(fontsize=9)
plt.tight_layout()
plt.show()
```

---

<!-- layer: formal -->

## Formal framework

**Hypotheses.**
- $H_0: \theta = \theta_0$
- $H_1: \theta \ne \theta_0$ (two-sided), or $H_1: \theta > \theta_0$ (one-sided)

**Test statistic.** $T = T(X_1, \ldots, X_n)$ — a function of the sample.

**P-value.** $p = P(|T| \ge |t_\text{obs}| \mid H_0)$ for a two-sided test.

**Decision rule.** Reject $H_0$ if $p < \alpha$, where $\alpha$ is pre-specified.

**Type I error ($\alpha$).** Rejecting $H_0$ when it's true.
**Type II error ($\beta$).** Failing to reject $H_0$ when $H_1$ is true.
**Power.** $1 - \beta$.

**Neyman–Pearson lemma.** Among all tests of size $\alpha$ for testing simple $H_0$ vs simple $H_1$, the likelihood-ratio test maximizes power.

---

<!-- block: misconception, inline: true -->
**"Failing to reject $H_0$ means $H_0$ is true."**

*Wrong:* if the p-value is above 0.05, the null hypothesis has been confirmed.

*Correct:* "fail to reject" is **not** "accept." It means the data isn't surprising enough to rule out $H_0$ — but the study may simply lack the power to detect a real effect. Absence of evidence isn't evidence of absence. The binary reject / fail-to-reject framing encourages black-and-white thinking; in reality $p = 0.04$ and $p = 0.06$ represent nearly identical evidence.
<!-- /block -->
