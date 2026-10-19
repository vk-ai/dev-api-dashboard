export interface BarDatum {
  label: string;
  value: number;
}

interface Props {
  id: string;
  title: string;
  data: BarDatum[];
  format: (v: number) => string;
  color?: string;
}

/** Dependency-free SVG bar chart with an accessible data-table fallback. */
export function BarChart({ id, title, data, format, color = "#3b2fc9" }: Props) {
  const W = 640;
  const H = 200;
  const pad = { l: 8, r: 8, t: 10, b: 24 };
  const max = Math.max(1, ...data.map((d) => d.value));
  const bw = data.length ? (W - pad.l - pad.r) / data.length : 0;
  const total = data.reduce((s, d) => s + d.value, 0);
  const peak = data.reduce((p, d) => (d.value > p.value ? d : p), data[0] ?? { label: "-", value: 0 });
  const summary = `${title}: ${data.length} days, total ${format(total)}, peak ${format(peak.value)} on ${peak.label}.`;
  return (
    <figure className="chart card" aria-labelledby={`${id}-title`} data-testid={id}>
      <figcaption id={`${id}-title`}><strong>{title}</strong></figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary}>
        {data.map((d, i) => {
          const h = ((H - pad.t - pad.b) * d.value) / max;
          return (
            <rect key={d.label} x={pad.l + i * bw + 1} y={H - pad.b - h} width={Math.max(1, bw - 2)} height={h} fill={color}>
              <title>{`${d.label}: ${format(d.value)}`}</title>
            </rect>
          );
        })}
        {data.length > 0 && (
          <>
            <text x={pad.l} y={H - 6}>{data[0].label}</text>
            <text x={W - pad.r} y={H - 6} textAnchor="end">{data[data.length - 1].label}</text>
          </>
        )}
      </svg>
      <details>
        <summary>Show data table</summary>
        <table>
          <thead><tr><th scope="col">Date</th><th scope="col">Value</th></tr></thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.label}><td>{d.label}</td><td>{format(d.value)}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
