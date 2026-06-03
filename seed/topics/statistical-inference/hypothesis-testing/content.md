<!-- block: state, values: {mu: 0, sigma: 1} -->

<!-- block: plot, spec: gaussian_pdf, params: {mu: 0, sigma: 1}, binds: [mu, sigma], anchor: ht-null, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "Ruling out chance" -->

# Hypothesis testing

You ran an experiment and saw an effect. But could that effect just be noise — the kind of pattern that shows up by luck even when nothing is going on? A hypothesis test is a disciplined way to answer that one question: *is what I saw surprising enough, under the assumption of "nothing going on," to rule chance out?*

The curve on the right is that "nothing going on" world — the **null distribution** of your test statistic.

---

<!-- block: gear, n: 2, label: "Null, alternative, and two ways to be wrong" -->

A test pits two hypotheses against each other:

- the **null** $H_0$ — the boring explanation: no effect, no difference, just noise;
- the **alternative** $H_1$ — there's a real effect.

You compute a **test statistic** from your data and ask how extreme it is *if $H_0$ were true*. If it's extreme enough — past a threshold set by your chosen significance level $\alpha$ — you reject $H_0$.

Two ways to be wrong: a **Type I error** is rejecting a true null (a false alarm; its rate is $\alpha$), and a **Type II error** is failing to detect a real effect (a miss; its rate is $\beta$). You can't drive both to zero at once — tightening one loosens the other unless you collect more data.

---

<!-- block: gear, n: 3, label: "Two worlds, one cutoff" -->

Under the null, the statistic centers at 0. If the alternative is true and the effect is real, the *same* statistic is drawn from a shifted world. Picking the right shift is the key to seeing what "power" means.

<!-- block: decision, anchor: ht-shift -->
question: |
  Under $H_0$, your standardized test statistic is centered at 0. Now suppose
  the alternative is true — there *is* a real effect. Where is the statistic's
  distribution centered now?
options:
  - id: zero
    label: "Still at 0 — the statistic doesn't know which hypothesis is true"
    writes: { mu: 0 }
    response: |
      Not quite. A real effect systematically pushes the statistic away from 0
      — that's what "an effect" means. If the alternative left the distribution
      centered at 0, no test could ever detect anything.
  - id: shifted
    label: "Shifted away from 0 — say, centered near 2.5"
    writes: { mu: 2.5 }
    response: |
      Right — watch the curve slide right. Under a real effect the statistic is
      drawn from a shifted distribution. The fraction of *that* shifted curve
      lying past your rejection cutoff is the test's **power** ($1 - \beta$).
      A bigger effect or a larger sample pushes it further right and lifts the
      power.
  - id: pvalue
    label: "At the p-value of the result"
    writes: { mu: 0 }
    response: |
      That mixes up two different things. The p-value is a number computed from
      one dataset; the alternative hypothesis is a whole distribution the
      statistic could follow. Under a real effect, that distribution is shifted
      away from 0 — it isn't located "at the p-value."
correct: shifted
<!-- /block -->

<!-- block: callout, kind: insight, depends_on: ht-shift, branch: shifted -->
Now both worlds are on the table: the null centered at 0 and the alternative shifted right. Your cutoff slices both. The null mass beyond it is $\alpha$ (false alarms); the alternative mass beyond it is power. Designing a good study is really just pushing these two distributions apart — more data, a cleaner measurement, a bigger true effect.
<!-- /block -->

---

<!-- layer: formal -->

<!-- block: gear, n: 4, label: "The procedure" -->

The standard recipe:

1. State $H_0$ and $H_1$.
2. Choose a significance level $\alpha$ (commonly 0.05) **before** seeing the data.
3. Compute a test statistic, e.g. $z = \dfrac{\bar{x} - \mu_0}{\sigma/\sqrt{n}}$.
4. Find the **p-value**: the probability, *if $H_0$ were true*, of a statistic at least as extreme as the one observed.
5. Reject $H_0$ if $p < \alpha$; otherwise fail to reject.

The whole edifice rests on the **sampling distribution** of the statistic under $H_0$ — that's the curve you measure "extreme" against, and why this topic depends on it.

---

<!-- block: gear, n: 5, label: "Calibrate the false-alarm rate" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: ht-sim -->
```python
import numpy as np

# When H0 is TRUE, a level-0.05 test should wrongly reject about 5% of the
# time — no more. Simulate 50,000 experiments under the null and check.
rng = np.random.default_rng(0)
n, alpha = 30, 0.05
z_crit = 1.96                      # two-sided 5% cutoff for a z-test
reject = 0
trials = 50_000
for _ in range(trials):
    sample = rng.normal(0, 1, n)   # H0 true: mean really is 0
    z = sample.mean() / (1 / np.sqrt(n))
    if abs(z) > z_crit:
        reject += 1
print(f"False-positive rate under H0: {reject/trials:.4f}  (target ~ {alpha})")
```

The test rejects a true null right around 5% of the time — that's $\alpha$ doing exactly its job. Set $\alpha$ smaller and false alarms fall, but so does power.

---

<!-- block: misconception, inline: true -->
**"A p-value is the probability that the null hypothesis is true."**

*Wrong:* $p = 0.03$ means there's a 3% chance the null is true.

*Correct:* the p-value is computed *assuming the null is true* — it's the chance of data this extreme **given $H_0$**, not the chance of $H_0$ given the data. Those are different conditional directions (flipping them is the same error Bayes' theorem exists to fix). A small p-value says "this data would be surprising if nothing were going on," nothing more — and it says nothing about whether the effect is large or important.
<!-- /block -->

---

<!-- layer: both -->

<!-- block: gear, n: 6, label: "Where it leads" -->

<!-- block: callout, kind: insight -->
**Where this leads.** The number in step 4 is the subject of [**p-values**](/topic/p-values), and the miss-rate $\beta$ is the subject of **statistical power**. **Confidence intervals** are the dual view — the values you *wouldn't* reject. And **t-tests** are this procedure with the t-distribution standing in for the normal when $\sigma$ is unknown.
<!-- /block -->
