export const usd = (v: number) => `$${v.toFixed(2)}`;
export const int = (v: number) => Math.round(v).toLocaleString("en-US");
export const pct = (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`;
