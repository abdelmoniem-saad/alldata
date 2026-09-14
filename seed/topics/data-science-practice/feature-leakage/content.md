<!-- block: gear, n: 1, label: "The 96% model that was a clerical error" -->

A hospital builds a readmission-risk model: 96% AUC, celebration, then
production failure at 60%. The audit found the reason in one feature:
`days_until_readmission`, computed *after* the patient was readmitted.
The target had leaked into the features through a join. The model hadn't
learned medicine; it had learned to read the answer key.

---

<!-- block: gear, n: 2, label: "What leakage is" -->

Leakage is any information in training that will not exist at
prediction time. It takes the same few costumes everywhere:

**Target leakage**: a feature contains the answer, directly (the
readmission column above) or through a side effect (a "treated with
insulin" flag implies the diabetes diagnosis). The give-away: one
feature towers over the others in importance, and the model is too good
by a suspicious margin.

**Preprocessing leakage**: statistics computed on the full dataset
before splitting. Impute with the *global* mean and the test rows have
already whispered their values into the training mean; scale with the
full-data standard deviation, select features on all rows, oversample
before folding, and the test set is contaminated by its own reflection.

**Temporal leakage**: the time-series lesson's hazard in pipeline
clothing. Training on 2022 with features derived from 2023 data, or
validating on the past while deploying on the future. In time-ordered
problems, the split must run forward.

---

<!-- block: gear, n: 3, label: "The mean you shouldn't have used" -->

<!-- block: decision, anchor: fl-pick -->
question: |
  Your dataset has missing incomes. You impute with the mean, then
  split into train and test, then cross-validate. Why is this leakage?
options:
  - id: a
    label: "The mean was computed from the test rows too"
    writes: { complexity: 8 }
    response: |
      Right, and the CV curve above is the confession: the imputed
      constant contains every row's observed income, including future
      test rows, so each test row has helped shape the value that
      fills its own gap. Flattered folds now, a production drop the
      day the constant goes stale.
  - id: b
    label: "It isn't; a constant is not information"
    writes: { complexity: 1 }
    response: |
      The cv_error_curve disagrees: train and validation errors sit
      suspiciously close, the signature of a pipeline that has already
      seen the future. A constant computed from all rows is a summary
      OF the test set, and summaries of the answer are the answer's
      shadow.
  - id: c
    label: "It is leakage only if the missing values were informative"
    writes: { complexity: 4 }
    response: |
      The missingness mechanism matters for a different decision
      (missing-data topic), but this leak fires regardless: the mean
      of the observed incomes includes the test rows' incomes, full
      stop. The fix is mechanical, impute with the train-fold mean,
      and it costs nothing to get right.
correct: a
<!-- /block -->

<!-- block: plot, spec: cv_error_curve, params: {complexity: 8}, binds: [complexity], anchor: fl-cv, mobile_order: 1 -->

Cross-validation's train and validation curves. Honest pipelines show a
gap you can reason about; leaked pipelines show the gap closing in
training while production diverges, and this plot is where that
pattern first shows itself.

---

<!-- block: gear, n: 4, label: "The discipline that makes it moot" -->

The fix is structural, not vigilance. Move every fitted step (imputer,
scaler, encoder, PCA rotation, feature selection, oversampling) into a
single pipeline object that refits inside each training fold, so the
validation folds are untouched by construction. sklearn's `Pipeline` +
`ColumnTransformer` exist precisely for this; the "fit on train,
transform everywhere" rule stops being a memory exercise and becomes
the shape of the code.

Feature engineering itself is the honest half of this topic, and it is
where most real model gains live: domain ratios (debt-to-income beats
debt and income separately), date decompositions (day-of-week from a
timestamp), aggregations with care (per-customer history is legitimate;
per-customer *target-derived* aggregates are the readmission column
again), and interaction terms the model would otherwise have to find by
brute force. The craft rule: engineer features you can defend as
available at prediction time, then let the pipeline handle their
statistics.

<!-- block: fill_in, anchor: fl-fill -->
1. Leakage is training information that will not exist at prediction time, and it inflates offline scores precisely where production fails.
2. Fitted preprocessing (means, scalers, encoders, rotations, oversampling) must be fit inside the training fold, never on the whole dataset.
3. The audit question for every feature is temporal: at the moment of prediction, could this value have existed?
<!-- /block -->

---

<!-- block: gear, n: 5, label: "See the score deflate" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: fl-sim -->
```python
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score

rng = np.random.default_rng(43)
y = (rng.random(3000) < 0.3).astype(int)
X = rng.normal(size=(3000, 5))

# A "feature" that is the target plus noise: leakage in its purest form.
leaky = np.column_stack([X, y + rng.normal(0, 0.3, 3000)])
for name, M in (("honest", X), ("leaky", leaky)):
    s = cross_val_score(LogisticRegression(), M, y, cv=5).mean()
    print(f"{name} features: CV accuracy = {s:.3f}")
# One leaked column moves the model from coin-flip to 90%+ while
# teaching it nothing that survives contact with production.
```

---

<!-- block: gear, n: 6, label: "Where this leads" -->

<!-- block: callout, kind: insight -->
**The capstone's through-line.** Every messy-analysis project in the
wild leaks somewhere: a date column that encodes the outcome, a
post-outcome survey merged onto pre-outcome rows, an imputer fit on
everything. The causal-inference topic next door extends the audit from
"what will exist at prediction time" to "what caused what", which is
the deeper half of the same skepticism.
<!-- /block -->

<!-- block: misconception, inline: true -->
**"Cross-validation prevents leakage."**

*Wrong:* k-fold CV is the mechanism that keeps test data honest, so any
pipeline scored by CV is clean.

*Correct:* cross-validation only protects the split it is given. If the
imputer, scaler, feature selection, or oversampling ran before the
folds were drawn, every fold already carries whole-dataset information
and CV faithfully reports a contaminated score. The pipeline must begin
inside the loop, which is exactly what the `Pipeline` object enforces.
<!-- /block -->
