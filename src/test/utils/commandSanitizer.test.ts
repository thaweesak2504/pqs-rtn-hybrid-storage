import { describe, expect, it } from "vitest";
import { CommandSanitizer } from "../../utils/commandSanitizer";

describe("CommandSanitizer", () => {
  it("sanitizes thai, invisible, and control characters", () => {
    const result = CommandSanitizer.sanitize("dir แ\u200B\u0001");
    expect(result).toBe("dir");
  });

  it("validates safe command", () => {
    const result = CommandSanitizer.validate("cargo test -- --nocapture");
    expect(result.isValid).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(result.sanitized).toBe("cargo test -- --nocapture");
  });

  it("flags multiple invalid patterns", () => {
    const result = CommandSanitizer.validate("rm -rf C:/ แ\u200B\u0001");
    expect(result.isValid).toBe(false);
    expect(result.issues).toContain("Contains Thai characters");
    expect(result.issues).toContain("Contains invisible characters");
    expect(result.issues).toContain("Contains control characters");
    expect(result.issues).toContain("Contains dangerous command pattern");
  });

  it("detects encoding issues for thai + english", () => {
    expect(CommandSanitizer.detectEncodingIssues("dir แ")).toBe(true);
    expect(CommandSanitizer.detectEncodingIssues("dir 123")).toBe(false);
  });

  it("returns sanitization stats", () => {
    const original = "echo แ\u200B\u0001";
    const sanitized = CommandSanitizer.sanitize(original);
    const stats = CommandSanitizer.getSanitizationStats(original, sanitized);

    expect(stats.originalLength).toBe(original.length);
    expect(stats.sanitizedLength).toBe(sanitized.length);
    expect(stats.charactersRemoved).toBeGreaterThan(0);
    expect(stats.thaiCharactersRemoved).toBe(1);
    expect(stats.invisibleCharactersRemoved).toBe(1);
    expect(stats.controlCharactersRemoved).toBe(1);
  });

  it("lists problematic characters with unicode details", () => {
    const list = CommandSanitizer.getProblematicCharacters("Aแ\u200B\u0001");
    expect(list.some((item: string) => item.includes("Thai:") && item.includes("U+E41"))).toBe(true);
    expect(list.some((item: string) => item.includes("Invisible:") && item.includes("U+200B"))).toBe(true);
    expect(list.some((item: string) => item.includes("Control:") && item.includes("U+1"))).toBe(true);
  });

  it("creates safe executor for valid command", () => {
    const exec = CommandSanitizer.createSafeExecutor("cargo test");
    expect(exec()).toBe("cargo test");
  });

  it("throws when creating safe executor for dangerous command", () => {
    expect(() => CommandSanitizer.createSafeExecutor("shutdown now")).toThrow(
      "Unsafe command detected",
    );
  });
});
