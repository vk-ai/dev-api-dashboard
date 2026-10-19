"use client";
import { useEffect, useState } from "react";
import { BarChart } from "./BarChart";
import { int, usd } from "@/lib/format";

interface UsageResponse {
  days: number;
  daily: { date: string; requests: number; characters: number; cost: number }[];
  models: { model: string; requests: number; characters: number; cost: number }[];
  totals: { requests: number; characters: number; cost: number };
  pricing: Record<string, number>;
}

export function UsageView() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<UsageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/usage?days=${days}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: UsageResponse) => !cancelled && setData(d))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [days]);

  return (
    <section aria-labelledby="usage-h">
      <h2 id="usage-h" className="row">
        <span>Last {days} days</span>
      </h2>
      <div className="row card">
        <label htmlFor="range">Range</label>
        <select id="range" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={7}>7 days</option>
          <option value={14}>14 days</option>
          <option value={30}>30 days</option>
        </select>
      </div>
      {error && <p role="alert" className="error">Failed to load usage: {error}</p>}
      {!data && !error && <p aria-live="polite">Loading usage…</p>}
      {data && (
        <>
          <div className="grid">
            <div className="card stat"><div className="label">Requests</div><div className="value" data-testid="total-requests">{int(data.totals.requests)}</div></div>
            <div className="card stat"><div className="label">Characters</div><div className="value">{int(data.totals.characters)}</div></div>
            <div className="card stat"><div className="label">Estimated cost</div><div className="value" data-testid="total-cost">{usd(data.totals.cost)}</div></div>
          </div>
          <BarChart id="requests-chart" title="Requests per day" data={data.daily.map((d) => ({ label: d.date, value: d.requests }))} format={int} />
          <BarChart id="cost-chart" title="Cost per day (USD)" color="#1f6b3a" data={data.daily.map((d) => ({ label: d.date, value: d.cost }))} format={usd} />
          <div className="card">
            <h3>Cost by model</h3>
            <table>
              <thead>
                <tr><th scope="col">Model</th><th scope="col">Requests</th><th scope="col">Characters</th><th scope="col">Price / 1k chars</th><th scope="col">Cost</th></tr>
              </thead>
              <tbody>
                {data.models.map((m) => (
                  <tr key={m.model}>
                    <td>{m.model}</td><td>{int(m.requests)}</td><td>{int(m.characters)}</td><td>{usd(data.pricing[m.model])}</td><td>{usd(m.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="muted">Prices are fictional demo values.</p>
          </div>
        </>
      )}
    </section>
  );
}
