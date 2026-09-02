import { describe, it, expect } from "vitest";
import { checkGuardrails } from "@/server/decision-engine/guardrails";

describe("checkGuardrails", () => {
  it("initializes checkGuardrails function", async () => {
    const verdict = await checkGuardrails({
      score: 75,
      amount: 4999,
      paymentId: "test-payment-id",
    });
    expect(verdict).toBeDefined();
    expect(["passed", "blocked", "escalated"]).toContain(verdict.verdict);
  });
});
