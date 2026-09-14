<!-- block: gear, n: 1, label: "The chart goes up" -->

On day 70 of the year, the team shipped a new onboarding flow to the
north region only. The daily-signups chart bends upward right around
day 70. The Slack message writes itself: "the launch worked."

Load `daily-metrics.csv` with `load("daily-metrics")` in any code block
here; it holds 120 days of signups for two regions, and it is messy in
the usual ways: a handful of missing days, and two days that do not
believe the trend.

---

<!-- block: gear, n: 2, label: "Why before/after lies here" -->

The naive comparison (north's after-mean minus its before-mean) reads
**+9.6 signups/day**. But the world did not hold still while the
feature shipped: a four-day promo ran in BOTH regions after day 70, a
viral spike hit north on day 85, and the south control had an outage
on day 105. Every one of those lands in the "after" window of the
series that launched, and none of them is the feature.

This is the causal-inference gap from the coupon example, wearing
time-series clothes. The counterfactual question is not "are signups
higher after day 70" but "how much would they have risen anyway?"
The south region, which did not get the feature, is the observable
stand-in for that counterfactual: whatever the promo does to the
world shows up in south too, and the launch's effect is the part
where north pulls away.

---

<!-- block: gear, n: 3, label: "Pick your estimate" -->

<!-- block: decision, anchor: ci2-pick -->
question: |
  Three analysts, three numbers. Which one goes in the report?
options:
  - id: a
    label: "+9.6/day: north after minus north before"
    writes: { mu: 9.6, sigma: 3 }
    response: |
      The histogram is wide and sits high, and it should: this number
      bundles the launch with the promo, the day-85 spike, and drift.
      Its width is honest, its center is not the launch's effect. This
      is the number the Slack message quotes.
  - id: b
    label: "+8.3/day: the difference-in-differences on cleaned data"
    writes: { mu: 8.3, sigma: 1 }
    response: |
      Correct, and the histogram says why it earns the report: tight,
      centered where the truth sits. The control region absorbed the
      promo's lift and the general drift; the outlier days were
      handled before differencing. What remains is the launch, and
      the uncertainty band finally means something.
  - id: c
    label: "South is flat, so the feature did nothing"
    writes: { mu: 0, sigma: 3 }
    response: |
      South being flat is not a finding about the feature; it is the
      control doing its job. Flatness in the untreated region is what
      makes the north comparison readable, not evidence of nothing.
correct: b
<!-- /block -->

<!-- block: plot, spec: empirical_histogram, params: {mu: 8.3, sigma: 1}, binds: [mu, sigma], anchor: ci2-hist, mobile_order: 1 -->

The estimated effect under the analysis you picked. The naive estimate
is the wide, shifted cloud; the cleaned DiD is the tight one. Same
data, different discipline.

---

<!-- block: gear, n: 4, label: "The estimator, formally" -->

$$\hat{\beta}_{DiD} = (\bar{y}_{N,after} - \bar{y}_{N,before})
                     - (\bar{y}_{S,after} - \bar{y}_{S,before})$$

With the two outlier days handled first, the cleaned means are 40.9 to
49.6 for north and 37.8 to 38.3 for south:

$$\hat{\beta}_{DiD} = 8.7 - 0.5 = +8.2\ \text{signups/day}$$

Note what each subtraction bought. The second parenthesis removes
everything both regions experienced together: the promo, the season,
the platform's drift. The first parenthesis then measures how much
*further* north rose than its own baseline. The order matters, which
is the missing-data topic's point about cleaning before estimating:
the raw DiD, computed with the outage still in the control's
after-mean, reads 9.2 and overshoots. Handle the outliers, then
difference.

<!-- block: fill_in, anchor: ci2-fill -->
1. Before/after in the treated series bundles the launch with everything else that changed; the control series separates them.
2. Clean the outliers first: the control's outage day inflates the raw DiD exactly as the viral day inflates the naive one.
3. The estimate that survives is +8.3/day, and its honest description is "under the parallel-trends assumption", named, not hidden.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Run the whole analysis" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: ci2-sim -->
```python
import numpy as np

rows = load("daily-metrics")
cut = "2026-05-10"          # day 70

def series(region, drop_dates=()):
    pts = [(r["date"], int(r["signups"])) for r in rows
           if r["region"] == region and r["date"] not in drop_dates]
    before = [v for dt, v in pts if dt < cut]
    after = [v for dt, v in pts if dt >= cut]
    return before, after

nb, na = series("north")
sb, sa = series("south", drop_dates=("2026-06-14",))   # the outage day
nbc, nac = series("north", drop_dates=("2026-05-25",))  # the viral day

naive = np.mean(na) - np.mean(nb)
raw_did = naive - (np.mean(sa) - np.mean(sb))
clean_did = (np.mean(nac) - np.mean(nbc)) - (np.mean(sa) - np.mean(sb))

print(f"naive  before/after       : {naive:+.2f}")
print(f"raw DiD (outliers in)     : {raw_did:+.2f}")
print(f"cleaned DiD (outliers out): {clean_did:+.2f}")
# Three estimates, one dataset. The report quotes the third, with the
# parallel-trends assumption named.
```

---

<!-- block: gear, n: 6, label: "Where this leads" -->

<!-- block: callout, kind: insight -->
**The assumption you owe the reader.** Difference-in-differences leans
on *parallel trends*: absent the launch, north would have moved like
south. You can check it partly (the two series tracked each other
before day 70), but you cannot prove it. The report says so in one
line, and the experimental-design topic says how the next team avoids
owing it: randomize the rollout region.
<!-- /block -->

<!-- block: quiz, anchor: ci2-check, depends_on: ci2-pick -->
title: "Check yourself"
questions:
  - prompt: |
      Why include the south region at all? It never received the
      feature.
    options:
      - "To make the chart look fuller"
      - "To measure everything the launch did NOT cause, so it can be subtracted"
      - "As a backup if north's data turns out incomplete"
    correct: 1
    response: |
      South is the counterfactual's stand-in: the promo, the season,
      the drift all appear there too, and the DiD subtracts exactly
      that share from north's rise.
  - prompt: |
      The raw DiD read +9.2, the cleaned read +8.3. What lived in the
      gap?
    options:
      - "Rounding error in the means"
      - "The outage day in the control's after-window, still inside the raw estimate"
      - "The promo, which DiD cannot handle"
    correct: 1
    response: |
      South's outage dragged its after-mean down, so subtracting it
      inflated the raw DiD. The promo was already handled by the
      subtraction; the outlier needed handling by you.
<!-- /block -->

<!-- block: exercise, anchor: ci2-exercise -->
prompt: |
  From the cleaned means (north 40.9 before, 49.6 after; south 37.8
  before, 38.3 after): compute the difference-in-differences estimate,
  rounded to one decimal.
answer: 8.2
tolerance: 0.25
unit: signups/day
hint: |
  Each region's change first, then subtract the control's change.
solution: |
  North: 49.6 - 40.9 = 8.7. South: 38.3 - 37.8 = 0.5. DiD = 8.7 - 0.5
  = 8.2 signups/day, the launch's estimated effect.
<!-- /block -->

<!-- block: misconception, inline: true -->
**"The launch obviously worked, signups went up right after day 70."**

*Wrong:* an upward bend after the launch date is itself the evidence.

*Correct:* signups also bend at the promo weekends, which arrived after
day 70 in both regions. The bend that matters is not "up vs before" but
"north vs south", and after the outliers are handled, that bend reads
+8.3/day, not +9.6. Direction is easy; the estimate that survives is
the one the control region agrees to.
<!-- /block -->
