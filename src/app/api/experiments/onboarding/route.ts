import { analyze, VARIANT_DESCRIPTIONS, SEED_CONFIG } from "@/lib/experiment";
import { handle, json } from "@/lib/http";
import { getStore } from "@/lib/store";

export async function GET() {
  return handle(() =>
    json({ analysis: analyze(getStore().events), variants: VARIANT_DESCRIPTIONS, seed: SEED_CONFIG }),
  );
}
