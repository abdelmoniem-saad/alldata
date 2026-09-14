<!-- block: gear, n: 1, label: "The brief" -->

You inherit a dataset of 500 adults: height (cm), sex, region, hours of
exercise per week, and self-reported daily calories. The brief from
the sports-science team: "do people who exercise more end up taller?"
The dataset is messy the way real datasets are: missing calories, a
region label with two spellings, and enough correlation between
exercise, sex, and region to hang every careless analysis.

Use the `heights` dataset with `load("heights")` in any code block of
this topic; the other code blocks simulate the workflow around it.

---

<!-- block: gear, n: 2, label: "Look before you model" -->

The EDA habits from the catalog come first, in the order that saves
you from yourself. Wrangling: `region` has "N", "north", and "North"
as three different values; a categorical cleanup comes before any
group comparison. Missingness: calories is missing in a meaningful
share of rows, and the pattern matters more than the amount
(missing-data topic): if exercise hours predict missingness, a naive
mean-impute biases every downstream estimate.

Then the joint look: exercise and sex are correlated in this sample
(men exercise more here), and sex is strongly associated with height.
That single fact is the entire story of this capstone, because the
question "does exercise make you taller" is really two questions in
one, and only one of them can be answered by a regression.

---

<!-- block: gear, n: 3, label: "The decision the whole capstone hangs on" -->

<!-- block: decision, anchor: cap-pick -->
question: |
  The naive comparison: people exercising 5+ hours/week average about
  3.7 cm taller. Before claiming exercise drives height, what does the
  catalog demand you check first?
options:
  - id: a
    label: "Whether 3.7 cm is statistically significant"
    writes: { mu: 0 }
    response: |
      Significance is the wrong gate here, and the flat line is the
      answer's shape: with n = 500 a 3.7 cm difference will clear any
      conventional bar. A significance test cannot rescue a comparison
      whose groups are not comparable. Next gate.
  - id: b
    label: "Who exercises more; sex correlates with both height and exercise"
    writes: { mu: 3.7 }
    response: |
      Correct, and the curve sits at the raw 3.7 cm precisely because
      this is the unadjusted number. The sample's exercisers skew male
      (68% of the 5+ group, versus 35% of the whole sample) and men are
      13 cm taller on average here. A chunk of the 3.7 cm is
      composition, not exercise. Adjusting for sex is the
      causal-inference discipline applied at home.
  - id: c
    label: "Whether the height measurements are rounded"
    writes: { mu: 1 }
    response: |
      Measurement hygiene matters, and rounding did blur the precision
      a little, but rounding shrinks correlations toward zero rather
      than manufacturing a 3.7 cm lift. The composition concern is the
      one that changes the conclusion; rounding only weakens it.
correct: b
<!-- /block -->

<!-- block: plot, spec: gaussian_pdf, params: {mu: 3.7, sigma: 1}, binds: [mu, sigma], anchor: cap-effect, mobile_order: 1 -->

The "exercise effect" you are being offered, in cm. The 3.7 cm headline
was real data and real arithmetic; the decision is about what it
and the decision is about what it
measures. Watch the estimate settle after the composition is removed.

---

<!-- block: gear, n: 4, label: "The analysis, done in order" -->

The regression the question deserves:

$$\text{height}_i = \beta_0 + \beta_1 \,\text{exercise}_i + \beta_2 \,\text{sex}_i + \beta_3 \,\text{region}_i + \varepsilon_i$$

with the diagnostics discipline attached: residual plot for structure
and heteroscedasticity, coefficient check against the EDA's story, and
sensitivity to the missing-data handling (complete-case vs imputed;
if the coefficient moves much, the imputation is driving the result
and you report both). The expected outcome, and the honest one: the
exercise coefficient flattens to zero (here, slightly negative) once
sex is in the model, and what remains is an association you describe
with its uncertainty, its confounders, and its observational status.

The report the brief deserves has four sections, and none of them is
"the p-value": what was cleaned and why (wrangling, missing-data),
what the adjusted estimate is with its interval, what the estimate
does NOT claim (causal inference topic, applied), and what design
would answer the question properly (experimental design: you cannot
randomize height, but you can be explicit that this is association).

<!-- block: fill_in, anchor: cap-fill -->
1. Clean first, with the missingness pattern checked, because imputation choices move coefficients.
2. Adjust for the composition the naive comparison hid (sex, region), then re-read the coefficient with its interval.
3. Report what remains as association, name its confounders, and say which design would turn the question into an experiment.
<!-- /block -->

---

<!-- block: gear, n: 5, label: "The whole analysis in one block" -->

<!-- block: simulation, editable: true, auto_run: true, anchor: cap-sim -->
```python
import numpy as np

rows = load("heights")                     # the real dataset
heights = np.array([r["height_cm"] for r in rows], dtype=float)
exercise = np.array([r["exercise_hours"] for r in rows], dtype=float)
sex = np.array([1 if r["sex"] == "M" else 0 for r in rows])

naive = heights[exercise >= 5].mean() - heights[exercise < 5].mean()

# Adjust: regress height on exercise + sex (composition control).
X = np.column_stack([np.ones(len(rows)), exercise, sex])
beta, *_ = np.linalg.lstsq(X, heights, rcond=None)
adjusted = beta[1]

print(f"naive difference (5+ vs <5 hrs) : {naive:+.2f} cm")
print(f"adjusted per-hour coefficient   : {adjusted:+.2f} cm/hour")
print(f"mean height by sex: M {heights[sex==1].mean():.1f}, "
      f"F {heights[sex==0].mean():.1f}")
# The 3.7 cm headline deflates once composition enters the model.
# What survives is a small association, reported with its interval and
# its limits, which is the difference between analysis and storytelling.
```

---

<!-- block: gear, n: 6, label: "Where this leads" -->

<!-- block: callout, kind: insight -->
**The catalog, exercised.** This topic introduced no new formulas; it
made you run the ones you have, in the order that keeps them honest:
wrangle, look, diagnose the comparison, adjust, diagnose the model,
report the limits. The next stage of learning is not another tool, it
is another dataset, and the same checklist applied to a question
someone actually pays to answer.
<!-- /block -->

<!-- block: misconception, inline: true -->
**"The adjusted model's near-zero coefficient means the earlier 3.7 cm was wrong data."**

*Wrong:* the naive comparison was mistaken; the numbers were bad.

*Correct:* both numbers were computed correctly from the same rows.
They answer different questions: the 3.7 cm describes who happens to
exercise; the adjusted coefficient estimates the association of
exercise with height *among people of the same sex and region*. No
dataset was dishonest, and no correction was an error; the difference
between the two numbers is the composition, which is exactly the thing
the unadjusted comparison forgot to hold still.
<!-- /block -->
