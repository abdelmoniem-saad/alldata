<!-- block: gear, n: 1, label: "The standard error you can't compute" -->

You measured 60 people's commute times. The mean is 31 minutes. How
uncertain is that number? The classical answer needs a formula for the
sampling distribution of a mean, and it leans on assumptions: normality,
or a big enough n for the CLT to cover you. Now change the statistic to
the 90th percentile, or the median, or the ratio of two medians, and
watch the formula shelf go empty.

---

<!-- block: gear, n: 2, label: "The sample is the world" -->

The bootstrap's move is almost insolent: if the sample is all you know
about the population, treat the sample *as* the population. Draw 60
commute times from your own 60 observations, with replacement. Compute
the statistic. Do it again. Ten thousand times. The spread of those ten
thousand statistics is a picture of how much your estimate wobbles, and
it required no distributional belief at all.

Two facts keep the picture honest. First, resamples concentrate around
**the sample's statistic, not the truth**: bootstrap a mean of 31 and the
resample means center on 31, whether or not the population's mean is 31.
The bootstrap measures the *wobble of the estimator*; it cannot know the
bias of the estimate. Second, the resample's spread mimics the sampling
spread: the standard deviation of the bootstrap means approximates the
standard error you would have derived by formula, and the 2.5th and
97.5th percentiles of the bootstrap means form a 95% confidence interval
with no formula beyond arithmetic.

---

<!-- block: gear, n: 3, label: "Where does the picture center?" -->

<!-- block: decision, anchor: bs-pick -->
question: |
  Your 60 commute times have a mean of 31 minutes. The true population
  mean is 28. Where will the bootstrap distribution of resample means
  center?
options:
  - id: a
    label: "28, the population mean"
    writes: { mu: 28 }
    response: |
      Tempting, and exactly the confusion to kill early. The bootstrap
      never sees the population; it draws from your 60 numbers. Its
      resample means circle 31. What the bootstrap knows is wobble, not
      truth.
  - id: b
    label: "31, the sample mean"
    writes: { mu: 31 }
    response: |
      Correct. The resample means orbit your statistic, which is why
      bootstrap CIs are read as "if the sample were redrawn, where would
      31 land", and why a biased sample passes its bias straight through
      the interval. The histogram's spread, not its center, is the
      deliverable.
  - id: c
    label: "Halfway: about 29.5"
    writes: { mu: 29.5 }
    response: |
      Averaging the two is the instinct of someone expecting the
      bootstrap to split the difference. It has no mechanism for that;
      there is no population in the algorithm, only the sample,
      resampled.
correct: b
<!-- /block -->

<!-- block: plot, spec: empirical_histogram, params: {mu: 31, sigma: 2.2}, binds: [mu, sigma], anchor: bs-hist, mobile_order: 1 -->

The bootstrap distribution of resample means. Its center is your estimate;
its width is the uncertainty you will quote. Narrow the sample (bigger n)
and the histogram contracts; that contraction is the standard error made
visible.

---

<!-- block: gear, n: 4, label: "The recipe, and where it shines" -->

$$\text{CI}_{95\%}^{\text{pct}} = \left[\hat{\theta}^{*}_{(0.025)},\ \hat{\theta}^{*}_{(0.975)}\right]$$

The percentile interval takes the 2.5% and 97.5% points of the bootstrap
statistics straight. Refinements (BCa, studentized) correct its small
bias, but the percentile interval already handles statistics with no
closed-form standard error, which is the point of the whole enterprise.

Where it shines: medians and percentiles (reporting the median response
time with an honest interval), ratios and correlations of non-normal
quantities, model coefficients where formulas assume too much, and any
statistic you can define but not differentiate. Where it disappoints:
extreme statistics like the sample maximum (resamples never contain new
extremes), and tiny samples, where the empirical distribution is a
caricature of the population's.

<!-- block: fill_in, anchor: bs-fill -->
1. Resample the data with replacement; the with-replacement is what makes each resample a fresh draw rather than a shuffle.
2. Recompute the statistic per resample; the collection is the estimator's sampling distribution, derived, not assumed.
3. Read spread and percentiles from that collection; the center is your sample's statistic, the width is your standard error.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Bootstrap the median" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: bs-sim -->
```python
import numpy as np

rng = np.random.default_rng(21)
# 60 commute times: right-skewed, so the formula book gets nervous.
sample = rng.lognormal(mean=3.3, sigma=0.35, size=60)

boot = [rng.choice(sample, size=60, replace=True).median() for _ in range(10000)]
lo, hi = np.percentile(boot, [2.5, 97.5])

print(f"sample median      = {np.median(sample):.2f} min")
print(f"bootstrap 95% CI   = [{lo:.2f}, {hi:.2f}] min")
print(f"bootstrap std dev  = {np.std(boot):.3f}  (the standard error)")
# Try writing a formula for the standard error of a median of a
# lognormal. Then notice you never needed one.
```

---

<!-- block: gear, n: 6, label: "Where this leads" -->

<!-- block: callout, kind: insight -->
**Resampling as a way of thinking.** The permutation test shuffles labels
to build a null; the bootstrap resamples within groups to build a
sampling distribution. Both replace calculus with simulation, and the A/B
tests, CV confidence intervals, and model comparisons later in the
catalog quietly use their logic. Efron's 1979 paper is the origin; the
idea's simplicity is why it took a decade to be believed.
<!-- /block -->

<!-- block: misconception, inline: true -->
**"The bootstrap creates new data, so more resamples mean more information."**

*Wrong:* 10,000 bootstrap resamples extract information the original 60
observations never contained.

*Correct:* every resample is drawn from the same 60 numbers; the
bootstrap reuses them from different angles. It can quantify the
uncertainty those 60 points carry, but it cannot widen their view of the
population. The bin bars in the permutation topic showed the same truth:
resampling refines the estimate of wobble, it does not manufacture
evidence.
<!-- /block -->
