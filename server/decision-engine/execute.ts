import { GuardrailVerdict } from "./guardrails";
import { InterventionType } from "@/lib/types";

export interface ExecuteResult {
  isSimulated: boolean;
  paymentLinkId?: string;
  attemptId: string;
}

export async function executeRecovery(params: {
  paymentId: string;
  guardrailVerdict: GuardrailVerdict;
  interventionType: InterventionType;
  amount: number;
}): Promise<ExecuteResult> {
  // Requires passed guardrail verdict per non-negotiable rule #2
  if (params.guardrailVerdict.verdict !== "passed") {
    throw new Error("Cannot execute recovery without passed guardrail verdict");
  }

  // Stub for Chunk 5
  return {
    isSimulated: params.interventionType === "reminder_message",
    attemptId: "stub-attempt-id",
  };
}
