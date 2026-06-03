<!-- block: graph_view, target: regression-modeling, anchor: fam-reg-start, mobile_order: 1 -->

Regression is how statistics answers the question "given X, what should I expect Y to be?" It's the workhorse of applied data science — most of the analysis you'll actually do, in any job, is regression in some disguise. This family starts with a single number and builds toward models with many moving parts.

The cluster behind these words is the regression arm of the graph.

---

<!-- block: graph_view, target: correlation, anchor: fam-reg-correlation -->

## Correlation

A single number for how tightly two variables move together, from −1 to +1. It's compact and intuitive — and it answers a much narrower question than people usually think, which is where the famous "correlation is not causation" cautions come from.

---

<!-- block: graph_view, target: simple-linear-regression, anchor: fam-reg-slr -->

## Simple linear regression

Fit a line through the cloud: predict one variable from another, and read the slope as a rate of change. Every later technique in this family is a modification of this one idea — least squares, a line, and the residuals it leaves behind.

---

<!-- block: graph_view, target: multiple-regression, anchor: fam-reg-multiple -->

## Multiple regression

More than one predictor at once. The new subtlety is interpretation: each coefficient is the effect of its variable *holding the others fixed* — which is both the power of the method and the source of its most common misreadings.

---

<!-- block: graph_view, target: logistic-regression, anchor: fam-reg-logistic -->

## Logistic regression

When the outcome is yes/no instead of a number — click or no click, pass or fail — the line gets bent through a logistic curve to predict a probability. It's the model behind a large share of everyday classifiers.

---

<!-- block: graph_view, target: regression-modeling, anchor: fam-reg-end -->

## Where to start

Start at [correlation](/topic/correlation) to get the feel for a linear relationship, then [simple linear regression](/topic/simple-linear-regression) for the line itself. From there the family generalizes: multiple predictors, binary outcomes, and the diagnostics that tell you whether to trust the fit.
