import { ScoreResult } from "@/lib/types";

export interface ScoreInput {
  pastSuccessRate: number;
  failureReason: string;
  isEvening: boolean;
  daysSinceLastSuccess: number;
  priorAttemptsThisMonth: number;
}

export function calculateRecoveryScore(input: ScoreInput): ScoreResult {
  // Stub for Chunk 2 - deterministic additive formula
  return {
    score: 0,
    breakdown: [],
  };
}
