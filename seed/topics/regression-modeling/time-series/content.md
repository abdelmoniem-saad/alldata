<!-- block: gear, n: 1, label: "Yesterday is not independent" -->

Every regression so far leaned on one quiet assumption: the errors are
independent from row to row. Time series data breaks that promise by
existing. Today's temperature resembles yesterday's. This month's sales
resemble last month's. Rows ordered in time are *autocorrelated*, and
everything you have built needs re-examining.

---

<!-- block: gear, n: 2, label: "The two hazards" -->

**Hazard one: fake confidence.** Positive autocorrelation means errors
travel in runs; one overestimate is followed by more overestimates. OLS
still returns an unbiased slope, but its standard errors assume each
observation brought independent information, and correlated rows bring
less. The practical effect: standard errors shrink, t-statistics
inflate, and spuriously "significant" trends appear in data that is
mostly wandering. Fitting a line to a random walk produces a confident
slope roughly half the time.

**Hazard two: fake structure.** Two series that both drift upward will
show a striking regression relationship with no connection at all:
spurious regression. Ice cream sales regressed on drowning deaths both
ride summer; two randomly drifting stocks both ride time. The residual
plot gives it away: instead of scatter, smooth long waves, the classic
signature of unmodeled autocorrelation.

---

<!-- block: gear, n: 3, label: "Trend or memory?" -->

<!-- block: decision, anchor: ts-pick -->
question: |
  Quarterly revenue climbs for 3 years and the residual plot shows
  long smooth waves above and below zero. The best first move?
options:
  - id: a
    label: "Add a quadratic trend term"
    writes: { slope: 1.2 }
    response: |
      The waves might shrink, but the disease is untreated: the errors
      are still serially correlated, so the standard errors stay
      flattered. Trend terms fight the symptom; memory needs its own
      treatment.
  - id: b
    label: "Difference the data before modeling"
    writes: { slope: 0.3 }
    response: |
      Correct, and the fit flattens toward honest noise. Differencing
      (modeling the change from one period to the next) removes the
      drift that manufactured the waves; a series of changes has far
      less memory than a series of levels. Trend and memory are
      different diseases and this one responds to differencing.
  - id: c
    label: "Collect more quarters"
    writes: { slope: 2.0 }
    response: |
      More rows of the same correlated process add less information
      than their count suggests, and the spurious structure gets more
      confident, not less. The waves are a modeling diagnosis, not a
      sample-size complaint.
correct: b
<!-- /block -->

<!-- block: plot, spec: scatter_with_fit, params: {slope: 0.3, intercept: 0}, binds: [slope, intercept], anchor: ts-fit, mobile_order: 1 -->

A stand-in for the fitted trend. The decision you just made is about
what the residuals around it will do: waves mean memory, scatter means
the trend earned its error bars.

---

<!-- block: gear, n: 4, label: "What survives, what changes" -->

Much of your toolkit transfers. The regression machinery, diagnostic
habit, and out-of-sample discipline all carry over; cross-validation
just has to respect time (train on the past, validate on the future,
never the reverse, which is the leakage trap in time-series clothing).
What changes: the models. The workhorse is the ARIMA family, which
regresses the series on its own past values (autoregression) and on
past shocks (moving average), after differencing until the memory is
absorbed. The acronym reads as its recipe: how many autoregressive
terms (p), how many differences (d), how many moving-average terms (q).

<!-- block: fill_in, anchor: ts-fill -->
1. Autocorrelation leaves OLS's slopes unbiased but wrecks their standard errors, so significance stops meaning what it says.
2. Two drifting series regress spuriously; the residual waves are the tell.
3. Differencing absorbs memory; ARIMA then models what remains of it, with the validation clock always running forward.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "See the spurious trend" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: ts-sim -->
```python
import numpy as np

rng = np.random.default_rng(19)
n = 300

# Two unrelated series that both drift (random walks with drift).
t = np.arange(n)
x = np.cumsum(rng.normal(0.05, 1, n))
y = np.cumsum(rng.normal(0.04, 1, n))

slope, intercept = np.polyfit(x, y, 1)
pred = slope * x + intercept
resid = y - pred

r = np.corrcoef(x, y)[0, 1]
print(f"R = {r:.3f}   <- striking, and completely fake")
print(f"slope = {slope:.3f}")
# The residual waves: smooth runs above and below zero, the signature
# of unmodeled memory. Difference both series and R collapses.
dx, dy = np.diff(x), np.diff(y)
print(f"after differencing: R = {np.corrcoef(dx, dy)[0, 1]:.3f}")
```

---

<!-- block: gear, n: 6, label: "Where this leads" -->

<!-- block: callout, kind: insight -->
**The assumption audit generalizes.** Time series is the first place the
independence assumption visibly breaks, but it is not the last:
clustered survey data, repeated measurements on the same patient,
nested students in schools. The instinct you built here, "check what
the rows share, then model it instead of trusting it", is the doorway
to mixed models.
<!-- /block -->

<!-- block: misconception, inline: true -->
**"A highly significant trend in 300 quarters proves the series is growing."**

*Wrong:* with n = 300 and a clean upward drift, the trend's p-value
settles the question.

*Correct:* a drifting series produces exactly such significance about
half the time with no real trend at all, and its standard errors are
flattered by the memory. The trustworthy evidence is differenced data,
out-of-sample forecast skill, or a design that randomizes the drift
away.
<!-- /block -->
