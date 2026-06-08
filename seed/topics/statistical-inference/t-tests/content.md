<!-- block: state, values: {df: 8} -->

<!-- block: plot, spec: student_t_pdf, params: {df: 8}, binds: [df], anchor: tt-null, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "Comparing means, honestly" -->

# T-tests

Is this group's average really different from that one — or from a target value? If you knew the population's spread $\sigma$, a z-test would settle it. But you almost never know $\sigma$; you estimate it from the same small sample you're testing. That extra layer of uncertainty is exactly what the **t-test** is built to handle.

---

<!-- block: gear, n: 2, label: "Estimating σ costs you" -->

The t statistic looks just like a z — $t = (\bar{x} - \mu_0)/(s/\sqrt{n})$ — but with the *sample* standard deviation $s$ in the denominator. Because $s$ is itself noisy, $t$ has **heavier tails** than the normal: more room for extreme values. That's the t-distribution with $n-1$ degrees of freedom. A small sample means few degrees of freedom, fatter tails, and a higher bar for "significant." As $n$ grows, $s$ pins down $\sigma$ and the t-curve converges to the z.

---

<!-- block: gear, n: 3, label: "Which test fits the design?" -->

The hardest part of a t-test is usually choosing *which one*. Here's a common trap.

<!-- block: decision, anchor: tt-design -->
question: |
  A study measures the **same** 20 patients' blood pressure before and after a
  drug. Which t-test fits, and what are the degrees of freedom?
options:
  - id: two-sample
    label: "Two-sample t-test — 'before' is one group, 'after' another (df = 38)"
    writes: { df: 38 }
    response: |
      Not the best fit. The two-sample test assumes the groups are
      *independent*, but these are the same people measured twice. Treating
      before and after as unrelated throws away the within-person matching — and
      usually buries the effect under patient-to-patient differences.
  - id: paired
    label: "Paired t-test — test the 20 before-minus-after differences against 0 (df = 19)"
    writes: { df: 19 }
    response: |
      Right. Reduce each patient to a single difference, then it's a one-sample
      t-test on those 20 differences against 0, with $df = 20 - 1 = 19$. Pairing
      cancels each person's baseline, so it's far more sensitive than treating
      the groups as independent.
  - id: one-sample-39
    label: "One-sample test on the differences, df = 39"
    writes: { df: 39 }
    response: |
      Right idea — it does reduce to a one-sample test on the differences — but
      the df is wrong. There are 20 differences, so $df = 19$, not 39. You have
      20 paired observations, not 40 independent ones.
correct: paired
<!-- /block -->

<!-- block: callout, kind: insight, depends_on: tt-design, branch: paired -->
With $df = 19$ the null t-curve above is what you compare your observed $t$ against. The paired design is the whole trick: collapsing to differences removes the patient-to-patient variation that would otherwise swamp the drug's effect.
<!-- /block -->

---

<!-- layer: formal -->

<!-- block: gear, n: 4, label: "The three t-tests" -->

- **One-sample:** $t = (\bar{x} - \mu_0)/(s/\sqrt{n})$, $df = n-1$. Tests one mean against a fixed value.
- **Two-sample:** $t = (\bar{x}_1 - \bar{x}_2)/\text{SE}$, comparing two independent group means. Welch's version uses separate variances and an adjusted df — the safer default.
- **Paired:** form each pair's difference, then run a one-sample test on the differences against 0, with $df = (\text{pairs}) - 1$.

In every case you compare the observed $t$ to the t-distribution with the right df and read a p-value off its tails — rejecting when $|t|$ exceeds the critical value for your $\alpha$.

<!-- block: derivation, title: "Why n − 1 degrees of freedom", collapsed: true -->
The sample variance $s^2$ is computed around the sample mean $\bar{x}$, which is itself estimated from the data. That constraint — the deviations from $\bar{x}$ must sum to zero — uses up one degree of freedom, leaving $n - 1$ independent pieces of information about the spread.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Pairing, in code" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: tt-sim -->
```python
import numpy as np

rng = np.random.default_rng(0)
# 20 patients, a real ~4-point drop, with large person-to-person baselines.
before = rng.normal(140, 12, 20)
after = before - rng.normal(4, 5, 20)

d = before - after                                   # per-patient difference
t = d.mean() / (d.std(ddof=1) / np.sqrt(len(d)))
print(f"paired   t = {t:.2f}  on df = {len(d)-1};  mean drop = {d.mean():.2f}")

# Treat the groups as independent (wrong) — baseline spread swamps the effect:
se = np.sqrt(before.var(ddof=1)/len(before) + after.var(ddof=1)/len(after))
t_wrong = (before.mean() - after.mean()) / se
print(f"unpaired t = {t_wrong:.2f}  (wrong) — much weaker; pairing removes baseline noise")
```

The paired test sees the effect clearly; the unpaired one, drowning in baseline variation, often can't.

---

<!-- block: misconception, inline: true -->
**"For a small sample, play it safe and use the z-test."**

*Wrong:* the normal is the standard reference, so reach for $z$ when data are scarce.

*Correct:* a small sample is exactly when you *can't* use $z$ — you don't know $\sigma$, and estimating it from few points adds uncertainty the normal ignores. The t-distribution's heavier tails are the correction; using $z$ with a small sample understates the tails and produces too many false positives. As $n$ grows, $t$ *becomes* $z$, so the t-test is never worse — it's $z$ plus an honesty adjustment for not knowing $\sigma$.
<!-- /block -->

---

<!-- layer: both -->

<!-- block: gear, n: 6, label: "Where it leads" -->

<!-- block: callout, kind: insight -->
**Where this leads.** A t-test is [**hypothesis testing**](/topic/hypothesis-testing) with the [**t-distribution**](/topic/t-distribution) as the null. Comparing *more than two* means at once is **ANOVA**, an F-test. Invert the same statistic and you get a [**confidence interval**](/topic/confidence-intervals) for the mean difference. And every coefficient in a regression is tested with exactly this t.
<!-- /block -->
