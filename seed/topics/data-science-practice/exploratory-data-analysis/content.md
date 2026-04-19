<!-- layer: intuition -->

## Look Before You Leap

Before building any model, you need to **look at your data**. Exploratory Data Analysis (EDA) is the art of summarizing, visualizing, and understanding a dataset before making assumptions.

EDA answers questions like:
- What do the distributions look like? Skewed? Bimodal? Outliers?
- Are there missing values? How many?
- How are variables related to each other?
- What patterns or anomalies stand out?

John Tukey, who coined the term, said: *"Far better an approximate answer to the right question than an exact answer to the wrong question."* EDA helps you find the right question.

---

## The EDA Workflow

1. **Summary statistics:** mean, median, standard deviation, min/max, quartiles
2. **Univariate plots:** histograms, box plots — what does each variable look like?
3. **Bivariate plots:** scatter plots, correlation matrices — how do variables relate?
4. **Missing data audit:** where are the gaps?
5. **Outlier detection:** what points seem unusual?

The golden rule: **plot everything before you compute anything.** Anscombe's quartet proves that summary statistics alone can be deeply misleading.

---

<!-- block: code_python, editable: true -->
```python
import numpy as np
import matplotlib.pyplot as plt
from scipy import stats

# Generate a realistic dataset: student performance
np.random.seed(42)
n = 200

hours_studied = np.random.exponential(3, n) + 1  # Right-skewed
hours_studied = np.clip(hours_studied, 0.5, 15)

sleep_hours = np.random.normal(7, 1.5, n)
sleep_hours = np.clip(sleep_hours, 3, 12)

# Score depends on study hours, sleep, and noise
score = 40 + 3 * hours_studied + 2 * sleep_hours + np.random.normal(0, 8, n)
score = np.clip(score, 0, 100)

# Add some missing values
missing_idx = np.random.choice(n, 10, replace=False)
sleep_with_missing = sleep_hours.copy()
sleep_with_missing[missing_idx] = np.nan

# EDA Dashboard
fig, axes = plt.subplots(2, 3, figsize=(14, 8))

# 1. Histogram of scores
axes[0,0].hist(score, bins=25, color='#14b8a6', alpha=0.7, edgecolor='white')
axes[0,0].axvline(np.mean(score), color='red', linestyle='--', label=f'Mean={np.mean(score):.1f}')
axes[0,0].axvline(np.median(score), color='green', linestyle='--', label=f'Median={np.median(score):.1f}')
axes[0,0].set_title('Score Distribution', fontweight='bold')
axes[0,0].legend(fontsize=8)

# 2. Box plots
axes[0,1].boxplot([hours_studied, sleep_hours, score/10],
                   labels=['Study hrs', 'Sleep hrs', 'Score/10'],
                   patch_artist=True,
                   boxprops=dict(facecolor='#a1a1aa', alpha=0.5))
axes[0,1].set_title('Variable Distributions', fontweight='bold')

# 3. Study hours (skewed!)
axes[0,2].hist(hours_studied, bins=25, color='#71717a', alpha=0.7, edgecolor='white')
axes[0,2].set_title('Study Hours (right-skewed!)', fontweight='bold')
skew = stats.skew(hours_studied)
axes[0,2].text(0.7, 0.85, f'Skewness: {skew:.2f}', transform=axes[0,2].transAxes,
               fontsize=10, bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5))

# 4. Scatter: study vs score
axes[1,0].scatter(hours_studied, score, alpha=0.5, color='#14b8a6', s=20)
r = np.corrcoef(hours_studied, score)[0,1]
axes[1,0].set_xlabel('Hours Studied')
axes[1,0].set_ylabel('Score')
axes[1,0].set_title(f'Study vs Score (r={r:.2f})', fontweight='bold')

# 5. Scatter: sleep vs score
valid = ~np.isnan(sleep_with_missing)
axes[1,1].scatter(sleep_hours[valid], score[valid], alpha=0.5, color='#52525b', s=20)
r2 = np.corrcoef(sleep_hours[valid], score[valid])[0,1]
axes[1,1].set_xlabel('Sleep Hours')
axes[1,1].set_ylabel('Score')
axes[1,1].set_title(f'Sleep vs Score (r={r2:.2f})', fontweight='bold')

# 6. Correlation heatmap
data = np.column_stack([hours_studied, sleep_hours, score])
corr = np.corrcoef(data.T)
im = axes[1,2].imshow(corr, cmap='RdBu_r', vmin=-1, vmax=1)
axes[1,2].set_xticks([0,1,2])
axes[1,2].set_yticks([0,1,2])
axes[1,2].set_xticklabels(['Study', 'Sleep', 'Score'], fontsize=9)
axes[1,2].set_yticklabels(['Study', 'Sleep', 'Score'], fontsize=9)
for i in range(3):
    for j in range(3):
        axes[1,2].text(j, i, f'{corr[i,j]:.2f}', ha='center', va='center', fontsize=11)
axes[1,2].set_title('Correlation Matrix', fontweight='bold')

plt.suptitle('EDA Dashboard: Student Performance Data', fontsize=14, y=1.02)
plt.tight_layout()
plt.show()

print(f"Dataset: {n} students, {np.sum(np.isnan(sleep_with_missing))} missing sleep values")
print(f"Score: mean={np.mean(score):.1f}, std={np.std(score):.1f}, range=[{np.min(score):.1f}, {np.max(score):.1f}]")
print(f"Study hours is right-skewed (skew={skew:.2f}) — consider log transform")
```
<!-- expected_output: EDA dashboard with 6 plots -->

---

<!-- layer: formal -->

## Key EDA Concepts

**Five-number summary:** $(\min, Q_1, \text{median}, Q_3, \max)$

**Interquartile range:** $\text{IQR} = Q_3 - Q_1$

**Outlier detection (Tukey's fences):**
- Outlier if $x < Q_1 - 1.5 \cdot \text{IQR}$ or $x > Q_3 + 1.5 \cdot \text{IQR}$

**Skewness:** $\gamma_1 = E\left[\left(\frac{X-\mu}{\sigma}\right)^3\right]$
- $\gamma_1 > 0$: right-skewed (long right tail)
- $\gamma_1 < 0$: left-skewed
- $\gamma_1 = 0$: symmetric

**Kurtosis:** $\gamma_2 = E\left[\left(\frac{X-\mu}{\sigma}\right)^4\right] - 3$
- $\gamma_2 > 0$: heavier tails than Normal
- $\gamma_2 < 0$: lighter tails than Normal

---

<!-- block: misconception -->
**Misconception: "EDA is just making pretty charts."**

*Wrong belief:* EDA is a preliminary step that doesn't produce real findings — the real work is modeling.

*Correction:* EDA often reveals the most important insights: unexpected patterns, data quality issues, violated assumptions, and entirely new questions. Many of the most impactful discoveries in data science come from looking at the data carefully, not from fitting complex models. If your EDA is sloppy, your model will inherit all the problems you didn't catch.

*Why this is common:* Machine learning culture emphasizes model accuracy metrics over understanding the data. Students want to jump straight to "the cool stuff." But the best data scientists spend 60-80% of their time on data understanding and preparation.

---

<!-- block: quiz -->
**Micro-challenge:** You receive a dataset of house prices. The mean price is $450,000 but the median is $320,000. What does this tell you about the distribution? Which measure of center is more appropriate? What plot would you make first?

*Hint:* When mean >> median, the distribution has a specific shape. Think about what pulls the mean up.

<!-- solution: Mean >> median indicates a RIGHT-SKEWED distribution — a few very expensive houses pull the mean up while most houses are below the mean. The median ($320K) is more appropriate here because it's resistant to outliers and better represents the "typical" house. You'd first make a histogram of prices to see the distribution shape, then possibly a box plot to identify outliers. You might also consider a log transformation to make the data more symmetric for modeling. -->
