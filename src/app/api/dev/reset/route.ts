import { handle, json } from "@/lib/http";
import { resetStore } from "@/lib/store";

/** Test-only: re-seed the in-memory store. Disabled unless DEMO_ALLOW_RESET=1. */
export async function POST() {
  return handle(() => {
    if (process.env.DEMO_ALLOW_RESET !== "1") return json({ error: "not found" }, 404);
    resetStore();
    return json({ ok: true });
  });
}
