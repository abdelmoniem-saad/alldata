<!-- block: gear, n: 1, label: "Twenty questions, played with data" -->

You have played this game: guess my animal, I answer yes or no. A
decision tree plays it with a dataset. "Is income above 60k?" "Is age
below 30?" Each answer routes the record down a branch; the leaf it
lands on is the prediction. The model is a flowchart learned from data,
which is why doctors, credit officers, and biologists can actually read
one.

---

<!-- block: gear, n: 2, label: "How splits get chosen" -->

The learning algorithm grows the tree greedily, top down. At each node
it tries every (feature, threshold) combination and keeps the split
that makes the children most *pure*: most of one class (for
classification, usually measured by Gini impurity or entropy) or with
the least within-branch variance (for regression). Repeat until the
leaves are pure or a stopping rule fires.

Purity is easy to win if you keep splitting: carve the data finely
enough and every leaf holds one point. That is the deep-tree trap, the
bias-variance tradeoff in its most literal costume. A deep tree has
almost no bias (it can carve any boundary) and enormous variance (the
exact carve depends on the exact sample; wiggle one training point and
the flowchart reshapes). Pruning, minimum leaf sizes, and depth limits
are variance control by another name.

---

<!-- block: gear, n: 3, label: "How deep is too deep" -->

<!-- block: decision, anchor: dt-pick -->
question: |
  Your tree's training accuracy is 99.8%, validation accuracy is 71%.
  The fix everyone reaches for first?
options:
  - id: a
    label: "Grow it deeper; it's almost perfect on training"
    writes: { complexity: 10 }
    response: |
      The curves just demonstrated the opposite: deeper is exactly how
      the train-error crept to 99.8 while the validation gap yawned.
      The tree is memorizing the sample, leaves carved around single
      points, and more depth sharpens the memorization.
  - id: b
    label: "Prune it: cap the depth, let the leaves be impure"
    writes: { complexity: 3 }
    response: |
      Correct, and the two curves are closing toward each other: a
      shallower tree must generalize within each leaf instead of
      special-casing individuals, so it trades a little training
      accuracy for a lot of validation stability. This is the
      bias-variance dial wearing bark.
  - id: c
    label: "Change the split criterion to entropy"
    writes: { complexity: 6 }
    response: |
      Gini and entropy produce nearly identical trees; the gap you are
      looking at is variance, not criterion. Switching the impurity
      measure is adjusting the coin flip on a rigged game.
correct: b
<!-- /block -->

<!-- block: plot, spec: bias_variance_curve, params: {complexity: 3}, binds: [complexity], anchor: dt-bv, mobile_order: 1 -->

The bias-variance picture with complexity = depth. Watch the two
curves: the tree is the rare model where you can watch overfitting
happen by scrolling a single number.

---

<!-- block: gear, n: 4, label: "The ensembles: two ways to buy stability" -->

A single tree is a volatile expert. Ensembles hire a committee, and
there are two philosophies for staffing it.

**Bagging (random forests)**: grow many deep trees on bootstrap
resamples of the data, with each split considering a random subset of
features, then average the votes. Deep trees are high-variance, low-bias
learners, and averaging independent high-variance estimates cancels the
variance while keeping the low bias. Forests are robust, hard to
misconfigure, and embarrassingly effective on tabular data.

**Boosting (gradient boosting, XGBoost, LightGBM)**: grow trees
*sequentially*, each new shallow tree fitting the residual errors the
committee so far leaves behind. Shallow trees are weak, high-bias
learners; boosting drives the bias down step by step. It wins
competitions, and it overfits with less warning, because each stage
leans harder on the previous stages' mistakes.

The bias-variance lens makes the two philosophies one sentence:
forests reduce variance of low-bias members, boosting reduces bias of
weak members.

<!-- block: fill_in, anchor: dt-fill -->
1. A tree splits greedily on purity, and depth is the honest dial between carving the sample and generalizing it.
2. Forests average many deep bootstrap trees, cancelling variance; boosting stacks many shallow trees, each fixing the last one's residuals.
3. Feature importance from a forest is a compass, not a map: it points where signal lives without certifying causation.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Grow one, prune one" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: dt-sim -->
```python
import numpy as np
from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import train_test_split

rng = np.random.default_rng(29)
X = rng.random((600, 2))
y = (X[:, 0] * 1.2 + rng.normal(0, 0.4, 600) > X[:, 1]).astype(int)

Xtr, Xva, ytr, yva = train_test_split(X, y, test_size=0.4, random_state=0)
for depth in (1, 3, 12):
    tree = DecisionTreeClassifier(max_depth=depth).fit(Xtr, ytr)
    print(f"depth={depth:>2}: train={tree.score(Xtr, ytr):.2f} "
          f"validation={tree.score(Xva, yva):.2f}")
# Depth 12 memorizes the training split and pays on validation.
# Depth 3 is the honest workhorse. The curves above, in numbers.
```

---

<!-- block: gear, n: 6, label: "Where this leads" -->

<!-- block: callout, kind: insight -->
**The tabular-data default.** On messy real-world tables with mixed
feature types, missing values, and interactions nobody wrote down,
gradient-boosted trees are the profession's quiet baseline. The
imbalanced-data topic next door tunes them for lopsided classes, and
the classification-metrics topic is how you'll judge the result.
<!-- /block -->

<!-- block: misconception, inline: true -->
**"Feature importance means these features cause the outcome."**

*Wrong:* a forest ranks income as the top predictor of default, so
income drives defaulting.

*Correct:* importance measures predictive contribution within the
training distribution, including contributions that ride on
correlations with true drivers. A proxy feature (zip code standing in
for wealth) can rank first while causing nothing. Importance is where
to look, and the causal-inference topic is about the claim it cannot
support.
<!-- /block -->
