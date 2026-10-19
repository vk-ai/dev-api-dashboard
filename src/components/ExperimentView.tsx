"use client";
import { useEffect, useState } from "react";
import type { ExperimentAnalysis, Variant } from "@/lib/experiment";
import { int, pct } from "@/lib/format";

interface Resp {
  analysis: ExperimentAnalysis;
  variants: Record<Variant, string>;
  seed: { users: number; trueRateA: number; trueRateB: number; seed: number };
}

export function ExperimentView() {
  const [d, setD] = useState<Resp | null>(null);
  useEffect(() => {
    fetch("/api/experiments/onboarding").then((r) => r.json()).then(setD);
  }, []);
  if (!d) return <p aria-live="polite">Loading analysis…</p>;
  const { analysis: a } = d;
  const t = a.test;
  return (
    <>
      <div className="card">
        <p>
          Experiment <code>{a.experimentId}</code>. Conversion = user created their first API key after seeing onboarding.
          Data = {int(d.seed.users)} seeded synthetic users (true rates {pct(d.seed.trueRateA, 0)} vs {pct(d.seed.trueRateB, 0)}) plus{" "}
          {a.liveEvents} live events from this server process.
        </p>
        <table data-testid="variant-table">
          <thead>
            <tr><th scope="col">Variant</th><th scope="col">Description</th><th scope="col">Exposed</th><th scope="col">Converted</th><th scope="col">Conversion rate</th></tr>
          </thead>
          <tbody>
            {a.variants.map((v) => (
              <tr key={v.variant}>
                <td>{v.variant}</td><td>{d.variants[v.variant]}</td><td>{int(v.exposed)}</td><td>{int(v.converted)}</td><td>{pct(v.rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {t && (
        <div className="card" data-testid="significance">
          <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>Two-proportion z-test (two-sided, α = 0.05)</h2>
          <ul>
            <li>Absolute lift (B − A): {pct(t.absoluteLift, 2)} (95% CI {pct(t.ci95[0], 2)} to {pct(t.ci95[1], 2)})</li>
            <li>Relative lift: {pct(t.relativeLift)}</li>
            <li>z = {t.z.toFixed(3)}, p = {t.pValue.toExponential(2)}</li>
            <li>Verdict: <strong>{t.significant ? "statistically significant" : "not significant"}</strong></li>
            <li>Sample-ratio check: χ² = {a.srm.chi2.toFixed(3)}, p = {a.srm.pValue.toFixed(3)} {a.srm.pValue < 0.001 ? "(SRM: investigate assignment!)" : "(no SRM)"}</li>
          </ul>
          <p className="muted">Synthetic data: this shows the analysis pipeline works, not that variant B would win with real users.</p>
        </div>
      )}
    </>
  );
}
