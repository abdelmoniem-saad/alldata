<!-- block: state, values: {effect: 0.5, alpha: 0.05, n: 1} -->

<!-- block: plot, spec: power_curves, params: {effect: 0.5, alpha: 0.05, n: 1}, binds: [effect, alpha, n], anchor: power-pic, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "The chance of catching a real effect" -->

# Statistical power

A test can fail two ways: cry wolf when nothing is there (a Type I error, rate $\alpha$) or miss a real effect (a Type II error, rate $\beta$). **Power** is $1 - \beta$ — if the effect is genuinely there, how often does your test actually catch it? A study with low power is a coin flip dressed up as science: it cannot reliably find what it's looking for.

---

<!-- block: gear, n: 2, label: "Two worlds and a cutoff" -->

The picture shows both worlds at once: the **null** (no effect, gray) centered at 0, and the **alternative** (the real effect, teal) shifted right by the standardized effect. The cutoff $z^*$ is set by $\alpha$. The red sliver of the null past $z^*$ is your false-alarm rate; the teal area of the alternative past $z^*$ is **power**. Three levers pull the curves apart: a bigger true effect, a larger sample (which marches the alternative right), or a more lenient $\alpha$.

---

<!-- block: gear, n: 3, label: "Buy power with sample size" -->

The effect here is fixed and modest. Raise the sample size and watch the alternative slide right until most of it clears the cutoff — that growing teal area is power climbing.

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
  prompt: "Raise the sample size until the test would catch this effect about 80% of the time — get the power label up near 0.80."
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

Four levers raise it: larger effect $\delta$, larger sample $n$, more lenient $\alpha$, or lower noise $\sigma$ (which raises $\delta$). **Power analysis** runs this backwards: fix a target power — say $0.80$ — and solve for the $n$ you need, *before* collecting any data.

<!-- block: derivation, title: "Solving for the required sample size", collapsed: true -->
Set power $= 0.80$, so $z_\alpha - \delta\sqrt{n} = \Phi^{-1}(0.20) = -z_{0.80}$. Then $\sqrt{n} = (z_\alpha + z_{0.80})/\delta$, i.e. $n = \big((z_\alpha + z_{0.80})/\delta\big)^2$. For one-sided $\alpha = 0.05$ ($z_\alpha = 1.645$) and power $0.80$ ($z_{0.80} = 0.842$): $n \approx (2.49/\delta)^2$. Smaller effects need quadratically more data.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Power, simulated" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: power-sim -->
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

Power climbs with $n$, crossing $\sim 0.80$ near $n = 25$ for this effect — exactly what the formula predicts.

---

<!-- block: misconception, inline: true -->
**"A non-significant result proves there's no effect."**

*Wrong:* $p > 0.05$, so the effect must be zero.

*Correct:* failing to reject $H_0$ could mean there's no effect — *or* that the study lacked the power to see one. An underpowered study misses real effects routinely: absence of evidence is not evidence of absence. Before believing a null result, ask what effect size the study had 80% power to detect; anything smaller than that could easily be hiding in plain sight.
<!-- /block -->

---

<!-- layer: both -->

<!-- block: gear, n: 6, label: "Where it leads" -->

<!-- block: callout, kind: insight -->
**Where this leads.** Power is the complement of the Type II rate $\beta$ from [**hypothesis testing**](/topic/hypothesis-testing), and it's why [**p-values**](/topic/p-values) alone never settle a question. Planning $n$ in advance is **power analysis** — the backbone of honest experiment design and of **A/B testing**, where it fixes the minimum detectable effect. Chronically underpowered studies are a leading driver of the replication crisis.
<!-- /block -->
