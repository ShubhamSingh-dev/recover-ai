import React from "react";
import { ScoreFactor } from "@/lib/types";

interface ScoreBreakdownProps {
  score: number;
  breakdown: ScoreFactor[];
}

export function ScoreBreakdown({ score, breakdown }: ScoreBreakdownProps) {
  const tier = score >= 70 ? "High" : score >= 40 ? "Medium" : "Low";

  return (
    <div className="space-y-4 rounded-lg border border-border-default bg-bg-surface p-4">
      <div className="flex items-center justify-between border-b border-border-default pb-3">
        <div>
          <span className="text-2xl font-bold text-text-primary">{score}</span>
          <span className="font-mono text-sm text-text-muted">/100</span>
        </div>
        <span className="rounded-sm bg-bg-sunken px-2 py-0.5 text-xs font-medium text-text-secondary">
          Tier: {tier}
        </span>
      </div>
      <div className="space-y-2">
        {breakdown.map((item, idx) => (
          <div key={idx} className="flex justify-between text-sm">
            <span className="text-text-secondary">{item.factor}</span>
            <span
              className={`font-mono font-medium ${
                item.points > 0 ? "text-success" : item.points < 0 ? "text-danger" : "text-text-muted"
              }`}
            >
              {item.points > 0 ? `+${item.points}` : item.points}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
