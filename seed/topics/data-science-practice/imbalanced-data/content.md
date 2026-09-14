<!-- block: gear, n: 1, label: "The 94% solution" -->

Churn is 6% of customers. A model that says "nobody churns" scores 94%
and has learned nothing. The gradient-boosted tree you trained is
cleverer than that, but not always by much: on hard problems with 99:1
class ratios, models converge toward the majority class because the
loss function is mostly counting the majority's opinions.

---

<!-- block: gear, n: 2, label: "Why the loss doesn't care" -->

Training minimizes total error, and total error is dominated by the
class that has all the rows. A model sacrificing 1% of accuracy (all of
it minority mistakes) to gain a little majority accuracy comes out
ahead in the arithmetic and behind in the mission. The gradient of the
loss barely notices the minority class exists.

The symptom set: validation accuracy that looks great, recall near
zero, a model whose probability outputs bunch well below 0.5 even for
obvious minority cases (the class prior drags the calibration), and
decision thresholds that, left at the default 0.5, predict the majority
class almost always.

---

<!-- block: gear, n: 3, label: "Rebalance on purpose" -->

<!-- block: decision, anchor: im-pick -->
question: |
  Your fraud model at the default threshold catches almost nothing
  (fraud is 1% of rows). The cheapest effective fix?
options:
  - id: a
    label: "Collect 99x more fraud-free transactions"
    writes: { prior: 0.5 }
    response: |
      The grid just showed the opposite prescription: rebalancing toward
      50/50 makes every fraud signal worth a hundred times more to the
      loss. Collecting more *majority* rows deepens the imbalance you
      are trying to escape.
  - id: b
    label: "Rebalance: class weights, oversampling, or undersampling"
    writes: { prior: 0.01 }
    response: |
      Correct, and the grid shows the honest version of it: the
      prevalence stays 1% in reality, but the model now feels each
      fraud row's weight. Class weights do it in the loss,
      oversampling duplicates minority rows, undersampling thins the
      majority, and the metric to watch afterwards is precision-recall,
      not accuracy.
  - id: c
    label: "Lower the threshold from 0.5 to 0.01 and ship"
    writes: { treatment_strategy: "aggressive" }
    response: |
      The net widened, and that is half a fix: threshold moves change
      the operating point but not what the model learned. If the
      probabilities themselves were dragged toward the majority class,
      no threshold ordering can recover the lost signal. Rebalance the
      training, then choose the threshold.
correct: b
<!-- /block -->

<!-- block: plot, spec: population_dot_grid, params: {prior: 0.01, sensitivity: 0.8, specificity: 0.9, treatment_strategy: "none"}, binds: [prior, sensitivity, specificity, treatment_strategy], anchor: im-grid, mobile_order: 1 -->

The population grid at 1% prevalence. The strategy binding is your
threshold personality; the prior binding is the world you are pretending
to train in, and the mismatch between the two is the whole topic.

---

<!-- block: gear, n: 4, label: "The fix menu, with side effects" -->

**Class weights**: multiply the minority's loss contribution (sklearn's
`class_weight="balanced"` sets weights inversely proportional to class
frequency). No data is invented or destroyed; the model just pays more
attention. Usually the first thing to try.

**Oversampling (SMOTE)**: synthesize new minority rows between existing
neighbors. Gives the loss more minority gradient to learn from, but
synthetic points can blur the real decision boundary, and it must be
applied *inside* the CV folds, never before splitting (oversampled
copies leaking across folds is textbook leakage).

**Undersampling**: thin the majority to balance. Wastes data, but with
millions of majority rows it is free.

**Threshold moving**: free, post-hoc, and honest about being a
deployment choice rather than a learning fix. Pair it with class
weights, don't substitute it.

Whichever you pick, validate with the classification-metrics toolkit on
the *natural* distribution: rebalance training, never rebalance the
test set.

<!-- block: fill_in, anchor: im-fill -->
1. The loss counts rows, so a 99:1 imbalance makes the minority class a rounding error in the gradient.
2. Rebalancing (weights, SMOTE, undersampling) changes what training cares about; threshold moving changes only where you cut.
3. Rebalance inside the CV folds, evaluate on natural data, and judge with precision-recall, not accuracy.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Watch the prior work" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: im-sim -->
```python
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split

rng = np.random.default_rng(41)
X = rng.normal(size=(20_000, 5))
y = (X[:, 0] * 1.5 + rng.normal(0, 1, 20_000) > 2.9).astype(int)  # ~2% fraud

Xtr, Xva, ytr, yva = train_test_split(X, y, test_size=0.3, stratify=y)
for weight in (None, "balanced"):
    m = LogisticRegression(max_iter=2000, class_weight=weight).fit(Xtr, ytr)
    pred = m.predict(Xva)
    tp, fn = ((pred == 1) & (yva == 1)).sum(), ((pred == 0) & (yva == 1)).sum()
    print(f"weight={weight!s:>8}: caught {tp}/{tp+fn} frauds, "
          f"false alarms {(pred == 1).sum() - tp}")
# Unweighted: catches almost nothing. Balanced: catches real fraud at
# the cost of false alarms, which was the trade you came to make.
```

---

<!-- block: gear, n: 6, label: "Where this leads" -->

<!-- block: callout, kind: insight -->
**Anomaly detection is the limit case.** When the minority is 0.01%, even
rebalancing strains, and the framing shifts from classification to
detection: model the normal world and flag departures (isolation
forests, autoencoder reconstruction error). The cost-matrix thinking
from classification-metrics is what keeps the framing honest.
<!-- /block -->

<!-- block: misconception, inline: true -->
**"Oversampling before splitting is fine as long as you don't touch the test set."**

*Wrong:* SMOTE on the full training pool, then cross-validating, is
standard practice and leak-free.

*Correct:* SMOTE creates new points *between* existing minority rows.
If a validation-fold minority row helped synthesize a training point,
the fold is contaminated: the model was shown a blurred copy of the
answer. Resampling must live inside each fold's training portion, which
is what imbalanced-learn's pipeline support exists to enforce.
<!-- /block -->
