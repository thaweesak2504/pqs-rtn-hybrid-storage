import { describe, expect, it } from "vitest";
import { normalizePolicyGuardError } from "../../utils/policyGuards";

describe("policyGuards", () => {
  it("normalizes branch-lock backend error", () => {
    const result = normalizePolicyGuardError(
      new Error("Cannot change document branch after evaluation has started"),
      "Failed to update",
    );

    expect(result).toBe("Section 300 policy: cannot change document branch after evaluation has started.");
  });

  it("normalizes answer-key section 300 policy errors", () => {
    const result = normalizePolicyGuardError(
      new Error("Answer keys not supported for section group 300"),
      "Failed to save",
    );

    expect(result).toBe("Section 300 policy: answer keys are not allowed for this flow.");
  });

  it("normalizes reference section 300 policy errors", () => {
    const result = normalizePolicyGuardError(
      new Error("References are not supported in section group 300"),
      "Failed to save",
    );

    expect(result).toBe("Section 300 policy: references are not allowed for this flow.");
  });

  it("falls back to prefixed raw error for non-policy failures", () => {
    const result = normalizePolicyGuardError(new Error("database unavailable"), "Failed to update");

    expect(result).toBe("Failed to update: database unavailable");
  });
});
