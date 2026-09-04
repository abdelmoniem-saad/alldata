<!-- block: state, values: {effect: 0.5, alpha: 0.05, n: 1} -->

<!-- block: plot, spec: power_curves, params: {effect: 0.5, alpha: 0.05, n: 1}, binds: [effect, alpha, n], anchor: power-pic, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "The chance of catching a real effect" -->

# Statistical power

A test can fail two ways: cry wolf when nothing is there (a Type I error, rate $\alpha$) or miss a real effect (a Type II error, rate $\beta$). **Power** is $1 - \beta$, if the effect is genuinely there, how often does your test actually catch it? A study with low power is a coin flip dressed up as science: it cannot reliably find what it's looking for.

---

<!-- block: gear, n: 2, label: "Two worlds and a cutoff" -->

The picture shows both worlds at once: the **null** (no effect, gray) centered at 0, and the **alternative** (the real effect, teal) shifted right by the standardized effect. The cutoff $z^*$ is set by $\alpha$. The red sliver of the null past $z^*$ is your false-alarm rate; the teal area of the alternative past $z^*$ is **power**. Three levers pull the curves apart: a bigger true effect, a larger sample (which marches the alternative right), or a more lenient $\alpha$.

---

<!-- block: gear, n: 3, label: "Buy power with sample size" -->

The effect here is fixed and modest. Raise the sample size and watch the alternative slide right until most of it clears the cutoff, that growing teal area is power climbing.

<!-- block: decision, anchor: power-lever -->
question: |
  The test currently runs at effect δ = 0.5, n = 16 (power ≈ 0.5). You
  can change exactly one thing. Which move pushes the alternative curve
  farther past the cutoff?
options:
  - id: a
    label: "Double n to 32"
    writes: { n: 32 }
    response: |
      A real improvement: the alternative's center is δ√n, so it advances
      by a factor of √2 ≈ 1.41. Watch the teal area grow. But note what
      the square root is telling you: doubling the *data* buys only a
      41% deeper push, which is sample-size planning's diminishing
      return in one picture.
  - id: b
    label: "Double the effect to δ = 1.0"
    writes: { effect: 1.0 }
    response: |
      The bigger jump: δ enters the alternative's center directly, so
      doubling it shifts the curve twice as far as doubling n would. The
      catch is the one the formula can't fix: in the wild, δ is a fact
      about the world, not a knob. That's why the lever you actually buy
      is n, and why small-effect studies need quadratic sample sizes.
  - id: c
    label: "Either one: both double the separation"
    writes: { n: 16 }
    response: |
      Compare the two pictures: at n = 32 (δ still 0.5) the alternative
      sits at 2.0; at δ = 1.0 (n still 16) it sits at 4.0. Not the same
      move, n advances the center by √2, the effect by 2. The algebra is
      one line, power = 1 − Φ(z_α − δ√n), and it prices the two levers
      differently by design.
correct: b
<!-- /block -->

<!-- block: state_reset, anchor: power-feel -->

<!-- block: playground, anchor: power-feel -->
binds: [n]
controls:
  - param: n
    label: "Sample size (n)"
    min: 1
    max: 40
    step: 1
goal:
  prompt: "Raise the sample size until the test would catch this effect about 80% of the time, get the power label up near 0.80."
  target: { n: 25 }
  success_when: "n >= 25"
  on_success: |
    Around $n = 25$ the power passes the conventional $0.80$ bar. The
    alternative's center is $\text{effect} \times \sqrt{n}$, so it marches right
    as data accumulate. Note the square root: because power grows with
    $\sqrt{n}$, halving the *miss* rate takes roughly four times the data.
<!-- /block -->

---

<!-- layer: formal -->

<!-- block: gear, n: 4, label: "What moves power" -->

Power is $P(\text{reject } H_0 \mid H_1 \text{ true}) = 1 - \beta$. For a one-sided z-test at level $\alpha$, standardized effect $\delta$, and $n$ observations,

$$\text{power} = 1 - \Phi\!\big(z_\alpha - \delta\sqrt{n}\big), \qquad z_\alpha = \Phi^{-1}(1 - \alpha).$$

Four levers raise it: larger effect $\delta$, larger sample $n$, more lenient $\alpha$, or lower noise $\sigma$ (which raises $\delta$). **Power analysis** runs this backwards: fix a target power, say $0.80$, and solve for the $n$ you need, *before* collecting any data.

<!-- block: derivation, title: "Solving for the required sample size", collapsed: true -->
Set power $= 0.80$, so $z_\alpha - \delta\sqrt{n} = \Phi^{-1}(0.20) = -z_{0.80}$. Then $\sqrt{n} = (z_\alpha + z_{0.80})/\delta$, i.e. $n = \big((z_\alpha + z_{0.80})/\delta\big)^2$. For one-sided $\alpha = 0.05$ ($z_\alpha = 1.645$) and power $0.80$ ($z_{0.80} = 0.842$): $n \approx (2.49/\delta)^2$. Smaller effects need quadratically more data.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Power, simulated" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: power-sim, layer: both, pair_id: power-sim -->
```python
import numpy as np

rng = np.random.default_rng(0)
# True standardized effect delta = 0.5; test H0: mean = 0 at one-sided alpha = 0.05.
delta, z_crit = 0.5, 1.645
for n in [10, 25, 60]:
    detect = 0
    for _ in range(20_000):
        x = rng.normal(delta, 1, n)
        z = x.mean() / (1 / np.sqrt(n))
        detect += z > z_crit
    print(f"n={n:>3}:  estimated power = {detect/20_000:.3f}")
```

<!-- block: code_r, pair_id: power-sim, editable: true, layer: both -->
```r
set.seed(0)
# True standardized effect delta = 0.5; test H0: mean = 0 at one-sided alpha = 0.05.
delta <- 0.5; z_crit <- 1.645
for (n in c(10, 25, 60)) {
  detect <- 0
  for (i in seq_len(20000)) {
    x <- rnorm(n, delta, 1)
    z <- mean(x) / (1 / sqrt(n))
    detect <- detect + (z > z_crit)
  }
  cat(sprintf("n=%3d:  estimated power = %.3f\n", n, detect/20000))
}
```

Power climbs with $n$, crossing $\sim 0.80$ near $n = 25$ for this effect, exactly what the formula predicts.

---

<!-- block: misconception, inline: true -->
**"A non-significant result proves there's no effect."**

*Wrong:* $p > 0.05$, so the effect must be zero.

*Correct:* failing to reject $H_0$ could mean there's no effect, *or* that the study lacked the power to see one. An underpowered study misses real effects routinely: absence of evidence is not evidence of absence. Before believing a null result, ask what effect size the study had 80% power to detect; anything smaller than that could easily be hiding in plain sight.
<!-- /block -->

---

<!-- layer: both -->

<!-- block: gear, n: 6, label: "Where it leads" -->

<!-- block: callout, kind: insight -->
**Where this leads.** Power is the complement of the Type II rate $\beta$ from [**hypothesis testing**](/topic/hypothesis-testing), and it's why [**p-values**](/topic/p-values) alone never settle a question. Planning $n$ in advance is **power analysis**, the backbone of honest experiment design and of **A/B testing**, where it fixes the minimum detectable effect. Chronically underpowered studies are a leading driver of the replication crisis.
<!-- /block -->
