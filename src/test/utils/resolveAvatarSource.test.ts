import { describe, expect, it } from "vitest";
import { resolveAvatarSource } from "../../utils/resolveAvatarSource";

describe("resolveAvatarSource", () => {
  it("returns null when raw is missing", () => {
    expect(resolveAvatarSource({ raw: null })).toBeNull();
    expect(resolveAvatarSource({})).toBeNull();
  });

  it("returns data URL as-is", () => {
    const dataUrl = "data:image/png;base64,abc123";
    expect(resolveAvatarSource({ raw: dataUrl, version: "1" })).toBe(dataUrl);
  });

  it("adds version query param to plain path", () => {
    expect(resolveAvatarSource({ raw: "C:/avatars/me.png", version: "42" })).toBe(
      "C:/avatars/me.png?v=42",
    );
  });

  it("appends version query param with ampersand when query already exists", () => {
    expect(resolveAvatarSource({ raw: "/img/avatar.png?size=small", version: "v1" })).toBe(
      "/img/avatar.png?size=small&v=v1",
    );
  });

  it("encodes version for URL safety", () => {
    expect(resolveAvatarSource({ raw: "/avatar.png", version: "a b" })).toBe(
      "/avatar.png?v=a%20b",
    );
  });

  it("returns raw path when version is not provided", () => {
    expect(resolveAvatarSource({ raw: "/avatars/1.png" })).toBe("/avatars/1.png");
  });
});
