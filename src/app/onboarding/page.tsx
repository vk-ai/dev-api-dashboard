import { Suspense } from "react";
import { OnboardingView } from "@/components/OnboardingView";

export default function OnboardingPage() {
  return (
    <>
      <h1>Get started</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <OnboardingView />
      </Suspense>
    </>
  );
}
