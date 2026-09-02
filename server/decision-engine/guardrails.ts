import { GuardrailResult } from "@/lib/types";

export interface GuardrailVerdict {
  verdict: GuardrailResult;
  reason?: string;
}

export async function checkGuardrails(params: {
  score: number;
  amount: number;
  paymentId: string;
}): Promise<GuardrailVerdict> {
  // Stub for Chunk 3
  return {
    verdict: "passed",
  };
}
