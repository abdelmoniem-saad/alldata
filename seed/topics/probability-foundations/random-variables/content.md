<!-- block: state, values: {mu: 0, sigma: 1} -->

<!-- block: plot, spec: gaussian_pdf, params: {mu: 0, sigma: 1}, binds: [mu, sigma], anchor: rv-pdf, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "It's actually a function" -->

# Random variables

A random variable is a function. That sounds wrong — it's called a *variable*, after all. But it doesn't store a value; it maps every outcome of an experiment to a number.

---

<!-- block: gear, n: 2, label: "Outcomes to numbers" -->

## A function in disguise

Roll a die. The outcome is one of $\{1, 2, 3, 4, 5, 6\}$. Define $X$ = "the number on the die." That's a random variable. It assigns each outcome the obvious number.

Define $Y$ = "1 if the roll is even, 0 otherwise." That's also a random variable — same outcomes, different numerical mapping. $X$ takes values in $\{1, 2, 3, 4, 5, 6\}$; $Y$ takes values in $\{0, 1\}$.

The numbers a random variable takes — and the probabilities it assigns to them — together define the **distribution** of the variable.

---

<!-- block: step_through, anchor: rv-walk -->
1. Start with a sample space $\Omega$ — the set of every outcome.
2. A **random variable** $X: \Omega \to \mathbb{R}$ assigns each outcome a number.
3. The **probability distribution** of $X$ tells you $P(X = x)$ for each value (discrete) or $P(a \le X \le b)$ (continuous).
4. Two random variables on the same $\Omega$ can take very different shapes — same underlying experiment, different summaries.
5. Once you have $X$, every probability question becomes: "what does the distribution of $X$ say about this event?"
<!-- /block -->

---

<!-- block: gear, n: 3, label: "Feel the parameters" -->

## Discrete vs. continuous

A **discrete** random variable takes values in a countable set: $\{0, 1, 2, \ldots\}$ or $\{H, T\}$. Probabilities are point masses.

A **continuous** random variable takes values in an interval: $\mathbb{R}$, $[0, 1]$, $[0, \infty)$. Probabilities live in a density — $P(X = x) = 0$ for any single value; only intervals have positive probability.

The plot on the right is a continuous distribution. Move the parameters; the *shape* the variable takes follows.

<!-- block: state_reset, anchor: rv-feel -->

<!-- block: playground, anchor: rv-feel -->
binds: [mu, sigma]
controls:
  - param: mu
    label: "Mean (μ)"
    min: -3
    max: 3
    step: 0.1
  - param: sigma
    label: "Std dev (σ)"
    min: 0.3
    max: 3
    step: 0.1
goal:
  prompt: "Make the distribution narrow and right-shifted: μ ≈ 1.5, σ ≈ 0.5."
  target: { mu: 1.5, sigma: 0.5 }
  success_when: "abs(mu - 1.5) < 0.15 and abs(sigma - 0.5) < 0.1"
  on_success: |
    Two parameters, two independent levers. $\mu$ slides the distribution left
    and right; $\sigma$ squeezes or spreads it. A normal random variable is
    fully determined by these two numbers.
<!-- /block -->

---

<!-- layer: formal -->

<!-- block: gear, n: 4, label: "Measurable, CDF, PMF, PDF" -->

## Formal definition

Given a probability space $(\Omega, \mathcal{F}, P)$, a **random variable** is a measurable function $X: \Omega \to \mathbb{R}$. "Measurable" means $\{X \le x\} \in \mathcal{F}$ for every $x$ — every event you'd want to assign a probability to is, in fact, an event in the underlying space.

The **cumulative distribution function** (CDF) is

$$F_X(x) = P(X \le x)$$

Every random variable has one. From the CDF you can recover the **probability mass function** (discrete) or **probability density function** (continuous):

$$\text{discrete: } p(x) = P(X = x) \qquad \text{continuous: } f(x) = F_X'(x)$$

<!-- block: derivation, title: "Why measurability is the right requirement", collapsed: true -->
The events we care about — $\{X \le x\}$, $\{a < X \le b\}$, $\{X \in B\}$ for $B$ a Borel set — should all have well-defined probabilities. The minimal condition that buys you all of them is: $\{X \le x\}$ is in the σ-algebra $\mathcal{F}$ for every $x \in \mathbb{R}$. The other events follow from countable unions/intersections, which σ-algebras are closed under.

For pathological functions (rare in practice but real in measure theory), some "events" you'd write down don't actually have probabilities. The measurability requirement excludes those.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Two RVs on one experiment" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: rv-sim -->
```python
import numpy as np
import matplotlib.pyplot as plt

# Simulate two random variables on the same experiment: roll a die.
# X = the number; Y = is_even.
np.random.seed(42)
n = 10_000
rolls = np.random.randint(1, 7, n)
x = rolls
y = (rolls % 2 == 0).astype(int)

fig, axes = plt.subplots(1, 2, figsize=(9, 3.2))
axes[0].hist(x, bins=range(1, 8), color='#14b8a6', alpha=0.8, align='left', rwidth=0.7)
axes[0].set_title('X = roll value')
axes[0].set_xlabel('value')

axes[1].hist(y, bins=[-0.5, 0.5, 1.5], color='#14b8a6', alpha=0.8, rwidth=0.7)
axes[1].set_title('Y = is_even')
axes[1].set_xticks([0, 1])
axes[1].set_xlabel('value')

plt.tight_layout()
plt.show()

print(f"E[X] = {x.mean():.4f}  (theoretical 3.5)")
print(f"E[Y] = {y.mean():.4f}  (theoretical 0.5)")
```

---

<!-- layer: both -->

<!-- block: gear, n: 6, label: "Where it leads" -->

<!-- block: callout, kind: insight -->
**Where this leads.** **Distributions** catalog the canonical shapes random variables take (normal, binomial, Poisson, exponential). **Expectation** summarizes a variable's center; **variance** its spread. **Independence of random variables** generalizes the events case. Almost everything downstream is "what does the distribution of $X$ tell us?" — random variables are the lever.
<!-- /block -->

---

<!-- block: misconception, inline: true -->
**"A random variable is a variable that takes random values."**

*Wrong:* it's like a normal algebraic variable, but with randomness baked in.

*Correct:* a random variable is a *function* from outcomes to numbers. The randomness comes from the underlying experiment, not from the variable itself. Once you fix an outcome $\omega$, $X(\omega)$ is just a number — not random anymore. The "random" in "random variable" describes the input, not the variable.
<!-- /block -->
