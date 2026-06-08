<!-- block: state, values: {p_a: 0.10, p_b: 0.12, n_a: 800, n_b: 800} -->

<!-- block: plot, spec: proportion_test, params: {p_a: 0.10, p_b: 0.12, n_a: 800, n_b: 800}, binds: [p_a, p_b, n_a, n_b], anchor: ab-bars, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "The experiment behind the button" -->

# A/B testing

Should the button be green or blue? A/B testing answers it the only honest way: randomly split users into a **control** (A) and a **variant** (B), measure a metric — conversion, click-through, signups — and ask whether B is *really* better or just luckier. It's hypothesis testing wearing a product-manager's hat, and randomization is what lets you call the difference *causal*.

---

<!-- block: gear, n: 2, label: "Is the lift real?" -->

The plot shows each group's conversion rate with a 95% error bar, and the verdict from a **two-proportion z-test**. The question is never "is B higher?" — it's "is B higher by more than noise could explain?" When the sample is small the error bars are wide and even a real-looking lift is `not significant`; the answer hinges as much on **how many users** you've collected as on the gap itself.

---

<!-- block: gear, n: 3, label: "Should you ship it?" -->

B is at 12% versus A's 10% after 800 users each — but the test says *not significant* ($z \approx 1.2$). Your PM says "it's trending up, let's ship."

<!-- block: decision, anchor: ab-peek -->
question: |
  The lift looks good but isn't significant yet. What's the right call?
options:
  - id: ship
    label: "Ship B — it's winning"
    writes: { p_a: 0.10, p_b: 0.12, n_a: 800, n_b: 800 }
    response: |
      That's the peeking trap. $z \approx 1.2$ (p ≈ 0.23) is squarely within
      what pure noise produces. "Trending" is not a result — shipping now is a
      coin-flip dressed as a decision.
  - id: moredata
    label: "Keep running to the pre-planned sample size"
    writes: { p_a: 0.10, p_b: 0.12, n_a: 3000, n_b: 3000 }
    response: |
      Right — watch the error bars shrink as n grows. With enough data the same
      two-point lift becomes clearly significant (z jumps past 2). Fix the
      sample size *up front* by power analysis, then read the result once.
  - id: stop-null
    label: "Stop — B has failed"
    writes: { p_a: 0.10, p_b: 0.12, n_a: 800, n_b: 800 }
    response: |
      Too hasty the other way. Not-yet-significant isn't the same as no effect —
      that's a power problem, not a verdict. Run to the planned n, then decide.
correct: moredata
<!-- /block -->

<!-- block: callout, kind: insight, depends_on: ab-peek, branch: moredata -->
The same lift, more data: the bars tightened and the result crossed into significance. The honest workflow is fixed-horizon — decide your sample size in advance for the smallest lift worth detecting (the **minimum detectable effect**), then look *once*.
<!-- /block -->

---

<!-- layer: formal -->

<!-- block: gear, n: 4, label: "The test, and why peeking lies" -->

For conversion counts, the **two-proportion z-test** uses the pooled rate $\hat{p}$ under the null:

$$z = \frac{\hat{p}_B - \hat{p}_A}{\sqrt{\hat{p}(1-\hat{p})\left(\tfrac{1}{n_A} + \tfrac{1}{n_B}\right)}}, \qquad \hat{p} = \frac{x_A + x_B}{n_A + n_B}.$$

Reject when $|z| > 1.96$ (at $\alpha = 0.05$), and report a **confidence interval** on the lift, not just a p-value. The deadly sin is **peeking**: checking repeatedly and stopping at the first significant moment. Each look is another chance to cross the line by luck, so the real false-positive rate balloons far past 5%. Fixes: a fixed sample size set by power analysis, or sequential/Bayesian designs built for continuous monitoring.

<!-- block: derivation, title: "Sizing the test before you run it", collapsed: true -->
Power analysis inverts the test: to detect a lift $\delta$ with power $1-\beta$ at level $\alpha$, each group needs roughly $n \approx \dfrac{(z_{\alpha/2} + z_{\beta})^2 \cdot 2\bar{p}(1-\bar{p})}{\delta^2}$. Smaller lifts need quadratically more users — which is why you commit to $n$ (and the minimum detectable effect) *before* collecting a single data point.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Run a test — and watch peeking misfire" -->

<!-- block: code_python, editable: true, auto_run: true, anchor: ab-code -->
```python
import numpy as np
rng = np.random.default_rng(0)

# One clean result: 300/3000 (A) vs 360/3000 (B).
nA = nB = 3000
xA, xB = 300, 360
pA, pB = xA/nA, xB/nB
pool = (xA + xB) / (nA + nB)
z = (pB - pA) / np.sqrt(pool*(1-pool)*(1/nA + 1/nB))
print(f"observed: A={pA:.1%}  B={pB:.1%}  z={z:.2f}  ->  "
      f"{'significant' if abs(z) > 1.96 else 'n.s.'}")

# Now the peeking trap: NULL A/A tests (no real difference), stop at the first
# significant peek among 10 checkpoints. The false-positive rate should be 5%.
checks = range(300, 3001, 300)
false_alarms = 0
trials = 1500
for _ in range(trials):
    a = np.cumsum(rng.random(3000) < 0.10)
    b = np.cumsum(rng.random(3000) < 0.10)
    for t in checks:
        pa, pb = a[t-1]/t, b[t-1]/t
        pp = (a[t-1] + b[t-1]) / (2*t)
        s = np.sqrt(pp*(1-pp)*(2/t)) if 0 < pp < 1 else 0
        if s and abs((pb - pa)/s) > 1.96:
            false_alarms += 1
            break
print(f"peeking at 10 checkpoints in a NULL test: {false_alarms/trials:.1%} "
      f"false positives (should be ~5%)")
```

The honest single test is significant; the peeking experiment cries "winner!" on identical groups roughly **one time in five** — peeking, quantified.

---

<!-- block: misconception, inline: true -->
**"Stop the test the moment it hits p < 0.05."**

*Wrong:* significance is significance — once you see it, you're done.

*Correct:* if you check after every batch of users and stop at the first significant reading, you've taken many shots at the 5% target, so your true false-positive rate is far higher (≈ 18% for ten looks). Significance is only calibrated for a *single*, pre-planned analysis. Decide the sample size in advance, or use a method designed for repeated looks.
<!-- /block -->

---

<!-- layer: both -->

<!-- block: gear, n: 6, label: "Where it leads" -->

<!-- block: callout, kind: insight -->
**Where this leads.** A/B testing is [**hypothesis testing**](/topic/hypothesis-testing), [**p-values**](/topic/p-values), and [**confidence intervals**](/topic/confidence-intervals) put to work, with **statistical power** fixing the sample size. The same machinery runs **clinical trials** in medicine (treatment vs placebo) and **conversion optimization** in business (checkout flows, pricing). For continuous monitoring, sequential testing and multi-armed bandits pick up where the fixed-horizon test stops.
<!-- /block -->
