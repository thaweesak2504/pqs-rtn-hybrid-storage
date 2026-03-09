import { invoke } from "@tauri-apps/api/tauri";
import { describe, expect, it, vi } from "vitest";
import zoomService from "../../services/zoomService";

describe("zoomService integration", () => {
  it("calls zoom_in command", async () => {
    vi.mocked(invoke).mockResolvedValueOnce(undefined);

    await zoomService.zoomIn();

    expect(invoke).toHaveBeenCalledWith("zoom_in");
  });

  it("calls zoom_out command", async () => {
    vi.mocked(invoke).mockResolvedValueOnce(undefined);

    await zoomService.zoomOut();

    expect(invoke).toHaveBeenCalledWith("zoom_out");
  });

  it("calls zoom_reset command", async () => {
    vi.mocked(invoke).mockResolvedValueOnce(undefined);

    await zoomService.zoomReset();

    expect(invoke).toHaveBeenCalledWith("zoom_reset");
  });

  it("rethrows invoke errors", async () => {
    const error = new Error("zoom failed");
    vi.mocked(invoke).mockRejectedValueOnce(error);
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(zoomService.zoomIn()).rejects.toThrow("zoom failed");
    expect(spy).toHaveBeenCalled();
  });
});
