import { describe, expect, it } from "vitest";
import { completeLesson, formatTimestamp, learningStorageKey, mergeLearningRecord } from "./learning";

describe("student learning record", () => {
  it("hydrates safe defaults while retaining a student’s saved choices", () => {
    expect(mergeLearningRecord({ goal: "Explain recursion", autoAdvance: false, completedLessonIds: ["lesson-1"] })).toMatchObject({
      goal: "Explain recursion",
      autoAdvance: false,
      completedLessonIds: ["lesson-1"],
      notes: [],
    });
  });

  it("does not duplicate completed lessons", () => {
    const record = mergeLearningRecord({ completedLessonIds: ["lesson-1"] });
    expect(completeLesson(record, "lesson-1").completedLessonIds).toEqual(["lesson-1"]);
    expect(completeLesson(record, "lesson-2").completedLessonIds).toEqual(["lesson-1", "lesson-2"]);
  });

  it("keeps course storage keys and timestamps predictable", () => {
    expect(learningStorageKey("  Python Programming  ")).toBe("lesson-ledger:learning:python programming");
    expect(formatTimestamp("4:05")).toBe("4:05");
    expect(formatTimestamp("around four minutes")).toBe("00:00");
  });
});
