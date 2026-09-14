<!-- block: gear, n: 1, label: "Fifty columns, one story" -->

A survey has 50 correlated questions. A sensor logs 30 channels that
move together. You suspect the real dimensionality is smaller: the
columns are many, but the *story* has few actors. Dimensionality
reduction is the search for those actors, and PCA (principal component
analysis) is its standard instrument.

---

<!-- block: gear, n: 2, label: "Rotate until the story shows" -->

PCA does one geometric thing: it rotates the axes of your data to line
up with the directions of greatest spread. The first principal
component is the single direction along which the cloud is most
stretched. The second is the most-stretched direction *perpendicular to
the first*, the third perpendicular to both, and so on, each component
a weighted combination of your original columns.

Two properties make the output usable. The components are ordered: the
variance each explains only shrinks, so "keep the first k" is a
well-defined compression. And the components are uncorrelated by
construction, which untangles the multicollinearity that plagued your
multiple regressions: fifty correlated survey items become a handful of
clean scores, often interpretable after a squint at their loadings
("component 2 loads positively on income, education, and age... call it
socioeconomic status", at your own interpretive risk).

The honest accounting is variance explained, and its units are the
original variables' units, squared. "The first component explains 60%"
means: projecting onto this one direction retains 60% of the total
spread. It does *not* mean 60% of the information, not 60% of the
predictive power, and not 60% of the story's meaning, three claims the
next gear separates.

---

<!-- block: gear, n: 3, label: "How many components?" -->

<!-- block: decision, anchor: dr-pick -->
question: |
  Ten features, and the first four PCA components explain 45%, 25%,
  12%, 8% of the variance (the rest trail at 3% each). You're
  compressing for a downstream model. How many do you keep, and on
  what grounds?
options:
  - id: a
    label: "Keep 4, the components with double-digit shares"
    writes: { controlled: 1 }
    response: |
      A defensible cut, and the plot shows the marginal contribution
      collapsing: after component 4 each new direction adds about as
      much spread as the noise floor. The round-number reading of the
      scree plot is the standard first answer.
  - id: b
    label: "Keep 10; never throw away variance before the model asks"
    writes: { controlled: 10 }
    response: |
      The plot flatlines: components 5 through 10 add nothing but
      dimensions. Keeping them defeats the purpose (you built ten
      orthogonal columns to replace ten correlated ones), and hands
      the downstream model ten mostly-noise directions to overfit.
  - id: c
    label: "Keep 2; only the big ones matter"
    writes: { controlled: 2 }
    response: |
      Cheap, but the plot disagrees: component 3 and 4 still carry
      12% and 8%, real spread the downstream model could use.
      Cut at the bend in the scree curve, not at the first two bars.
correct: a
<!-- /block -->

<!-- block: plot, spec: added_variable_plot, params: {controlled: 1}, binds: [controlled], anchor: dr-avp, mobile_order: 1 -->

The marginal-value view: what each additional component contributes
once the earlier ones are kept. PCA's scree plot is this idea in its
native dialect, and the bend is where compression stops being lossy.

---

<!-- block: gear, n: 4, label: "Cautions that earn their keep" -->

Scale first: PCA is variance-hungry, and a feature measured in
thousands will dominate one measured in fractions unless everything is
standardized; this is the most common silent PCA bug. Fit the rotation
on training data only and apply it to validation (rotations learned
from the test set are leakage in rotation clothing). And mind the
interpretation trap: components are mathematical directions, not latent
causes; the socioeconomic-status story is a hypothesis you test, not
something PCA certified.

Beyond PCA, know the names: t-SNE and UMAP for visualization (they
preserve neighborhoods, not variance, and their cluster pictures flatter
unless you check), and autoencoders (neural compression) when linear
directions won't do.

<!-- block: fill_in, anchor: dr-fill -->
1. PCA rotates the axes to the directions of greatest spread, ordered, orthogonal, and linear in the original columns.
2. "Explains X% of variance" is a statement about retained spread, not about information or predictive power.
3. Standardize before rotating; fit the rotation on train only; interpret loadings as hypotheses, not findings.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Compress and check" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: dr-sim -->
```python
import numpy as np
from sklearn.decomposition import PCA

rng = np.random.default_rng(37)
latent = rng.normal(0, 1, (500, 1))            # one true driver
X = latent + 0.3 * rng.normal(size=(500, 8))   # eight noisy views of it

pca = PCA().fit(X)
shares = pca.explained_variance_ratio_.round(2)
print("variance shares:", shares)

X1 = PCA(n_components=1).fit_transform(X)      # the whole story, one column
print("corr(X1, latent):", round(abs(np.corrcoef(X1[:, 0], latent[:, 0])[0, 1]), 3))
# Eight features, one actor. The first component recovers the latent
# driver almost perfectly; the other seven were echoes of it.
```

---

<!-- block: gear, n: 6, label: "Where this leads" -->

<!-- block: callout, kind: insight -->
**A cure for multicollinearity, with a price.** Regularization handled
correlated predictors by shrinking; PCA handles them by rotating into
uncorrelated coordinates. The price is interpretability: "component 2"
has no units your stakeholder knows. Feature engineering and leakage
(coming next) adds the rule that makes or breaks PCA pipelines: the
rotation is part of the model, and it learns from training data only.
<!-- /block -->

<!-- block: misconception, inline: true -->
**"PCA finds the important variables."**

*Wrong:* the top components identify which original features matter
most; drop the rest.

*Correct:* components are combinations of all features, not a feature
selection. The first component might load on eight columns at once; a
variable with a huge loading there is not "important" on its own, and a
variable with near-zero loadings everywhere may still be the one that
predicts your (unsupervised!) target. PCA preserves variance, and
variance is not importance: the target-relevant signal can hide in the
1% component you dropped.
<!-- /block -->
