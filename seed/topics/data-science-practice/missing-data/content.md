<!-- block: state, values: {mechanism: "mcar", missing_frac: 0.25} -->

<!-- block: plot, spec: missingness_grid, params: {mechanism: "mcar", missing_frac: 0.25}, binds: [mechanism, missing_frac], anchor: md-grid, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "Why is it missing?" -->

# Missing data

Real datasets have holes — unanswered survey questions, broken sensors, dropped records. The reflex is to fill them or drop them and move on. But the *right* move depends entirely on **why** the value is missing, and getting that wrong quietly biases everything downstream. The mechanism matters more than the method.

---

<!-- block: gear, n: 2, label: "Three mechanisms" -->

Rubin's taxonomy (toggle the grid to see each footprint):

- **MCAR** — missing *completely* at random: the holes are unrelated to anything. Dropping rows is safe, just wasteful.
- **MAR** — missing at random: the missingness depends on *other observed* variables (income missing more in a region you recorded). Recoverable, because you can model it from what you have.
- **MNAR** — missing *not* at random: the missingness depends on the *missing value itself* (high earners decline to report income). The dangerous one — the gaps hide a pattern you can't see.

Only MCAR lets you drop rows without introducing bias.

---

<!-- block: gear, n: 3, label: "Diagnose the mechanism" -->

<!-- block: decision, anchor: md-mech -->
question: |
  On a survey, **income** is missing far more often for high earners, who
  decline to answer. Which mechanism is this — and is mean-imputation safe?
options:
  - id: mcar
    label: "MCAR — just drop the missing rows"
    writes: { mechanism: "mcar", missing_frac: 0.25 }
    response: |
      No. If it were MCAR the missingness wouldn't depend on income — but here
      it clearly does. Dropping the missing rows would throw away the high
      earners systematically, biasing the average income downward.
  - id: mar
    label: "MAR — impute from other observed variables"
    writes: { mechanism: "mar", missing_frac: 0.4 }
    response: |
      Close, but not quite. MAR means the missingness is explained by *other
      observed* variables. Here it depends on income *itself* — the very value
      that's missing — which is the harder case.
  - id: mnar
    label: "MNAR — and mean-imputation is dangerous here"
    writes: { mechanism: "mnar", missing_frac: 0.4 }
    response: |
      Right. The missingness depends on the unobserved value itself. Filling the
      gaps with the mean of the *low earners who did answer* drags the estimate
      down — exactly the wrong direction. MNAR needs modeling the missingness or
      a sensitivity analysis, not a naive fill.
correct: mnar
<!-- /block -->

<!-- block: callout, kind: warning, depends_on: md-mech, branch: mnar -->
MNAR is the case you can't fix by looking at the data alone — the evidence you'd need *is* what's missing. The honest responses are to model the missingness mechanism explicitly, run a sensitivity analysis over plausible assumptions, or go collect the missing values. What you must *not* do is mean-impute and pretend the gap is closed.
<!-- /block -->

---

<!-- layer: formal -->

<!-- block: gear, n: 4, label: "Methods, best to worst-by-default" -->

- **Listwise deletion** (drop incomplete rows) — unbiased *only* under MCAR, and wasteful.
- **Mean / median imputation** — shrinks variance (every fill sits exactly at the center), distorts correlations, and is biased unless MCAR. Convenient, rarely correct.
- **Regression / kNN imputation** — predicts the missing value from the other columns; far better under MAR.
- **Multiple imputation** — impute many times *with* random noise, analyze each completed dataset, and pool. The gold standard under MAR because it propagates the extra uncertainty instead of hiding it.

That last point connects to **point estimation**: naive single imputation understates standard errors, because it treats invented values as if they were real observations — so confidence intervals come out falsely narrow.

<!-- block: derivation, title: "Why mean-imputation shrinks the variance", collapsed: true -->
Replace $m$ of $n$ values with the sample mean $\bar{x}$ of the observed ones. Those $m$ points now contribute *zero* squared deviation. The imputed sample variance is $\frac{n - m}{n - 1}\,s^2_{\text{obs}}$ — deflated by roughly the fraction missing. Every "mean-impute then compute variance" pipeline reports a spread that's too small, and any interval built on it is too narrow.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Watch imputation bias an estimate" -->

<!-- block: code_python, editable: true, auto_run: true, anchor: md-code -->
```python
import numpy as np
rng = np.random.default_rng(0)

income = rng.normal(70, 20, 5000)
true_mean = income.mean()

# MNAR: high earners (value > 90) decline to report.
mnar = income.copy(); mnar[income > 90] = np.nan
# MCAR: a random 20% go missing, unrelated to value.
mcar = income.copy(); mcar[rng.random(5000) < 0.2] = np.nan

for name, obs in [("MNAR", mnar), ("MCAR", mcar)]:
    drop = np.nanmean(obs)                                          # drop missing
    imputed = np.where(np.isnan(obs), np.nanmean(obs), obs).mean()  # mean-impute
    print(f"{name}:  true = {true_mean:.1f}   drop-missing = {drop:.1f}   mean-imputed = {imputed:.1f}")
```

Under **MCAR** both estimates land on the truth. Under **MNAR** both are biased *low* by several points — the high earners are simply gone, and no amount of filling with the observed mean brings them back.

---

<!-- block: misconception, inline: true -->
**"Just fill missing values with the column mean — it's the safe default."**

*Wrong:* mean-imputation is a harmless, neutral choice.

*Correct:* it's rarely safe. It shrinks variance (every filled point sits exactly at the mean), distorts correlations between columns, and is unbiased only under MCAR — under MNAR it can be badly wrong. Prefer multiple imputation, which fills with plausible *varied* values and carries the added uncertainty forward into your standard errors instead of hiding it.
<!-- /block -->

---

<!-- layer: both -->

<!-- block: gear, n: 6, label: "Where it leads" -->

<!-- block: callout, kind: insight -->
**Where this leads.** Finding and characterizing the gaps is part of [**exploratory data analysis**](/topic/exploratory-data-analysis); handling them well is what keeps [**point estimation**](/topic/point-estimation) honest. Naive imputation quietly breaks the standard errors that **confidence intervals** and **hypothesis tests** depend on — multiple imputation exists precisely to restore that honesty.
<!-- /block -->
