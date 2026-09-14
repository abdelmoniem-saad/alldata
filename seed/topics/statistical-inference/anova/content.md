<!-- block: gear, n: 1, label: "Five fertilizers, one question" -->

A greenhouse tests five fertilizers on tomato yield. The obvious move is
ten pairwise t-tests. The obvious move is also a trap, and you already
know why: ten chances for one false star at the 0.05 level is about a 40%
family error rate before a single tomato is weighed.

---

<!-- block: gear, n: 2, label: "Between and within" -->

ANOVA asks one question of all groups at once: are the group means more
spread out than the noise inside the groups would predict? It splits the
total variability into two parts:

- **Between-group variation**: how far each group's mean sits from the
  grand mean. This grows when fertilizers genuinely differ.
- **Within-group variation**: the scatter of plants inside each group.
  This is the yardstick, the noise every effect has to clear.

Their ratio is the F statistic. If fertilizers do nothing, both estimate
the same noise variance and F hovers near 1. If treatments matter, the
between-part inflates and F climbs. The reference distribution is the F
curve you have already met, whose shape depends on two degrees of
freedom: $k - 1$ for the numerator (groups minus one) and $N - k$ for the
denominator (observations minus groups).

---

<!-- block: gear, n: 3, label: "Degree the test" -->

<!-- block: decision, anchor: anova-pick -->
question: |
  Your greenhouse has 5 fertilizers and 100 plants (20 per group).
  What are the F test's degrees of freedom?
options:
  - id: a
    label: "(4, 95)"
    writes: { df1: 4, df2: 95 }
    response: |
      Correct on both counts: k - 1 = 4 for the between-groups part, and
      N - k = 95 for the pooled within-group noise. The curve is the one
      your F statistic gets judged against. Now find where your computed
      F lands on it.
  - id: b
    label: "(5, 100)"
    writes: { df1: 5, df2: 100 }
    response: |
      Close but off by one on both, a classic slip. The numerator loses a
      degree because the grand mean is estimated first; the denominator
      loses five because each group's own mean is estimated. (4, 95) is
      the pair the table wants.
  - id: c
    label: "(4, 80)"
    writes: { df1: 4, df2: 80 }
    response: |
      The 4 is right. The 80 would follow if 20 plants were spent per
      group estimate, but the group means cost one degree each only in
      the within-group pool: 100 observations minus 5 fitted means is 95,
      not 80.
correct: a
<!-- /block -->

<!-- block: plot, spec: f_pdf, params: {df1: 4, df2: 95}, binds: [df1, df2], anchor: anova-f, mobile_order: 1 -->

The F(4, 95) reference curve, right-skewed with its bulk near 1. A world
of equal fertilizers produces F values from this shape; yours has to
wander into the far right tail to earn the word "different".

---

<!-- block: gear, n: 4, label: "The table, honestly read" -->

$$F = \frac{MS_{\text{between}}}{MS_{\text{within}}}
    = \frac{SS_{\text{between}} / (k-1)}{SS_{\text{within}} / (N-k)}$$

The one-way ANOVA table reports both sums of squares, both degrees of
freedom, both mean squares, and the F. Two cautions before you celebrate
a small p-value. First, the omnibus result says only "some difference
exists somewhere"; it does not say which fertilizers beat which. The
follow-up is pairwise comparison with a correction (Tukey's HSD is the
standard), which is gear-2's multiple-comparisons lesson wearing its work
clothes. Second, the F inherits the t-test's assumptions: roughly equal
group spreads and roughly normal residuals. Levene's test and a residual
plot are the cheap insurance.

<!-- block: fill_in, anchor: anova-fill -->
1. Ten pairwise t-tests at 0.05 carry about a 40% family error rate, which is why the omnibus test exists.
2. F is between-group mean square over within-group mean square, and F near 1 is what a null world produces.
3. A significant F sends you to corrected pairwise comparisons; it names no winner by itself.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Run one" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: anova-sim -->
```python
import numpy as np
from scipy import stats

rng = np.random.default_rng(3)
groups = [rng.normal(52, 4, 20), rng.normal(52, 4, 20),
          rng.normal(53, 4, 20), rng.normal(55, 4, 20),
          rng.normal(52, 4, 20)]

F, p = stats.f_oneway(*groups)
print(f"F = {F:.2f}, p = {p:.4f}")

# The omnibus truth: two groups differ by 3 (0.75 SD) and the test sees it.
# It will not tell you WHICH pair. Tukey's HSD names names.
try:
    from scipy.stats import tukey_hsd
    res = tukey_hsd(*groups)
    print(res.statistic.round(2))
except Exception:
    print("(post-hoc needs scipy >= 1.10)")
```

---

<!-- block: gear, n: 6, label: "Where this leads" -->

<!-- block: callout, kind: insight -->
**The F you already met.** You first saw this curve in the
f-distribution topic as "the overall-significance test in multiple
regression". It is the same animal: in regression the between-part is
"variance the predictors explain" and the within-part is the residual.
Two-way ANOVA and mixed models extend the same split to factors and
interactions.
<!-- /block -->

<!-- block: misconception, inline: true -->
**"A significant ANOVA means group A beats group B."**

*Wrong:* rejecting the F test's null identifies the pairs that differ.

*Correct:* the omnibus F tests the pooled claim "all five means are
equal". Its rejection says at least one mean is out of line, and nothing
more. Naming the guilty pairs requires corrected post-hoc comparisons,
which must carry their own multiple-comparisons correction to keep the
family error rate honest.
<!-- /block -->
