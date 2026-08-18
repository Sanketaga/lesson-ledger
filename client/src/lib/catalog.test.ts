import { describe, expect, it } from "vitest";
import { filterCatalog } from "./catalog";

describe("bundled catalog search", () => {
  it("returns a local lesson before the live-provider fallback is considered", () => {
    const results = filterCatalog("All", "neural network");

    expect(results).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "neural-network",
        title: "But what is a neural network?",
      }),
    ]));
  });
});
