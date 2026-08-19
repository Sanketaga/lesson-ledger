import Home from "./Home";
import { describe, expect, it } from "vitest";

describe("Home module", () => {
  it("loads the landing component without a JSX parser error", () => {
    expect(Home).toBeTypeOf("function");
  });
});
