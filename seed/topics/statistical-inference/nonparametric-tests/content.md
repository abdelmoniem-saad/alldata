<!-- block: gear, n: 1, label: "The outlier that hires itself" -->

Reaction times for two interface designs. Design A reads 210, 220, 205,
214 milliseconds. Design B reads 208, 219, 2,300, 211. One participant
answered a phone call mid-trial. The t-test's machinery, which averages
and pools variances, just ate a 2,300 like it was data.

---

<!-- block: gear, n: 2, label: "Tests that only know order" -->

The t-test's assumptions are specific: roughly normal populations (or
big-enough samples), and its p-value leans on the *values* of the
numbers. Nonparametric tests throw away the values and keep only their
order. Pool both groups, sort everything, replace each number by its
rank, and ask whether one group's ranks are systematically higher.

That single move buys enormous robustness. A 2,300 is just "the biggest
rank", no more influential than a 2,400 or a 2,001. Skewed distributions,
ordinal scales ("rate your pain 1 to 10"), and ugly tails stop being
landmines. The Wilcoxon rank-sum test (Mann-Whitney U, the same test in
different arithmetic) is the two-group answer; Wilcoxon signed-rank pairs
before-and-after measurements; Kruskal-Wallis is its ANOVA-shaped
sibling for several groups.

The price is honest and worth naming: you give up testing the *mean*.
The rank-sum test asks whether one distribution tends to sit above the
other, which is close to a comparison of medians when the shapes match.
If the mean is genuinely the quantity you care about and the data are
clean, the t-test extracts more from the same data. Nonparametric tests
are not a free upgrade; they are the right tool when the assumptions
behind the mean are the part you cannot defend.

---

<!-- block: gear, n: 3, label: "Which center do you mean?" -->

<!-- block: decision, anchor: np-pick -->
question: |
  Income data, right-skewed with billionaires in the tail. The t-test
  compares means, and the mean is dragged by the tail. Which center
  should your two-group comparison defend?
options:
  - id: a
    label: "The mean; it's the standard"
    writes: { mu: 1.5 }
    response: |
      The curve slid to mu = 1.5, and with it every billionaire in the
      sample dragged the average. A handful of extreme incomes can move
      that number by more than the effect you are hunting, which is
      exactly why the standard fails here.
  - id: b
    label: "The median; it's the robust one"
    writes: { mu: 0.0 }
    response: |
      Correct, and the curve sat back down at the center of the mass.
      The median is the point where half the ranks are above and half
      below, which is precisely what the rank-based test compares. The
      tail can double in size without moving it a step.
  - id: c
    label: "The mode; it's the most common"
    writes: { mu: -0.5 }
    response: |
      The curve slid left of center, which is where a mode often sits in
      a right-skewed distribution, and it is the wrong summary here. The
      mode ignores almost everything about the distribution; the median
      uses every observation's order without letting the tail vote
      twice.
correct: b
<!-- /block -->

<!-- block: plot, spec: gaussian_pdf, params: {mu: 0, sigma: 1}, binds: [mu, sigma], anchor: np-curve, mobile_order: 1 -->

A stand-in for the income distribution's center. The rank test cares
where the mass sits relative to the other group, not where the tail
tows the mean; watch which center stays put when the tail grows.

---

<!-- block: gear, n: 4, label: "What the U statistic does" -->

For each observation, count how many observations of the *other* group it
beats. Sum those wins for group A: that is U. Under the null (the
distributions are interchangeable), U is a symmetric lottery whose
distribution is known exactly, computable by counting, with no normal
curve anywhere in it. U far from its null center says one group's values
systematically outrank the other's.

Ties get average ranks. Aside from tie handling, the null distribution
does not depend on the population's shape, which is the entire
nonparametric bargain: trade a little power under clean normality for
validity everywhere else.

<!-- block: fill_in, anchor: np-fill -->
1. Ranking destroys the tail's veto: an outlier is one rank, not one lever on the mean.
2. The rank-sum test's null is distribution-shape-free, so its p-value survives skew and outliers intact.
3. The cost is interpretive: you are testing "tends to sit higher", not the arithmetic mean.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Watch the outlier work" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: np-sim -->
```python
import numpy as np
from scipy import stats

rng = np.random.default_rng(5)
a = rng.normal(100, 15, 25)                 # design A
b = np.append(rng.normal(100, 15, 24), 3200)  # design B, one phone call

t, tp = stats.ttest_ind(a, b)
u, up = stats.mannwhitneyu(a, b, alternative="two-sided")
print(f"means: A {a.mean():.1f} vs B {b.mean():.1f}")
print(f"t-test: t = {t:+.2f}, p = {tp:.4f}   <- fooled by one point")
print(f"rank-sum: U = {u:.0f}, p = {up:.4f} <- unmoved")
# The t-test reads a huge "effect" the outlier manufactured. The rank
# test, which only knows order, keeps both p-values honest.
```

---

<!-- block: gear, n: 6, label: "Where this leads" -->

<!-- block: callout, kind: insight -->
**The permutation escape hatch.** If you want a test of the actual mean
without distributional faith, the permutation test recomputes the
mean-difference under every reshuffle of group labels and reads your
statistic's rank in that null world. It is the topic coming next, and it
generalizes to any statistic you can compute.
<!-- /block -->

<!-- block: misconception, inline: true -->
**"Nonparametric tests are weaker, so always prefer the t-test."**

*Wrong:* rank tests trade so much power that they should be a last resort.

*Correct:* under exactly-normal data the t-test holds a modest power edge
(equivalent to a few percent of sample size). Under skew, heavy tails, or
ordinal scales, the t-test's error and power degrade while the rank test
holds steady. "Weaker" is conditional; on the data you actually have,
robustness often *is* the power.
<!-- /block -->
