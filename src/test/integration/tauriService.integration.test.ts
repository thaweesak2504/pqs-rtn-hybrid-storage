import { invoke } from "@tauri-apps/api/tauri";
import { describe, expect, it, vi } from "vitest";
import { safeInvoke, tauriAvatarService, tauriUserService } from "../../services/tauriService";

const setTauriUnavailable = () => {
  Object.defineProperty(window, "__TAURI__", {
    value: undefined,
    writable: true,
    configurable: true,
  });
};

const setTauriAvailable = () => {
  Object.defineProperty(window, "__TAURI__", {
    value: {
      convertFileSrc: vi.fn((src: string) => src),
    },
    writable: true,
    configurable: true,
  });
};

describe("tauriService integration", () => {
  it("safeInvoke rejects when not in tauri environment", async () => {
    setTauriUnavailable();

    await expect(safeInvoke("get_all_users")).rejects.toThrow("Not running in Tauri environment");
  });

  it("safeInvoke calls invoke when __TAURI__ is present", async () => {
    setTauriAvailable();
    vi.mocked(invoke).mockResolvedValueOnce([{ id: 1, username: "admin" }]);

    const result = await safeInvoke("get_all_users");

    expect(invoke).toHaveBeenCalledWith("get_all_users", undefined);
    expect(result).toEqual([{ id: 1, username: "admin" }]);
  });

  it("maps createUser payload to backend keys", async () => {
    setTauriAvailable();
    vi.mocked(invoke).mockResolvedValueOnce({ id: 1, username: "admin" });

    await tauriUserService.createUser("admin", "a@x.com", "pass", "Admin User", "CAPT", "admin");

    expect(invoke).toHaveBeenCalledWith("create_user", {
      username: "admin",
      email: "a@x.com",
      password: "pass",
      fullName: "Admin User",
      rank: "CAPT",
      role: "admin",
    });
  });

  it("maps saveAvatar payload with Uint8Array serialization", async () => {
    setTauriAvailable();
    vi.mocked(invoke).mockResolvedValueOnce({ id: 2, user_id: 7, mime_type: "image/png" });

    await tauriAvatarService.saveAvatar(7, new Uint8Array([10, 20, 30]), "image/png");

    expect(invoke).toHaveBeenCalledWith("save_avatar", {
      userId: 7,
      avatarData: [10, 20, 30],
      mimeType: "image/png",
    });
  });

  it("maps getAvatarByUserId command args", async () => {
    setTauriAvailable();
    vi.mocked(invoke).mockResolvedValueOnce({ id: 3, user_id: 99 });

    const result = await tauriAvatarService.getAvatarByUserId(99);

    expect(invoke).toHaveBeenCalledWith("get_avatar_by_user_id", { userId: 99 });
    expect(result).toEqual({ id: 3, user_id: 99 });
  });

  it("rethrows deleteAvatar errors", async () => {
    setTauriAvailable();
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(invoke).mockRejectedValueOnce(new Error("delete failed"));

    await expect(tauriAvatarService.deleteAvatar(3)).rejects.toThrow("delete failed");
    expect(spy).toHaveBeenCalled();
  });
});
