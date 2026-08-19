import { describe, expect, it } from "vitest";
import { buildLearningRoadmap } from "./roadmap";

describe("deterministic learning roadmaps", () => {
  it("creates a programming roadmap that progresses from setup to a guided project", () => {
    const roadmap = buildLearningRoadmap("python");

    expect(roadmap.track).toBe("Programming");
    expect(roadmap.modules.map(module => module.id)).toEqual(["setup", "foundations", "logic", "real-programs", "project"]);
    expect(roadmap.modules.map(module => module.searchQuery)).toEqual(expect.arrayContaining([
      expect.stringContaining("setup installation first program"),
      expect.stringContaining("conditions loops functions"),
      expect.stringContaining("beginner project build"),
    ]));
  });

  it("uses distinct learning paths for language, academic, and practical subjects", () => {
    expect(buildLearningRoadmap("hindi").modules.map(module => module.id)).toEqual(["sounds", "everyday-words", "sentence-building", "guided-dialogue", "real-practice"]);
    expect(buildLearningRoadmap("calculus").modules.map(module => module.id)).toEqual(["orientation", "definitions", "methods", "problem-solving", "worked-practice"]);
    expect(buildLearningRoadmap("cooking").modules.map(module => module.id)).toEqual(["setup", "fundamentals", "methods", "guided-task", "practice-project"]);
  });
});
