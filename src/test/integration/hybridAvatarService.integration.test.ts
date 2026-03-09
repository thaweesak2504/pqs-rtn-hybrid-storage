import { invoke } from "@tauri-apps/api/tauri";
import { describe, expect, it, vi } from "vitest";
import { hybridAvatarService, type HybridAvatarInfo } from "../../services/hybridAvatarService";

const sampleInfo: HybridAvatarInfo = {
  user_id: 7,
  avatar_path: "media/avatars/7.png",
  avatar_updated_at: "2026-03-09T00:00:00Z",
  avatar_mime: "image/png",
  avatar_size: 1234,
  file_exists: true,
};

describe("hybridAvatarService integration", () => {
  it("maps saveAvatar payload and returns info", async () => {
    vi.mocked(invoke).mockResolvedValueOnce(sampleInfo);

    const bytes = new Uint8Array([1, 2, 3]);
    const result = await hybridAvatarService.saveAvatar(7, bytes, "image/png");

    expect(invoke).toHaveBeenCalledWith("save_hybrid_avatar", {
      userId: 7,
      avatarData: [1, 2, 3],
      mimeType: "image/png",
    });
    expect(result).toEqual(sampleInfo);
  });

  it("calls get_hybrid_avatar_info with userId", async () => {
    vi.mocked(invoke).mockResolvedValueOnce(sampleInfo);

    const result = await hybridAvatarService.getAvatarInfo(7);

    expect(invoke).toHaveBeenCalledWith("get_hybrid_avatar_info", { userId: 7 });
    expect(result.user_id).toBe(7);
  });

  it("calls cleanup_orphaned_avatar_files without args", async () => {
    vi.mocked(invoke).mockResolvedValueOnce(5);

    const count = await hybridAvatarService.cleanupOrphanedFiles();

    expect(invoke).toHaveBeenCalledWith("cleanup_orphaned_avatar_files");
    expect(count).toBe(5);
  });

  it("wraps errors for deleteAvatar", async () => {
    vi.mocked(invoke).mockRejectedValueOnce("db unavailable");
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(hybridAvatarService.deleteAvatar(7)).rejects.toThrow(
      "Failed to delete avatar: db unavailable",
    );
    expect(spy).toHaveBeenCalled();
  });
});
