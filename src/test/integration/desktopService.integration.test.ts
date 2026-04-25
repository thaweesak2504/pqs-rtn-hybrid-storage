import { describe, expect, it, vi } from "vitest";

const windowMock = {
  minimize: vi.fn().mockResolvedValue(undefined),
  maximize: vi.fn().mockResolvedValue(undefined),
  unmaximize: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  hide: vi.fn().mockResolvedValue(undefined),
  show: vi.fn().mockResolvedValue(undefined),
  isMaximized: vi.fn().mockResolvedValue(true),
  isMinimized: vi.fn().mockResolvedValue(false),
  isVisible: vi.fn().mockResolvedValue(true),
  setSize: vi.fn().mockResolvedValue(undefined),
  setPosition: vi.fn().mockResolvedValue(undefined),
  center: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@tauri-apps/api/window", () => ({
  getCurrent: vi.fn(() => windowMock),
  LogicalSize: class LogicalSize {
    width: number;
    height: number;
    constructor(width: number, height: number) {
      this.width = width;
      this.height = height;
    }
  },
  LogicalPosition: class LogicalPosition {
    x: number;
    y: number;
    constructor(x: number, y: number) {
      this.x = x;
      this.y = y;
    }
  },
}));

import { invoke } from "@tauri-apps/api/tauri";
import DesktopService from "../../services/desktopService";

describe("DesktopService integration", () => {
  it("minimizes current window", async () => {
    await DesktopService.minimizeWindow();
    expect(windowMock.minimize).toHaveBeenCalledTimes(1);
  });

  it("calls zoom command through invoke", async () => {
    vi.mocked(invoke).mockResolvedValueOnce(undefined);

    await DesktopService.zoomIn();

    expect(invoke).toHaveBeenCalledWith("zoom_in");
  });

  it("sets window size using LogicalSize", async () => {
    await DesktopService.setWindowSize(1280, 720);

    expect(windowMock.setSize).toHaveBeenCalledTimes(1);
    const arg = windowMock.setSize.mock.calls[0]?.[0] as { width: number; height: number };
    expect(arg.width).toBe(1280);
    expect(arg.height).toBe(720);
  });

  it("calls additional window wrapper operations", async () => {
    await DesktopService.maximizeWindow();
    await DesktopService.unmaximizeWindow();
    await DesktopService.hideWindow();
    await DesktopService.showWindow();
    await DesktopService.closeWindow();
    await DesktopService.setWindowPosition(20, 30);
    await DesktopService.centerWindow();

    expect(windowMock.maximize).toHaveBeenCalledTimes(1);
    expect(windowMock.unmaximize).toHaveBeenCalledTimes(1);
    expect(windowMock.hide).toHaveBeenCalledTimes(1);
    expect(windowMock.show).toHaveBeenCalledTimes(1);
    expect(windowMock.close).toHaveBeenCalledTimes(1);
    expect(windowMock.setPosition).toHaveBeenCalledTimes(1);
    expect(windowMock.center).toHaveBeenCalledTimes(1);
  });

  it("returns state queries from window object", async () => {
    await expect(DesktopService.isMaximized()).resolves.toBe(true);
    await expect(DesktopService.isMinimized()).resolves.toBe(false);
    await expect(DesktopService.isVisible()).resolves.toBe(true);
  });

  it("returns fallback values on state query errors", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    windowMock.isMaximized.mockRejectedValueOnce(new Error("max state failed"));
    windowMock.isMinimized.mockRejectedValueOnce(new Error("min state failed"));
    windowMock.isVisible.mockRejectedValueOnce(new Error("visible state failed"));

    await expect(DesktopService.isMaximized()).resolves.toBe(false);
    await expect(DesktopService.isMinimized()).resolves.toBe(false);
    await expect(DesktopService.isVisible()).resolves.toBe(true);
    expect(spy).toHaveBeenCalled();
  });

  it("swallows zoom errors and logs", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(invoke).mockRejectedValueOnce(new Error("zoom broken"));

    await expect(DesktopService.zoomOut()).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
  });
});
