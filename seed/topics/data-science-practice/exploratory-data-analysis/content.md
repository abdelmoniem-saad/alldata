<!-- block: state, values: {mu: 450, sigma: 120} -->

<!-- block: plot, spec: empirical_histogram, params: {mu: 450, sigma: 120}, binds: [mu, sigma], anchor: eda-hist, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "Look before you model" -->

# Exploratory data analysis

Before any model is fit, look at the data. **EDA** is the discipline of summarizing, plotting, and interrogating a dataset *before* making assumptions: What shape are the distributions? Where are the gaps and outliers? Which variables move together? Tukey, who named the practice, put the stakes plainly — an approximate answer to the right question beats an exact answer to the wrong one. EDA is how you find the right question.

---

<!-- block: gear, n: 2, label: "The workflow" -->

A reliable EDA pass runs the same five stations every time:

1. **Summary statistics** — mean, median, SD, min/max, quartiles. Cheap, and the mean-vs-median gap alone diagnoses skew.
2. **Univariate plots** — a histogram per variable. Shape first: skewed? bimodal? truncated?
3. **Bivariate plots** — scatters and a correlation matrix. How do variables relate?
4. **Missing-data audit** — where are the holes, and do they cluster?
5. **Outlier check** — which points are extreme, and are they errors or signal?

The golden rule: **plot before you compute.** Anscombe's quartet — four datasets with identical summary statistics and wildly different shapes — is the standing proof that numbers alone mislead.

---

<!-- block: gear, n: 3, label: "Mean 450, median 320 — now what?" -->

The histogram shows a sample of house prices (in $k). Your summary table says **mean = \$450k** but **median = \$320k** — a huge gap.

<!-- block: decision, anchor: eda-center -->
question: |
  The mean is far above the median. What does that tell you about the shape,
  and which number should headline your report?
options:
  - id: symmetric
    label: "Nothing special — report the mean, it uses all the data"
    writes: { mu: 450, sigma: 120 }
    response: |
      The gap *is* the signal. In a symmetric distribution mean ≈ median; a
      mean 40% above the median means something is dragging it up. Reporting
      the mean as "the typical house" would mislead — most houses cost well
      under $450k.
  - id: skewed
    label: "Right-skewed — a few expensive houses drag the mean up; report the median"
    writes: { mu: 320, sigma: 90 }
    response: |
      Exactly — and the view recenters on the typical home. A long right tail
      of mansions pulls the mean far above where most houses actually sit.
      The median resists outliers, so it's the honest "typical" here. First
      plot to make: this histogram; likely transform for modeling: a log.
  - id: error
    label: "The data must be corrupted — investigate before summarizing"
    writes: { mu: 450, sigma: 120 }
    response: |
      Healthy instinct, wrong conclusion. Mean ≫ median is the *expected*
      signature of prices, incomes, and most bounded-below quantities — a
      legitimate right skew, not corruption. (Checking a few extreme rows
      never hurts, but this pattern alone isn't an alarm.)
correct: skewed
<!-- /block -->

<!-- block: callout, kind: insight, depends_on: eda-center, branch: skewed -->
This one comparison — mean against median — is the highest-value 10 seconds in EDA. It costs nothing, runs on any numeric column, and immediately tells you whether the "average" you're about to report describes the typical case or a tail.
<!-- /block -->

---

<!-- layer: formal -->

<!-- block: gear, n: 4, label: "The numbers behind the look" -->

- **Five-number summary:** $(\min, Q_1, \text{median}, Q_3, \max)$; the box plot is its picture. **IQR** $= Q_3 - Q_1$.
- **Tukey's fences:** flag $x < Q_1 - 1.5\,\text{IQR}$ or $x > Q_3 + 1.5\,\text{IQR}$ as outliers — a screening rule, not a verdict.
- **Skewness** $\gamma_1 = \mathbb{E}\big[\big(\tfrac{X-\mu}{\sigma}\big)^3\big]$: positive → long right tail (and mean > median); negative → the reverse.

<!-- block: derivation, title: "Why the mean chases the tail", collapsed: true -->
The mean minimizes squared distance to the data, so each point pulls on it with leverage proportional to its *distance* — a \$3M mansion tugs the mean 10× harder than a \$300k overestimate tugs back. The median minimizes *absolute* distance: every point pulls equally hard regardless of how far it sits. That's the whole robustness story — squared loss chases tails, absolute loss doesn't.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Run a first-look pass" -->

<!-- block: code_python, editable: true, auto_run: true, anchor: eda-code -->
```python
import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(42)
# A realistic student dataset: skewed study hours, normal-ish sleep, a score
# driven by both — plus a few missing sleep values, as real data always has.
n = 200
study = np.clip(rng.exponential(3, n) + 1, 0.5, 15)          # right-skewed
sleep = np.clip(rng.normal(7, 1.5, n), 3, 12)
score = np.clip(40 + 3 * study + 2 * sleep + rng.normal(0, 8, n), 0, 100)
sleep[rng.choice(n, 10, replace=False)] = np.nan              # missing values

fig, ax = plt.subplots(2, 2, figsize=(11, 7))
ax[0, 0].hist(score, bins=25, color="#14b8a6", alpha=0.8)
ax[0, 0].axvline(score.mean(), ls="--", c="tomato", label=f"mean {score.mean():.0f}")
ax[0, 0].axvline(np.median(score), ls="--", c="seagreen", label=f"median {np.median(score):.0f}")
ax[0, 0].set_title("Scores"); ax[0, 0].legend(fontsize=8)
ax[0, 1].hist(study, bins=25, color="#71717a", alpha=0.8)
ax[0, 1].set_title("Study hours — right-skewed")
ax[1, 0].scatter(study, score, s=14, alpha=0.5, color="#14b8a6")
ax[1, 0].set_title(f"Study vs score  (r = {np.corrcoef(study, score)[0,1]:.2f})")
ok = ~np.isnan(sleep)
ax[1, 1].scatter(sleep[ok], score[ok], s=14, alpha=0.5, color="#71717a")
ax[1, 1].set_title(f"Sleep vs score  (r = {np.corrcoef(sleep[ok], score[ok])[0,1]:.2f})")
plt.tight_layout(); plt.show()

print(f"{n} rows; missing sleep: {int(np.isnan(sleep).sum())}")
print(f"study hours: mean {study.mean():.2f} vs median {np.median(study):.2f}  -> right skew, consider log")
```

Four plots and three printed lines already surface the skew, the relationships, and the missing values — everything a model would otherwise trip over silently.

---

<!-- block: misconception, inline: true -->
**"EDA is just making pretty charts before the real work."**

*Wrong:* exploration is a warm-up; modeling is the analysis.

*Correct:* EDA routinely produces the most important findings — data-entry errors, leaking variables, violated assumptions, the wrong question being asked. A model inherits every problem the EDA pass didn't catch; sloppy looking guarantees sloppy modeling. Practitioners spend most of their time here precisely because it's where analyses are won or lost.
<!-- /block -->

---

<!-- layer: both -->

<!-- block: gear, n: 6, label: "Where it leads" -->

<!-- block: callout, kind: insight -->
**Where this leads.** EDA consumes what [**data wrangling**](/topic/data-wrangling) cleans, and the gaps it surfaces are handled in [**missing data**](/topic/missing-data). The shapes you eyeball here are the **distributions** cluster made precise; the pairwise relationships are [**correlation**](/topic/correlation) and the doorway to **regression**.
<!-- /block -->
