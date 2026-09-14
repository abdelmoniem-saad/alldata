<!-- block: gear, n: 1, label: "The winning study" -->

Two teams both report p < 0.05. Team A's drug lowers blood pressure by 12
points. Team B's lowers it by 0.4 points. Only one of these papers changes
a doctor's prescription pad.

---

<!-- block: gear, n: 2, label: "Significant is not the same as big" -->

A p-value answers one question: if there were truly no effect, how
surprised would this data make us? It says nothing about how large the
effect is. With a big enough sample, a meaningless difference becomes
"statistically significant", because sampling noise gets crushed and even
a speck of a real effect stands out.

The size of the effect is a separate number, called the effect size, and
it needs its own reporting. The most common form for two-group
comparisons is Cohen's d: the gap between the group means, measured in
pooled standard deviations. d = 0.2 is small, d = 0.5 moderate, d = 0.8
large. Those landmarks are conventions, not laws; the right question is
always "is this effect big enough to matter in the world this decision
lives in?"

---

<!-- block: gear, n: 3, label: "How big is big?" -->

<!-- block: decision, anchor: es-pick -->
question: |
  A tutoring program raises test scores by 8 points, and scores have a
  standard deviation of 16. What is Cohen's d?
options:
  - id: a
    label: "0.5, half the standard deviation"
    writes: { mu: 0.5 }
    response: |
      Half, yes, but you divided by the wrong thing twice. d is the
      difference (8) divided by the pooled standard deviation (16), so
      d = 0.5. You get to keep this one.
  - id: b
    label: "0.125, the gap is an eighth of the spread"
    writes: { mu: 0.125 }
    response: |
      Correct, and the curve just told you so: an eighth of a standard
      deviation means the average treated student sits only slightly
      above the untreated middle. The distributions overlap almost
      completely. Whatever the p-value says, this program moves a
      student by a sliver.
  - id: c
    label: "8, the raw difference in points"
    writes: { mu: 8 }
    response: |
      That is the raw gap, and raw gaps are units: 8 IQ points and 8
      blood-pressure points are different animals. The whole point of d
      is to divide the gap by the spread so effects can be compared
      across studies. As a d value, 8 is not a thing.
correct: b
<!-- /block -->

<!-- block: plot, spec: gaussian_pdf, params: {mu: 0, sigma: 1}, binds: [mu, sigma], anchor: es-curve, mobile_order: 1 -->

The curve's center sits at the effect size you picked, in standard
deviation units. At d = 0.125 the treated distribution barely clears the
untreated one; slide to d = 0.8 and the separation becomes obvious even
before anyone computes a p-value.

---

<!-- block: gear, n: 4, label: "The definition" -->

$$d = \frac{\bar{x}_1 - \bar{x}_2}{s_{\text{pooled}}}$$

The pooled standard deviation

$$s_{\text{pooled}} = \sqrt{\frac{(n_1-1)s_1^2 + (n_2-1)s_2^2}{n_1+n_2-2}}$$

is a sample-size-weighted average of the two group spreads. Every term
here is observable from the data, which is exactly why effect sizes
belong in abstracts: a reader with only the paper can reconstruct how
much the intervention actually moved people.

A useful companion number is the probability of superiority: the chance
that a random treated individual outscores a random untreated one. It is
$\Phi(d/2^{1/2})$ under normality, about 0.56 at d = 0.2, 0.64 at d =
0.5, 0.71 at d = 0.8. Even a "large" effect leaves a lot of overlap.

<!-- block: fill_in, anchor: es-fill -->
1. The p-value is a function of the effect size AND the sample size, so a tiny d with a huge n still earns stars.
2. The effect size isolates the part a reader can act on: how much the treatment moves the outcome, in spread units.
3. Reporting d alongside p makes the paper honest about both questions: is there an effect, and is it big enough to matter.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Compute one" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: es-sim -->
```python
import numpy as np

rng = np.random.default_rng(7)

def cohens_d(a, b):
    na, nb = len(a), len(b)
    sp = np.sqrt(((na - 1) * a.std(ddof=1)**2 + (nb - 1) * b.std(ddof=1)**2) / (na + nb - 2))
    return (a.mean() - b.mean()) / sp

# Two studies, same true effect (0.3 SD), wildly different samples.
big = [rng.normal(0.3, 1, 2000), rng.normal(0.0, 1, 2000)]
small = [rng.normal(0.3, 1, 8), rng.normal(0.0, 1, 8)]

for name, (a, b) in [("n=2000 per arm", big), ("n=8 per arm", small)]:
    d = cohens_d(a, b)
    print(f"{name}: d = {d:+.2f}")
# The big study's d lands near the truth. The small one's d is a lottery
# ticket that can read 1.2 on a lucky draw, which is small samples
# manufacturing both significance AND drama.
```

---

<!-- block: gear, n: 6, label: "Where this leads" -->

<!-- block: callout, kind: insight -->
**Pair it with power.** Effect size and sample size are the two inputs of
the power calculation, so the d you expect to find determines how many
people you need. And when you read a meta-analysis someday, it is Cohen's
d (or its cousins) that lets twenty studies with different scales and
sample sizes speak with one voice.
<!-- /block -->

<!-- block: misconception, inline: true -->
**"If it's statistically significant, it's important."**

*Wrong:* a p-value below 0.05 certifies that an effect matters.

*Correct:* significance certifies that the effect is distinguishable from
noise at this sample size. With n = 10,000, a 0.1-point difference on a
100-point exam can clear that bar easily. The effect size, not the
p-value, is the number that says whether the difference is worth the
intervention's cost.
<!-- /block -->
