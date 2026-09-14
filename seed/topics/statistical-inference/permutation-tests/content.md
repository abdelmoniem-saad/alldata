<!-- block: gear, n: 1, label: "Ask the data directly" -->

You want to know whether a new onboarding flow retains users better. You
have two groups, a mean difference, and a nagging doubt: are the
distributions even normal? Here is the trick that ends the argument.
Under the null, group labels are meaningless decoration. So shuffle them.

---

<!-- block: gear, n: 2, label: "The shuffle is the null" -->

Pool all observations, randomly deal them back into two groups of the
same sizes, and recompute the statistic you actually care about: the
difference in means, or medians, or medians of ratios of medians. Each
reshuffle is one draw from the world where the labels have no effect.
Do this thousands of times and you hold, in your hands, the null
distribution of your statistic, built from your data with no formula
about normality anywhere.

The p-value is embarrassingly direct: the fraction of reshuffles whose
statistic was at least as extreme as the one you observed. If only 3 in
10,000 shuffles beat your real difference, your p-value is 0.0003. The
test needs exactly one assumption, called exchangeability: under the
null, the two groups' observations must be swappable. Randomized
assignment gives you that for free; observational groups that differ in
kind (patients at a specialized clinic versus a walk-in) do not, and no
amount of shuffling fixes labels that were never arbitrary.

---

<!-- block: gear, n: 3, label: "How many shuffles?" -->

<!-- block: decision, anchor: pt-pick -->
question: |
  Your friend runs 10 permutations and reports p = 0.3, "not
  significant". Why should you not trust that number very far?
options:
  - id: a
    label: "10 is too few: the p-value is coarse"
    writes: { n: 10 }
    response: |
      Correct, and the bars show why: with n = 10 the smallest nonzero
      p-value the design can express is 1/10. You can never report
      p < 0.01 from ten shuffles, and near the decision boundary the
      estimate wobbles by whole tenths. Ten is a debugging run.
  - id: b
    label: "100 is plenty for any report"
    writes: { n: 100 }
    response: |
      Better by ten times, but the granularity is now 0.01: you can
      claim p = 0.04 but never reliably p = 0.003. For a boundary case
      against alpha = 0.05 that may squeak by; for anything you would
      print in a paper it is still thin.
  - id: c
    label: "10,000, because p-values need precision"
    writes: { n: 10000 }
    response: |
      The professional answer, and the bars agree: the expressible
      resolution is now 0.0001, far below any alpha you would use.
      Monte Carlo wobble no longer moves decisions. Ten thousand costs
      seconds of compute, which is why permutation tests stopped being
      exotic.
correct: c
<!-- /block -->

<!-- block: plot, spec: binomial_pmf, params: {n: 10, p: 0.05}, binds: [n, p], anchor: pt-bars, mobile_order: 1 -->

The resampling arithmetic, wearing its uniform: with n shuffles the
p-value can only move in steps of 1/n, and the spread of the estimate
around the true one is what those bars draw. More shuffles, finer
ruler.

---

<!-- block: gear, n: 4, label: "The machinery, in five lines" -->

No test statistic is privileged. The permutation framework answers any
question you can write as a number: a difference in medians, a
correlation, the gap between the 90th percentiles, even the accuracy of
a model fit to each half. The recipe is always the same three moves:
compute the observed statistic, generate the null world by breaking the
structure you are testing (shuffling labels, flipping signs within
pairs), and count how extreme the real world is inside the fake ones.

Exactness is available at the small end. With groups of size 5 and 4,
there are only $\binom{9}{4} = 126$ distinct assignments, so you can
enumerate every one and the p-value is exact rather than Monte Carlo.
Beyond trivial sizes, random resampling approximates it, and the bin
arithmetic you just saw prices that approximation.

<!-- block: fill_in, anchor: pt-fill -->
1. Shuffling labels manufactures the null world the hypothesis describes: the treatment does nothing, so membership is arbitrary.
2. The p-value is a proportion of simulated worlds, which is why resolution is 1 over the number of shuffles.
3. Exchangeability is the load-bearing assumption; randomized designs supply it, convenience sampling may not.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Run one" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: pt-sim -->
```python
import numpy as np

rng = np.random.default_rng(9)
a = rng.normal(52, 10, 40)   # new onboarding
b = rng.normal(49, 10, 40)   # old onboarding

obs = a.mean() - b.mean()
pooled = np.concatenate([a, b])
diffs = []
for _ in range(10000):
    shuffled = rng.permutation(pooled)
    diffs.append(shuffled[:40].mean() - shuffled[40:].mean())
diffs = np.array(diffs)

p = (np.abs(diffs) >= abs(obs)).mean()
print(f"observed diff = {obs:+.2f}")
print(f"permutation p  = {p:.4f}  (10,000 shuffles)")
# No t-statistic, no normality check. The null world was manufactured
# from the data, and the answer is just a proportion of it.
```

---

<!-- block: gear, n: 6, label: "Where this leads" -->

<!-- block: callout, kind: insight -->
**The bootstrap is this idea's sibling.** The permutation test breaks the
labels to manufacture a null; the bootstrap resamples *within* each group
to manufacture new realizations of the estimate. Between them they cover
most of classical inference, with code you can read in one sitting.
<!-- /block -->

<!-- block: misconception, inline: true -->
**"Permutation tests are approximate hacks compared to real parametric tests."**

*Wrong:* shuffling is a rough-and-ready substitute for the proper t-test.

*Correct:* with full enumeration the permutation p-value is exact, its
null distribution is derived from the data rather than assumed, and when
the t-test's assumptions do hold it converges to the same answer. The
cost is compute (cheap) and the exchangeability requirement (a design
question, not a formula).
<!-- /block -->
