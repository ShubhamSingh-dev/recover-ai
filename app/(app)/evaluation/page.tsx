import React from "react";
import { MethodologyBanner } from "@/components/recovery/MethodologyBanner";

export default function EvaluationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Evaluation Benchmark</h1>
        <p className="text-sm text-text-secondary">
          Non-circular synthetic benchmark comparing RecoverAI against contact-everyone and do-nothing baselines.
        </p>
      </div>

      <MethodologyBanner />

      <div className="rounded-lg border border-border-default bg-bg-surface p-8 text-center text-sm text-text-secondary">
        Evaluation harness ready. Run a benchmark batch to view live metrics.
      </div>
    </div>
  );
}
