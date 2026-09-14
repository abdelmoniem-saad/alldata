<!-- block: gear, n: 1, label: "The question the graph can't answer" -->

The graph says: customers who redeem coupons spend 30% more per month.
The stakeholder asks: "so give everyone coupons?" And the graph goes
quiet, because its number answers a different question: *how much more
do coupon users spend*, not *how much would spending change if we
handed out coupons*. Those differ whenever coupon users were never a
random draw, and they never are.

---

<!-- block: gear, n: 2, label: "The counterfactual gap" -->

The causal effect of a treatment on a unit is the difference between
the outcome with treatment and the outcome *without*, on the same unit,
in the same world. You observe at most one of those two outcomes; the
other is the counterfactual, forever missing. All of causal inference
is a strategy for estimating that missing value from other units.

**Randomization is the gold strategy**: flip a coin, and the two arms
become balance sheets of everything else, observed or not. Age,
income, motivation, desperation: all distributed evenly by the coin,
so a mean difference is the causal effect, and no covariates are needed
in principle. This is why the ab-testing topic could be so breezy.

**Without randomization you adjust, and adjustment is where the
difficulty lives.** Regression, matching, or weighting can block the
paths that confound treatment and outcome (the coupon example: bargain
hunters both redeem coupons AND buy in bulk). But adjustment only
fixes what you measured and modeled correctly; it cannot fix an
unobserved driver of both ("price-sensitive people" living nowhere in
the data), and it destroys the estimate if you adjust for the wrong
variable: a variable *affected by* the treatment is a mediator, and
controlling for it erases the very effect you're estimating.

---

<!-- block: gear, n: 3, label: "Adjust or not" -->

<!-- block: decision, anchor: ci-pick -->
question: |
  Estimating the coupon's effect on spend. Coupon redemption is driven
  by bargain-hunting, which also drives spending. What does honest
  adjustment need?
options:
  - id: a
    label: "Adjust for spend; it's the outcome"
    writes: { slope: 0 }
    response: |
      The fit line went flat, and that is the picture of an effect
      adjusted into oblivion: conditioning on (a function of) the
      outcome destroys the comparison. You never adjust for the
      outcome or its descendants.
  - id: b
    label: "Adjust for bargain-hunting, the common cause"
    writes: { slope: 0.15 }
    response: |
      Correct in spirit, and the line settled at the smaller honest
      slope: block the backdoor (the variable that drives both
      redemption and spend) and the remaining difference approaches
      the coupon's own effect, provided bargain-hunting is actually
      measured. The 30% raw number deflates; that deflation is the
      estimate earning its keep.
  - id: c
    label: "Adjust for coupon stockpile, an effect of redemption"
    writes: { slope: 0.4 }
    response: |
      The line steepened beyond the raw slope, the signature of a
      collider or mediator mistake: conditioning on a consequence of
      treatment opens a spurious path instead of closing one.
      Adjustment variables must precede the treatment.
correct: b
<!-- /block -->

<!-- block: plot, spec: scatter_with_fit, params: {slope: 0.15, intercept: 0}, binds: [slope, intercept], anchor: ci-fit, mobile_order: 1 -->

The estimated coupon effect as a slope. Raw association (steep), fully
blocked backdoors (the deflated honest number), and outcome-adjusted
nonsense (flat): three slopes, three analyses, one dataset.

---

<!-- block: gear, n: 4, label: "The toolbox, named" -->

Beyond regression adjustment: **matching** (compare treated units to
similar untreated ones), **inverse propensity weighting** (reweight the
untreated to look like the treated, using a model of who gets treated),
**difference-in-differences** (before/after trends between a treated
and untreated group, the policy-evaluation workhorse), and
**instrumental variables** (a variable that shifts treatment but
plausibly touches the outcome only through it; distance to a hospital
for hospital care). Every method's validity hangs on an untestable
claim about which paths exist, which is why the field's central habit
is the **sensitivity analysis**: how strong would an unmeasured
confounder have to be to erase this conclusion?

<!-- block: fill_in, anchor: ci-fill -->
1. The causal effect compares a world with treatment to the same world without, and one of those worlds is always unobserved.
2. Randomization balances even the confounders you never measured; adjustment only balances the ones you did.
3. Adjust for causes of treatment, never for consequences of treatment, and always ask what the adjustment assumes away.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Watch the deflation" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: ci-sim -->
```python
import numpy as np

rng = np.random.default_rng(47)
n = 20_000
bargain_hunter = rng.normal(0, 1, n)                    # unobserved-ish driver
coupon = (bargain_hunter + rng.normal(0, 1, n) > 0).astype(int)
spend = 80 + 10 * coupon + 25 * bargain_hunter + rng.normal(0, 20, n)

naive = spend[coupon == 1].mean() - spend[coupon == 0].mean()

X = np.column_stack([coupon, bargain_hunter])
beta, *_ = np.linalg.lstsq(X, spend, rcond=None)
print(f"naive difference    : {naive:+.1f}  <- 'coupon users spend more'")
print(f"adjusted for driver : {beta[0]:+.1f}  <- the honest slope")
# The raw number read 25-30 points of coupon effect. Most of it was
# the shopper, not the coupon. The adjustment returns ~10, the truth
# built into the simulation.
```

---

<!-- block: gear, n: 6, label: "Where this leads" -->

<!-- block: callout, kind: insight -->
**Design beats adjustment.** Every method here leans on assumptions you
cannot verify from the data alone, which is why the strongest causal
claims come from design: randomize (ab-testing), or exploit a natural
experiment (a policy that hit some regions and not others). The
experimental-design topic is the discipline of building that strength
on purpose.
<!-- /block -->

<!-- block: misconception, inline: true -->
**"If I control for enough variables in the regression, correlation becomes causation."**

*Wrong:* with enough covariates in the model, the coefficient on X is
X's causal effect on Y.

*Correct:* adjustment helps only for measured confounders, only when
modeled with the right functional form, and only when the variables
precede the treatment; an unmeasured common cause or a badly placed
control poisons the estimate all the same. More covariates is not a
convergence to truth; some covariates (mediators, colliders) make it
worse. The honesty lives in the design, and in saying what the analysis
assumes.
<!-- /block -->
