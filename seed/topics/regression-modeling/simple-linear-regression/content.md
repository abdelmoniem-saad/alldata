<!-- layer: intuition -->

## Fitting a Line to Data

Correlation tells you whether X and Y are linearly related. **Regression** goes further: it finds the **best-fitting line** so you can predict Y from X.

The model: $Y = \beta_0 + \beta_1 X + \varepsilon$

- $\beta_0$ = intercept (predicted Y when X = 0)
- $\beta_1$ = slope (how much Y changes per unit increase in X)
- $\varepsilon$ = error (everything the line can't explain)

**Least squares** finds the line that minimizes the total squared distance between the data points and the line. It's the most common fitting method because it has nice mathematical properties.

---

## How to Interpret the Slope

The slope $\beta_1$ is the **key number** in regression:

- $\beta_1 = 2.5$: "For each additional unit of X, Y increases by 2.5 on average"
- $\beta_1 = -0.8$: "For each additional unit of X, Y decreases by 0.8 on average"
- $\beta_1 = 0$: X provides no linear predictive value for Y

**R-squared** tells you the quality of the fit: what fraction of Y's variation is explained by the line. R² = 0.7 means the line explains 70% of the variance. The remaining 30% is noise.

---

<!-- block: code_python, editable: true -->
```python
import numpy as np
import matplotlib.pyplot as plt
from scipy import stats

# Generate data with a known relationship
np.random.seed(42)
n = 50
X = np.random.uniform(20, 80, n)
true_slope = 0.8
true_intercept = 15
noise = np.random.normal(0, 8, n)
Y = true_intercept + true_slope * X + noise

# Fit the regression
slope, intercept, r_value, p_value, std_err = stats.linregress(X, Y)
Y_pred = intercept + slope * X
residuals = Y - Y_pred

fig, axes = plt.subplots(1, 3, figsize=(14, 4))

# 1. Data + regression line
axes[0].scatter(X, Y, color='#14b8a6', alpha=0.7, edgecolors='white', s=40)
x_line = np.linspace(15, 85, 100)
axes[0].plot(x_line, intercept + slope * x_line, 'r-', linewidth=2,
             label=f'ŷ = {intercept:.1f} + {slope:.2f}x')
axes[0].set_xlabel('X')
axes[0].set_ylabel('Y')
axes[0].set_title('Data + Best Fit Line', fontweight='bold')
axes[0].legend()
axes[0].grid(alpha=0.2)

# 2. Residuals
axes[1].scatter(Y_pred, residuals, color='#71717a', alpha=0.7, edgecolors='white', s=40)
axes[1].axhline(0, color='red', linestyle='--')
axes[1].set_xlabel('Predicted Y')
axes[1].set_ylabel('Residual')
axes[1].set_title('Residual Plot (should be random)', fontweight='bold')
axes[1].grid(alpha=0.2)

# 3. R² visualization
axes[2].bar(['Explained\n(R²)', 'Unexplained\n(1-R²)'],
            [r_value**2, 1-r_value**2],
            color=['#22c55e', '#ef4444'], edgecolor='white')
axes[2].set_ylabel('Proportion of variance')
axes[2].set_title(f'R² = {r_value**2:.3f}', fontweight='bold')
axes[2].set_ylim(0, 1)

plt.tight_layout()
plt.show()

print(f"True model: Y = {true_intercept} + {true_slope}·X + noise")
print(f"Fitted:     ŷ = {intercept:.2f} + {slope:.3f}·X")
print(f"R² = {r_value**2:.3f}  (explains {r_value**2:.1%} of variance)")
print(f"p-value for slope: {p_value:.2e} (highly significant)")
```
<!-- expected_output: Fitted regression close to true model -->

---

<!-- layer: formal -->

## Formal Definition

**Model:** $Y_i = \beta_0 + \beta_1 X_i + \varepsilon_i$ where $\varepsilon_i \sim N(0, \sigma^2)$ iid.

**Least squares estimators:**

$$\hat{\beta}_1 = \frac{\sum_{i=1}^n (X_i - \bar{X})(Y_i - \bar{Y})}{\sum_{i=1}^n (X_i - \bar{X})^2} = r \cdot \frac{s_Y}{s_X}$$

$$\hat{\beta}_0 = \bar{Y} - \hat{\beta}_1 \bar{X}$$

**Coefficient of determination:**

$$R^2 = 1 - \frac{SS_{res}}{SS_{tot}} = 1 - \frac{\sum(Y_i - \hat{Y}_i)^2}{\sum(Y_i - \bar{Y})^2} = r^2$$

**Testing $H_0: \beta_1 = 0$:**

$$t = \frac{\hat{\beta}_1}{SE(\hat{\beta}_1)} \sim t(n-2)$$

**Gauss-Markov:** Under the standard assumptions (linearity, independence, homoscedasticity, no perfect collinearity), OLS is the **Best Linear Unbiased Estimator** (BLUE).

---

<!-- block: misconception -->
**Misconception: "High R² means the model is good."**

*Wrong belief:* R² = 0.95 means the regression model is excellent and can be trusted for predictions.

*Correction:* R² only measures how much variance is explained — it says nothing about whether the model is **correct**. A quadratic relationship forced through a linear model can have high R² but systematically wrong predictions. Also, R² always increases when you add more predictors (even useless ones). You can get R² = 1.0 by fitting n data points with n-1 predictors. Always check residual plots!

*Why this is common:* R² is a single, easy-to-interpret number between 0 and 1. It feels like a grade (0.95 = A!). But model quality requires checking assumptions, not just one summary number.

---

<!-- block: quiz -->
**Micro-challenge:** A regression of salary on years of experience gives: ŷ = 35000 + 2500x with R² = 0.68. Interpret the slope. Predict salary for someone with 10 years of experience. What fraction of salary variation is NOT explained by experience?

*Hint:* The slope has units. Unexplained variation = 1 - R².

<!-- solution: Slope interpretation: Each additional year of experience is associated with a $2,500 increase in salary, on average. Prediction: ŷ = 35000 + 2500(10) = $60,000. Unexplained variation = 1 - 0.68 = 0.32 (32%). So 32% of salary variation is due to factors other than experience (education, industry, location, skills, etc). Note: "associated with" not "causes" — this is observational data! -->
