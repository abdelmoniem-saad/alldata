<!-- block: state, values: {mu: 0, sigma: 1, n: 1} -->

<!-- block: plot, spec: gaussian_pdf, params: {mu: 0, sigma: 1, n: 1}, binds: [mu, sigma, n], anchor: lln-curve, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "The average settles down" -->

# Law of large numbers

Flip a fair coin ten times and the fraction of heads might be 0.7. Flip it ten thousand times and it will sit very close to 0.5. The **law of large numbers** is this promise made precise: as you collect more independent observations, their average converges to the true mean. It's the reason casinos profit, polls work, and "more data" is good advice.

---

<!-- block: gear, n: 2, label: "Why it stops wandering" -->

The sample mean of $n$ observations is itself a random quantity, with standard error $\sigma/\sqrt{n}$. As $n$ grows, that spread shrinks toward zero, so the distribution of the sample mean collapses onto a spike sitting exactly at the true mean $\mu$. There's simply less and less room for the average to be far from $\mu$.

The curve on the right is the distribution of the sample mean. At $n = 1$ it's the full population spread. Raise $n$ and watch it narrow to a spike, that collapse *is* the law of large numbers.

---

<!-- block: gear, n: 3, label: "Collapse the curve" -->

<!-- block: decision, anchor: lln-dilution -->
question: |
  Your first 10 flips of a fair coin gave 30% heads. Over the next
  10,000 flips, the running heads fraction will:
options:
  - id: a
    label: "Climb above 50% for a while: the deficit gets repaid"
    writes: { n: 10 }
    response: |
      Watch what that claim would need: the curve pushing the average
      back up, a memory of the debt. The coin has none. At n = 10 the
      curve is wide, sure, a 30% start is unremarkable, but nothing in
      the mechanics steers the future toward compensation. The law works
      by dilution, not repayment.
  - id: b
    label: "Stay below 50%: early shortfalls persist in the average"
    writes: { n: 1 }
    response: |
      That's the wide end of the picture, where a single flip *is* the
      average and any imbalance dominates. But each new flip adds a full
      weight to a numerator that no longer moves: a 3-head deficit over
      10 flips is huge, over 10,010 flips it's a third of a percent. The
      past doesn't persist, it dissolves.
  - id: c
    label: "Converge toward 50% as the early imbalance is drowned out"
    writes: { n: 10000 }
    response: |
      Right, and the collapsed curve is the mechanism drawn: the running
      fraction's distribution at n = 10,000 is a spike at 0.5, with no
      room left for the early 30% to register. Nothing corrected the
      deficit, it was diluted. That difference is exactly the gambler's
      fallacy.
correct: c
<!-- /block -->

<!-- block: state_reset, anchor: lln-feel -->

<!-- block: playground, anchor: lln-feel -->
binds: [n]
controls:
  - param: n
    label: "Sample size (n)"
    min: 1
    max: 100
    step: 1
goal:
  prompt: "Pile up enough observations that the sample mean is pinned tightly to the truth, get n up to 50 or more."
  target: { n: 50 }
  success_when: "n >= 50"
  on_success: |
    By $n = 50$ the sample mean almost never lands far from $\mu$, the curve
    has collapsed to a narrow spike. Push $n \to \infty$ and the spread goes to
    zero entirely: the average converges to the true mean. That convergence is
    the whole content of the law.
<!-- /block -->

---

<!-- layer: formal -->

<!-- block: gear, n: 4, label: "The statement, and what it is not" -->

The (weak) law of large numbers says: for independent, identically distributed $X_1, \ldots, X_n$ with mean $\mu$, the sample mean $\bar{X}_n$ converges in probability to $\mu$, for any tolerance $\varepsilon > 0$,

$$P\big(|\bar{X}_n - \mu| > \varepsilon\big) \to 0 \quad \text{as } n \to \infty.$$

It's worth being precise about what converges. The **law of large numbers** says *where* the average ends up: pinned at $\mu$. The **central limit theorem** says what the *fluctuations* look like along the way: rescaled by $\sqrt{n}$, they're normal. LLN collapses the curve to a point; the CLT describes the shape of the curve before it collapses. Different questions, often confused.

<!-- block: derivation, title: "A one-line proof via Chebyshev", collapsed: true -->
Chebyshev's inequality bounds how often a variable strays from its mean by its variance: $P(|\bar{X}_n - \mu| > \varepsilon) \le \text{Var}(\bar{X}_n)/\varepsilon^2$. Since $\text{Var}(\bar{X}_n) = \sigma^2/n$, the right side is $\sigma^2/(n\varepsilon^2)$, which goes to 0 as $n \to \infty$ for any fixed $\varepsilon$. That's convergence in probability, the weak law, in one line, and the reason it needs finite variance.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Watch a running fraction converge" -->

<!-- block: dataset, name: coin-flips-1000, source: synthetic -->

<!-- block: simulation, editable: true, auto_run: true, anchor: lln-sim, layer: both, pair_id: lln-sim -->
```python
import numpy as np

# 1,000 coin flips from the curated dataset. The running fraction of heads
# starts wild and settles toward 0.5: the law of large numbers, watched on
# data instead of formulas.
flips = load("coin-flips-1000")
heads = np.array([1.0 if row["outcome"] == "H" else 0.0 for row in flips])
running = np.cumsum(heads) / np.arange(1, heads.size + 1)

for n in [10, 100, 1_000]:
    print(f"after {n:>5} flips: heads fraction = {running[n-1]:.4f}   (true mean 0.5)")
```

<!-- block: code_r, pair_id: lln-sim, editable: true, layer: both -->
```r
# Same demonstration, simulated in R (the curated CSV loads only in the
# Python runner): the running fraction of heads over 1,000 flips.
set.seed(0)
flips <- rbinom(1000, 1, 0.5)
running <- cumsum(flips) / seq_along(flips)

for (n in c(10, 100, 1000)) {
  cat(sprintf("after %5d flips: heads fraction = %.4f   (true mean 0.5)\n", n, running[n]))
}
```

Early on the fraction swings; by 1,000 flips it's locked near 0.5. Note it
does *not* land on exactly 0.5, it just gets reliably closer.

---

<!-- block: misconception, inline: true -->
**"After a run of tails, heads is 'due' to even things out."**

*Wrong:* the law of large numbers forces the counts to balance, so a deficit of heads will be made up.

*Correct:* the coin has no memory, each flip is still 50/50, and past results are never "corrected." The average converges not because the universe repays a debt, but because early imbalances get *diluted*: a 3-head lead over 10 flips is huge, but over 10,000 flips it's a rounding error. The law works by drowning the past in new data, not by reversing it. Believing otherwise is the **gambler's fallacy**.
<!-- /block -->

---

<!-- layer: both -->

<!-- block: gear, n: 6, label: "Where it leads" -->

<!-- block: callout, kind: insight -->
**Where this leads.** The **central limit theorem** is the refinement: it describes the *shape* of $\bar{X}_n$'s fluctuations, not just where they settle. **Sampling distributions** formalize the $\sigma/\sqrt{n}$ spread you watched collapse here. And **Monte Carlo** methods are the law of large numbers turned into a tool, estimating hard quantities by averaging many random draws.
<!-- /block -->
