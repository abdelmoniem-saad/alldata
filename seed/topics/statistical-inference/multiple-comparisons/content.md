<!-- block: gear, n: 1, label: "Twenty lottery tickets" -->

One test at the 0.05 level is a lottery with a 5% losing-you-odds rate.
Most teams, though, do not run one test. They run twenty: twenty
subgroups, twenty outcomes, twenty models. And then they publish the one
with the stars.

---

<!-- block: gear, n: 2, label: "The arithmetic nobody plans for" -->

Each test controls its own false-positive rate at 5%. But your real
promise is usually broader: "this study contains no false discovery." The
chance that a whole family of null tests produces at least one star grows
fast. With m independent null tests at level $\alpha$:

$$P(\text{at least one false positive}) = 1 - (1 - \alpha)^m$$

At m = 20 and $\alpha$ = 0.05 that is about 64%. The most likely outcome
of twenty fair tests is not "no stars", it is "one star, and it is
lying." The researchers who hunt it down and publish it never mention the
other nineteen.

---

<!-- block: gear, n: 3, label: "Price the family" -->

<!-- block: decision, anchor: mc-pick -->
question: |
  A genomics screen runs 100 independent null tests, each at alpha =
  0.05. Roughly what is the chance of at least one false positive?
options:
  - id: a
    label: "5%, each test is capped at 0.05"
    writes: { n: 1 }
    response: |
      The 5% is per test, not per study. The curve at n = 1 shows a
      single lottery ticket. Your study bought a hundred.
  - id: b
    label: "About 99%, near certainty"
    writes: { n: 100 }
    response: |
      Look at the bars: with n = 100 at p = 0.05, the zero-successes bar
      has almost vanished. One minus 0.95 to the 100th is about 0.994.
      Under a full-null world, a star is essentially guaranteed, and the
      only open question is whether anyone catches it being a lie.
  - id: c
    label: "About 64%"
    writes: { n: 20 }
    response: |
      64% is the twenty-test answer, the one from gear 2. Multiply the
      ticket count by five and the surviving no-false-positive
      probability, 0.95^100, collapses to under 1%.
correct: b
<!-- /block -->

<!-- block: plot, spec: binomial_pmf, params: {n: 1, p: 0.05}, binds: [n, p], anchor: mc-bars, mobile_order: 1 -->

The bars count false positives among your m null tests, at p = 0.05 per
test. At n = 1 the story is tame. Push n to 20 and "one false positive"
becomes the single most likely outcome. At n = 100 the no-fire bar is a
sliver.

---

<!-- block: gear, n: 4, label: "The corrections" -->

The classical fix is Bonferroni: run each test at $\alpha/m$, which holds
the family-wise error rate at $\alpha$. With m = 20, each test needs
p < 0.0025 to count. It is simple and brutally conservative; real
discoveries pay for the Schutz it buys.

Modern high-dimensional work usually controls the **false discovery rate**
instead: the expected fraction of your stars that are false. The
Benjamini-Hochberg procedure sorts the m p-values, finds the largest one
with $p_{(i)} \le (i/m)q$, and declares that many significant. It accepts
that some stars will be fake as long as they are a controlled minority,
which is the right trade when a screen exists to nominate candidates for
confirmation, not to settle them.

<!-- block: fill_in, anchor: mc-fill -->
1. A per-test alpha controls a per-test error rate; the study-level promise needs the family to be priced.
2. Family-wise methods (Bonferroni) make any single false star nearly impossible across the whole family.
3. False-discovery-rate methods allow a controlled fraction of false stars, the trade screens and genomics live by.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Watch the family grow" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: mc-sim -->
```python
import numpy as np

rng = np.random.default_rng(11)
alpha, sims = 0.05, 20000

for m in (1, 20, 100):
    # m independent null tests per "study"; star = p < alpha.
    pvals = rng.random((sims, m))
    any_star = (pvals < alpha).any(axis=1).mean()
    theory = 1 - (1 - alpha) ** m
    print(f"m={m:>3}: P(at least one false star) = {any_star:.3f} (theory {theory:.3f})")
# The simulated frequencies track the formula. At m=100 the "study"
# false-fires 99% of the time while every individual test behaved.
```

---

<!-- block: gear, n: 6, label: "Where this leads" -->

<!-- block: callout, kind: insight -->
**This is where p-hacking lives.** The garden of forking paths, trying a
subgroup after the main result disappoints, is multiple comparisons run
without the accounting. The honest fixes are procedural: pre-register the
tests, correct for the family you actually ran, and treat screens as
candidate generation.
<!-- /block -->

<!-- block: misconception, inline: true -->
**"Each test was significant at 0.05, so the study's findings are sound."**

*Wrong:* if every individual test passes its own 5% bar, false discoveries
are ruled out.

*Correct:* the bars above are the rebuttal. At twenty tests the family
false-positive probability is about 64%, at a hundred it is 99%. The
per-test alpha was designed for one pre-declared question, and running a
fleet under the same bar converts the study into a lottery where the
winner gets published.
<!-- /block -->
