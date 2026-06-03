<!-- block: graph_view, target: distributions, anchor: fam-dist-start, mobile_order: 1 -->

Distributions are the shapes uncertainty takes. Once you can speak probability, these are the handful of recurring forms you meet again and again — each one a model for a specific kind of randomness. Learn five of them by feel and most of applied statistics becomes legible.

The cluster behind these words is the distributions arm of the graph.

---

<!-- block: graph_view, target: bernoulli-distribution, anchor: fam-dist-bernoulli -->

## Bernoulli

The simplest distribution there is: a single yes/no trial with success probability $p$. It's the atom every count is built from — flip it, repeat it, and the richer distributions appear.

---

<!-- block: graph_view, target: binomial-distribution, anchor: fam-dist-binomial -->

## Binomial

Count the successes in $n$ independent Bernoulli trials and you have the binomial. Coin flips, conversion rates, defect counts — anywhere you tally yes/no outcomes over a fixed number of tries.

---

<!-- block: graph_view, target: poisson-distribution, anchor: fam-dist-poisson -->

## Poisson

Counts of rare events in a fixed window — arrivals at a queue, typos on a page, decays per second — when each instant carries a tiny chance and there are very many of them. One parameter, the rate $\lambda$, sets both its center and its spread.

---

<!-- block: graph_view, target: normal-distribution, anchor: fam-dist-normal -->

## Normal

The bell curve, and the one to know cold. Two numbers — a mean and a spread — describe it completely, and the central limit theorem makes it the limit of almost everything. Most of inference is built on top of it.

---

<!-- block: graph_view, target: t-distribution, anchor: fam-dist-t -->

## Student's t

The normal's heavier-tailed cousin, for when you're estimating the spread from a small sample instead of knowing it. Those fatter tails are the honesty: with little data, extreme values are likelier than the normal would admit. As the sample grows, t becomes the normal.

---

<!-- block: graph_view, target: distributions, anchor: fam-dist-end -->

## Where to start

Build from the atom up: [Bernoulli](/topic/bernoulli-distribution) → [binomial](/topic/binomial-distribution) → [Poisson](/topic/poisson-distribution). Then meet the continuous workhorses — [the normal](/topic/normal-distribution) and [Student's t](/topic/t-distribution). If you only have time for one, make it the normal.
