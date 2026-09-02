import React from "react";
import { EvaluationResults } from "@/lib/types";

interface BaselineComparisonChartProps {
  results: EvaluationResults;
}

export function BaselineComparisonChart({ results }: BaselineComparisonChartProps) {
  return (
    <div className="rounded-lg border border-border-default bg-bg-surface p-6">
      <h4 className="text-sm font-semibold text-text-primary mb-4">
        Recovery Rate vs. Baseline Strategies
      </h4>
      <div className="h-64 flex items-center justify-center border border-dashed border-border-default rounded text-sm text-text-muted">
        Chart Component (Recharts)
      </div>
    </div>
  );
}
