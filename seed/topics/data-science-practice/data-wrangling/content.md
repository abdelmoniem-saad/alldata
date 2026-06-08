<!-- block: state, values: {mu: 50, sigma: 20} -->

<!-- block: plot, spec: empirical_histogram, params: {mu: 50, sigma: 20}, binds: [mu, sigma], anchor: dw-hist, mobile_order: 1 -->

---

<!-- block: gear, n: 1, label: "The unglamorous 80%" -->

# Data wrangling

Before a single model is fit, the data has to be *made fit to use*: parsed into the right types, reshaped into the right layout, joined, de-duplicated, and stripped of the little landmines real exports are full of. This is data wrangling — routinely 80% of the work, and the part that quietly decides whether everything downstream is right or garbage.

---

<!-- block: gear, n: 2, label: "What 'messy' looks like" -->

The usual suspects: numbers stored as text (`"$1,200"`, `"3.5%"`), dates as strings, the same category spelled three ways, duplicate rows, data spread across files that must be **joined**, tables in the wrong **shape** (wide when you need long), and — most insidious — **sentinel values**: a real number like `-999` or `9999` standing in for "missing." A sentinel looks like data, so it sails straight into your averages and wrecks them.

---

<!-- block: gear, n: 3, label: "Spot the landmine" -->

The histogram is a `delivery_time` column. A handful of rows use `9999` as a sentinel for "never delivered."

<!-- block: decision, anchor: dw-clean -->
question: |
  You need the *typical* delivery time. A few rows store `9999` — the export
  tool's code for "never delivered." What's the right first move?
options:
  - id: average-asis
    label: "Average the column as-is — the sentinels are rare"
    writes: { mu: 50, sigma: 20 }
    response: |
      No — even a handful of 9999s drag the mean and explode the standard
      deviation. "Rare" isn't "harmless" when the value is absurd. The summary
      you'd report is meaningless.
  - id: mark-missing
    label: "Replace 9999 with NaN, then summarize the real values"
    writes: { mu: 34, sigma: 8 }
    response: |
      Right — watch the distribution snap back to the real delivery times. A
      sentinel is missing data wearing a number's clothes: turn it into an
      explicit NaN *before* any aggregate, then decide separately how to handle
      the genuinely-missing rows.
  - id: drop-column
    label: "Drop the whole column — it's corrupted"
    writes: { mu: 50, sigma: 20 }
    response: |
      Too drastic. The column is fine; only the sentinel *encoding* is the
      problem. Dropping it throws away good data to avoid a one-line fix.
correct: mark-missing
<!-- /block -->

<!-- block: callout, kind: warning, depends_on: dw-clean, branch: mark-missing -->
This is the most common silent data bug there is. Always inspect a column's distinct values and range *before* you trust an aggregate — `-999`, `9999`, `0`, and `"N/A"` masquerading as data have ruined more analyses than any modeling mistake.
<!-- /block -->

---

<!-- layer: formal -->

<!-- block: gear, n: 4, label: "Tidy data and the core verbs" -->

Most wrangling is bending data into **tidy** form, where (1) each variable is a column, (2) each observation is a row, and (3) each type of observational unit is its own table. Tidy data is what every plotting and modeling tool expects. The handful of operations that get you there:

- **filter / select** — keep the rows and columns you need.
- **mutate** — derive new columns (parse types, compute ratios).
- **group-by / aggregate** — collapse to per-group summaries.
- **join** — merge tables on a key (and mind the one-to-many fan-out).
- **pivot / melt** — reshape between wide and long.

Garbage in, garbage out is not a cliché here: a type error or a stray sentinel survives every later step.

---

<!-- block: gear, n: 5, label: "Clean a messy export" -->

<!-- block: code_python, editable: true, auto_run: true, anchor: dw-code -->
```python
import pandas as pd
import numpy as np

# A messy export: prices as strings with $ and commas, ratings using -999 as
# a 'no rating' sentinel. Exactly what tends to land on your desk.
raw = pd.DataFrame({
    "product": ["A", "B", "C", "D", "E"],
    "price":   ["$1,200", "$950", "N/A", "$3,400", "$780"],
    "rating":  [4.5, -999, 3.9, 4.1, -999],
})
print("raw 'price' dtype:", raw["price"].dtype, "(stored as text!)\n")

clean = raw.copy()
# 1) Parse price: strip $ and commas, coerce to number ('N/A' -> NaN).
clean["price"] = pd.to_numeric(clean["price"].str.replace(r"[$,]", "", regex=True),
                               errors="coerce")
# 2) The -999 sentinel is missing in disguise — make it a real NaN.
clean["rating"] = clean["rating"].replace(-999, np.nan)

print("clean:\n", clean, "\n")
print(f"mean rating  raw (with -999): {raw['rating'].mean():8.1f}")
print(f"mean rating  cleaned        : {clean['rating'].mean():8.2f}")
```

The raw mean rating is a nonsensical negative number; once the sentinel becomes `NaN`, the real average (~4.2) appears. One sentinel, one wrecked statistic.

---

<!-- block: misconception, inline: true -->
**"Cleaning data is mechanical busywork — the analysis is the real work."**

*Wrong:* wrangling is a chore you rush through to get to the modeling.

*Correct:* the decisions you make while wrangling — how to encode missingness, which rows are duplicates, how to join, what counts as an outlier — *are* analysis, and they shape every result that follows. A model can't recover from a sentinel you left in or a join that silently duplicated rows. The wrangling is where most real-world errors are made, and caught.
<!-- /block -->

---

<!-- layer: both -->

<!-- block: gear, n: 6, label: "Where it leads" -->

<!-- block: callout, kind: insight -->
**Where this leads.** Wrangling feeds [**exploratory data analysis**](/topic/exploratory-data-analysis), where you actually look at what you've cleaned. Handling the gaps you uncover — once a sentinel becomes an explicit `NaN` — is its own discipline: [**missing data**](/topic/missing-data). And reliable joins and types are the bedrock under every model in the catalog.
<!-- /block -->
