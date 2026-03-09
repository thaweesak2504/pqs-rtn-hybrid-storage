import { invoke } from "@tauri-apps/api/tauri";
import { describe, expect, it, vi } from "vitest";
import { safeInvoke, tauriUserService } from "../../services/tauriService";

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
});
