"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiKeyView } from "@/lib/apiKeys";

interface Revealed {
  name: string;
  secret: string;
}

export function KeysView() {
  const [keys, setKeys] = useState<ApiKeyView[] | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Revealed | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const secretRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/keys");
    const d = await r.json();
    setKeys(d.keys);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch((e: Error) => setError(e.message));
  }, [load]);

  useEffect(() => {
    if (revealed) secretRef.current?.focus();
  }, [revealed]);

  async function call(url: string, body?: unknown) {
    setError(null);
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const d = await r.json();
    if (!r.ok) {
      setError(d.error ?? `HTTP ${r.status}`);
      return null;
    }
    return d;
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const d = await call("/api/keys", { name });
    if (d) {
      setRevealed({ name: d.key.name, secret: d.secret });
      setCopied(false);
      setName("");
      await load();
    }
  }

  async function onRotate(k: ApiKeyView) {
    const d = await call(`/api/keys/${k.id}/rotate`);
    if (d) {
      setRevealed({ name: d.key.name, secret: d.secret });
      setCopied(false);
      await load();
    }
  }

  async function onRevoke(id: string) {
    const d = await call(`/api/keys/${id}/revoke`);
    setConfirming(null);
    if (d) await load();
  }

  async function copy() {
    if (!revealed) return;
    try {
      await navigator.clipboard.writeText(revealed.secret);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <form className="card row" onSubmit={onCreate} aria-labelledby="create-h">
        <h2 id="create-h" style={{ margin: 0, fontSize: "1.1rem", width: "100%" }}>Create a key</h2>
        <label htmlFor="key-name">Key name</label>
        <input id="key-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. ci-runner" required maxLength={64} />
        <button type="submit">Create key</button>
      </form>

      {error && <p role="alert" className="error">{error}</p>}

      {revealed && (
        <div className="card alert" role="region" aria-labelledby="secret-h" data-testid="secret-panel">
          <h2 id="secret-h" style={{ marginTop: 0, fontSize: "1.1rem" }}>Copy your new key for “{revealed.name}”</h2>
          <p>This is the only time the full key is shown. We store only a SHA-256 hash.</p>
          <div className="secret" tabIndex={-1} ref={secretRef} data-testid="secret-value">{revealed.secret}</div>
          <div className="row" style={{ marginTop: "0.6rem" }}>
            <button type="button" className="secondary" onClick={copy}>Copy</button>
            <button type="button" onClick={() => setRevealed(null)}>I have saved it</button>
            <span aria-live="polite">{copied ? "Copied to clipboard" : ""}</span>
          </div>
        </div>
      )}

      <div className="card">
        <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>Your keys</h2>
        {!keys ? (
          <p aria-live="polite">Loading keys…</p>
        ) : (
          <table data-testid="keys-table">
            <thead>
              <tr>
                <th scope="col">Name</th><th scope="col">Key</th><th scope="col">Status</th><th scope="col">Created</th><th scope="col">Last used</th><th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} data-key-id={k.id}>
                  <td>{k.name}</td>
                  <td><code>{k.prefix}…</code></td>
                  <td><span className={`badge ${k.status}`}>{k.status}</span></td>
                  <td>{k.createdAt.slice(0, 10)}</td>
                  <td>{k.lastUsedAt ? k.lastUsedAt.slice(0, 16).replace("T", " ") : "never"}</td>
                  <td className="row">
                    {k.status === "active" && confirming !== k.id && (
                      <>
                        <button type="button" className="secondary" onClick={() => onRotate(k)} aria-label={`Rotate ${k.name}`}>Rotate</button>
                        <button type="button" className="danger" onClick={() => setConfirming(k.id)} aria-label={`Revoke ${k.name}`}>Revoke</button>
                      </>
                    )}
                    {confirming === k.id && (
                      <>
                        <span>Revoke permanently?</span>
                        <button type="button" className="danger" onClick={() => onRevoke(k.id)} aria-label={`Confirm revoke ${k.name}`}>Yes, revoke</button>
                        <button type="button" className="secondary" onClick={() => setConfirming(null)}>Cancel</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
