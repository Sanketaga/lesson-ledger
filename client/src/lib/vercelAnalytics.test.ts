import { Analytics } from "@vercel/analytics/react";
import { describe, expect, it } from "vitest";

describe("Vercel Analytics integration", () => {
  it("exposes the React analytics component used by the application root", () => {
    expect(Analytics).toBeDefined();
  });
});
