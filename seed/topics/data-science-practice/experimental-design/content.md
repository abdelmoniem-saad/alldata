<!-- block: gear, n: 1, label: "The analysis cannot fix the design" -->

Every topic so far carried a warning label: with observational data,
adjustment is guesswork about unmeasured things. This topic is the
manufacture of the alternative. Design is the part of statistics where
you decide, *before the data exists*, what comparisons will be clean.
Decisions made here cannot be undone by any analysis later; decisions
botched here cannot be repaired by any analysis either.

---

<!-- block: gear, n: 2, label: "The three pillars" -->

**Randomization** assigns treatments by chance, which does something no
adjustment can: it balances *every* confounder, measured, unmeasured,
and unmeasurable, in expectation. It converts a comparison of different
kinds of customers into a comparison of identical customers dealt
different cards. The ab-testing topic assumed this pillar; here it is,
poured.

**Replication** is the sample size pillar, and it is a power calculation
wearing work clothes: before collecting anything, decide the minimum
detectable effect and the n that detects it. Underpowered experiments
don't just risk null results; combined with the habit of peeking, they
manufacture false discoveries that replicate nowhere.

**Blocking** is precision engineering: group the units into similar
blocks (same warehouse, same week, same patient cluster) and randomize
*within* blocks. Blocking doesn't change what you can conclude; it
removes known sources of variability from the comparison, so the same
n detects smaller effects. Pairing is blocking with blocks of two: the
before-and-after design, each subject their own control.

---

<!-- block: gear, n: 3, label: "Which design buys the power?" -->

<!-- block: decision, anchor: ed-pick -->
question: |
  Testing a new checkout flow. You can recruit 200 users. Version A:
  100 random to old, 100 to new. Version B: 100 users use both flows,
  one per week, order randomized. Which has the sharper comparison,
  assuming user-to-user spending differences are huge?
options:
  - id: a
    label: "A; more independent users per arm"
    writes: { effect: 0.3, n: 2 }
    response: |
      The power curve slid to the small end, and it is lying by
      comparison: between-arm noise now includes every personality
      difference in your 200 users, the very variation a budget like
      this cannot average away. Two arms of strangers differ by more
      than the feature you built.
  - id: b
    label: "B; each user is their own control"
    writes: { effect: 0.8, n: 8 }
    response: |
      Correct, and the curve went to the comfortable end: the paired
      design subtracts each user from themselves, so the huge
      user-to-user variation never enters the comparison at all. Only
      the within-user week-to-week noise remains. This is blocking
      with blocks of two, and it is why within-subject designs dominate
      when subjects are expensive and variable.
  - id: c
    label: "They're equivalent; 200 users is 200 users"
    writes: { effect: 0.3, n: 8 }
    response: |
      The curves disagree, and the disagreement is the lesson: design
      changes what the same n can detect. A paired design on 200
      users can outperform an unpaired one on 2,000. Counting rows is
      not counting information.
correct: b
<!-- /block -->

<!-- block: plot, spec: power_curves, params: {effect: 0.8, alpha: 0.05, n: 8}, binds: [effect, alpha, n], anchor: ed-power, mobile_order: 1 -->

Power curves at the design's effective settings. The paired design's
advantage is that it moves along this curve by subtracting the noise
you could never have averaged away.

---

<!-- block: gear, n: 4, label: "The threat model, pre-mortem style" -->

Designs die from named threats, and naming them is the defense.
**Selection bias**: the treatment arm is self-selected (opt-in beta
users), randomization broken at the door. **History**: something else
changed mid-experiment (a holiday, a price change), and the treated
window caught it differently. **Attrition**: users who quit the
treatment differ from those who quit the control, and the surviving
samples are no longer comparable. **Carryover**: in paired designs,
this week's treatment version bleeds into next week's control
(requires washout or counterbalancing). **Novelty**: the new flow wins
because it is new, an effect that decays after week one. The
pre-registration habit (write the hypothesis, the metric, the sample
size, and the analysis before the data exists) closes the door on the
subtlest threat of all: the garden of forking paths that
multiple-comparisons documented.

<!-- block: fill_in, anchor: ed-fill -->
1. Randomization balances measured and unmeasured confounders in expectation; it is the only mechanism that does.
2. Blocking and pairing subtract known variation from the comparison, buying power without buying rows.
3. Pre-register hypothesis, metric, and sample size; the design's integrity is decided before the first row arrives.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Design, then analyze" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: ed-sim -->
```python
import numpy as np
from scipy import stats

rng = np.random.default_rng(53)
users = 100
personality = rng.normal(0, 30, users)     # huge user-to-user differences
treatment_effect = 4                       # the real lift

# Version A: independent arms.
a_ctrl = personality[:50] + rng.normal(0, 10, 50)
a_treat = personality[50:] + treatment_effect + rng.normal(0, 10, 50)

# Version B: paired, each user sees both, order randomized.
b_ctrl = personality + rng.normal(0, 10, users)
b_treat = personality + treatment_effect + rng.normal(0, 10, users)

print(f"unpaired  : p = {stats.ttest_ind(a_treat, a_ctrl).pvalue:.3f}")
print(f"paired    : p = {stats.ttest_rel(b_treat, b_ctrl).pvalue:.3f}")
# Same 100 users, same true lift, same noise. The paired design
# detects the effect the unpaired design misses, because blocking
# subtracted the personality noise before the test ever ran.
```

---

<!-- block: gear, n: 6, label: "Where this leads" -->

<!-- block: callout, kind: insight -->
**The family tree.** The factorial designs behind two-way ANOVA test
several treatments and their interactions at once. Sequential designs
let you peek without breaking the error rate. Quasi-experiments
(difference-in-differences, regression discontinuity) import design
logic into settings where you couldn't randomize. Every one of them is
this topic's three pillars, rearranged.
<!-- /block -->

<!-- block: misconception, inline: true -->
**"Randomization just makes the groups roughly equal on the variables I measured."**

*Wrong:* the point of random assignment is balance on known covariates,
which is why covariate adjustment afterward finishes the job.

*Correct:* balance on measured covariates is the *least* of what
randomization buys, and adjustment can finish nothing it didn't start.
The irreplaceable gift is balance on everything unmeasured: motivation,
mood, life events, all the variables nobody thought to log. That is why
an analysis of a randomized experiment needs no adjustment to be
unbiased, while the same analysis on observational data is a litigation
of assumptions.
<!-- /block -->
