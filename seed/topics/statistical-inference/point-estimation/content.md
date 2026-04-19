<!-- layer: intuition -->

## Making Your Best Guess

You want to know the average height of all adults in your country. You can't measure everyone, so you measure 100 people and compute their average. That number — the sample average — is your **point estimate** of the population average.

**Point estimation** is the art of using sample data to produce a single "best guess" for an unknown population parameter.

Common examples:
- Sample mean $\bar{x}$ estimates the population mean $\mu$
- Sample proportion $\hat{p}$ estimates the population proportion $p$
- Sample variance $s^2$ estimates the population variance $\sigma^2$

---

## What Makes a Good Estimator?

Not all guesses are equal. A good estimator should be:

1. **Unbiased:** On average, it hits the target. $E[\hat{\theta}] = \theta$
2. **Consistent:** With more data, it gets closer to the truth
3. **Efficient:** Among all unbiased estimators, it has the smallest variance

The sample mean $\bar{X}$ is the gold standard: it's unbiased, consistent, and efficient for estimating the population mean (under mild conditions). This is why "take the average" is the most common statistical procedure.

---

<!-- block: code_python, editable: true -->
```python
import numpy as np
import matplotlib.pyplot as plt

# Demonstrate: sample mean is unbiased but variable
np.random.seed(42)
true_mean = 170  # True population mean height (cm)
true_std = 10

n_experiments = 5000
sample_sizes = [5, 20, 100]

fig, axes = plt.subplots(1, 3, figsize=(12, 4), sharey=True)

for ax, n in zip(axes, sample_sizes):
    estimates = [np.random.normal(true_mean, true_std, n).mean() for _ in range(n_experiments)]
    ax.hist(estimates, bins=50, color='#d4d4d8', alpha=0.7, density=True, edgecolor='white')
    ax.axvline(true_mean, color='#ef4444', linestyle='--', linewidth=2, label=f'True μ={true_mean}')
    ax.axvline(np.mean(estimates), color='#22c55e', linestyle=':', linewidth=2,
               label=f'Mean of estimates={np.mean(estimates):.1f}')
    ax.set_title(f'n = {n}', fontweight='bold')
    ax.set_xlabel('Sample mean')
    ax.legend(fontsize=8)

axes[0].set_ylabel('Density')
plt.suptitle('Sampling Variability: More Data → Tighter Estimates', fontsize=13, y=1.02)
plt.tight_layout()
plt.show()

print("Standard error of the mean = σ/√n:")
for n in sample_sizes:
    print(f"  n={n:3d}: SE = {true_std/np.sqrt(n):.2f} cm")
```
<!-- expected_output: Standard error decreases with sample size -->

---

<!-- layer: formal -->

## Formal Definition

An **estimator** $\hat{\theta}$ is a function of the sample data used to estimate a parameter $\theta$.

**Bias:** $\text{Bias}(\hat{\theta}) = E[\hat{\theta}] - \theta$

**Mean Squared Error:**

$$\text{MSE}(\hat{\theta}) = E[(\hat{\theta} - \theta)^2] = \text{Var}(\hat{\theta}) + \text{Bias}(\hat{\theta})^2$$

**Sample mean:** For $X_1, \ldots, X_n$ iid with mean $\mu$ and variance $\sigma^2$:

$$\bar{X} = \frac{1}{n}\sum_{i=1}^n X_i$$

$$E[\bar{X}] = \mu \quad \text{(unbiased)}$$
$$\text{Var}(\bar{X}) = \frac{\sigma^2}{n} \quad \text{(decreasing in n)}$$

**Bessel's correction:** $s^2 = \frac{1}{n-1}\sum(X_i - \bar{X})^2$ uses $n-1$ to be unbiased for $\sigma^2$.

---

<!-- block: misconception -->
**Misconception: "A bigger sample always gives a better estimate."**

*Wrong belief:* If my sample size is large enough, my estimate must be close to the truth.

*Correction:* A larger sample reduces **random error** (variance), but it doesn't fix **systematic error** (bias). If your sampling method is biased — for example, an online survey that only reaches tech-savvy people — then more data just gives you a more precise wrong answer. The famous 1936 Literary Digest poll surveyed 2.4 million people and predicted the wrong president, while Gallup polled 50,000 and got it right. Bias beats sample size.

*Why this is common:* Statistics courses focus on random sampling, where bigger IS better. Real-world data collection rarely achieves pure random sampling.

---

<!-- block: quiz -->
**Micro-challenge:** You measure the weights of 8 fish: [2.1, 3.4, 2.8, 3.1, 2.5, 3.6, 2.9, 3.2] kg. Calculate the sample mean and sample standard deviation. Why do we divide by n-1 = 7 (not 8) for the standard deviation?

*Hint:* The mean is straightforward. For s², we divide by n-1 (Bessel's correction) because using the sample mean instead of the true mean makes the deviations systematically smaller.

<!-- solution: Mean = (2.1+3.4+2.8+3.1+2.5+3.6+2.9+3.2)/8 = 23.6/8 = 2.95 kg. Sample variance s² = Σ(xᵢ - 2.95)²/7 = (0.7225+0.2025+0.0225+0.0225+0.2025+0.4225+0.0025+0.0625)/7 = 1.66/7 ≈ 0.237. s ≈ 0.487 kg. We divide by n-1 because the sample mean "uses up" one piece of information — the deviations from x̄ always sum to 0, so only n-1 are free to vary. Dividing by n would systematically underestimate σ². -->
