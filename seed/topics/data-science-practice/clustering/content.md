<!-- block: gear, n: 1, label: "Structure without a teacher" -->

Every model so far learned from answers: a target column, labeled rows.
Clustering is the other game: no labels, just points, and the question
"do these customers, genes, or stars fall into natural groups?" The
algorithm must invent the groups, which makes it powerful and makes it
dangerous, because it will always invent *something*.

---

<!-- block: gear, n: 2, label: "k-means, the workhorse" -->

k-means is the algorithm you'll meet first, and its recipe is almost
suspiciously simple. Pick k centers at random. Assign every point to
its nearest center. Move each center to the mean of its members.
Repeat until nothing moves. It converges to a local optimum of one
objective: minimize the within-cluster sum of squared distances.

That objective shapes what k-means can and cannot see. It prefers
round-ish, similarly-sized blobs; elongated or nested shapes defeat it.
It is sensitive to the starting centers (k-means++ fixes the worst of
that) and it demands that you choose k in advance, which smuggles the
hardest question into the setup: what if the data has 4 natural groups
and you said 3?

The deeper trap is subtler. k-means on *uniform noise* still returns k
tidy clusters, each with a confident centroid. The algorithm cannot
report "actually, there is no structure here"; it reports structure by
construction. Every clustering result needs the follow-up question:
would this pattern survive a sensible skeptic?

---

<!-- block: gear, n: 3, label: "Do you still see two?" -->

<!-- block: decision, anchor: cl-pick -->
question: |
  Two customer groups sit at 20 and 40 on a satisfaction axis. The
  within-group spread grows from 2 to 8 points. At which spread do the
  "two clusters" stop being defensible?
options:
  - id: a
    label: "Spread 2; tight and obviously two"
    writes: { sigma: 2 }
    response: |
      At sigma = 2 the histogram is two clean peaks with a valley
      between them: two modes, and the eye agrees with k-means. This
      is the case where clustering is honest description, not
      invention.
  - id: b
    label: "Spread 8; the peaks have merged"
    writes: { sigma: 8 }
    response: |
      Correct, and the histogram shows it: one broad hump, no valley.
      k-means with k = 2 will still draw a boundary and report two
      clusters with confident centroids, but the data no longer shows
      two populations, it shows one spread-out population. The
      algorithm's output has outrun the evidence.
  - id: c
    label: "Spread 4; halfway is still two"
    writes: { sigma: 4 }
    response: |
      The dip is fading but still there: a shallow valley between two
      shoulders. This is the honest gray zone where the right answer is
      "weak structure", which is exactly the phrase k-means cannot say.
      Report the ambiguity or collect more data; don't round it up.
correct: b
<!-- /block -->

<!-- block: plot, spec: empirical_histogram, params: {mu: 30, sigma: 2}, binds: [mu, sigma], anchor: cl-hist, mobile_order: 1 -->

The satisfaction distribution as the spread grows. Two peaks, then
shoulders, then one hump: the visual test for whether "two groups" is a
discovery or a decision you imposed.

---

<!-- block: gear, n: 4, label: "Choosing k without fooling yourself" -->

The standard tool, the elbow or silhouette method, plots a cluster-
quality score against k and looks for the bend. It helps, but remember
the asymmetry: more k always improves the fit score on the data you
already have (more centroids, shorter distances), which is training
error wearing a clustering costume. The defenses that actually work:
validate clusters the way you validate models, on data they didn't see
(do the same groups emerge in a second sample?); check that cluster
membership predicts something you care about outside the clustering
variables (retention, response to treatment); and eyeball the
silhouette widths for clusters that are only notional.

Alternatives worth knowing by name: DBSCAN (clusters by density, finds
arbitrary shapes, labels outliers as noise), and hierarchical clustering
(a dendrogram of merges you cut at any level, standard in genomics).

<!-- block: fill_in, anchor: cl-fill -->
1. k-means alternates assign-and-move, minimizing within-cluster squared distance to k centers you chose.
2. The algorithm always returns k clusters; whether the data contains k populations is your question to answer separately.
3. Validation is external: does the structure reappear in new data, and does it predict anything beyond the variables you clustered on?
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Watch the merge" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: cl-sim -->
```python
import numpy as np
from sklearn.cluster import KMeans

rng = np.random.default_rng(31)
for sigma in (2.0, 4.0, 8.0):
    a = rng.normal(20, sigma, 200)
    b = rng.normal(40, sigma, 200)
    pts = np.column_stack([np.r_[a, b], rng.normal(0, sigma, 400)])
    km = KMeans(n_clusters=2, n_init=10).fit(pts)
    agree = (km.labels_[:200] == km.labels_[200]).mean()
    print(f"sigma={sigma:.0f}: k-means purity vs truth = {1 - agree:.2f}")
    # At sigma=2 the labels recover the truth; at sigma=8 the two
    # "clusters" are a coin flip against reality. The algorithm never
    # says so. You just did.
```

---

<!-- block: gear, n: 6, label: "Where this leads" -->

<!-- block: callout, kind: insight -->
**Unsupervised as pre-processing.** Clusters often serve downstream
models: segment-then-predict pipelines, anomaly detection (points far
from every centroid), and the dimensionality-reduction topic next door,
which solves a different unsupervised question: not "which groups" but
"which directions carry the story".
<!-- /block -->

<!-- block: misconception, inline: true -->
**"k-means found 3 clusters, so there are 3 groups in the data."**

*Wrong:* the algorithm's output is a measurement of the data's structure.

*Correct:* k-means always outputs exactly k clusters, on any data,
including uniform noise; k was your input, not its finding. The map
above is the check that matters: structure is what survives the spread
test, the re-run test, and the does-it-predict-anything-else test. An
algorithm that cannot output "nothing here" cannot be your evidence
that something is here.
<!-- /block -->
