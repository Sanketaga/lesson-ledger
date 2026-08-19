import { describe, expect, it } from "vitest";
import { getPlayerFrameCrop } from "./frameCapture";

describe("getPlayerFrameCrop", () => {
  it("maps the visible player bounds into a scaled captured-tab frame", () => {
    expect(getPlayerFrameCrop(
      { left: 120, top: 80, width: 640, height: 360 },
      { width: 1280, height: 720 },
      { width: 2560, height: 1440 },
    )).toEqual({ x: 240, y: 160, width: 1280, height: 720 });
  });

  it("clamps a partial player rectangle to the captured-frame boundary", () => {
    expect(getPlayerFrameCrop(
      { left: 900, top: 450, width: 200, height: 100 },
      { width: 1000, height: 500 },
      { width: 1000, height: 500 },
    )).toEqual({ x: 900, y: 450, width: 100, height: 50 });
  });

  it("returns no crop when the player is outside the captured frame", () => {
    expect(getPlayerFrameCrop(
      { left: 1100, top: 0, width: 100, height: 100 },
      { width: 1000, height: 500 },
      { width: 1000, height: 500 },
    )).toBeNull();
  });
});
