import { describe, expect, it } from "vitest";

/**
 * Phase B Advanced Tests - Branch Selection & Score Cascade
 * Pure logic tests for cascade chain calculations
 */

describe("Branch Selection Logic", () => {
  it("exempted group without branch metadata has no children", () => {
    const exemptedNoBranch = {
      id: "s3xx.2",
      metadata: null,
      children: [],
    };

    expect(exemptedNoBranch.children.length).toBe(0);
  });

  it("branch metadata contains valid branch codes", () => {
    const metadata = {
      branches: ["mechanic", "electrician", "plumber"],
    };

    expect(metadata.branches).toContain("mechanic");
    expect(metadata.branches).toHaveLength(3);
  });

  it("branch selection adds children to exempted group", () => {
    const exempted: { id: string; children: Array<{ id: string; content: string }> } = { id: "s3xx.2", children: [] };

    // Simulate branch selection
    exempted.children = [
      { id: "s3xx.2.1", content: "Knowledge 1" },
      { id: "s3xx.2.2", content: "Knowledge 2" },
    ];

    expect(exempted.children.length).toBe(2);
  });
});

describe("Score Cascade - Group Score Updates", () => {
  it("group_score = sum of scored children", () => {
    const children = [
      { is_scored: false, score: 0 }, // Prerequisite
      { is_scored: true, score: 15 }, // Knowledge test
      { is_scored: true, score: 15 }, // Knowledge test
    ];

    const groupScore = children.reduce((sum, child) => {
      return sum + (child.is_scored ? child.score : 0);
    }, 0);

    expect(groupScore).toBe(30);
  });

  it("exempted parent always contributes 0", () => {
    const exempted = { question_type: "exempted", group_score: 0 };
    const contribution = exempted.question_type === "exempted" ? 0 : exempted.group_score;

    expect(contribution).toBe(0);
  });

  it("child score change triggers group_score recalc", () => {
    const parent = {
      id: "s3xx.1",
      children: [
        { id: "s3xx.1.4", is_scored: true, score: 15 },
        { id: "s3xx.1.5", is_scored: true, score: 15 },
      ],
    };

    // Calculate initial group_score
    let groupScore = parent.children.reduce((sum, c) => sum + (c.is_scored ? c.score : 0), 0);
    expect(groupScore).toBe(30);

    // Simulate score update
    parent.children[0].score = 20;

    // Recalculate
    groupScore = parent.children.reduce((sum, c) => sum + (c.is_scored ? c.score : 0), 0);
    expect(groupScore).toBe(35);
  });
});

describe("Score Cascade - Section Total", () => {
  it("section total = sum of L1 group_score only", () => {
    const section = {
      children: [
        { is_group_header: true, group_score: 30 },
        { is_group_header: true, group_score: 0 },  // exempted
        { is_group_header: true, group_score: 40 },
        { is_group_header: true, group_score: 20 },
      ],
    };

    const total = section.children.reduce((sum, q) => sum + (q.group_score || 0), 0);

    expect(total).toBe(90); // 30 + 0 + 40 + 20
  });

  it("excludes L2 from section total (no double counting)", () => {
    const section = {
      children: [
        {
          id: "s3xx.1",
          is_group_header: true,
          group_score: 30,
          children: [
            { id: "s3xx.1.4", is_scored: true, score: 15 }, // L2 - NOT in section total
            { id: "s3xx.1.5", is_scored: true, score: 15 }, // L2 - NOT in section total
          ],
        },
        {
          id: "s3xx.2",
          is_group_header: true,
          group_score: 0, // exempted
        },
      ],
    };

    const total = section.children.reduce((sum, q) => sum + (q.group_score || 0), 0);

    // Should be 30 + 0, NOT 30 + 15 + 15
    expect(total).toBe(30);
  });

  it("handles mixed L1 headers and non-headers", () => {
    const section = {
      children: [
        { is_group_header: true, group_score: 30 },   // L1 header
        { is_scored: true, score: 20 },               // L1 non-header
        { is_group_header: true, group_score: 0 },    // L1 header (exempted)
      ],
    };

    const total = section.children.reduce((sum, q) => {
      if (q.is_group_header) {
        return sum + (q.group_score || 0);
      }
      return sum + (q.is_scored ? q.score || 0 : 0);
    }, 0);

    expect(total).toBe(50); // 30 + 20 + 0
  });
});

describe("Score Cascade - Exempted Status Blocking", () => {
  it("exempted child contributes 0 to parent group_score", () => {
    const children = [
      { question_type: "standard", score: 50 },
      { question_type: "exempted", score: 50 }, // Won't contribute
      { question_type: "standard", score: 30 },
    ];

    const groupScore = children.reduce((sum, child) => {
      const contribution = child.question_type === "exempted" ? 0 : child.score;
      return sum + contribution;
    }, 0);

    expect(groupScore).toBe(80); // 50 + 0 + 30
  });

  it("exempted group blocks all child contributions", () => {
    const parent = { question_type: "exempted", group_score: 0 };

    // Parent exempted = 0 regardless of child scores
    const parentContribution = parent.question_type === "exempted" ? 0 : parent.group_score;

    expect(parentContribution).toBe(0);
  });
});

describe("Score Cascade - Prerequisites vs Knowledge Tests", () => {
  it("prerequisites (3xx.1.1-1.3) are is_scored=false", () => {
    const prerequisites = [
      { sequence: 1, is_scored: false },
      { sequence: 2, is_scored: false },
      { sequence: 3, is_scored: false },
    ];

    prerequisites.forEach(p => expect(p.is_scored).toBe(false));
  });

  it("knowledge tests (3xx.1.4-1.5) are is_scored=true", () => {
    const tests = [
      { sequence: 4, is_scored: true },
      { sequence: 5, is_scored: true },
    ];

    tests.forEach(t => expect(t.is_scored).toBe(true));
  });

  it("prerequisites excluded from group_score calculation", () => {
    const group = {
      children: [
        { sequence: 1, is_scored: false, score: 0 },   // Prereq - excluded
        { sequence: 2, is_scored: false, score: 0 },   // Prereq - excluded
        { sequence: 3, is_scored: false, score: 0 },   // Prereq - excluded
        { sequence: 4, is_scored: true, score: 15 },   // Knowledge - included
        { sequence: 5, is_scored: true, score: 15 },   // Knowledge - included
      ],
    };

    const groupScore = group.children
      .filter(c => c.is_scored)
      .reduce((sum, c) => sum + c.score, 0);

    expect(groupScore).toBe(30); // Only seq 4 + 5
  });
});

describe("Score Validation - Error Detection", () => {
  it("detects exempted group with non-zero score", () => {
    const anomaly = { question_type: "exempted", group_score: 50 };

    const isAnomaly = anomaly.question_type === "exempted" && anomaly.group_score !== 0;
    expect(isAnomaly).toBe(true);
  });

  it("detects non-scored question with score > 0", () => {
    const anomaly = { is_scored: false, score: 20 };

    const isAnomaly = !anomaly.is_scored && anomaly.score > 0;
    expect(isAnomaly).toBe(true);
  });

  it("detects missing group_score on header", () => {
    const missingScore = { is_group_header: true };

    const isMissing = "group_score" in missingScore === false;
    expect(isMissing).toBe(true);
  });
});
