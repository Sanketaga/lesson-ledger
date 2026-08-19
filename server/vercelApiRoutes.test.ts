import oauthCallback from "../api/oauth/callback";
import storageProxy from "../api/manus-storage/[...path]";
import trpcRoute from "../api/trpc/[...path]";
import { describe, expect, it } from "vitest";

describe("Vercel API route entries", () => {
  it("exports Express handlers for the production tRPC, OAuth, and storage paths", () => {
    expect(trpcRoute).toBeTypeOf("function");
    expect(oauthCallback).toBeTypeOf("function");
    expect(storageProxy).toBeTypeOf("function");
  });
});
