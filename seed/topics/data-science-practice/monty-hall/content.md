<!-- block: gear, n: 1, label: "Three doors" -->

Three doors. Behind one, a car. Behind the other two, goats. You pick door
1. The host — who knows where the car is — opens door 3 and shows you a
goat. He asks: **do you want to switch to door 2?**

Most people say it makes no difference: two closed doors, fifty-fifty.
Most people are wrong, and the simulation below will make you *feel* why.

---

<!-- block: gear, n: 2, label: "Where the information hides" -->

The fifty-fifty instinct treats the host's reveal as worthless. It isn't.
Monty's choice is **conditional on where the car is and on what you picked**:

- If your first pick was right (1 in 3), Monty can open either goat door —
  and switching always loses.
- If your first pick was wrong (2 in 3), Monty is *forced* to open the only
  goat door he can — and switching always wins.

So the reveal isn't random noise; it's information that flows straight into
the probability of your *other* closed door. The odds that you picked right
never change: still 1 in 3. The entire remaining 2 in 3 concentrates on the
one door Monty avoided.

---

<!-- block: gear, n: 3, label: "Commit to a strategy" -->

<!-- block: decision, anchor: monty-reveal -->
question: |
  You picked door 1. Monty opens door 3 — a goat.
  Which strategy wins the car more often?
options:
  - id: a
    label: "Stay with door 1"
    writes: { p: 0.3333 }
    response: |
      Staying wins only when your first pick was right — 1 in 3. Watch the
      histogram settle around 3 wins out of 10. Your door never gained
      probability from the reveal; door 2 took all of it.
  - id: b
    label: "It doesn't matter — fifty-fifty"
    writes: { p: 0.5 }
    response: |
      This is the trap. Two doors remain, but they are *not* symmetric: your
      door was fixed at 1/3 before the reveal, and the reveal can't change
      the past. A fifty-fifty prior would mean Monty's knowledge told you
      nothing — check the histogram: it drifts to 5/10, which the real data
      never does.
  - id: c
    label: "Switch to door 2"
    writes: { p: 0.6667 }
    response: |
      Right. Switching wins whenever your first pick was wrong — 2 in 3.
      The histogram climbs toward 6 or 7 wins out of 10. Monty was forced
      to open a goat door, and that constraint is the whole gift.
correct: c
<!-- /block -->

<!-- block: plot, spec: binomial_pmf, params: {n: 10, p: 0.3333}, anchor: monty-wins -->

The plot shows the number of wins across **10 plays** of the game under the
strategy you committed to. Switch and watch the whole distribution march
right.

---

<!-- block: gear, n: 4, label: "The counting argument" -->

Forget formulas; count the worlds. Your first pick splits 100 possible
games into two families:

- **30 games**: the car is behind door 1 (your pick). Staying wins all 30.
- **70 games**: the car is behind door 2 or 3. Monty must open the goat
  door he can, and switching wins all 70.

Switching wins 70/100. That's the entire theorem. The formal version:
$$P(\text{car behind 2} \mid \text{Monty opened 3}) = \frac{1/3}{1/3 + 1/3} = \frac{2}{3}$$
The denominator shrinks from "door 2 or door 3" to "door 2" once Monty's
knowledge removes door 3 — and the numerator never moved.

---

<!-- block: gear, n: 5, label: "Play it 1,000 times" -->

<!-- block: code_python, editable: true, auto_run: true -->
```python
from collections import Counter

games = load("monty-hall-runs")

tally = Counter()
for g in games:
    outcome = "stay wins" if g["stay_wins"] else "switch wins"
    tally[outcome] += 1

total = len(games)
print(f"Simulated games: {total}")
for outcome, n in tally.most_common():
    print(f"{outcome:<13} {n:>5}  ({n / total:.1%})")

# The reveal gives you information *because* Monty knows where the car is.
# Force a clueless host (he opens a random door) and the advantage dies:
clueless = sum(1 for g in games if g["stay_wins"] == g["switch_wins"])
print(f"\ngames where switching did NOT help: {clueless}")
```

Every row of the dataset is one full game: your pick, the car's door, the
door Monty opened, and who won. Aggregating 1,000 of them makes the 2/3 —
1/3 split impossible to unsee.

---

<!-- block: gear, n: 6, label: "Where it leads" -->

<!-- block: callout, kind: insight -->
**Where this leads.** The engine under the reveal is [**conditional
probability**](/topic/conditional-probability) — the same reversal
[**Bayes' theorem**](/topic/bayes-theorem) formalizes, dressed as a game
show. And if 10 games in the histogram look unconvincing, that wobble is
exactly what [**the law of large numbers**](/topic/law-of-large-numbers)
tames: with 1,000 simulated games the split lands on 2/3 almost exactly.
<!-- /block -->
