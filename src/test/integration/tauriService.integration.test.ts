import { invoke } from "@tauri-apps/api/tauri";
import { describe, expect, it, vi } from "vitest";
import {
    safeInvoke,
    tauriAvatarService,
    tauriDatabaseService,
    tauriUserService,
} from "../../services/tauriService";

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
  it("safeInvoke calls invoke directly in desktop-only mode", async () => {
    setTauriUnavailable();
    vi.mocked(invoke).mockResolvedValueOnce([{ id: 1 }]);

    const result = await safeInvoke("get_all_users");
    expect(invoke).toHaveBeenCalledWith("get_all_users", undefined);
    expect(result).toEqual([{ id: 1 }]);
  });

  it("safeInvoke calls invoke when __TAURI__ is present", async () => {
    setTauriAvailable();
    vi.mocked(invoke).mockResolvedValueOnce([{ id: 1, username: "admin" }]);

    const result = await safeInvoke("get_all_users");

    expect(invoke).toHaveBeenCalledWith("get_all_users", undefined);
    expect(result).toEqual([{ id: 1, username: "admin" }]);
  });

  it("safeInvoke rethrows invoke errors in tauri environment", async () => {
    setTauriAvailable();
    vi.mocked(invoke).mockRejectedValueOnce(new Error("backend failed"));

    await expect(safeInvoke("get_all_users")).rejects.toThrow("backend failed");
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

  it("maps authenticateUser payload", async () => {
    setTauriAvailable();
    vi.mocked(invoke).mockResolvedValueOnce({ id: 1, username: "admin" });

    await tauriUserService.authenticateUser("admin", "secret");

    expect(invoke).toHaveBeenCalledWith("authenticate_user", {
      usernameOrEmail: "admin",
      password: "secret",
    });
  });

  it("maps changePassword payload", async () => {
    setTauriAvailable();
    vi.mocked(invoke).mockResolvedValueOnce(undefined);

    await tauriUserService.changePassword(42, "old-secret", "new-strong-pass");

    expect(invoke).toHaveBeenCalledWith("change_password", {
      userId: 42,
      oldPassword: "old-secret",
      newPassword: "new-strong-pass",
    });
  });

  it("maps updateUser payload with plaintext password", async () => {
    setTauriAvailable();
    vi.mocked(invoke).mockResolvedValueOnce({ id: 7, username: "jane" });

    await tauriUserService.updateUser(7, "jane", "j@x.com", "brand-new-pw", "Jane Doe", "LT", "editor");

    expect(invoke).toHaveBeenCalledWith("update_user", {
      id: 7,
      username: "jane",
      email: "j@x.com",
      password: "brand-new-pw",
      fullName: "Jane Doe",
      rank: "LT",
      role: "editor",
    });
  });

  it("maps updateUser without password change (null)", async () => {
    setTauriAvailable();
    vi.mocked(invoke).mockResolvedValueOnce({ id: 7, username: "jane" });

    await tauriUserService.updateUser(7, "jane", "j@x.com", undefined, "Jane Doe", "LT", "editor");

    expect(invoke).toHaveBeenCalledWith("update_user", {
      id: 7,
      username: "jane",
      email: "j@x.com",
      password: null,
      fullName: "Jane Doe",
      rank: "LT",
      role: "editor",
    });
  });

  it("maps initializeDatabase command", async () => {
    setTauriAvailable();
    vi.mocked(invoke).mockResolvedValueOnce("initialized");

    const result = await tauriDatabaseService.initializeDatabase();

    expect(invoke).toHaveBeenCalledWith("initialize_database", undefined);
    expect(result).toBe("initialized");
  });
});
