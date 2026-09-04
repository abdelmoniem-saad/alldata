<!-- block: state, values: {mu: 0, sigma: 1} -->

<!-- block: plot, spec: gaussian_pdf, params: {mu: 0, sigma: 1}, binds: [mu, sigma], anchor: expectation-pdf, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "The number you'll never roll" -->

# Expectation

The expected value $\mathbb{E}[X]$ is the average, but a *long-run* average. Roll a fair die a million times and the running mean converges to 3.5. You'll never roll a 3.5; the expectation isn't a value you'll see, it's the value the world settles around.

---

<!-- block: gear, n: 2, label: "Center of mass" -->

## The balance point

For a discrete random variable $X$ taking value $x_i$ with probability $p_i$:

$$\mathbb{E}[X] = \sum_i x_i \, p_i$$

Mechanical reading: place weights $p_i$ at positions $x_i$ on a number line. $\mathbb{E}[X]$ is where the line balances. The center of mass.

For continuous variables it's an integral instead of a sum:

$$\mathbb{E}[X] = \int_{-\infty}^{\infty} x \, f(x) \, dx$$

Same picture, just with a continuous weight density $f(x)$ instead of point masses.

---

<!-- block: gear, n: 3, label: "Price the game" -->

One ticket, three payout tables. Commit to a pick before computing, then
watch where the balance point lands.

<!-- block: decision, anchor: exp-ticket -->
question: |
  Which ticket has the highest expected value?
  Ticket A: pays +3 half the time, -1 the other half.
  Ticket B: pays +10 with probability 0.2, -1 otherwise.
  Ticket C: pays +1 every single round.
options:
  - id: a
    label: "Ticket A"
    writes: { mu: 1.0 }
    response: |
      A's expectation is 0.5(3) + 0.5(-1) = 1.0, and the balance point on
      the curve has slid there. But B's expectation is higher: 1.2. A's
      bigger swings are variance, not value; that's the orthogonal axis,
      and [variance](/topic/variance) is its topic.
  - id: b
    label: "Ticket B"
    writes: { mu: 1.2 }
    response: |
      Right. B's expectation is 0.2(10) + 0.8(-1) = 1.2, the highest of the
      three, and the balance point sits farthest right. It wins on
      expectation even though it pays nothing 80% of the time: the mean of
      a distribution can be a value that distribution rarely visits.
  - id: c
    label: "Ticket C"
    writes: { mu: 1.0 }
    response: |
      C pays +1 always, so its expectation is exactly 1.0, the same as
      Ticket A's. Look at the curve: identical balance point, very
      different games. Expectation alone can't tell A from C; that's the
      gap [variance](/topic/variance) fills.
correct: b
<!-- /block -->

<!-- block: state_reset, anchor: expectation-feel -->

<!-- block: playground, anchor: expectation-feel -->
binds: [mu, sigma]
controls:
  - param: mu
    label: "Mean (μ, the balance point)"
    min: -3
    max: 3
    step: 0.1
  - param: sigma
    label: "Std dev (σ, the spread)"
    min: 0.3
    max: 3
    step: 0.1
goal:
  prompt: |
    Slide the curve to a non-zero center. Notice that the *spread* (σ) doesn't
    change where the balance point is, it only changes how concentrated the
    weight is around that point. Land $\mu = 1.5$ to confirm.
  target: { mu: 1.5, sigma: 1 }
  success_when: "abs(mu - 1.5) < 0.1"
  on_success: |
    The balance point moved with $\mu$, and only with $\mu$. Expectation is a
    *location* parameter, it tells you where the center of mass sits.
    Variance ($\sigma^2$) is the orthogonal *spread* parameter that tells you
    how concentrated the weight is around that center.
  hints:
    - after_seconds: 30
      text: "Drag the mean slider; the std-dev slider doesn't move the center."
<!-- /block -->

---

<!-- layer: formal -->

<!-- block: gear, n: 4, label: "Linearity, with or without independence" -->

## Linearity of expectation

The single most-used fact about expectation:

$$\mathbb{E}[aX + bY] = a \, \mathbb{E}[X] + b \, \mathbb{E}[Y]$$

It holds whether or not $X$ and $Y$ are independent. That's the magical part, for variance, you'd need independence; for expectation, never.

<!-- block: derivation, title: "Why linearity holds without independence", collapsed: true -->
For discrete variables on a joint distribution $p(x, y)$:

$$\mathbb{E}[X + Y] = \sum_{x,y} (x + y) \, p(x, y) = \sum_{x,y} x \, p(x,y) + \sum_{x,y} y \, p(x,y)$$

The first sum reduces to $\sum_x x \, p(x) = \mathbb{E}[X]$ (marginalize over $y$). The second to $\mathbb{E}[Y]$. Independence is never used. The same argument extends to integrals for continuous variables.

This is why the expected number of heads in $n$ fair flips is $n/2$ even though the flips don't have to be independent, *any* dependency structure gives the same expectation.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "A million die rolls" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: expectation-sim, layer: both, pair_id: expectation-sim -->
```python
import numpy as np

# Roll a fair die a million times and watch the running mean converge to 3.5.
np.random.seed(42)
rolls = np.random.randint(1, 7, 1_000_000)
running = np.cumsum(rolls) / np.arange(1, len(rolls) + 1)

# Spot checks at orders of magnitude.
for n in [10, 100, 10_000, 1_000_000]:
    print(f"n={n:>10,}  running mean = {running[n-1]:.4f}  (E[X] = 3.5000)")
```

<!-- block: code_r, pair_id: expectation-sim, editable: true, layer: both -->
```r
# Roll a fair die a million times and watch the running mean converge to 3.5.
set.seed(42)
rolls <- sample(1:6, 1000000, replace = TRUE)
running <- cumsum(rolls) / seq_along(rolls)

# Spot checks at orders of magnitude.
for (n in c(10, 100, 10000, 1000000)) {
  cat(sprintf("n=%s  running mean = %.4f  (E[X] = 3.5000)\n",
              formatC(n, big.mark = ",", width = 10, format = "d"), running[n]))
}
```

---

<!-- layer: both -->

<!-- block: gear, n: 6, label: "Where it leads" -->

<!-- block: callout, kind: insight -->
**Where this leads.** **Variance** is $\mathbb{E}[(X - \mathbb{E}[X])^2]$, the expected squared distance from the balance point. **The law of large numbers** says the sample mean converges to the expectation as $n \to \infty$. **The CLT** tells you the *shape* the sample mean takes around that limit. All three are direct consequences of expectation's mechanics.
<!-- /block -->

---

<!-- block: misconception, inline: true -->
**"$\mathbb{E}[X]$ is a value you'll observe."**

*Wrong:* the expectation is a "typical" outcome of $X$.

*Correct:* the expected number of heads in 3 flips is 1.5. You'll never *see* 1.5 heads. Expectation is a population parameter, not a sample value. It's the long-run average, what the running mean settles at as the sample grows. For most distributions, no single observation equals the expectation.
<!-- /block -->
