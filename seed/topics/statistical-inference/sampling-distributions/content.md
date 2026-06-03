<!-- block: state, values: {mu: 0, sigma: 1, n: 1} -->

<!-- block: plot, spec: gaussian_pdf, params: {mu: 0, sigma: 1, n: 1}, binds: [mu, sigma, n], anchor: sd-curve, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "Your estimate is itself random" -->

# Sampling distributions

You collect one sample, compute one average, and report it. But that average is just one draw from a lottery: a different sample would have given a different number. The **sampling distribution** is the distribution of your statistic across all the samples you *could* have drawn. It's the idea that makes inference possible — it's how you attach uncertainty to a single estimate.

---

<!-- block: gear, n: 2, label: "Two distributions, don't confuse them" -->

There are two distributions in play, and keeping them apart is most of the battle:

- The **distribution of the data** — what individual observations look like. Heights, incomes, dice rolls. Its spread is the population $\sigma$, and collecting more data does *not* shrink it.
- The **sampling distribution of the mean** — what the *average* of $n$ observations looks like across repeated samples. It's centered at the same $\mu$, but its spread is the **standard error** $\sigma/\sqrt{n}$, which *does* shrink as $n$ grows.

The curve on the right is the second one. Right now $n = 1$, so it matches the data. Raise $n$ and watch it pull in toward the mean.

---

<!-- block: gear, n: 3, label: "Shrink the standard error" -->

<!-- block: state_reset, anchor: sd-feel -->

<!-- block: playground, anchor: sd-feel -->
binds: [n]
controls:
  - param: n
    label: "Sample size (n)"
    min: 1
    max: 100
    step: 1
goal:
  prompt: "Make the sampling distribution five times narrower than the population — get the standard error σ/√n down to about 0.2."
  target: { n: 25 }
  success_when: "n >= 25"
  on_success: |
    There it is: at $n = 25$ the standard error is $1/\sqrt{25} = 0.2$, five
    times tighter than the population's $\sigma = 1$. Note the *square root*:
    cutting the standard error in half takes **four times** the data, not
    twice. That diminishing return is the central fact of sample-size planning.
<!-- /block -->

---

<!-- layer: formal -->

<!-- block: gear, n: 4, label: "Mean, standard error, and the CLT" -->

For a sample of $n$ independent observations with population mean $\mu$ and standard deviation $\sigma$, the sample mean $\bar{X}$ has

$$\mathbb{E}[\bar{X}] = \mu \qquad \text{SE}(\bar{X}) = \frac{\sigma}{\sqrt{n}}.$$

The mean is unbiased — centered on the truth. The standard error is the spread of the sampling distribution, and it shrinks like $1/\sqrt{n}$. The **central limit theorem** adds the shape: for large enough $n$, $\bar{X}$ is approximately normal *regardless of the data's shape*. That's why the normal curve, not the data's histogram, governs inference about the mean.

<!-- block: derivation, title: "Why the standard error is σ/√n", collapsed: true -->
With independent observations, variances add. The sample mean is $\bar{X} = \frac{1}{n}\sum_i X_i$, so

$$\text{Var}(\bar{X}) = \frac{1}{n^2}\sum_{i=1}^{n}\text{Var}(X_i) = \frac{1}{n^2}\cdot n\sigma^2 = \frac{\sigma^2}{n}.$$

Take the square root to get the standard deviation of $\bar{X}$: $\text{SE} = \sigma/\sqrt{n}$.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Build one by resampling" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: sd-sim -->
```python
import numpy as np

# Draw many samples; each gives one sample mean. The spread of those means
# is the sampling distribution — and it tracks sigma/sqrt(n), not sigma.
rng = np.random.default_rng(0)
sigma = 1.0
for n in [1, 4, 25, 100]:
    means = rng.normal(0, sigma, size=(100_000, n)).mean(axis=1)
    print(f"n={n:>3}:  SD of sample means = {means.std():.4f}   "
          f"(sigma/sqrt(n) = {sigma/np.sqrt(n):.4f})")
```

The observed spread of the sample means matches $\sigma/\sqrt{n}$ at every $n$ — the data's own spread stays $\sigma$ throughout.

---

<!-- block: misconception, inline: true -->
**"More data makes the data less spread out."**

*Wrong:* collecting a bigger sample shrinks the variability.

*Correct:* a bigger sample shrinks the spread of your *estimate* (the standard error $\sigma/\sqrt{n}$), not the spread of the *data* (the population $\sigma$, which is a fact about the world and doesn't budge). Adding observations doesn't make people's heights more similar — it makes your estimate of the *average* height more precise. Conflating the two is the most common sampling-distribution mistake.
<!-- /block -->

---

<!-- layer: both -->

<!-- block: gear, n: 6, label: "Where it leads" -->

<!-- block: callout, kind: insight -->
**Where this leads.** The standard error is the engine of **confidence intervals** ($\bar{x} \pm z \cdot \text{SE}$) and the denominator of the test statistic in **hypothesis testing**. The normal shape comes from the **central limit theorem**. And when $\sigma$ must be estimated from a small sample, the **t-distribution** replaces the normal here.
<!-- /block -->
