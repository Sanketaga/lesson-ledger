import { describe, expect, it } from "vitest";
import { isFullscreenTarget } from "./fullscreen";

describe("isFullscreenTarget", () => {
  it("recognizes the active fullscreen player surface", () => {
    const player = {} as Element;
    expect(isFullscreenTarget(player, player)).toBe(true);
  });

  it("keeps another fullscreen surface distinct from the player", () => {
    expect(isFullscreenTarget({} as Element, {} as Element)).toBe(false);
    expect(isFullscreenTarget(null, {} as Element)).toBe(false);
  });
});
