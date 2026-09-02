import { describe, it, expect } from "vitest";
import { calculateRecoveryScore } from "@/server/decision-engine/score";

describe("calculateRecoveryScore", () => {
  it("initializes calculateRecoveryScore function", () => {
    const res = calculateRecoveryScore({
      pastSuccessRate: 0.8,
      failureReason: "insufficient_funds",
      isEvening: true,
      daysSinceLastSuccess: 5,
      priorAttemptsThisMonth: 0,
    });
    expect(res).toBeDefined();
    expect(typeof res.score).toBe("number");
  });
});
