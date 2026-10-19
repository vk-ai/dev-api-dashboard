"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Variant = "A" | "B";

function getUserId(override: string | null): string {
  if (override) return override;
  const k = "demo-uid";
  let id = window.localStorage.getItem(k);
  if (!id) {
    id = "u-" + crypto.randomUUID();
    window.localStorage.setItem(k, id);
  }
  return id;
}

async function logEvent(userId: string, type: "step_completed" | "converted", step?: string) {
  await fetch("/api/experiments/onboarding/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId, type, step }),
  });
}

export function OnboardingView() {
  const params = useSearchParams();
  const [userId, setUserId] = useState<string | null>(null);
  const [variant, setVariant] = useState<Variant | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const uid = getUserId(params.get("uid"));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUserId(uid);
    fetch("/api/experiments/onboarding/assign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: uid }),
    })
      .then((r) => r.json())
      .then((d) => setVariant(d.variant))
      .catch((e: Error) => setError(e.message));
  }, [params]);

  async function createFirstKey() {
    if (!userId) return;
    const r = await fetch("/api/keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: `onboarding-${userId.slice(0, 12)}` }),
    });
    const d = await r.json();
    if (!r.ok) {
      setError(d.error);
      return;
    }
    setSecret(d.secret);
    await logEvent(userId, "converted");
  }

  async function completeStep(step: string) {
    if (!userId || done.includes(step)) return;
    setDone((s) => [...s, step]);
    await logEvent(userId, "step_completed", step);
  }

  if (error) return <p role="alert" className="error">{error}</p>;
  if (!variant) return <p aria-live="polite">Loading your onboarding…</p>;

  return (
    <section className="card" aria-labelledby="ob-h" data-variant={variant} data-testid="onboarding">
      <h2 id="ob-h" style={{ marginTop: 0 }}>
        {variant === "A" ? "Three steps to your first request" : "Make your first request in one step"}
      </h2>
      <p className="muted">Experiment variant {variant}. Assignment is a deterministic hash of your user id.</p>

      {variant === "A" ? (
        <ol className="steps">
          <li>
            Name your project.{" "}
            <button type="button" className="secondary" onClick={() => completeStep("project")} disabled={done.includes("project")}>
              {done.includes("project") ? "Done" : "Mark done"}
            </button>
          </li>
          <li>
            Create an API key.{" "}
            <button type="button" onClick={createFirstKey} disabled={!done.includes("project") || !!secret}>Create my first key</button>
          </li>
          <li>Read the quickstart docs and send a request.</li>
        </ol>
      ) : (
        <>
          <p>Create a key and paste this into your terminal:</p>
          <pre><code>{`curl -X POST http://localhost:3000/api/v1/speech \\
  -H "Authorization: Bearer ${secret ?? "<your key>"}" \\
  -H "content-type: application/json" \\
  -d '{"text":"hello world","model":"tts-turbo"}'`}</code></pre>
          <button type="button" onClick={createFirstKey} disabled={!!secret}>Create my first key</button>
        </>
      )}

      {secret && (
        <div role="status" data-testid="onboarding-done" style={{ marginTop: "1rem" }}>
          <p><strong>Key created.</strong> Copy it now; it will not be shown again:</p>
          <div className="secret">{secret}</div>
        </div>
      )}
    </section>
  );
}
