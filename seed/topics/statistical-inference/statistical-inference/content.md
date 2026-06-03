<!-- block: graph_view, target: statistical-inference, anchor: fam-inf-start, mobile_order: 1 -->

Inference is the move from a sample to a claim about the world it came from. You never see the whole population; you see a slice, and you want to say something honest about the rest. Everything in this family is machinery for quantifying what you can — and can't — conclude from limited data.

The cluster behind these words is the inference arm of the graph.

---

<!-- block: graph_view, target: point-estimation, anchor: fam-inf-point -->

## Point estimation

Turning a sample into a single best guess for a population number — a mean, a proportion, a rate — and then asking the harder question: how good is that guess? Bias and variance enter here.

---

<!-- block: graph_view, target: sampling-distributions, anchor: fam-inf-sampling -->

## Sampling distributions

The idea that makes inference possible: your estimate is itself random. Collect a different sample and you'd get a different number. The distribution of the estimate across all the samples you *could* have drawn is what lets you attach uncertainty to a single one.

---

<!-- block: graph_view, target: confidence-intervals, anchor: fam-inf-ci -->

## Confidence intervals

Instead of one number, a range of plausible values — with a calibrated sense of how often the method captures the truth. The subtle part is what the confidence level describes: the procedure, not any single interval.

---

<!-- block: graph_view, target: hypothesis-testing, anchor: fam-inf-ht -->

## Hypothesis testing

A disciplined way to ask whether an effect is real or could just be chance, and to name the two errors you're trading off when you decide. Most of statistics' bad reputation comes from people running tests without knowing they're running one.

---

<!-- block: graph_view, target: p-values, anchor: fam-inf-pvalues -->

## P-values

The most-cited and most-misread number in science. A p-value is the probability of data this extreme *if the null were true* — not the probability the null is true. Getting that distinction right is half of statistical literacy.

---

<!-- block: graph_view, target: statistical-inference, anchor: fam-inf-end -->

## Where to start

Follow the chain: [point estimation](/topic/point-estimation) → [sampling distributions](/topic/sampling-distributions) → [confidence intervals](/topic/confidence-intervals) and [hypothesis testing](/topic/hypothesis-testing) → [p-values](/topic/p-values). Sampling distributions is the keystone — if one idea here clicks, make it that one.
