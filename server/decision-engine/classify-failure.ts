import { FailureClassification } from "@/lib/types";

export function classifyFailureReason(failureReason: string): FailureClassification {
  // Stub for Chunk 2
  const unrecoverable = ["card_blacklisted", "fraud_suspected", "account_closed"];
  if (unrecoverable.includes(failureReason)) {
    return "not_recoverable";
  }
  return "recoverable";
}
