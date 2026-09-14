<!-- block: gear, n: 1, label: "The model that is 99% accurate and useless" -->

Fraud is 1% of transactions. A "model" that predicts *never fraud* is
99% accurate. It has also never caught a single fraud. Accuracy, the
first metric everyone reaches for, collapses the moment the classes are
uneven, and the classes are uneven almost always: fraud, disease
screening, churn, defects, clicks.

---

<!-- block: gear, n: 2, label: "The confusion matrix, read as costs" -->

Every classifier produces four counts. **True positives** (caught
fraud), **false positives** (innocent customers flagged), **false
negatives** (fraud that sailed through), **true negatives** (everyone
correctly waved through). All the interesting metrics are ratios over
these four cells, and each ratio answers a different stakeholder's
question:

$$\text{Precision} = \frac{TP}{TP + FP} \qquad
  \text{Recall} = \frac{TP}{TP + FN}$$

Precision speaks for the alarm: when it rings, how often is it right?
Recall speaks for the event: of all the fraud out there, how much did we
catch? They trade against each other through the decision threshold.
Lower the threshold and the net widens: recall climbs, precision sags.
Raise it and the model gets picky. There is no "best", only the
operating point your costs demand: a cancer screen wants recall
(missing a case is catastrophic), a spam filter wants precision (a
lost job offer is worse than ten spam emails).

The **ROC curve** plots true-positive rate against false-positive rate
as the threshold sweeps, and its area (AUC) has a beautiful
interpretation: the probability that a random positive scores above a
random negative. 0.5 is coin-flipping, 0.9 means the distributions
barely overlap. Unlike accuracy, AUC is threshold-free, which is why it
compares models fairly across operating points.

---

<!-- block: gear, n: 3, label: "Read the operating point" -->

<!-- block: decision, anchor: cm-pick -->
question: |
  A hospital deploys the sepsis early-warning model. Missing a case
  costs a life; a false alarm costs an extra lab panel. Which metric
  should the team tune for?
options:
  - id: a
    label: "Precision; alarms must be trustworthy"
    writes: { pattern: "conservative" }
    response: |
      The fit slid to the conservative corner, and that choice has a
      body count here: precision-first means many quiet misses, and a
      missed sepsis case is the one error this hospital cannot afford.
      Trustworthy alarms are the wrong priority when the cost matrix is
      lopsided this way.
  - id: b
    label: "Recall; misses are the expensive error"
    writes: { pattern: "aggressive" }
    response: |
      Correct, and the scatter shows the price you accepted: more false
      alarms, more lab panels, more alarm fatigue to manage. That is
      the right trade when one false negative is a catastrophe and a
      false positive is paperwork. The metric follows the cost matrix,
      never the other way round.
  - id: c
    label: "Accuracy; it summarizes everything"
    writes: { pattern: "random" }
    response: |
      The plot went to noise, which is what accuracy does to the
      decision: sepsis is rare, so a model that never alarms is 99%+
      accurate and lethal. This is gear 1's trap, now in a hospital.
correct: b
<!-- /block -->

<!-- block: plot, spec: residual_plot, params: {pattern: "random"}, binds: [pattern], anchor: cm-resid, mobile_order: 1 -->

A stand-in for the threshold sweep: each pattern is an operating
personality. Aggressive nets catch everything and cry wolf; conservative
ones stay quiet and miss. The curve you care about lives in the ROC
plane, not in a single accuracy number.

---

<!-- block: gear, n: 4, label: "Reading the trade honestly" -->

Three habits separate practitioners from leaderboard chasers. Report
the confusion matrix at the deployed threshold, not the threshold that
made the chart pretty. Choose the threshold from the cost matrix, with
the people who live with the errors. And when classes are wildly
imbalanced, consider precision-recall curves instead of ROC: with 1%
positives, the false-positive-rate axis has room for so few true
negatives that ROC can flatter a weak model, while the PR curve tells
the grim truth.

<!-- block: fill_in, anchor: cm-fill -->
1. Accuracy collapses on imbalanced classes; the majority class alone can hand a useless model a great score.
2. Precision and recall are the two costs of the threshold, and every deployment picks its point on that trade.
3. AUC is threshold-free and reads as the pairwise ranking probability, which is why it compares models rather than deployments.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Feel the trade" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: cm-sim -->
```python
import numpy as np

rng = np.random.default_rng(23)
y = (rng.random(10_000) < 0.02)          # 2% fraud
score = rng.random(10_000) + y * 0.3     # weak but real signal

for thr in (0.3, 0.5, 0.7):
    pred = score > thr
    tp, fp = (pred & y).sum(), (pred & ~y).sum()
    fn = (~pred & y).sum()
    print(f"thr={thr}: precision={tp/max(tp+fp,1):.2f} "
          f"recall={tp/(tp+fn):.2f} caught={tp} missed={fn}")
# Slide the threshold and watch the trade: the net widens and narrows.
# No threshold dominates; the cost matrix picks.
```

---

<!-- block: gear, n: 6, label: "Where this leads" -->

<!-- block: callout, kind: insight -->
**The evaluation habit.** Cross-validation told you how to test fairly;
this topic tells you what to measure. The imbalanced-data topic extends
the toolbox to the sampling side (oversampling, class weights), and the
bias-variance topic explains why chasing the last point of AUC is often
fitting noise.
<!-- /block -->

<!-- block: misconception, inline: true -->
**"AUC 0.9 means the model is 90% accurate."**

*Wrong:* the area under the ROC curve converts directly into a
percent-correct on predictions.

*Correct:* AUC 0.9 means a random positive scores above a random
negative 90% of the time, a statement about ranking, not about any
deployed threshold. A model with AUC 0.9 can be 60% accurate, 40%
accurate, or 99% accurate depending on where the operating point sits
and how imbalanced the classes are.
<!-- /block -->
