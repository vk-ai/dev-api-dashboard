/** Small, dependency-free statistics helpers for the A/B analysis. */

/** erf via Abramowitz & Stegun 7.1.26 (max abs error ~1.5e-7). */
export function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
}

export function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

export interface TwoProportionResult {
  rateA: number;
  rateB: number;
  absoluteLift: number;
  relativeLift: number;
  z: number;
  pValue: number;
  /** 95% CI for rateB - rateA (unpooled Wald). */
  ci95: [number, number];
  significant: boolean;
}

/** Two-sided pooled two-proportion z-test. */
export function twoProportionZTest(
  convA: number,
  nA: number,
  convB: number,
  nB: number,
  alpha = 0.05,
): TwoProportionResult {
  if (nA <= 0 || nB <= 0) throw new Error("sample sizes must be positive");
  const pA = convA / nA;
  const pB = convB / nB;
  const pooled = (convA + convB) / (nA + nB);
  const sePooled = Math.sqrt(pooled * (1 - pooled) * (1 / nA + 1 / nB));
  const z = sePooled === 0 ? 0 : (pB - pA) / sePooled;
  const pValue = 2 * (1 - normalCdf(Math.abs(z)));
  const seDiff = Math.sqrt((pA * (1 - pA)) / nA + (pB * (1 - pB)) / nB);
  const diff = pB - pA;
  return {
    rateA: pA,
    rateB: pB,
    absoluteLift: diff,
    relativeLift: pA === 0 ? 0 : diff / pA,
    z,
    pValue,
    ci95: [diff - 1.959964 * seDiff, diff + 1.959964 * seDiff],
    significant: pValue < alpha,
  };
}

/**
 * Sample-ratio-mismatch check: chi-square (1 dof) of observed counts vs an
 * expected 50/50 split. p < 0.001 usually means assignment is broken.
 */
export function sampleRatioMismatch(nA: number, nB: number): { chi2: number; pValue: number } {
  const total = nA + nB;
  if (total === 0) return { chi2: 0, pValue: 1 };
  const e = total / 2;
  const chi2 = ((nA - e) ** 2 + (nB - e) ** 2) / e;
  // chi-square with 1 dof: P(X > chi2) = 2 * (1 - Phi(sqrt(chi2)))
  const pValue = 2 * (1 - normalCdf(Math.sqrt(chi2)));
  return { chi2, pValue };
}
