<!-- block: state, values: {rate: 1} -->

<!-- block: plot, spec: exponential_pdf, params: {rate: 1}, binds: [rate], anchor: exp-curve, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "The wait until the next event" -->

# Exponential distribution

The Poisson counts *how many* events land in a window. The exponential answers the partner question: *how long until the next one?* Time until the next bus, the next radioactive decay, the next email, when events arrive at a steady average rate, the gap between them follows an **exponential distribution**. Like the Poisson, it has a single dial: the rate $\lambda$.

---

<!-- block: gear, n: 2, label: "One rate, and a long tail" -->

The rate $\lambda$ is events per unit time; the **mean waiting time** is its reciprocal, $1/\lambda$. The density is tallest at $x = 0$ and decays from there, so the *next* event is most likely to come soon, short waits are common, and long waits get exponentially rarer but never impossible. That long right tail is why the mean $1/\lambda$ (the dashed marker) sits well to the right of the peak: a few long waits drag the average out.

---

<!-- block: gear, n: 3, label: "Dial the rate" -->

Drag $\lambda$ and watch the curve. Crank the rate up and events come thick and fast, the curve crushes toward zero and the mean wait shrinks. Ease it down and the wait stretches out.

<!-- block: decision, anchor: exp-due -->
question: |
  Events arrive truly at random (this dial: rate λ = 1, mean wait 1).
  You have already waited a long time and nothing has happened. The
  expected *additional* wait is:
options:
  - id: a
    label: "Shorter: after all this, it must be due"
    writes: { rate: 2.0 }
    response: |
      That intuition fits scheduled buses, not random arrivals. Raising
      the rate (crushing the curve toward zero) is a different *process*,
      not the passage of time. In the memoryless world the hazard never
      climbs; the event is no more due now than at the start.
  - id: b
    label: "Unchanged: the clock resets every instant"
    writes: { rate: 1.0 }
    response: |
      Right, and the curve is the proof: the density is tallest at zero
      *right now*, just as it was when you arrived. Conditioning on the
      wait so far cancels out of the survival function entirely, P(extra >
      t | already waited s) = P(extra > t). The exponential is the only
      continuous distribution with this trick.
  - id: c
    label: "Longer: your luck has run out"
    writes: { rate: 0.5 }
    response: |
      Lowering the rate stretches every future wait, but that's a change
      to the process, not a consequence of having waited. The curve's
      shape at rate 0.5 has the same property as at rate 1: given any wait
      so far, the remaining wait is a fresh draw from the same
      distribution.
correct: b
<!-- /block -->

<!-- block: state_reset, anchor: exp-feel -->

<!-- block: playground, anchor: exp-feel -->
binds: [rate]
controls:
  - param: rate
    label: "Rate (λ, events per unit time)"
    min: 0.3
    max: 3
    step: 0.1
goal:
  prompt: "Speed the events up until the average wait drops below half a time unit, push the rate past 2."
  target: { rate: 2 }
  success_when: "rate >= 2"
  on_success: |
    The mean wait is $1/\lambda$, so at $\lambda = 2$ the average gap is $0.5$.
    Higher rate, shorter waits, the whole curve is squeezed toward zero. The
    marker for the mean slides left in lockstep with $1/\lambda$.
<!-- /block -->

---

<!-- layer: formal -->

<!-- block: gear, n: 4, label: "The formula, and memorylessness" -->

For $X \sim \text{Exponential}(\lambda)$ on $x \ge 0$,

$$f(x) = \lambda e^{-\lambda x}, \qquad F(x) = 1 - e^{-\lambda x}, \qquad \mathbb{E}[X] = \frac{1}{\lambda}, \qquad \text{Var}(X) = \frac{1}{\lambda^2}.$$

Its defining signature is **memorylessness**: the chance of waiting at least another $t$ is the same no matter how long you've already waited,

$$P(X > s + t \mid X > s) = P(X > t).$$

The exponential is the *only* continuous distribution with this property, the continuous echo of a coin that never remembers its last flip.

<!-- block: derivation, title: "Why the exponential is memoryless", collapsed: true -->
The survival function is $P(X > t) = 1 - F(t) = e^{-\lambda t}$. So

$$P(X > s + t \mid X > s) = \frac{P(X > s + t)}{P(X > s)} = \frac{e^{-\lambda(s+t)}}{e^{-\lambda s}} = e^{-\lambda t} = P(X > t).$$

The $s$ cancels completely: the past wait leaves no trace on the future.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Memorylessness, checked" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: exp-sim, layer: both, pair_id: exp-sim -->
```python
import numpy as np

# NumPy parameterizes by scale = 1/rate (the mean). Confirm mean and variance,
# then test memorylessness: among waits already past 2, the *extra* wait should
# still look exponential with the same mean.
rng = np.random.default_rng(0)
for lam in [0.5, 1, 2]:
    x = rng.exponential(1 / lam, 1_000_000)
    print(f"rate={lam}:  mean={x.mean():.3f} (1/λ={1/lam:.3f})   "
          f"var={x.var():.3f} (1/λ²={1/lam**2:.3f})")

x = rng.exponential(1.0, 3_000_000)          # rate 1 → mean 1
extra = x[x > 2] - 2                          # remaining wait, given already past 2
print(f"\noverall mean {x.mean():.3f};  extra wait beyond 2 averages {extra.mean():.3f}  (still ~1)")
```

<!-- block: code_r, pair_id: exp-sim, editable: true, layer: both -->
```r
# R parameterizes rexp by rate. Confirm mean and variance, then test
# memorylessness: among waits already past 2, the extra wait should still
# look exponential with the same mean.
set.seed(0)
for (lam in c(0.5, 1, 2)) {
  x <- rexp(1000000, rate = lam)
  cat(sprintf("rate=%g:  mean=%.3f (1/lam=%.3f)   var=%.3f (1/lam^2=%.3f)\n",
              lam, mean(x), 1/lam, mean((x - mean(x))^2), 1/lam^2))
}

x <- rexp(3000000, rate = 1)            # rate 1 -> mean 1
extra <- x[x > 2] - 2                    # remaining wait, given already past 2
cat(sprintf("\noverall mean %.3f;  extra wait beyond 2 averages %.3f  (still ~1)\n",
            mean(x), mean(extra)))
```

The extra wait beyond time 2 averages the same as a fresh wait, the past is forgotten.

---

<!-- block: misconception, inline: true -->
**"After waiting a long time, the event must be 'due' soon."**

*Wrong:* the longer you've waited, the closer the next event has to be.

*Correct:* memorylessness says the remaining wait has the *same* distribution no matter how long you've already stood there. A bus modeled as exponential is no more due at minute 20 than at minute 0. (Real buses run on schedules, so real waits *do* have memory, which is exactly why the exponential is the wrong model for them and the right model for truly random arrivals like decay.)
<!-- /block -->

---

<!-- layer: both -->

<!-- block: gear, n: 6, label: "Where it leads" -->

<!-- block: callout, kind: insight -->
**Where this leads.** The exponential is the continuous twin of the **Poisson**: the gaps between Poisson events are exponentially distributed. Add up $k$ independent exponential waits and you get the **gamma** distribution. And its memorylessness, a constant hazard rate, makes it the foundation of **queueing theory** and the baseline against which **survival analysis** measures everything else.
<!-- /block -->
