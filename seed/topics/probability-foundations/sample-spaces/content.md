<!-- block: state, values: {n: 2, p: 0.5} -->

<!-- block: plot, spec: binomial_pmf, params: {n: 2, p: 0.5}, binds: [n, p], anchor: ss-bars, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "What could happen" -->

# Sample spaces and events

Before you can compute the probability of anything, you have to answer a prior question: what could happen at all? The complete set of possible outcomes is the **sample space**. The thing you actually care about — "an even number," "at least one head" — is an **event**, a subset of that space. Get these two right and probability is bookkeeping; get them muddled and every later number is suspect.

---

<!-- block: gear, n: 2, label: "Outcomes, events, and the set algebra" -->

Flip two coins. The sample space is $\Omega = \{HH, HT, TH, TT\}$ — four equally likely outcomes. The plot on the right counts heads across that space: zero heads (TT), one head (HT or TH), two heads (HH), with probabilities $\tfrac14, \tfrac12, \tfrac14$.

An **event** is any subset. "At least one head" is $\{HH, HT, TH\}$. Events combine with the algebra of sets, and that's the whole toolkit:

- **union** $A \cup B$ — "A or B (or both)"
- **intersection** $A \cap B$ — "A and B together"
- **complement** $A^c$ — "not A"

When every outcome is equally likely, the probability of an event is just a counting ratio: $P(A) = |A| / |\Omega|$.

---

<!-- block: gear, n: 3, label: "When you learn something" -->

Knowing something *restricts* the sample space — and that can change a probability in ways intuition resists.

<!-- block: decision, anchor: ss-twocoins -->
question: |
  Two coins are flipped behind a screen. You're told **at least one is heads**.
  Given only that, what's the probability *both* are heads?
options:
  - id: half
    label: "1/2 — the other coin is still 50/50"
    writes: { n: 2, p: 0.5 }
    response: |
      The tempting answer, but it quietly assumes a "first" and "second" coin.
      The information "at least one is heads" doesn't single out a coin — it
      rules out one whole outcome (TT) from $\{HH, HT, TH, TT\}$, leaving three
      equally likely possibilities. Only one of those three is HH.
  - id: third
    label: "1/3 — the news rules out TT, leaving three cases"
    writes: { n: 2, p: 0.5 }
    response: |
      Right. The sample space starts as $\{HH, HT, TH, TT\}$. "At least one
      head" eliminates TT, leaving $\{HH, HT, TH\}$ — three equally likely
      outcomes, of which exactly one (HH) has both heads. So $P = 1/3$. The
      restriction did the work.
  - id: quarter
    label: "1/4 — both heads is one of four outcomes"
    writes: { n: 2, p: 0.5 }
    response: |
      That's the *unconditional* probability of HH, before you were told
      anything. The phrase "at least one is heads" is information — it shrinks
      the sample space from four outcomes to three, which raises the
      probability from 1/4 to 1/3.
correct: third
<!-- /block -->

<!-- block: callout, kind: insight, depends_on: ss-twocoins, branch: third -->
This is conditioning in miniature: restricting attention to the outcomes consistent with what you know, then re-counting. Naming the sample space explicitly — all four outcomes — is what makes the right answer obvious instead of a trick.
<!-- /block -->

---

<!-- layer: formal -->

<!-- block: gear, n: 4, label: "The axioms underneath" -->

Formally, a probability assigns each event $A \subseteq \Omega$ a number $P(A)$ obeying three rules (Kolmogorov's axioms):

$$P(A) \ge 0, \qquad P(\Omega) = 1, \qquad P\!\left(\bigcup_i A_i\right) = \sum_i P(A_i) \text{ for disjoint } A_i.$$

Everything else — the complement rule $P(A^c) = 1 - P(A)$, the inclusion–exclusion formula — is derived from these. For a finite space of equally likely outcomes they collapse to counting:

$$P(A) = \frac{|A|}{|\Omega|}.$$

The hard part of real problems is rarely the arithmetic; it's writing down $\Omega$ correctly in the first place.

---

<!-- block: gear, n: 5, label: "Count it by simulating" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: ss-sim -->
```python
import numpy as np

# Flip two fair coins many times. Confirm the unconditional P(HH) = 1/4,
# then condition on "at least one head" and watch it rise to 1/3.
rng = np.random.default_rng(0)
flips = rng.integers(0, 2, size=(1_000_000, 2))   # 0 = tails, 1 = heads
heads = flips.sum(axis=1)                          # 0, 1, or 2 heads

p_both = np.mean(heads == 2)
at_least_one = heads >= 1
p_both_given_one = np.mean(heads[at_least_one] == 2)

print(f"P(both heads)                    = {p_both:.4f}  (= 1/4)")
print(f"P(both heads | at least one head) = {p_both_given_one:.4f}  (= 1/3)")
```

---

<!-- block: misconception, inline: true -->
**"The sample space is just the outcomes I care about."**

*Wrong:* to find P(rolling a 6), the sample space is {six, not-six}.

*Correct:* the sample space is *every* outcome the experiment can produce — $\{1,2,3,4,5,6\}$ — not a pre-filtered pair. Collapsing it to "six / not-six" happens to give the right single number here, but it throws away the structure you need the moment a problem involves conditioning or combined events. Write the full $\Omega$ first.
<!-- /block -->

---

<!-- layer: both -->

<!-- block: gear, n: 6, label: "Where it leads" -->

<!-- block: callout, kind: insight -->
**Where this leads.** The three axioms become the **basic probability rules** (addition, complement, inclusion–exclusion). Restricting the space on new information is **conditional probability**, and reversing that restriction is **Bayes' theorem**. Mapping outcomes to numbers turns events into **random variables** — the bridge to the rest of statistics.
<!-- /block -->
