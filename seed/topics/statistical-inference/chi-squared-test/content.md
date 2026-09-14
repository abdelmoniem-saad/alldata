<!-- block: gear, n: 1, label: "Coffee, not calipers" -->

Everything so far compared numbers: blood pressures, yields, scores. But
a huge share of real questions are counts. Did more people order oat milk
than the menu share predicts? Does survey support for a policy differ by
age bracket? The t-test has nothing to grip; the data are tally marks.

---

<!-- block: gear, n: 2, label: "What you'd see if categories were deaf" -->

Arrange the counts in a table, rows for one variable, columns for the
other. Now compute what each cell would hold if the two variables were
completely deaf to each other:

$$E_{ij} = \frac{\text{row } i \text{ total} \times \text{column } j \text{ total}}{N}$$

That is the row's share of the table spread evenly across the columns.
Then measure how far every cell wandered from its expectation, scaled by
the expectation, and add it all up:

$$\chi^2 = \sum_{ij} \frac{(O_{ij} - E_{ij})^2}{E_{ij}}$$

Big cells get big expectations, so their surprises count less; a 3-count
wobble in a cell expecting 50 is noise, the same wobble in a cell
expecting 4 is a signal. If the variables are independent, this statistic
follows the chi-squared curve, and the shape's parameters are the only
thing left to pin down.

---

<!-- block: gear, n: 3, label: "Degree the table" -->

<!-- block: decision, anchor: cst-pick -->
question: |
  A 3-row by 4-column table of survey counts (300 respondents). How many
  degrees of freedom does the independence chi-squared test have?
options:
  - id: a
    label: "11, one per interior cell"
    writes: { df: 11 }
    response: |
      The table has 11 non-marginal cells, but they are not free: once
      the row and column totals are fixed, the whole grid is determined
      by a much smaller set of choices. Eleven would be the count, not
      the freedom.
  - id: b
    label: "6, (3-1) x (4-1)"
    writes: { df: 6 }
    response: |
      Correct, and it reads like the multiplication it is: each row loses
      one degree to its own total, each column to its own. Three rows
      contribute 2, four columns contribute 3, and 2 x 3 = 6. The curve
      on screen is the yardstick.
  - id: c
    label: "299, one per respondent"
    writes: { df: 299 }
    response: |
      That is the N-1 logic of a one-sample variance test, not a table.
      Independence tests live on cell expectations, and the marginals
      devour most of the freedom before the test starts.
correct: b
<!-- /block -->

<!-- block: plot, spec: chi_squared_pdf, params: {df: 6}, binds: [df], anchor: cst-curve, mobile_order: 1 -->

The chi-squared curve at df = 6, the null world's scoreboard for your
table. Your statistic's distance into the right tail is the evidence.

---

<!-- block: gear, n: 4, label: "Read it like a statistician" -->

Three practical guards before trusting a small p-value. Expected counts:
the classical rule wants every expected cell at 5 or more (1 is tolerated
with caution, and Fisher's exact test covers small tables honestly).
Independence of observations: each respondent contributes one cell, not
five. And the ever-present trap: a significant $\chi^2$ says the pattern
is not the independence pattern, not which cell is the deviant. That
question needs cell-by-cell residuals ($O - E$ over $\sqrt{E}$), which is
the same post-hoc discipline as ANOVA.

<!-- block: fill_in, anchor: cst-fill -->
1. Expected counts come from the marginals alone; they encode the null hypothesis of deafness between the variables.
2. The statistic sums squared, expectation-scaled surprises, so big cells forgive small wobbles.
3. Freedom is (rows - 1) x (cols - 1), because the marginals consume the rest.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "Tally one" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: cst-sim -->
```python
import numpy as np
from scipy import stats

# Menu choice by age bracket (counts, not measurements).
table = np.array([
    [30, 45, 20, 5],    # 18-29
    [40, 50, 35, 15],   # 30-49
    [55, 40, 30, 25],   # 50+
])

chi2, p, dof, expected = stats.chi2_contingency(table)
print(f"chi2 = {chi2:.2f}, df = {dof}, p = {p:.4f}")
print("expected under independence:")
print(expected.round(1))
# df = (3-1) * (4-1) = 6. Where any single cell's observed pulled far from
# expected, the residuals table (observed - expected) names it.
```

---

<!-- block: gear, n: 6, label: "Where this leads" -->

<!-- block: callout, kind: insight -->
**Same idea, other clothes.** The goodness-of-fit variant compares one
sample's counts to a claimed distribution (is this die fair?). The test
of independence you just ran extends to homogeneity (same menu pattern
across cities?). And when cells get tiny, Fisher's exact test computes
the tail probabilities straight from combinatorics instead of leaning on
the curve.
<!-- /block -->

<!-- block: misconception, inline: true -->
**"A significant chi-squared means age causes menu choice."**

*Wrong:* the test confirms a causal link between the row and column
variables.

*Correct:* the test establishes that the observed table is unlikely under
independence, an association claim. The 50+ bracket and oat milk may both
be riding a third variable (income, region). Causation needs design:
randomization, or at least the adjustment discipline of the causal
inference lesson.
<!-- /block -->
