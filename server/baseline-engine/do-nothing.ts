import { BaselineMetrics } from "@/lib/types";

// Note: Must NEVER read synthetic_ground_truth_recoverable (Rule #4 & Decision D-014)
export function evaluateDoNothing(
  payments: Array<{ amount: number }>,
  spontaneousRate = 0.07
): BaselineMetrics {
  // Stub for Chunk 11
  return {
    revenueRecovered: 0,
    recoveryRate: spontaneousRate,
    contactAttempts: 0,
  };
}
