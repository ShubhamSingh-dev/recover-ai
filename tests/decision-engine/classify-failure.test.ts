import { describe, it, expect } from "vitest";
import { classifyFailureReason } from "@/server/decision-engine/classify-failure";

describe("classifyFailureReason", () => {
  it("classifies recoverable vs unrecoverable failures", () => {
    expect(classifyFailureReason("insufficient_funds")).toBe("recoverable");
    expect(classifyFailureReason("card_blacklisted")).toBe("not_recoverable");
  });
});
