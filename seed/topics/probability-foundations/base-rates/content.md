<!-- block: gear, n: 1, label: "The 99% trap, at scale" -->

A screening test for a condition affecting **1 in 1,000 people** is **99%
accurate**: it catches 99% of true cases and falsely flags only 1% of
healthy people. Your result comes back **positive**.

Ninety-nine percent accurate, ninety-nine percent positive. Bad news?

Not so fast. This topic is the population-scale version of
[**Bayes' theorem**](/topic/bayes-theorem): the rarer the condition, the
more the false positives drown out the true ones, and at 1-in-1,000 they
drown them ten to one.

---

<!-- block: gear, n: 2, label: "Count people, not percentages" -->

Percentages hide the base rate. Counts reveal it. Picture a city of
**1,000,000**:

- **1,000 people** are actually sick. The test catches **990** of them.
- **999,000 people** are healthy. The 1% error rate flags **9,990** of
  them.

Now stand in the crowd of everyone who tested positive: 990 true positives
surrounded by 9,990 false positives. Your chance of being sick is
990 / 10,980, about **9%**. A "99% accurate" test, and nine times out of
ten a positive result is a false alarm.

---

<!-- block: gear, n: 3, label: "Commit before you compute" -->

<!-- block: decision, anchor: base-rate-intuition -->
question: |
  Condition: 1 in 1,000. Test: 99% sensitive, 99% specific.
  You test positive. What's the probability you're actually sick?
options:
  - id: a
    label: "About 99%: the test is 99% accurate"
    writes: { treatment_strategy: "treat_all" }
    response: |
      Look at the dot grid: almost every highlighted dot is a *healthy*
      person caught by the 1% error rate. Accuracy describes the test's
      behavior, not your posterior; the 1-in-1,000 base rate dominates.
  - id: b
    label: "About 50%: even odds"
    writes: { treatment_strategy: "treat_half" }
    response: |
      Better instinct: you're discounting the accuracy. But the truth is
      harsher still. Even-odds would require the sick and healthy
      populations to feed the positive pool equally. At 1-in-1,000, the
      healthy pool is a thousand times bigger, so its 1% error swamps the
      true positives ten to one.
  - id: c
    label: "About 9%: one in eleven positives is real"
    writes: { treatment_strategy: "retest" }
    response: |
      Exactly. 990 true positives against 9,990 false positives: roughly 1
      in 11 positive tests is real. This is why the standard protocol is a
      *retest*: a second positive on an independent test drops the false
      positives by another factor of 100, and your posterior soars.
correct: c
<!-- /block -->

<!-- block: plot, spec: population_dot_grid, params: {prior: 0.001, sensitivity: 0.99, specificity: 0.99, treatment_strategy: "none"}, anchor: base-rate-grid -->

Every dot is a person. Highlighted dots tested positive. Under your
treatment strategy, count how many highlighted dots are actually sick;
the grid makes the 9% visible instead of arithmetic.

---

<!-- block: gear, n: 4, label: "The formal version" -->

The same calculation, symbol by symbol. Bayes' theorem with prevalence
$P(D) = 0.001$, sensitivity $P(+ \mid D) = 0.99$, and false-positive rate
$P(+ \mid \neg D) = 0.01$:

$$P(D \mid +) = \frac{0.99 \times 0.001}{0.99 \times 0.001 + 0.01 \times 0.999} = \frac{0.00099}{0.01098} \approx 0.09$$

The denominator is the whole story: the healthy population is 999× larger,
so its 1% error contributes **ten times** more positive tests than the
sick population's 99% hit rate. [**Bayes' theorem**](/topic/bayes-theorem)
is the general rule; the base rate is the lever that decides whether the
answer is terrifying or reassuring.

---

<!-- block: gear, n: 5, label: "Compute it from raw records" -->

<!-- block: code_python, editable: true, auto_run: true -->
```python
import pandas as pd

records = load("medical-test-results")
df = pd.DataFrame(records)

print(f"Screened patients: {len(df)}")
print(pd.crosstab(df["true_status"], df["test_result"], margins=True))

sick = df[df["true_status"] == "sick"]
healthy = df[df["true_status"] == "healthy"]

true_pos = (sick["test_result"] == "positive").sum()
false_pos = (healthy["test_result"] == "positive").sum()

ppv = true_pos / (true_pos + false_pos)
print(f"\nTrue positives:     {true_pos}")
print(f"False positives:    {false_pos}")
print(f"P(sick | positive) = {ppv:.1%}")
print("...from a test that is 99% accurate.")
```

No theorem in this block, just counting. The crosstab *is* Bayes'
theorem in table form, and the final line falls out of the counts the same
way it fell out of the dot grid.

---

<!-- block: gear, n: 6, label: "Where it leads" -->

<!-- block: callout, kind: insight -->
**Where this leads.** The reversal you just did is
[**Bayes' theorem**](/topic/bayes-theorem) on population counts, and the
vocabulary comes from [**conditional probability**](/topic/conditional-probability).
The same base-rate blindness explains why [**hypothesis
testing**](/topic/hypothesis-testing) on rare effects produces mostly
false alarms: the smaller the effect prevalence, the worse the
false-positive pileup, and [**statistical
power**](/topic/statistical-power) is how you fight back.
<!-- /block -->
