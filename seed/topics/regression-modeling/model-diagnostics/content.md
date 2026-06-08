<!-- block: state, values: {pattern: "random"} -->

<!-- block: plot, spec: residual_plot, params: {pattern: "random"}, binds: [pattern], anchor: md-resid, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "Trust, but verify" -->

# Model diagnostics

A regression will always hand you coefficients and an $R^2$. Whether you can *trust* them depends on assumptions — and the **residuals** (what the model gets wrong) are where you check. A sound model leaves residuals that look like structureless noise. Any pattern in them is the data telling you the model is missing something.

---

<!-- block: gear, n: 2, label: "The assumptions, by acronym" -->

Linear regression leans on **LINE**: **L**inearity (the relationship really is a line), **I**ndependence (errors don't depend on each other), **N**ormality (errors are roughly normal — this is what inference needs), and **E**qual variance (homoscedasticity — the spread of errors is constant). The residuals-vs-fitted plot catches the two that bite hardest: a **curve** flags broken linearity, a **funnel** flags unequal variance.

---

<!-- block: gear, n: 3, label: "Read the residuals" -->

The plot starts on a clean, structureless band — a healthy model. Now diagnose a sick one.

<!-- block: decision, anchor: md-read -->
question: |
  A residuals-vs-fitted plot shows the spread of the residuals fanning out —
  tight on the left, much wider on the right. Which assumption is broken, and
  what's it called?
options:
  - id: funnel
    label: "Equal variance — this is heteroscedasticity"
    writes: { pattern: "funnel" }
    response: |
      Right — switch the view to the funnel. The error variance grows with the
      fitted value, so the model is more uncertain at the high end than the low.
      Coefficients stay unbiased, but their standard errors — and your p-values
      and intervals — are wrong. Fixes: transform $y$ (e.g. a log), or use
      robust/weighted standard errors.
  - id: curve
    label: "Linearity — this is a curved relationship"
    writes: { pattern: "curve" }
    response: |
      That's a *different* violation. A U-shaped residual plot means the *mean*
      is mis-modeled — a straight line through curved data. The fanning-out
      described here is about the *spread*, which is heteroscedasticity.
  - id: none
    label: "Nothing's wrong — residual scatter is expected"
    writes: { pattern: "random" }
    response: |
      Some scatter is expected, but *systematic* fanning is not. Random
      residuals form a uniform band; a spread that grows with the fitted value
      is the signature of unequal variance.
correct: funnel
<!-- /block -->

<!-- block: callout, kind: insight, depends_on: md-read, branch: funnel -->
A funnel means your uncertainty isn't constant — so the single "standard error" the model reports is a fiction averaged over very different regimes. Toggle the pattern to **curve** to see the other classic violation: a bowed residual cloud that says "fit me with a curve, not a line."
<!-- /block -->

---

<!-- layer: formal -->

<!-- block: gear, n: 4, label: "What each plot catches" -->

The diagnostic toolkit:

- **Residuals vs fitted** — the workhorse. A flat random band is healthy; a curve means nonlinearity (add a term or transform); a funnel means heteroscedasticity.
- **Q–Q plot** — residual quantiles against normal quantiles. Points on the diagonal mean roughly normal errors; heavy S-bends mean fat tails or skew, which dents the validity of t-tests and intervals.
- **Scale–location and leverage (Cook's distance)** — flag the few influential points quietly steering the whole fit.

The fixes follow the diagnosis: transform a variable, add a missing term, use robust standard errors, or investigate the outliers — don't just delete them.

<!-- block: derivation, title: "Why we plot residuals against *fitted*, not against y", collapsed: true -->
Residuals are mechanically correlated with the observed $y$ (since $y = \hat{y} + e$), so a residuals-vs-$y$ plot always slopes — an artifact, not a signal. Under the model's assumptions the fitted values $\hat{y}$ are *independent* of the residuals, so any pattern against $\hat{y}$ is genuine evidence of a violation.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Manufacture a violation" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: md-sim -->
```python
import numpy as np

rng = np.random.default_rng(0)
x = np.linspace(0, 10, 200)
# Heteroscedastic truth: the noise grows with x.
y = 1.5 + 0.8 * x + rng.normal(0, 0.2 + 0.4 * x)

b = np.polyfit(x, y, 1)
resid = y - np.polyval(b, x)
# Correlating |residual| with the fitted value exposes the funnel:
corr = np.corrcoef(np.abs(resid), x)[0, 1]
print(f"corr(|residual|, fitted) = {corr:.2f}   -> > 0 means the spread grows: heteroscedastic")
```

A positive correlation between residual *size* and the fitted value is the funnel, quantified — exactly what the eye sees.

---

<!-- block: misconception, inline: true -->
**"A high $R^2$ means the model is good."**

*Wrong:* $R^2 = 0.95$, so the model is trustworthy.

*Correct:* $R^2$ measures how much variance is explained, not whether the model is *correct*. A curved relationship fit with a line can post a high $R^2$ while its residuals scream nonlinearity; heteroscedastic data can have a great $R^2$ and wrong standard errors. $R^2$ says nothing about bias, the validity of inference, or out-of-sample performance. Read the residual plots before you trust the number.
<!-- /block -->

---

<!-- layer: both -->

<!-- block: gear, n: 6, label: "Where it leads" -->

<!-- block: callout, kind: insight -->
**Where this leads.** Diagnostics validate the [**multiple regression**](/topic/multiple-regression) and [**simple linear regression**](/topic/simple-linear-regression) you've fit, and the normality check leans on the [**normal distribution**](/topic/normal-distribution) through the Q–Q plot. When assumptions fail, the repairs live nearby: transformations, [**regularization**](/topic/regularization) for instability, and out-of-sample checks via **cross-validation**.
<!-- /block -->
