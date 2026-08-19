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

  it("matches conversational learning requests against the local Python fallback", () => {
    const results = filterCatalog("All", "I want to learn Python");

    expect(results).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "python-beginners",
        title: "Learn Python - Full Course for Beginners",
      }),
    ]));
  });
});
