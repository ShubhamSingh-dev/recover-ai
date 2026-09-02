// Synthetic data generator (Chunk 11)
// Note: Never imported by server/decision-engine/score.ts

export interface SyntheticPaymentData {
  id: string;
  amount: number;
  failure_reason: string;
  method: string;
  is_synthetic: boolean;
  synthetic_ground_truth_recoverable: boolean;
}

export function generateSyntheticBatch(count = 500, seed = "recoverai-2026"): SyntheticPaymentData[] {
  // Stub for Chunk 11
  return [];
}
