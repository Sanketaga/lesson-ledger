import { describe, expect, it } from "vitest";
import { normalizeLearningQuery } from "./learningQuery";

describe("normalizeLearningQuery", () => {
  it("extracts the topic from a conversational learning request", () => {
    expect(normalizeLearningQuery("I want to learn Python")).toBe("python");
  });

  it("removes beginner framing while preserving a specific topic", () => {
    expect(normalizeLearningQuery("Can you teach me intro to Python for beginners?")).toBe("python");
  });

  it("normalizes familiar topic aliases", () => {
    expect(normalizeLearningQuery("I want to learn neural networks")).toBe("neural network");
  });
});
